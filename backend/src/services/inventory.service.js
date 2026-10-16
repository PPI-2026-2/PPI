import { AppError } from "../utils/app-error.js";
import { escapeLike, OBJECT, withConnection, withTransaction } from "../utils/db.js";
import { productImageUrl } from "../utils/product-image.js";

const INVENTORY_SELECT = `
SELECT RF.ID_REFERENCIA_PK, RF.ESTADO AS REF_ESTADO,
       P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, P.ESTADO AS PROD_ESTADO,
       T.NOMBRE_TALLA,
       I.CANTIDAD_ACTUAL, I.CANTIDAD_RESERVADA, I.STOCK_MINIMO, I.FECHA_ACTUALIZACION
  FROM INVENTARIO I
  JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = I.ID_REFERENCIA_FK
  JOIN PRODUCTOS P            ON P.ID_PRODUCTO_PK    = RF.ID_PRODUCTO_FK
  JOIN TALLA T                ON T.ID_TALLA_PK       = RF.ID_TALLA_FK`;

// Regla de negocio (vive aquí, no en la base de datos):
//   AGOTADO = nada disponible; BAJO = disponible <= stock mínimo (si hay mínimo definido); OK = el resto.
function stockLevel(available, minimum) {
    if (available <= 0) return "AGOTADO";
    if (minimum > 0 && available <= minimum) return "BAJO";
    return "OK";
}

function toInventoryRow(row) {
    const available = row.CANTIDAD_ACTUAL - row.CANTIDAD_RESERVADA;
    return {
        referenceId: row.ID_REFERENCIA_PK,
        productId: row.ID_PRODUCTO_PK,
        productName: row.NOMBRE_PRODUCTO,
        imageUrl: productImageUrl(row.NOMBRE_PRODUCTO),
        productStatus: row.PROD_ESTADO,
        sizeName: row.NOMBRE_TALLA,
        referenceStatus: row.REF_ESTADO,
        onHand: row.CANTIDAD_ACTUAL,
        reserved: row.CANTIDAD_RESERVADA,
        available,
        minimum: row.STOCK_MINIMO,
        level: stockLevel(available, row.STOCK_MINIMO),
        updatedAt: row.FECHA_ACTUALIZACION
    };
}

async function fetchInventoryRow(connection, referenceId) {
    const result = await connection.execute(
        `${INVENTORY_SELECT} WHERE RF.ID_REFERENCIA_PK = :referenceId`,
        { referenceId },
        OBJECT
    );
    if (!result.rows[0]) throw new AppError("La referencia no tiene inventario.", 404);
    return toInventoryRow(result.rows[0]);
}

export function listInventory({ search, productId, level } = {}) {
    return withConnection(async (connection) => {
        const conditions = [];
        const binds = {};
        if (search) {
            conditions.push("UPPER(P.NOMBRE_PRODUCTO) LIKE UPPER(:search) ESCAPE '\\'");
            binds.search = `%${escapeLike(search)}%`;
        }
        if (productId) {
            conditions.push("P.ID_PRODUCTO_PK = :productId");
            binds.productId = productId;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = await connection.execute(
            `${INVENTORY_SELECT} ${where} ORDER BY P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA`,
            binds,
            OBJECT
        );
        const all = result.rows.map(toInventoryRow);
        const items = level ? all.filter((item) => item.level === level) : all;
        const summary = {
            references: all.length,
            units: all.reduce((sum, item) => sum + item.onHand, 0),
            reserved: all.reduce((sum, item) => sum + item.reserved, 0),
            soldOut: all.filter((item) => item.level === "AGOTADO").length,
            low: all.filter((item) => item.level === "BAJO").length
        };
        return { items, summary };
    });
}

export function setMinimum(referenceId, minimum) {
    return withTransaction(async (connection) => {
        const updated = await connection.execute(
            `UPDATE INVENTARIO
                SET STOCK_MINIMO = :minimum, FECHA_ACTUALIZACION = SYSDATE
              WHERE ID_REFERENCIA_FK = :referenceId`,
            { minimum, referenceId }
        );
        if (updated.rowsAffected !== 1) throw new AppError("La referencia no tiene inventario.", 404);
        return fetchInventoryRow(connection, referenceId);
    });
}

// Ajuste manual (+ o -). Nunca deja el stock negativo ni por debajo de lo reservado.
export function adjustStock(referenceId, quantity, observation, userId) {
    return withTransaction(async (connection) => {
        const updated = await connection.execute(
            `UPDATE INVENTARIO
                SET CANTIDAD_ACTUAL = CANTIDAD_ACTUAL + :delta,
                    FECHA_ACTUALIZACION = SYSDATE
              WHERE ID_REFERENCIA_FK = :referenceId
                AND CANTIDAD_ACTUAL + :deltaCheck >= CANTIDAD_RESERVADA`,
            { delta: quantity, deltaCheck: quantity, referenceId }
        );
        if (updated.rowsAffected !== 1) {
            const exists = await connection.execute(
                "SELECT 1 FROM INVENTARIO WHERE ID_REFERENCIA_FK = :referenceId",
                { referenceId },
                OBJECT
            );
            if (!exists.rows[0]) throw new AppError("La referencia no tiene inventario.", 404);
            throw new AppError("El ajuste dejaría el stock negativo o por debajo de lo reservado.", 409);
        }
        await connection.execute(
            `INSERT INTO MOVIMIENTO_INVENTARIO (ID_REFERENCIA_FK, TIPO, CANTIDAD, ID_USUARIO_FK, OBSERVACION)
             VALUES (:referenceId, 'AJUSTE', :quantity, :userId, :observation)`,
            { referenceId, quantity, userId, observation }
        );
        return fetchInventoryRow(connection, referenceId);
    });
}
