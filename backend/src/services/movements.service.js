import { OBJECT, withConnection } from "../utils/db.js";
import { productImageUrl } from "../utils/product-image.js";

function toMovement(row) {
    return {
        id: row.ID_MOVIMIENTO_PK,
        type: row.TIPO,
        quantity: row.CANTIDAD,
        date: row.FECHA,
        referenceId: row.ID_REFERENCIA_FK,
        productId: row.ID_PRODUCTO_PK,
        productName: row.NOMBRE_PRODUCTO,
        imageUrl: productImageUrl(row.NOMBRE_PRODUCTO),
        sizeName: row.NOMBRE_TALLA,
        userName: `${row.NOMBRE_US} ${row.APELLIDO_US}`.trim(),
        receptionId: row.ID_RECEPCION_FK,
        orderDetailId: row.ID_DETALLE_PEDIDO_FK,
        observation: row.OBSERVACION
    };
}

export function listMovements({ type, productId, referenceId, limit }) {
    return withConnection(async (connection) => {
        const conditions = [];
        const binds = { maxRows: limit };
        if (type) {
            conditions.push("M.TIPO = :movementType");
            binds.movementType = type;
        }
        if (productId) {
            conditions.push("P.ID_PRODUCTO_PK = :productId");
            binds.productId = productId;
        }
        if (referenceId) {
            conditions.push("M.ID_REFERENCIA_FK = :referenceId");
            binds.referenceId = referenceId;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = await connection.execute(
            `SELECT M.ID_MOVIMIENTO_PK, M.TIPO, M.CANTIDAD, M.FECHA, M.ID_REFERENCIA_FK,
                    M.ID_RECEPCION_FK, M.ID_DETALLE_PEDIDO_FK, M.OBSERVACION,
                    P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA, U.NOMBRE_US, U.APELLIDO_US
               FROM MOVIMIENTO_INVENTARIO M
               JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = M.ID_REFERENCIA_FK
               JOIN PRODUCTOS P            ON P.ID_PRODUCTO_PK    = RF.ID_PRODUCTO_FK
               JOIN TALLA T                ON T.ID_TALLA_PK       = RF.ID_TALLA_FK
               JOIN USUARIO U              ON U.ID_USUARIO_PK     = M.ID_USUARIO_FK
               ${where}
              ORDER BY M.FECHA DESC, M.ID_MOVIMIENTO_PK DESC
              FETCH FIRST :maxRows ROWS ONLY`,
            binds,
            OBJECT
        );
        return result.rows.map(toMovement);
    });
}
