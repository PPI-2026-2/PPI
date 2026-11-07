import { AppError } from "../utils/app-error.js";
import { escapeLike, OBJECT, withConnection, withTransaction } from "../utils/db.js";
import { productImageUrl } from "../utils/product-image.js";

const INVENTORY_SELECT = `
SELECT RF.ID_REFERENCIA_PK, RF.ESTADO AS REF_ESTADO,
       P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, P.ESTADO AS PROD_ESTADO, P.ID_PROVEEDOR_FK,
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
        supplierId: row.ID_PROVEEDOR_FK,
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

// Condiciones del nivel de stock en SQL (misma regla que stockLevel): así el filtro y la paginación se hacen en la base.
const LEVEL_SQL = {
    AGOTADO: "(I.CANTIDAD_ACTUAL - I.CANTIDAD_RESERVADA) <= 0",
    BAJO: "(I.CANTIDAD_ACTUAL - I.CANTIDAD_RESERVADA) > 0 AND I.STOCK_MINIMO > 0 AND (I.CANTIDAD_ACTUAL - I.CANTIDAD_RESERVADA) <= I.STOCK_MINIMO",
    OK: "(I.CANTIDAD_ACTUAL - I.CANTIDAD_RESERVADA) > 0 AND NOT (I.STOCK_MINIMO > 0 AND (I.CANTIDAD_ACTUAL - I.CANTIDAD_RESERVADA) <= I.STOCK_MINIMO)"
};

// Sin `page` devuelve todo el inventario (lo usa la pantalla de recepciones para elegir referencias).
// Con `page` pagina en la base (pageSize por página) y devuelve el total para armar los números de página.
export function listInventory({ search, productId, level, page, pageSize } = {}) {
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
        const baseWhere = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const rowConditions = level ? [...conditions, `(${LEVEL_SQL[level]})`] : conditions;
        const rowWhere = rowConditions.length ? `WHERE ${rowConditions.join(" AND ")}` : "";
        const fromClause = `FROM INVENTARIO I
          JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = I.ID_REFERENCIA_FK
          JOIN PRODUCTOS P            ON P.ID_PRODUCTO_PK    = RF.ID_PRODUCTO_FK
          JOIN TALLA T                ON T.ID_TALLA_PK       = RF.ID_TALLA_FK`;

        // Resumen sobre todo el inventario que cumple búsqueda/producto (no solo la página visible).
        const summaryResult = await connection.execute(
            `SELECT COUNT(*) AS REFS, NVL(SUM(I.CANTIDAD_ACTUAL), 0) AS UNITS, NVL(SUM(I.CANTIDAD_RESERVADA), 0) AS RESERVED,
                    NVL(SUM(CASE WHEN ${LEVEL_SQL.AGOTADO} THEN 1 ELSE 0 END), 0) AS SOLD_OUT,
                    NVL(SUM(CASE WHEN ${LEVEL_SQL.BAJO} THEN 1 ELSE 0 END), 0) AS LOW
               ${fromClause} ${baseWhere}`,
            binds,
            OBJECT
        );
        const sum = summaryResult.rows[0];
        const summary = { references: sum.REFS, units: sum.UNITS, reserved: sum.RESERVED, soldOut: sum.SOLD_OUT, low: sum.LOW };

        const order = "ORDER BY P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA, RF.ID_REFERENCIA_PK";
        if (!page) {
            const result = await connection.execute(`${INVENTORY_SELECT} ${rowWhere} ${order}`, binds, OBJECT);
            return { items: result.rows.map(toInventoryRow), summary };
        }

        const countResult = await connection.execute(`SELECT COUNT(*) AS TOTAL ${fromClause} ${rowWhere}`, binds, OBJECT);
        const total = countResult.rows[0].TOTAL;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const current = Math.min(page, totalPages);
        const result = await connection.execute(
            `${INVENTORY_SELECT} ${rowWhere} ${order} OFFSET :offsetRows ROWS FETCH NEXT :maxRows ROWS ONLY`,
            { ...binds, offsetRows: (current - 1) * pageSize, maxRows: pageSize },
            OBJECT
        );
        return { items: result.rows.map(toInventoryRow), summary, pagination: { page: current, pageSize, total, totalPages } };
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
