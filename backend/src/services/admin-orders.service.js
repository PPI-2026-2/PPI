import { AppError } from "../utils/app-error.js";
import { OBJECT, withConnection } from "../utils/db.js";
import {
    cancelUnclaimedOrder as cancelUnclaimed,
    getOrder,
    getOrdersSummary,
    ORDER_SELECT,
    ORDER_STATUSES,
    toOrderSummary
} from "./employee-orders.service.js";

const MAX_ROWS = 200;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export { ORDER_STATUSES };

// Días que un pedido COMPLETO (ya avisado al cliente) puede esperar en tienda antes de considerarse "sin reclamar".
export function unclaimedDays() {
    const value = Number(process.env.ORDER_UNCLAIMED_DAYS);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 4;
}

// Condición SQL de "sin reclamar": COMPLETO y avisado hace más de N días.
const UNCLAIMED_CONDITION = `P.ESTADO = 'COMPLETO'
    AND (SELECT MAX(H.FECHA) FROM PROCESO_PEDIDO H WHERE H.ID_PEDIDO_FK = P.ID_PEDIDO_PK AND H.ESTADO = 'COMPLETO') < SYSDATE - :unclaimedLimit`;

// Consulta de pedidos para el administrador, con filtros opcionales:
//   status: un estado · q: código (SP-0007 o 7), nombre o correo del cliente · from/to: fechas YYYY-MM-DD (inclusive, fecha del pedido)
//   unclaimed: solo los COMPLETO que superan los días permitidos sin reclamar
//   page/pageSize: paginación real; sin page devuelve hasta 200 pedidos.
export function listAdminOrders({ status, q, from, to, unclaimed = false, page, pageSize = 100 } = {}) {
    return withConnection(async (connection) => {
        const binds = {};
        const conditions = [];
        const limit = unclaimedDays();
        if (unclaimed) {
            conditions.push(`(${UNCLAIMED_CONDITION})`);
            binds.unclaimedLimit = limit;
        } else if (status) {
            conditions.push("P.ESTADO = :statusFilter");
            binds.statusFilter = status;
        }
        const text = String(q ?? "").trim().slice(0, 100);
        if (text) {
            const digits = text.replace(/\D/g, "");
            const clauses = ["UPPER(U.NOMBRE_US || ' ' || U.APELLIDO_US) LIKE :searchName", "UPPER(U.EMAIL) LIKE :searchMail"];
            binds.searchName = `%${text.toUpperCase()}%`;
            binds.searchMail = `%${text.toUpperCase()}%`;
            if (digits && digits.length <= 9 && /^(SP-?)?\d+$/i.test(text)) {
                clauses.push("P.ID_PEDIDO_PK = :searchId");
                binds.searchId = Number(digits);
            }
            conditions.push(`(${clauses.join(" OR ")})`);
        }
        if (from) {
            if (!DATE_PATTERN.test(from)) throw new AppError("La fecha inicial no es válida.");
            conditions.push("P.FECHA_PEDIDO >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
            binds.dateFrom = from;
        }
        if (to) {
            if (!DATE_PATTERN.test(to)) throw new AppError("La fecha final no es válida.");
            conditions.push("P.FECHA_PEDIDO < TO_DATE(:dateTo, 'YYYY-MM-DD') + 1");
            binds.dateTo = to;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const order = "ORDER BY P.FECHA_PEDIDO DESC, P.ID_PEDIDO_PK DESC";
        const mapOrder = (row) => {
            const summary = toOrderSummary(row);
            return { ...summary, unclaimed: summary.status === "COMPLETO" && summary.readyDays !== null && summary.readyDays > limit };
        };

        if (!page) {
            const result = await connection.execute(`${ORDER_SELECT} ${where} ${order} FETCH FIRST ${MAX_ROWS} ROWS ONLY`, binds, OBJECT);
            return { orders: result.rows.map(mapOrder), pagination: null };
        }

        const countResult = await connection.execute(
            `SELECT COUNT(*) AS TOTAL FROM PEDIDO P JOIN USUARIO U ON U.ID_USUARIO_PK = P.ID_USUARIO_FK ${where}`,
            binds,
            OBJECT
        );
        const total = countResult.rows[0]?.TOTAL ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const current = Math.min(page, totalPages);
        const result = await connection.execute(
            `${ORDER_SELECT} ${where} ${order} OFFSET :offsetRows ROWS FETCH NEXT :maxRows ROWS ONLY`,
            { ...binds, offsetRows: (current - 1) * pageSize, maxRows: pageSize },
            OBJECT
        );
        return { orders: result.rows.map(mapOrder), pagination: { page: current, pageSize, total, totalPages } };
    });
}

// Conteo por estado + cuántos pedidos están "sin reclamar" y el plazo vigente.
export async function getAdminSummary() {
    const counts = await getOrdersSummary();
    const limit = unclaimedDays();
    const unclaimedCount = await withConnection(async (connection) => {
        const result = await connection.execute(
            `SELECT COUNT(*) AS TOTAL FROM PEDIDO P WHERE ${UNCLAIMED_CONDITION}`,
            { unclaimedLimit: limit },
            OBJECT
        );
        return result.rows[0]?.TOTAL ?? 0;
    });
    return { counts, unclaimedCount, unclaimedDays: limit };
}

// Valor de lo ya reclamado en tienda (solo unidades entregadas), según la fecha de entrega.
//   month: "YYYY-MM" · from/to: "YYYY-MM-DD" (inclusive). Sin filtros: todo el histórico.
export function getClaimedValue({ month, from, to } = {}) {
    return withConnection(async (connection) => {
        const binds = {};
        const conditions = ["P.ESTADO = 'RECLAMADO'"];
        if (month) {
            if (!MONTH_PATTERN.test(month)) throw new AppError("El mes no es válido.");
            conditions.push("P.FECHA_ENTREGA >= TO_DATE(:monthStart, 'YYYY-MM-DD')");
            conditions.push("P.FECHA_ENTREGA < ADD_MONTHS(TO_DATE(:monthEnd, 'YYYY-MM-DD'), 1)");
            binds.monthStart = `${month}-01`;
            binds.monthEnd = `${month}-01`;
        } else {
            if (from && !DATE_PATTERN.test(from)) throw new AppError("La fecha inicial no es válida.");
            if (to && !DATE_PATTERN.test(to)) throw new AppError("La fecha final no es válida.");
            if (from && to && from > to) throw new AppError("La fecha inicial no puede ser posterior a la final.");
            if (from) {
                conditions.push("P.FECHA_ENTREGA >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
                binds.dateFrom = from;
            }
            if (to) {
                conditions.push("P.FECHA_ENTREGA < TO_DATE(:dateTo, 'YYYY-MM-DD') + 1");
                binds.dateTo = to;
            }
        }
        const result = await connection.execute(
            `SELECT NVL(SUM(D.CANTIDAD_DISPONIBLE * D.PRECIO_UNITARIO), 0) AS TOTAL,
                    COUNT(DISTINCT P.ID_PEDIDO_PK) AS PEDIDOS
               FROM DETALLE_PEDIDO D
               JOIN PEDIDO P ON P.ID_PEDIDO_PK = D.ID_PEDIDO_FK
              WHERE ${conditions.join(" AND ")}`,
            binds,
            OBJECT
        );
        const row = result.rows[0] ?? {};
        return { total: row.TOTAL ?? 0, orders: row.PEDIDOS ?? 0, month: month ?? null, from: from ?? null, to: to ?? null };
    });
}

export const cancelUnclaimedOrder = (orderId, adminId) => cancelUnclaimed(orderId, adminId, unclaimedDays());

export const getAdminOrder = getOrder;
