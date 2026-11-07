import { AppError } from "../utils/app-error.js";
import { buildSetClause, numberOut, OBJECT, withConnection, withTransaction } from "../utils/db.js";

const SUPPLIER_COLUMNS = {
    name: "NOMBRE_PROVEEDOR",
    lastName: "APELLIDO_PROVEEDOR",
    phone: "TELEFONO_PROVEEDOR",
    deliveryDays: "DIAS_ENTREGA",
    status: "ESTADO"
};

const SUPPLIER_SELECT = `SELECT ID_PROVEEDOR_PK, NOMBRE_PROVEEDOR, APELLIDO_PROVEEDOR, TELEFONO_PROVEEDOR,
                                DIAS_ENTREGA, ESTADO
                           FROM PROVEEDOR`;

function toSupplier(row) {
    return {
        id: row.ID_PROVEEDOR_PK,
        name: row.NOMBRE_PROVEEDOR,
        lastName: row.APELLIDO_PROVEEDOR,
        phone: row.TELEFONO_PROVEEDOR,
        deliveryDays: row.DIAS_ENTREGA,
        status: row.ESTADO
    };
}

async function fetchSupplier(connection, id) {
    const result = await connection.execute(`${SUPPLIER_SELECT} WHERE ID_PROVEEDOR_PK = :id`, { id }, OBJECT);
    if (!result.rows[0]) throw new AppError("El proveedor no existe.", 404);
    return toSupplier(result.rows[0]);
}

export function listSuppliers({ status } = {}) {
    return withConnection(async (connection) => {
        const binds = {};
        let where = "";
        if (status) {
            where = "WHERE ESTADO = :status";
            binds.status = status;
        }
        const result = await connection.execute(
            `${SUPPLIER_SELECT} ${where} ORDER BY NOMBRE_PROVEEDOR`,
            binds,
            OBJECT
        );
        return result.rows.map(toSupplier);
    });
}

export function createSupplier({ name, lastName, phone, deliveryDays }) {
    return withTransaction(async (connection) => {
        const result = await connection.execute(
            `INSERT INTO PROVEEDOR (NOMBRE_PROVEEDOR, APELLIDO_PROVEEDOR, TELEFONO_PROVEEDOR, DIAS_ENTREGA)
             VALUES (:name, :lastName, :phone, :deliveryDays)
             RETURNING ID_PROVEEDOR_PK INTO :id`,
            { name, lastName, phone, deliveryDays, id: numberOut() }
        );
        return fetchSupplier(connection, result.outBinds.id[0]);
    });
}

// Solo se elimina un proveedor sin productos ni recepciones (PRODUCTOS y RECEPCION lo referencian);
// si ya se usó, se desactiva para conservar el historial.
export function deleteSupplier(id) {
    return withTransaction(async (connection) => {
        const found = await connection.execute(
            `SELECT NOMBRE_PROVEEDOR,
                    (SELECT COUNT(*) FROM PRODUCTOS WHERE ID_PROVEEDOR_FK = :id) AS PRODUCTOS,
                    (SELECT COUNT(*) FROM RECEPCION WHERE ID_PROVEEDOR_FK = :id) AS RECEPCIONES
               FROM PROVEEDOR
              WHERE ID_PROVEEDOR_PK = :id
                FOR UPDATE`,
            { id },
            OBJECT
        );
        const row = found.rows[0];
        if (!row) throw new AppError("El proveedor no existe.", 404);
        if (row.PRODUCTOS > 0 || row.RECEPCIONES > 0) {
            throw new AppError(
                `No se puede eliminar a ${row.NOMBRE_PROVEEDOR}: tiene ${row.PRODUCTOS} producto(s) y ${row.RECEPCIONES} recepción(es) registradas. Desactívalo para que no se use más.`,
                409
            );
        }
        await connection.execute("DELETE FROM PROVEEDOR WHERE ID_PROVEEDOR_PK = :id", { id });
        return { id, name: row.NOMBRE_PROVEEDOR };
    });
}

export function updateSupplier(id, changes) {
    return withTransaction(async (connection) => {
        const { clause, binds } = buildSetClause(changes, SUPPLIER_COLUMNS);
        const result = await connection.execute(
            `UPDATE PROVEEDOR SET ${clause} WHERE ID_PROVEEDOR_PK = :id`,
            { ...binds, id }
        );
        if (result.rowsAffected === 0) throw new AppError("El proveedor no existe.", 404);
        return fetchSupplier(connection, id);
    });
}
