import { AppError } from "../utils/app-error.js";
import { numberOut, OBJECT, withConnection, withTransaction } from "../utils/db.js";
import { productImageUrl } from "../utils/product-image.js";

const RECEPTION_SELECT = `
SELECT R.ID_RECEPCION_PK, R.ID_REFERENCIA_FK, R.FECHA_INGRESO, R.CANTIDAD_ESPERADA, R.CANTIDAD_RECIBIDA,
       R.CANTIDAD_ACEPTADA, R.CANTIDAD_RECHAZADA, R.MOTIVO_RECHAZO, R.ESTADO, R.OBSERVACION,
       P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA,
       V.ID_PROVEEDOR_PK, V.NOMBRE_PROVEEDOR,
       U.NOMBRE_US, U.APELLIDO_US
  FROM RECEPCION R
  JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = R.ID_REFERENCIA_FK
  JOIN PRODUCTOS P            ON P.ID_PRODUCTO_PK    = RF.ID_PRODUCTO_FK
  JOIN TALLA T                ON T.ID_TALLA_PK       = RF.ID_TALLA_FK
  JOIN PROVEEDOR V            ON V.ID_PROVEEDOR_PK   = R.ID_PROVEEDOR_FK
  JOIN USUARIO U              ON U.ID_USUARIO_PK     = R.ID_USUARIO_FK`;

function toReception(row) {
    return {
        id: row.ID_RECEPCION_PK,
        referenceId: row.ID_REFERENCIA_FK,
        productId: row.ID_PRODUCTO_PK,
        productName: row.NOMBRE_PRODUCTO,
        imageUrl: productImageUrl(row.NOMBRE_PRODUCTO),
        sizeName: row.NOMBRE_TALLA,
        supplierId: row.ID_PROVEEDOR_PK,
        supplierName: row.NOMBRE_PROVEEDOR,
        receivedBy: `${row.NOMBRE_US} ${row.APELLIDO_US}`.trim(),
        date: row.FECHA_INGRESO,
        expected: row.CANTIDAD_ESPERADA,
        received: row.CANTIDAD_RECIBIDA,
        accepted: row.CANTIDAD_ACEPTADA,
        rejected: row.CANTIDAD_RECHAZADA,
        rejectionReason: row.MOTIVO_RECHAZO,
        status: row.ESTADO,
        observation: row.OBSERVACION
    };
}

async function fetchReception(connection, id) {
    const result = await connection.execute(`${RECEPTION_SELECT} WHERE R.ID_RECEPCION_PK = :id`, { id }, OBJECT);
    if (!result.rows[0]) throw new AppError("La recepción no existe.", 404);
    return toReception(result.rows[0]);
}

// Sin `page`: lista corta (las 200 más recientes). Con `page`: paginación real (pageSize por página) con el total.
export function listReceptions({ status, productId, page, pageSize = 100 } = {}) {
    return withConnection(async (connection) => {
        const conditions = [];
        const binds = {};
        if (status) {
            conditions.push("R.ESTADO = :status");
            binds.status = status;
        }
        if (productId) {
            conditions.push("P.ID_PRODUCTO_PK = :productId");
            binds.productId = productId;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const order = "ORDER BY R.FECHA_INGRESO DESC, R.ID_RECEPCION_PK DESC";

        if (!page) {
            const result = await connection.execute(`${RECEPTION_SELECT} ${where} ${order} FETCH FIRST 200 ROWS ONLY`, binds, OBJECT);
            return { receptions: result.rows.map(toReception), pagination: null };
        }

        const countResult = await connection.execute(
            `SELECT COUNT(*) AS TOTAL
               FROM RECEPCION R
               JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = R.ID_REFERENCIA_FK
               JOIN PRODUCTOS P            ON P.ID_PRODUCTO_PK    = RF.ID_PRODUCTO_FK
              ${where}`,
            binds,
            OBJECT
        );
        const total = countResult.rows[0]?.TOTAL ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const current = Math.min(page, totalPages);
        const result = await connection.execute(
            `${RECEPTION_SELECT} ${where} ${order} OFFSET :offsetRows ROWS FETCH NEXT :maxRows ROWS ONLY`,
            { ...binds, offsetRows: (current - 1) * pageSize, maxRows: pageSize },
            OBJECT
        );
        return { receptions: result.rows.map(toReception), pagination: { page: current, pageSize, total, totalPages } };
    });
}

export function getReception(id) {
    return withConnection((connection) => fetchReception(connection, id));
}

// Registra la recepción. El stock NO cambia hasta que se confirma.
export function createReception({ referenceId, expected, received, rejected, rejectionReason, observation }, userId) {
    return withTransaction(async (connection) => {
        const reference = await connection.execute(
            `SELECT RF.ESTADO AS REF_ESTADO, P.ESTADO AS PROD_ESTADO, P.ID_PROVEEDOR_FK
               FROM REFERENCIA_PRODUCTO RF
               JOIN PRODUCTOS P ON P.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
              WHERE RF.ID_REFERENCIA_PK = :referenceId`,
            { referenceId },
            OBJECT
        );
        const row = reference.rows[0];
        if (!row) throw new AppError("La referencia (producto y talla) no existe.", 404);
        if (row.PROD_ESTADO !== "ACTIVO") throw new AppError("El producto está inactivo.", 409);
        if (row.REF_ESTADO !== "ACTIVO") throw new AppError("La talla está inactiva para este producto.", 409);

        const result = await connection.execute(
            `INSERT INTO RECEPCION (ID_PROVEEDOR_FK, ID_REFERENCIA_FK, ID_USUARIO_FK, CANTIDAD_ESPERADA,
                                    CANTIDAD_RECIBIDA, CANTIDAD_ACEPTADA, CANTIDAD_RECHAZADA, MOTIVO_RECHAZO, OBSERVACION)
             VALUES (:supplierId, :referenceId, :userId, :expected, :received, :accepted, :rejected, :reason, :observation)
             RETURNING ID_RECEPCION_PK INTO :id`,
            {
                supplierId: row.ID_PROVEEDOR_FK,
                referenceId,
                userId,
                expected,
                received,
                accepted: received - rejected,
                rejected,
                reason: rejectionReason,
                observation,
                id: numberOut()
            }
        );
        return fetchReception(connection, result.outBinds.id[0]);
    });
}

// Suma lo aceptado al inventario de la referencia y deja el movimiento ENTRADA_RECEPCION.
async function addAcceptedToInventory(connection, { referenceId, accepted, userId, receptionId }) {
    if (accepted <= 0) return;
    const updated = await connection.execute(
        `UPDATE INVENTARIO
            SET CANTIDAD_ACTUAL = CANTIDAD_ACTUAL + :accepted,
                FECHA_ACTUALIZACION = SYSDATE
          WHERE ID_REFERENCIA_FK = :referenceId`,
        { accepted, referenceId }
    );
    if (updated.rowsAffected !== 1) {
        throw new AppError("La referencia no tiene fila de inventario.", 409);
    }
    await connection.execute(
        `INSERT INTO MOVIMIENTO_INVENTARIO (ID_REFERENCIA_FK, TIPO, CANTIDAD, ID_USUARIO_FK, ID_RECEPCION_FK, OBSERVACION)
         VALUES (:referenceId, 'ENTRADA_RECEPCION', :quantity, :userId, :receptionId, :note)`,
        { referenceId, quantity: accepted, userId, receptionId, note: `Recepción #${receptionId}` }
    );
}

// Entrega de un producto en varias tallas, guardada con un solo clic: una fila de RECEPCION por talla,
// ya CONFIRMADA, con lo aceptado sumado al inventario. Si una talla falla, no se guarda ninguna.
// La cantidad esperada se iguala a la recibida (el proveedor entrega en físico lo que trae).
export function receiveDelivery({ productId, lines, rejectionReason, observation }, userId) {
    return withTransaction(async (connection) => {
        const product = await connection.execute(
            "SELECT ESTADO, ID_PROVEEDOR_FK FROM PRODUCTOS WHERE ID_PRODUCTO_PK = :productId",
            { productId },
            OBJECT
        );
        const productRow = product.rows[0];
        if (!productRow) throw new AppError("El producto no existe.", 404);
        if (productRow.ESTADO !== "ACTIVO") throw new AppError("El producto está inactivo.", 409);

        const ids = [];
        for (const line of lines) {
            const reference = await connection.execute(
                `SELECT RF.ESTADO, T.NOMBRE_TALLA
                   FROM REFERENCIA_PRODUCTO RF
                   JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
                  WHERE RF.ID_REFERENCIA_PK = :referenceId
                    AND RF.ID_PRODUCTO_FK = :productId`,
                { referenceId: line.referenceId, productId },
                OBJECT
            );
            const referenceRow = reference.rows[0];
            if (!referenceRow) throw new AppError("Una de las tallas no pertenece a este producto.", 404);
            if (referenceRow.ESTADO !== "ACTIVO") {
                throw new AppError(`La talla ${referenceRow.NOMBRE_TALLA} está inactiva para este producto.`, 409);
            }

            const accepted = line.received - line.rejected;
            const inserted = await connection.execute(
                `INSERT INTO RECEPCION (ID_PROVEEDOR_FK, ID_REFERENCIA_FK, ID_USUARIO_FK, CANTIDAD_ESPERADA,
                                        CANTIDAD_RECIBIDA, CANTIDAD_ACEPTADA, CANTIDAD_RECHAZADA, MOTIVO_RECHAZO,
                                        ESTADO, OBSERVACION)
                 VALUES (:supplierId, :referenceId, :userId, :received, :received, :accepted, :rejected, :reason,
                         'CONFIRMADA', :observation)
                 RETURNING ID_RECEPCION_PK INTO :id`,
                {
                    supplierId: productRow.ID_PROVEEDOR_FK,
                    referenceId: line.referenceId,
                    userId,
                    received: line.received,
                    accepted,
                    rejected: line.rejected,
                    reason: line.rejected > 0 ? rejectionReason : null,
                    observation,
                    id: numberOut()
                }
            );
            const receptionId = inserted.outBinds.id[0];
            await addAcceptedToInventory(connection, { referenceId: line.referenceId, accepted, userId, receptionId });
            ids.push(receptionId);
        }

        const receptions = [];
        for (const id of ids) receptions.push(await fetchReception(connection, id));
        return receptions;
    });
}

// Confirmar = sumar lo aceptado al inventario + dejar el movimiento. Todo en una sola transacción.
export function confirmReception(id, userId) {
    return withTransaction(async (connection) => {
        const found = await connection.execute(
            `SELECT ID_REFERENCIA_FK, CANTIDAD_ACEPTADA, ESTADO
               FROM RECEPCION
              WHERE ID_RECEPCION_PK = :id
                FOR UPDATE`,
            { id },
            OBJECT
        );
        const reception = found.rows[0];
        if (!reception) throw new AppError("La recepción no existe.", 404);
        if (reception.ESTADO !== "REGISTRADA") {
            throw new AppError(`La recepción ya está ${reception.ESTADO.toLowerCase()}; no se puede confirmar.`, 409);
        }

        await addAcceptedToInventory(connection, {
            referenceId: reception.ID_REFERENCIA_FK,
            accepted: reception.CANTIDAD_ACEPTADA,
            userId,
            receptionId: id
        });

        await connection.execute(
            "UPDATE RECEPCION SET ESTADO = 'CONFIRMADA' WHERE ID_RECEPCION_PK = :id",
            { id }
        );
        return fetchReception(connection, id);
    });
}

// Solo se anulan las REGISTRADAS (no han tocado el inventario). Una confirmada se corrige con un ajuste.
export function cancelReception(id, note) {
    return withTransaction(async (connection) => {
        const found = await connection.execute(
            "SELECT ESTADO, OBSERVACION FROM RECEPCION WHERE ID_RECEPCION_PK = :id FOR UPDATE",
            { id },
            OBJECT
        );
        const reception = found.rows[0];
        if (!reception) throw new AppError("La recepción no existe.", 404);
        if (reception.ESTADO !== "REGISTRADA") {
            throw new AppError(
                reception.ESTADO === "CONFIRMADA"
                    ? "Una recepción confirmada no se anula; corrige el stock con un ajuste de inventario."
                    : "La recepción ya está anulada.",
                409
            );
        }
        const observation = [reception.OBSERVACION, note ? `Anulada: ${note}` : "Anulada"]
            .filter(Boolean)
            .join(" | ")
            .slice(0, 500);
        await connection.execute(
            "UPDATE RECEPCION SET ESTADO = 'ANULADA', OBSERVACION = :observation WHERE ID_RECEPCION_PK = :id",
            { observation, id }
        );
        return fetchReception(connection, id);
    });
}
