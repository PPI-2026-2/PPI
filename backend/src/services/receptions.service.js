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

export function listReceptions({ status, productId } = {}) {
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
        const result = await connection.execute(
            `${RECEPTION_SELECT} ${where}
              ORDER BY R.FECHA_INGRESO DESC, R.ID_RECEPCION_PK DESC
              FETCH FIRST 200 ROWS ONLY`,
            binds,
            OBJECT
        );
        return result.rows.map(toReception);
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

        const accepted = reception.CANTIDAD_ACEPTADA;
        if (accepted > 0) {
            const updated = await connection.execute(
                `UPDATE INVENTARIO
                    SET CANTIDAD_ACTUAL = CANTIDAD_ACTUAL + :accepted,
                        FECHA_ACTUALIZACION = SYSDATE
                  WHERE ID_REFERENCIA_FK = :referenceId`,
                { accepted, referenceId: reception.ID_REFERENCIA_FK }
            );
            if (updated.rowsAffected !== 1) {
                throw new AppError("La referencia no tiene fila de inventario.", 409);
            }
            await connection.execute(
                `INSERT INTO MOVIMIENTO_INVENTARIO (ID_REFERENCIA_FK, TIPO, CANTIDAD, ID_USUARIO_FK, ID_RECEPCION_FK, OBSERVACION)
                 VALUES (:referenceId, 'ENTRADA_RECEPCION', :quantity, :userId, :receptionId, :note)`,
                {
                    referenceId: reception.ID_REFERENCIA_FK,
                    quantity: accepted,
                    userId,
                    receptionId: id,
                    note: `Recepción #${id}`
                }
            );
        }

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
