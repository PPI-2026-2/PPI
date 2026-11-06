import { AppError } from "../utils/app-error.js";
import { OBJECT, withConnection, withTransaction } from "../utils/db.js";
import { sendOrderStatusEmail } from "./order-notifications.service.js";
import { cancelWindowMinutes, orderCode } from "./orders.service.js";

// Pedidos vistos por el EMPLEADO. Ciclo de vida:
//   PENDIENTE --(pasan los minutos de cancelación del cliente)--> verificar --> COMPLETO | INCOMPLETO
//   INCOMPLETO --volver a verificar--> COMPLETO | INCOMPLETO       COMPLETO --entregar (reclamado)--> RECLAMADO
//   (PENDIENTE | INCOMPLETO | COMPLETO) --cancelar (solo el cliente dueño y dentro de su plazo; el empleado no cancela)--> CANCELADO
// Cada vez que un pedido queda COMPLETO o INCOMPLETO se envía un correo al cliente.
// Verificar = el empleado confirma por línea cuántas unidades hay en tienda; esas unidades se RESERVAN.
// Entregar  = baja el stock real y lo reservado, y deja un movimiento SALIDA_PEDIDO por línea.
export const ORDER_STATUSES = ["PENDIENTE", "INCOMPLETO", "COMPLETO", "RECLAMADO", "CANCELADO"];

export const ORDER_SELECT = `
SELECT P.ID_PEDIDO_PK, P.FECHA_PEDIDO, P.FECHA_ENTREGA, P.ESTADO,
       (SYSDATE - P.FECHA_PEDIDO) * 86400 AS TRANSCURRIDO,
       (CASE WHEN P.ESTADO = 'COMPLETO'
             THEN SYSDATE - (SELECT MAX(H.FECHA) FROM PROCESO_PEDIDO H WHERE H.ID_PEDIDO_FK = P.ID_PEDIDO_PK AND H.ESTADO = 'COMPLETO')
        END) AS DIAS_LISTO,
       U.NOMBRE_US, U.APELLIDO_US, U.EMAIL,
       (SELECT COUNT(*) FROM DETALLE_PEDIDO D WHERE D.ID_PEDIDO_FK = P.ID_PEDIDO_PK) AS LINEAS,
       (SELECT NVL(SUM(D.CANTIDAD_PEDIDO), 0) FROM DETALLE_PEDIDO D WHERE D.ID_PEDIDO_FK = P.ID_PEDIDO_PK) AS UNIDADES,
       (SELECT NVL(SUM(D.CANTIDAD_PEDIDO * D.PRECIO_UNITARIO), 0) FROM DETALLE_PEDIDO D WHERE D.ID_PEDIDO_FK = P.ID_PEDIDO_PK) AS TOTAL,
       (SELECT NVL(SUM(D.CANTIDAD_DISPONIBLE * D.PRECIO_UNITARIO), 0) FROM DETALLE_PEDIDO D WHERE D.ID_PEDIDO_FK = P.ID_PEDIDO_PK) AS TOTAL_CONFIRMADO
  FROM PEDIDO P
  JOIN USUARIO U ON U.ID_USUARIO_PK = P.ID_USUARIO_FK`;

export function toOrderSummary(row) {
    return {
        id: row.ID_PEDIDO_PK,
        code: orderCode(row.ID_PEDIDO_PK),
        status: row.ESTADO,
        createdAt: row.FECHA_PEDIDO,
        deliveredAt: row.FECHA_ENTREGA,
        customer: `${row.NOMBRE_US} ${row.APELLIDO_US}`.trim(),
        email: row.EMAIL,
        lines: row.LINEAS,
        units: row.UNIDADES,
        total: row.TOTAL,
        confirmedTotal: row.TOTAL_CONFIRMADO,
        // Días que lleva COMPLETO (listo para reclamar); null si el pedido no está en ese estado.
        readyDays: row.DIAS_LISTO == null ? null : Number(row.DIAS_LISTO),
        // Segundos que faltan para que el empleado pueda verificar (el cliente aún puede cancelar).
        verifyInSeconds: row.ESTADO === "PENDIENTE" ? Math.max(0, Math.ceil(cancelWindowMinutes() * 60 - row.TRANSCURRIDO)) : 0
    };
}

export function listOrders({ statuses } = {}) {
    return withConnection(async (connection) => {
        const binds = {};
        let where = "";
        if (statuses?.length) {
            where = `WHERE P.ESTADO IN (${statuses.map((status, index) => {
                binds[`status${index}`] = status;
                return `:status${index}`;
            }).join(", ")})`;
        }
        const result = await connection.execute(
            `${ORDER_SELECT} ${where} ORDER BY P.FECHA_PEDIDO DESC, P.ID_PEDIDO_PK DESC`,
            binds,
            OBJECT
        );
        return result.rows.map(toOrderSummary);
    });
}

export function getOrdersSummary() {
    return withConnection(async (connection) => {
        const result = await connection.execute(
            "SELECT ESTADO, COUNT(*) AS TOTAL FROM PEDIDO GROUP BY ESTADO",
            {},
            OBJECT
        );
        const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
        for (const row of result.rows) counts[row.ESTADO] = row.TOTAL;
        return counts;
    });
}

async function fetchOrderDetail(connection, id) {
    const orderResult = await connection.execute(`${ORDER_SELECT} WHERE P.ID_PEDIDO_PK = :id`, { id }, OBJECT);
    const row = orderResult.rows[0];
    if (!row) throw new AppError("El pedido no existe.", 404);

    const linesResult = await connection.execute(
        `SELECT D.ID_DETALLE_PEDIDO_PK, D.ID_REFERENCIA_FK, D.CANTIDAD_PEDIDO, D.CANTIDAD_DISPONIBLE, D.PRECIO_UNITARIO,
                PR.NOMBRE_PRODUCTO, T.NOMBRE_TALLA,
                NVL(I.CANTIDAD_ACTUAL, 0) - NVL(I.CANTIDAD_RESERVADA, 0) AS LIBRE
           FROM DETALLE_PEDIDO D
           JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = D.ID_REFERENCIA_FK
           JOIN PRODUCTOS PR ON PR.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
           JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
           LEFT JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = D.ID_REFERENCIA_FK
          WHERE D.ID_PEDIDO_FK = :id
          ORDER BY D.ID_DETALLE_PEDIDO_PK`,
        { id },
        OBJECT
    );
    const historyResult = await connection.execute(
        `SELECT H.ESTADO, H.FECHA, H.OBSERVACION, U.NOMBRE_US, U.APELLIDO_US
           FROM PROCESO_PEDIDO H
           JOIN USUARIO U ON U.ID_USUARIO_PK = H.ID_USUARIO_FK
          WHERE H.ID_PEDIDO_FK = :id
          ORDER BY H.FECHA, H.ID_PROCESO_PEDIDO_PK`,
        { id },
        OBJECT
    );

    const open = row.ESTADO === "PENDIENTE" || row.ESTADO === "INCOMPLETO";
    const items = linesResult.rows.map((line) => ({
        detailId: line.ID_DETALLE_PEDIDO_PK,
        referenceId: line.ID_REFERENCIA_FK,
        productName: line.NOMBRE_PRODUCTO,
        sizeName: line.NOMBRE_TALLA,
        requested: line.CANTIDAD_PEDIDO,
        confirmed: line.CANTIDAD_DISPONIBLE,
        unitPrice: line.PRECIO_UNITARIO,
        subtotal: line.PRECIO_UNITARIO * line.CANTIDAD_PEDIDO,
        // Tope al verificar: lo pedido, y lo que ya está reservado para este pedido + lo libre en el inventario.
        maxConfirmable: open ? Math.min(line.CANTIDAD_PEDIDO, line.CANTIDAD_DISPONIBLE + Math.max(0, line.LIBRE)) : line.CANTIDAD_DISPONIBLE
    }));
    const history = historyResult.rows.map((entry) => ({
        status: entry.ESTADO,
        at: entry.FECHA,
        employee: `${entry.NOMBRE_US} ${entry.APELLIDO_US}`.trim(),
        observation: entry.OBSERVACION
    }));
    const lastIncomplete = [...history].reverse().find((entry) => entry.status === "INCOMPLETO");
    return {
        ...toOrderSummary(row),
        incompleteReason: row.ESTADO === "INCOMPLETO" ? lastIncomplete?.observation ?? "" : "",
        items,
        history
    };
}

export function getOrder(id) {
    return withConnection((connection) => fetchOrderDetail(connection, id));
}

// Bloquea el pedido (nadie más lo cambia mientras dura la transacción) y valida que su estado permita la acción.
// Devuelve { status, ownerId, elapsedSeconds }.
async function lockOrder(connection, id, allowedStatuses, actionLabel) {
    const result = await connection.execute(
        `SELECT ESTADO, ID_USUARIO_FK, (SYSDATE - FECHA_PEDIDO) * 86400 AS TRANSCURRIDO
           FROM PEDIDO WHERE ID_PEDIDO_PK = :id FOR UPDATE`,
        { id },
        OBJECT
    );
    const row = result.rows[0];
    if (!row) throw new AppError("El pedido no existe.", 404);
    if (!allowedStatuses.includes(row.ESTADO)) {
        throw new AppError(`No se puede ${actionLabel} un pedido en estado ${row.ESTADO}.`, 409);
    }
    return { status: row.ESTADO, ownerId: row.ID_USUARIO_FK, elapsedSeconds: row.TRANSCURRIDO };
}

async function loadLines(connection, orderId) {
    const result = await connection.execute(
        `SELECT ID_DETALLE_PEDIDO_PK, ID_REFERENCIA_FK, CANTIDAD_PEDIDO, CANTIDAD_DISPONIBLE
           FROM DETALLE_PEDIDO
          WHERE ID_PEDIDO_FK = :orderId
          ORDER BY ID_REFERENCIA_FK`,
        { orderId },
        OBJECT
    );
    return result.rows;
}

// Bloquea las filas de inventario del pedido siempre en el mismo orden (evita bloqueos cruzados entre pedidos).
async function lockInventory(connection, orderId) {
    const result = await connection.execute(
        `SELECT ID_REFERENCIA_FK, CANTIDAD_ACTUAL, CANTIDAD_RESERVADA
           FROM INVENTARIO
          WHERE ID_REFERENCIA_FK IN (SELECT ID_REFERENCIA_FK FROM DETALLE_PEDIDO WHERE ID_PEDIDO_FK = :orderId)
          ORDER BY ID_REFERENCIA_FK
            FOR UPDATE`,
        { orderId },
        OBJECT
    );
    return new Map(result.rows.map((row) => [row.ID_REFERENCIA_FK, row]));
}

function logProcess(connection, orderId, userId, status, observation) {
    return connection.execute(
        `INSERT INTO PROCESO_PEDIDO (ID_PEDIDO_FK, ID_USUARIO_FK, ESTADO, OBSERVACION)
         VALUES (:orderId, :userId, :status, :observation)`,
        { orderId, userId, status, observation }
    );
}

// lines: [{ detailId, quantity }] con TODAS las líneas del pedido. quantity = unidades confirmadas en tienda.
// Devuelve { order, notification }: notification es el resultado del correo al cliente
// ("sent" | "simulated" | "failed") o "unchanged" si la verificación no cambió nada.
export async function verifyOrder(orderId, userId, lines, observation) {
    const { order, notify } = await withTransaction(async (connection) => {
        const locked = await lockOrder(connection, orderId, ["PENDIENTE", "INCOMPLETO"], "verificar");
        if (locked.status === "PENDIENTE") {
            const secondsLeft = Math.ceil(cancelWindowMinutes() * 60 - locked.elapsedSeconds);
            if (secondsLeft > 0) {
                throw new AppError(`El cliente aún puede cancelar este pedido. Podrás verificarlo en ${Math.ceil(secondsLeft / 60)} min.`, 409);
            }
        }
        const details = await loadLines(connection, orderId);
        const inventory = await lockInventory(connection, orderId);
        const lastReasonResult = await connection.execute(
            `SELECT OBSERVACION FROM PROCESO_PEDIDO
              WHERE ID_PROCESO_PEDIDO_PK = (SELECT MAX(ID_PROCESO_PEDIDO_PK) FROM PROCESO_PEDIDO
                                             WHERE ID_PEDIDO_FK = :orderId AND ESTADO = 'INCOMPLETO')`,
            { orderId },
            OBJECT
        );
        const previousReason = lastReasonResult.rows[0]?.OBSERVACION ?? "";

        const wanted = new Map(lines.map((line) => [line.detailId, line.quantity]));
        if (wanted.size !== lines.length) throw new AppError("Hay líneas repetidas en la verificación.");
        if (details.some((detail) => !wanted.has(detail.ID_DETALLE_PEDIDO_PK)) || wanted.size !== details.length) {
            throw new AppError("Debes indicar la cantidad confirmada de todos los productos del pedido.");
        }

        let allComplete = true;
        let quantitiesChanged = false;
        for (const detail of details) {
            const quantity = wanted.get(detail.ID_DETALLE_PEDIDO_PK);
            if (quantity > detail.CANTIDAD_PEDIDO) {
                throw new AppError("No puedes confirmar más unidades de las que pidió el cliente.");
            }
            const delta = quantity - detail.CANTIDAD_DISPONIBLE;
            if (delta !== 0) {
                quantitiesChanged = true;
                const stock = inventory.get(detail.ID_REFERENCIA_FK);
                const free = stock ? stock.CANTIDAD_ACTUAL - stock.CANTIDAD_RESERVADA : 0;
                if (delta > 0 && delta > free) {
                    throw new AppError(`En el inventario solo hay ${free} ${free === 1 ? "unidad libre" : "unidades libres"} para una de las referencias del pedido.`, 409);
                }
                const reserved = await connection.execute(
                    `UPDATE INVENTARIO
                        SET CANTIDAD_RESERVADA = CANTIDAD_RESERVADA + :delta,
                            FECHA_ACTUALIZACION = SYSDATE
                      WHERE ID_REFERENCIA_FK = :referenceId
                        AND CANTIDAD_RESERVADA + :deltaCheck <= CANTIDAD_ACTUAL
                        AND CANTIDAD_RESERVADA + :deltaFloor >= 0`,
                    { delta, deltaCheck: delta, deltaFloor: delta, referenceId: detail.ID_REFERENCIA_FK }
                );
                if (reserved.rowsAffected !== 1) {
                    throw new AppError("El inventario cambió mientras verificabas el pedido. Vuelve a intentarlo.", 409);
                }
                await connection.execute(
                    "UPDATE DETALLE_PEDIDO SET CANTIDAD_DISPONIBLE = :quantity WHERE ID_DETALLE_PEDIDO_PK = :detailId",
                    { quantity, detailId: detail.ID_DETALLE_PEDIDO_PK }
                );
            }
            if (quantity < detail.CANTIDAD_PEDIDO) allComplete = false;
        }

        const status = allComplete ? "COMPLETO" : "INCOMPLETO";
        if (status === "INCOMPLETO" && !observation) {
            throw new AppError("Escribe el motivo por el que el pedido está incompleto.");
        }
        await connection.execute("UPDATE PEDIDO SET ESTADO = :status WHERE ID_PEDIDO_PK = :orderId", { status, orderId });
        await logProcess(connection, orderId, userId, status, observation);
        const notifyCustomer = status !== locked.status || quantitiesChanged || (status === "INCOMPLETO" && (observation ?? "") !== previousReason);
        return { order: await fetchOrderDetail(connection, orderId), notify: notifyCustomer };
    });

    // El correo se envía cuando la transacción ya terminó: un fallo del correo nunca deshace la verificación.
    const notification = notify ? await sendOrderStatusEmail(order).catch(() => ({ status: "failed", to: order.email })) : { status: "unchanged", to: order.email };
    return { order, notification };
}

// Marcar como reclamado: solo un pedido COMPLETO (todas las unidades verificadas y reservadas) se puede entregar.
export function deliverOrder(orderId, userId) {
    return withTransaction(async (connection) => {
        await lockOrder(connection, orderId, ["COMPLETO"], "entregar");
        const details = await loadLines(connection, orderId);
        await lockInventory(connection, orderId);

        const toDeliver = details.filter((detail) => detail.CANTIDAD_DISPONIBLE > 0);
        if (toDeliver.length === 0) {
            throw new AppError("El pedido no tiene unidades confirmadas para entregar. Verifícalo primero.", 409);
        }
        for (const detail of toDeliver) {
            const quantity = detail.CANTIDAD_DISPONIBLE;
            const updated = await connection.execute(
                `UPDATE INVENTARIO
                    SET CANTIDAD_ACTUAL = CANTIDAD_ACTUAL - :quantity,
                        CANTIDAD_RESERVADA = CANTIDAD_RESERVADA - :reservedQuantity,
                        FECHA_ACTUALIZACION = SYSDATE
                  WHERE ID_REFERENCIA_FK = :referenceId
                    AND CANTIDAD_RESERVADA >= :reservedCheck
                    AND CANTIDAD_ACTUAL >= :actualCheck`,
                { quantity, reservedQuantity: quantity, reservedCheck: quantity, actualCheck: quantity, referenceId: detail.ID_REFERENCIA_FK }
            );
            if (updated.rowsAffected !== 1) {
                throw new AppError("El inventario no coincide con lo reservado para este pedido. Revisa el stock antes de entregar.", 409);
            }
            await connection.execute(
                `INSERT INTO MOVIMIENTO_INVENTARIO (ID_REFERENCIA_FK, TIPO, CANTIDAD, ID_USUARIO_FK, ID_DETALLE_PEDIDO_FK, OBSERVACION)
                 VALUES (:referenceId, 'SALIDA_PEDIDO', :movementQuantity, :userId, :detailId, :observation)`,
                {
                    referenceId: detail.ID_REFERENCIA_FK,
                    movementQuantity: -quantity,
                    userId,
                    detailId: detail.ID_DETALLE_PEDIDO_PK,
                    observation: `Entrega del pedido ${orderCode(orderId)}`
                }
            );
        }
        await connection.execute(
            "UPDATE PEDIDO SET ESTADO = 'RECLAMADO', FECHA_ENTREGA = SYSDATE WHERE ID_PEDIDO_PK = :orderId",
            { orderId }
        );
        await logProcess(connection, orderId, userId, "RECLAMADO", "Pedido reclamado en tienda.");
        return fetchOrderDetail(connection, orderId);
    });
}

// Libera lo reservado y deja el pedido CANCELADO (se usa tanto para el empleado como para el cliente).
async function releaseAndCancel(connection, orderId, userId, observation) {
    const details = await loadLines(connection, orderId);
    await lockInventory(connection, orderId);

    for (const detail of details) {
        if (detail.CANTIDAD_DISPONIBLE <= 0) continue;
        const released = await connection.execute(
            `UPDATE INVENTARIO
                SET CANTIDAD_RESERVADA = CANTIDAD_RESERVADA - :quantity,
                    FECHA_ACTUALIZACION = SYSDATE
              WHERE ID_REFERENCIA_FK = :referenceId
                AND CANTIDAD_RESERVADA >= :quantityCheck`,
            { quantity: detail.CANTIDAD_DISPONIBLE, quantityCheck: detail.CANTIDAD_DISPONIBLE, referenceId: detail.ID_REFERENCIA_FK }
        );
        if (released.rowsAffected !== 1) {
            throw new AppError("El inventario no coincide con lo reservado para este pedido. Revisa el stock antes de cancelar.", 409);
        }
        await connection.execute(
            "UPDATE DETALLE_PEDIDO SET CANTIDAD_DISPONIBLE = 0 WHERE ID_DETALLE_PEDIDO_PK = :detailId",
            { detailId: detail.ID_DETALLE_PEDIDO_PK }
        );
    }
    await connection.execute("UPDATE PEDIDO SET ESTADO = 'CANCELADO' WHERE ID_PEDIDO_PK = :orderId", { orderId });
    await logProcess(connection, orderId, userId, "CANCELADO", observation);
}

// Cancelación por el cliente dueño del pedido, solo dentro del plazo (por defecto 15 minutos desde que lo hizo).
export function cancelOrderAsCustomer(orderId, userId) {
    return withTransaction(async (connection) => {
        const locked = await lockOrder(connection, orderId, ["PENDIENTE", "INCOMPLETO", "COMPLETO"], "cancelar");
        if (locked.ownerId !== userId) throw new AppError("El pedido no existe.", 404);
        if (locked.elapsedSeconds >= cancelWindowMinutes() * 60) {
            throw new AppError(`Ya pasaron los ${cancelWindowMinutes()} minutos para cancelar: el pedido está en verificación en tienda.`, 409);
        }
        await releaseAndCancel(connection, orderId, userId, "Cancelado por el cliente.");
        return { id: orderId, code: orderCode(orderId), status: "CANCELADO" };
    });
}

// Cancelación por el ADMINISTRADOR de un pedido COMPLETO que lleva más de `limitDays` días sin reclamar.
// Libera lo reservado (vuelve al stock disponible) y deja el aviso para el cliente en su historial.
export function cancelUnclaimedOrder(orderId, adminId, limitDays) {
    return withTransaction(async (connection) => {
        await lockOrder(connection, orderId, ["COMPLETO"], "cancelar por falta de reclamo");
        const ready = await connection.execute(
            `SELECT SYSDATE - MAX(FECHA) AS DIAS
               FROM PROCESO_PEDIDO
              WHERE ID_PEDIDO_FK = :orderId AND ESTADO = 'COMPLETO'`,
            { orderId },
            OBJECT
        );
        const days = Number(ready.rows[0]?.DIAS);
        if (!Number.isFinite(days) || days <= limitDays) {
            throw new AppError(`El pedido aún no supera los ${limitDays} días sin reclamar.`, 409);
        }
        await releaseAndCancel(
            connection,
            orderId,
            adminId,
            `No fue reclamado en ${limitDays} días; los productos separados volvieron al stock.`
        );
        return { id: orderId, code: orderCode(orderId), status: "CANCELADO" };
    });
}

// Cierre por el ADMINISTRADOR de un pedido INCOMPLETO que no se va a completar: libera lo separado
// y el motivo queda en el historial y en el aviso al cliente.
export function cancelIncompleteOrder(orderId, adminId, reason) {
    return withTransaction(async (connection) => {
        await lockOrder(connection, orderId, ["INCOMPLETO"], "cerrar");
        await releaseAndCancel(connection, orderId, adminId, reason);
        return { id: orderId, code: orderCode(orderId), status: "CANCELADO" };
    });
}
