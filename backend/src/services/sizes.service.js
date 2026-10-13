import { AppError } from "../utils/app-error.js";
import { numberOut, OBJECT, withConnection, withTransaction } from "../utils/db.js";

function toSize(row) {
    return { id: row.ID_TALLA_PK, name: row.NOMBRE_TALLA, products: row.USOS ?? 0 };
}

export function listSizes() {
    return withConnection(async (connection) => {
        const result = await connection.execute(
            `SELECT T.ID_TALLA_PK, T.NOMBRE_TALLA,
                    (SELECT COUNT(*) FROM REFERENCIA_PRODUCTO R WHERE R.ID_TALLA_FK = T.ID_TALLA_PK) AS USOS
               FROM TALLA T
              ORDER BY T.ID_TALLA_PK`,
            [],
            OBJECT
        );
        return result.rows.map(toSize);
    });
}

export function createSize(name) {
    return withTransaction(async (connection) => {
        const duplicate = await connection.execute(
            "SELECT 1 FROM TALLA WHERE UPPER(NOMBRE_TALLA) = UPPER(:name) FETCH FIRST 1 ROWS ONLY",
            { name }
        );
        if (duplicate.rows.length) throw new AppError("Esa talla ya existe.", 409);

        const result = await connection.execute(
            "INSERT INTO TALLA (NOMBRE_TALLA) VALUES (:name) RETURNING ID_TALLA_PK INTO :id",
            { name, id: numberOut() }
        );
        return { id: result.outBinds.id[0], name, products: 0 };
    });
}
