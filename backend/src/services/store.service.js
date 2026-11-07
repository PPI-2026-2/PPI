import { AppError } from "../utils/app-error.js";
import { OBJECT, withConnection } from "../utils/db.js";
import { productImageUrl } from "../utils/product-image.js";
import { pendingUnitsSql } from "./orders.service.js";

// Tienda pública: solo lectura. Lo que se puede pedir = CANTIDAD_ACTUAL - CANTIDAD_RESERVADA - unidades ya pedidas sin separar.
const MAX_PER_ORDER = 10;

function toStoreProduct(row) {
    return {
        id: row.ID_PRODUCTO_PK,
        name: row.NOMBRE_PRODUCTO,
        description: row.DESCRIPCION_PRODUCTO || "",
        price: row.PRECIO,
        imageUrl: productImageUrl(row.NOMBRE_PRODUCTO)
    };
}

// Compara tallas como número cuando se puede ("9" antes que "10"); si no, como texto.
function compareSizes(a, b) {
    const numberA = Number(a.sizeName);
    const numberB = Number(b.sizeName);
    if (Number.isFinite(numberA) && Number.isFinite(numberB)) return numberA - numberB;
    return String(a.sizeName).localeCompare(String(b.sizeName), "es", { numeric: true });
}

function toStoreSize(row) {
    const available = Math.max(0, (row.CANTIDAD_ACTUAL ?? 0) - (row.CANTIDAD_RESERVADA ?? 0) - row.PENDIENTES);
    return {
        referenceId: row.ID_REFERENCIA_PK,
        sizeName: row.NOMBRE_TALLA,
        isAvailable: available > 0,
        // Máximo que se puede pedir de esta talla (no se publica el stock real).
        maxQuantity: Math.min(MAX_PER_ORDER, available)
    };
}

// Solo productos activos con al menos una talla activa que tenga unidades disponibles.
export function listStoreProducts() {
    return withConnection(async (connection) => {
        const result = await connection.execute(
            `SELECT P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, P.DESCRIPCION_PRODUCTO, P.PRECIO
               FROM PRODUCTOS P
              WHERE P.ESTADO = 'ACTIVO'
                AND EXISTS (SELECT 1
                              FROM REFERENCIA_PRODUCTO R
                              JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = R.ID_REFERENCIA_PK
                             WHERE R.ID_PRODUCTO_FK = P.ID_PRODUCTO_PK
                               AND R.ESTADO = 'ACTIVO'
                               AND I.CANTIDAD_ACTUAL - I.CANTIDAD_RESERVADA - ${pendingUnitsSql("I.ID_REFERENCIA_FK")} > 0)
              ORDER BY P.NOMBRE_PRODUCTO`,
            {},
            OBJECT
        );
        return result.rows.map(toStoreProduct);
    });
}

// Detalle: todas las tallas activas del producto, marcando cuáles tienen disponibilidad.
export function getStoreProduct(id) {
    return withConnection(async (connection) => {
        const productResult = await connection.execute(
            `SELECT P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, P.DESCRIPCION_PRODUCTO, P.PRECIO
               FROM PRODUCTOS P
              WHERE P.ID_PRODUCTO_PK = :id AND P.ESTADO = 'ACTIVO'`,
            { id },
            OBJECT
        );
        const row = productResult.rows[0];
        if (!row) throw new AppError("El producto no existe o no está disponible.", 404);

        const sizeResult = await connection.execute(
            `SELECT R.ID_REFERENCIA_PK, T.NOMBRE_TALLA, I.CANTIDAD_ACTUAL, I.CANTIDAD_RESERVADA,
                    ${pendingUnitsSql("R.ID_REFERENCIA_PK")} AS PENDIENTES
               FROM REFERENCIA_PRODUCTO R
               JOIN TALLA T ON T.ID_TALLA_PK = R.ID_TALLA_FK
               LEFT JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = R.ID_REFERENCIA_PK
              WHERE R.ID_PRODUCTO_FK = :id AND R.ESTADO = 'ACTIVO'`,
            { id },
            OBJECT
        );
        const sizes = sizeResult.rows.map(toStoreSize).sort(compareSizes);
        return { ...toStoreProduct(row), isAvailable: sizes.some((size) => size.isAvailable), sizes };
    });
}
