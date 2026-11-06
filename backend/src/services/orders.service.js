import { AppError } from "../utils/app-error.js";
import { numberOut, OBJECT, withConnection, withTransaction } from "../utils/db.js";

const MAX_PER_PRODUCT = 10;
const MAX_LINES = 30;

export const orderCode = (id) => `SP-${String(id).padStart(4, "0")}`;

// Tiempo (minutos) en que el cliente puede cancelar su pedido. Pasado ese tiempo el pedido queda en verificación
// por el empleado. Configurable con ORDER_CANCEL_WINDOW_MINUTES en backend/.env (por defecto 15).
export function cancelWindowMinutes() {
    const value = Number(process.env.ORDER_CANCEL_WINDOW_MINUTES);
    return Number.isFinite(value) && value > 0 ? value : 15;
}

// requested: [{ referenceId, quantity }]  (ya validados por el controlador)
// El precio NO viene del cliente: se toma de PRODUCTOS al momento del pedido y queda guardado en el detalle.
// El pedido nace PENDIENTE; el stock se reserva cuando el empleado lo verifica en la tienda (fase 5).
export function createOrder(userId, requested) {
    return withTransaction(async (connection) => {
        // Una referencia repetida se suma en una sola línea.
        const wanted = new Map();
        for (const item of requested) {
            wanted.set(item.referenceId, (wanted.get(item.referenceId) ?? 0) + item.quantity);
        }
        if (wanted.size > MAX_LINES) throw new AppError(`Un pedido admite máximo ${MAX_LINES} productos distintos.`);

        const ids = [...wanted.keys()];
        const binds = {};
        const placeholders = ids.map((id, index) => {
            binds[`ref${index}`] = id;
            return `:ref${index}`;
        });

        const result = await connection.execute(
            `SELECT RF.ID_REFERENCIA_PK, RF.ESTADO AS REF_ESTADO,
                    P.NOMBRE_PRODUCTO, P.ESTADO AS PROD_ESTADO, P.PRECIO,
                    T.NOMBRE_TALLA,
                    NVL(I.CANTIDAD_ACTUAL, 0) - NVL(I.CANTIDAD_RESERVADA, 0) AS DISPONIBLE
               FROM REFERENCIA_PRODUCTO RF
               JOIN PRODUCTOS P ON P.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
               JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
               LEFT JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK
              WHERE RF.ID_REFERENCIA_PK IN (${placeholders.join(", ")})`,
            binds,
            OBJECT
        );
        const references = new Map(result.rows.map((row) => [row.ID_REFERENCIA_PK, row]));

        const problems = [];
        const lines = [];
        for (const [referenceId, quantity] of wanted) {
            const row = references.get(referenceId);
            if (!row || row.PROD_ESTADO !== "ACTIVO" || row.REF_ESTADO !== "ACTIVO") {
                problems.push(row
                    ? `${row.NOMBRE_PRODUCTO} (talla ${row.NOMBRE_TALLA}) ya no está disponible.`
                    : "Un producto de tu carrito ya no está disponible.");
                continue;
            }
            if (quantity > MAX_PER_PRODUCT) {
                problems.push(`${row.NOMBRE_PRODUCTO} (talla ${row.NOMBRE_TALLA}): máximo ${MAX_PER_PRODUCT} unidades por producto.`);
                continue;
            }
            if (row.DISPONIBLE < quantity) {
                problems.push(row.DISPONIBLE > 0
                    ? `${row.NOMBRE_PRODUCTO} (talla ${row.NOMBRE_TALLA}): solo hay ${row.DISPONIBLE} ${row.DISPONIBLE === 1 ? "unidad disponible" : "unidades disponibles"}.`
                    : `${row.NOMBRE_PRODUCTO} (talla ${row.NOMBRE_TALLA}) está agotado.`);
                continue;
            }
            lines.push({ referenceId, quantity, row });
        }
        if (problems.length) throw new AppError(problems.join(" "), 409);

        const orderResult = await connection.execute(
            `INSERT INTO PEDIDO (ID_USUARIO_FK) VALUES (:userId) RETURNING ID_PEDIDO_PK INTO :id`,
            { userId, id: numberOut() }
        );
        const orderId = orderResult.outBinds.id[0];

        for (const line of lines) {
            await connection.execute(
                `INSERT INTO DETALLE_PEDIDO (ID_PEDIDO_FK, ID_REFERENCIA_FK, CANTIDAD_PEDIDO, PRECIO_UNITARIO)
                 VALUES (:orderId, :referenceId, :quantity, :unitPrice)`,
                { orderId, referenceId: line.referenceId, quantity: line.quantity, unitPrice: line.row.PRECIO }
            );
        }

        const items = lines.map((line) => ({
            referenceId: line.referenceId,
            productName: line.row.NOMBRE_PRODUCTO,
            sizeName: line.row.NOMBRE_TALLA,
            quantity: line.quantity,
            unitPrice: line.row.PRECIO,
            subtotal: line.row.PRECIO * line.quantity
        }));
        return {
            id: orderId,
            code: orderCode(orderId),
            status: "PENDIENTE",
            pickup: "Tienda local",
            cancelWindowMinutes: cancelWindowMinutes(),
            total: items.reduce((sum, item) => sum + item.subtotal, 0),
            items
        };
    });
}

// Historial de pedidos del cliente autenticado (solo los suyos), del más reciente al más antiguo.
export function listMyOrders(userId) {
    return withConnection(async (connection) => {
        const windowSeconds = cancelWindowMinutes() * 60;
        const orderResult = await connection.execute(
            `SELECT P.ID_PEDIDO_PK, P.FECHA_PEDIDO, P.FECHA_ENTREGA, P.ESTADO,
                    (SYSDATE - P.FECHA_PEDIDO) * 86400 AS TRANSCURRIDO,
                    (SELECT H.OBSERVACION FROM PROCESO_PEDIDO H
                      WHERE H.ID_PROCESO_PEDIDO_PK = (SELECT MAX(H2.ID_PROCESO_PEDIDO_PK) FROM PROCESO_PEDIDO H2
                                                       WHERE H2.ID_PEDIDO_FK = P.ID_PEDIDO_PK AND H2.ESTADO = 'INCOMPLETO')) AS MOTIVO
               FROM PEDIDO P
              WHERE P.ID_USUARIO_FK = :userId
              ORDER BY P.FECHA_PEDIDO DESC, P.ID_PEDIDO_PK DESC`,
            { userId },
            OBJECT
        );
        const lineResult = await connection.execute(
            `SELECT D.ID_PEDIDO_FK, D.CANTIDAD_PEDIDO, D.CANTIDAD_DISPONIBLE, D.PRECIO_UNITARIO,
                    PR.NOMBRE_PRODUCTO, T.NOMBRE_TALLA
               FROM DETALLE_PEDIDO D
               JOIN PEDIDO P ON P.ID_PEDIDO_PK = D.ID_PEDIDO_FK
               JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = D.ID_REFERENCIA_FK
               JOIN PRODUCTOS PR ON PR.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
               JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
              WHERE P.ID_USUARIO_FK = :userId
              ORDER BY D.ID_DETALLE_PEDIDO_PK`,
            { userId },
            OBJECT
        );
        const itemsByOrder = new Map();
        for (const line of lineResult.rows) {
            if (!itemsByOrder.has(line.ID_PEDIDO_FK)) itemsByOrder.set(line.ID_PEDIDO_FK, []);
            itemsByOrder.get(line.ID_PEDIDO_FK).push({
                productName: line.NOMBRE_PRODUCTO,
                sizeName: line.NOMBRE_TALLA,
                requested: line.CANTIDAD_PEDIDO,
                confirmed: line.CANTIDAD_DISPONIBLE,
                unitPrice: line.PRECIO_UNITARIO,
                subtotal: line.PRECIO_UNITARIO * line.CANTIDAD_PEDIDO
            });
        }
        return orderResult.rows.map((row) => {
            const items = itemsByOrder.get(row.ID_PEDIDO_PK) ?? [];
            const secondsLeft = Math.max(0, Math.ceil(windowSeconds - row.TRANSCURRIDO));
            const cancellable = ["PENDIENTE", "INCOMPLETO", "COMPLETO"].includes(row.ESTADO) && secondsLeft > 0;
            return {
                id: row.ID_PEDIDO_PK,
                code: orderCode(row.ID_PEDIDO_PK),
                status: row.ESTADO,
                createdAt: row.FECHA_PEDIDO,
                deliveredAt: row.FECHA_ENTREGA,
                total: items.reduce((sum, item) => sum + item.subtotal, 0),
                confirmedTotal: items.reduce((sum, item) => sum + item.confirmed * item.unitPrice, 0),
                incompleteReason: row.ESTADO === "INCOMPLETO" ? row.MOTIVO ?? "" : "",
                canCancel: cancellable,
                cancelSecondsLeft: cancellable ? secondsLeft : 0,
                items
            };
        });
    });
}

// Avisos dentro de la aplicación (campana del usuario): cambios de estado hechos por la tienda en los pedidos del
// cliente. Se leen del historial PROCESO_PEDIDO, así que funcionan aunque el correo no esté configurado.
export function listMyNotifications(userId) {
    return withConnection(async (connection) => {
        const result = await connection.execute(
            `SELECT H.ID_PROCESO_PEDIDO_PK, H.ID_PEDIDO_FK, H.ESTADO, H.FECHA, H.OBSERVACION
               FROM PROCESO_PEDIDO H
               JOIN PEDIDO P ON P.ID_PEDIDO_PK = H.ID_PEDIDO_FK
              WHERE P.ID_USUARIO_FK = :userId
                AND H.ID_USUARIO_FK <> P.ID_USUARIO_FK
                AND H.ESTADO IN ('INCOMPLETO', 'COMPLETO', 'RECLAMADO', 'CANCELADO')
                AND H.FECHA >= SYSDATE - 30
              ORDER BY H.ID_PROCESO_PEDIDO_PK DESC
              FETCH FIRST 20 ROWS ONLY`,
            { userId },
            OBJECT
        );
        return result.rows.map((row) => {
            const code = orderCode(row.ID_PEDIDO_FK);
            const reason = row.OBSERVACION ? `: ${row.OBSERVACION}` : ".";
            const message = {
                COMPLETO: `Tu pedido ${code} está listo para reclamar en la tienda.`,
                INCOMPLETO: `Tu pedido ${code} está incompleto${reason}`,
                RECLAMADO: `Tu pedido ${code} fue reclamado en la tienda.`,
                CANCELADO: `La tienda canceló tu pedido ${code}${reason}`
            }[row.ESTADO];
            return { id: row.ID_PROCESO_PEDIDO_PK, orderId: row.ID_PEDIDO_FK, code, status: row.ESTADO, at: row.FECHA, message };
        });
    });
}
