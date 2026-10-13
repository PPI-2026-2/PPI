import { AppError } from "../utils/app-error.js";
import {
    buildSetClause,
    escapeLike,
    numberOut,
    OBJECT,
    withConnection,
    withTransaction
} from "../utils/db.js";
import { productImageFile, productImageSlug, productImageUrl } from "../utils/product-image.js";

const PRODUCT_COLUMNS = {
    name: "NOMBRE_PRODUCTO",
    description: "DESCRIPCION_PRODUCTO",
    price: "PRECIO",
    supplierId: "ID_PROVEEDOR_FK",
    status: "ESTADO"
};

const PRODUCT_SELECT = `SELECT P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, P.DESCRIPCION_PRODUCTO, P.PRECIO,
                               P.ESTADO, P.ID_PROVEEDOR_FK, V.NOMBRE_PROVEEDOR,
                               (SELECT COUNT(*) FROM REFERENCIA_PRODUCTO R
                                 WHERE R.ID_PRODUCTO_FK = P.ID_PRODUCTO_PK AND R.ESTADO = 'ACTIVO') AS TALLAS_ACTIVAS
                          FROM PRODUCTOS P
                          JOIN PROVEEDOR V ON V.ID_PROVEEDOR_PK = P.ID_PROVEEDOR_FK`;

function toProduct(row) {
    return {
        id: row.ID_PRODUCTO_PK,
        name: row.NOMBRE_PRODUCTO,
        description: row.DESCRIPCION_PRODUCTO,
        price: row.PRECIO,
        imageFile: productImageFile(row.NOMBRE_PRODUCTO),
        imageUrl: productImageUrl(row.NOMBRE_PRODUCTO),
        status: row.ESTADO,
        supplierId: row.ID_PROVEEDOR_FK,
        supplierName: row.NOMBRE_PROVEEDOR,
        activeSizes: row.TALLAS_ACTIVAS
    };
}

function toSizeEntry(row) {
    const onHand = row.CANTIDAD_ACTUAL ?? 0;
    const reserved = row.CANTIDAD_RESERVADA ?? 0;
    return {
        referenceId: row.ID_REFERENCIA_PK,
        sizeId: row.ID_TALLA_FK,
        sizeName: row.NOMBRE_TALLA,
        status: row.ESTADO,
        onHand,
        reserved,
        available: onHand - reserved,
        minimum: row.STOCK_MINIMO ?? 0
    };
}

async function fetchProduct(connection, id) {
    const productResult = await connection.execute(
        `${PRODUCT_SELECT} WHERE P.ID_PRODUCTO_PK = :id`,
        { id },
        OBJECT
    );
    const row = productResult.rows[0];
    if (!row) throw new AppError("El producto no existe.", 404);

    const sizeResult = await connection.execute(
        `SELECT R.ID_REFERENCIA_PK, R.ID_TALLA_FK, T.NOMBRE_TALLA, R.ESTADO,
                I.CANTIDAD_ACTUAL, I.CANTIDAD_RESERVADA, I.STOCK_MINIMO
           FROM REFERENCIA_PRODUCTO R
           JOIN TALLA T ON T.ID_TALLA_PK = R.ID_TALLA_FK
           LEFT JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = R.ID_REFERENCIA_PK
          WHERE R.ID_PRODUCTO_FK = :id
          ORDER BY T.ID_TALLA_PK`,
        { id },
        OBJECT
    );
    return { ...toProduct(row), sizes: sizeResult.rows.map(toSizeEntry) };
}

async function assertActiveSupplier(connection, supplierId) {
    const result = await connection.execute(
        "SELECT ESTADO FROM PROVEEDOR WHERE ID_PROVEEDOR_PK = :supplierId",
        { supplierId },
        OBJECT
    );
    const supplier = result.rows[0];
    if (!supplier) throw new AppError("El proveedor seleccionado no existe.", 404);
    if (supplier.ESTADO !== "ACTIVO") throw new AppError("El proveedor seleccionado está inactivo.", 409);
}

async function assertSizesExist(connection, sizeIds) {
    const binds = {};
    const placeholders = sizeIds.map((id, index) => {
        binds[`s${index}`] = id;
        return `:s${index}`;
    });
    const result = await connection.execute(
        `SELECT COUNT(*) AS TOTAL FROM TALLA WHERE ID_TALLA_PK IN (${placeholders.join(", ")})`,
        binds,
        OBJECT
    );
    if (result.rows[0].TOTAL !== sizeIds.length) throw new AppError("Alguna talla seleccionada no existe.");
}

// La imagen se deduce del nombre: dos nombres con el mismo "slug" usarían el mismo archivo.
async function assertUniqueName(connection, name, excludeId = null) {
    const slug = productImageSlug(name);
    if (!slug) throw new AppError("El nombre debe contener al menos una letra o un número.");

    const result = await connection.execute(
        "SELECT ID_PRODUCTO_PK, NOMBRE_PRODUCTO FROM PRODUCTOS",
        [],
        OBJECT
    );
    const clash = result.rows.find(
        (row) => row.ID_PRODUCTO_PK !== excludeId && productImageSlug(row.NOMBRE_PRODUCTO) === slug
    );
    if (clash) {
        throw new AppError(
            `Ya existe un producto con ese nombre o con uno equivalente ("${clash.NOMBRE_PRODUCTO}" usa ${slug}.png).`,
            409
        );
    }
}

// Cada talla del producto = una referencia + su fila de inventario en cero.
async function addReference(connection, productId, sizeId) {
    const reference = await connection.execute(
        `INSERT INTO REFERENCIA_PRODUCTO (ID_PRODUCTO_FK, ID_TALLA_FK)
         VALUES (:productId, :sizeId)
         RETURNING ID_REFERENCIA_PK INTO :id`,
        { productId, sizeId, id: numberOut() }
    );
    await connection.execute(
        "INSERT INTO INVENTARIO (ID_REFERENCIA_FK) VALUES (:referenceId)",
        { referenceId: reference.outBinds.id[0] }
    );
}

export function listProducts({ status, search } = {}) {
    return withConnection(async (connection) => {
        const conditions = [];
        const binds = {};
        if (status) {
            conditions.push("P.ESTADO = :status");
            binds.status = status;
        }
        if (search) {
            conditions.push("UPPER(P.NOMBRE_PRODUCTO) LIKE UPPER(:search) ESCAPE '\\'");
            binds.search = `%${escapeLike(search)}%`;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = await connection.execute(
            `${PRODUCT_SELECT} ${where} ORDER BY P.ID_PRODUCTO_PK DESC`,
            binds,
            OBJECT
        );
        return result.rows.map(toProduct);
    });
}

export function getProduct(id) {
    return withConnection((connection) => fetchProduct(connection, id));
}

export function createProduct({ name, description, price, supplierId, sizeIds }) {
    return withTransaction(async (connection) => {
        await assertActiveSupplier(connection, supplierId);
        await assertSizesExist(connection, sizeIds);
        await assertUniqueName(connection, name);

        const inserted = await connection.execute(
            `INSERT INTO PRODUCTOS (NOMBRE_PRODUCTO, DESCRIPCION_PRODUCTO, PRECIO, ID_PROVEEDOR_FK)
             VALUES (:name, :description, :price, :supplierId)
             RETURNING ID_PRODUCTO_PK INTO :id`,
            { name, description, price, supplierId, id: numberOut() }
        );
        const productId = inserted.outBinds.id[0];

        for (const sizeId of sizeIds) {
            await addReference(connection, productId, sizeId);
        }
        return fetchProduct(connection, productId);
    });
}

export function updateProduct(id, changes) {
    return withTransaction(async (connection) => {
        const current = await connection.execute(
            "SELECT ID_PROVEEDOR_FK FROM PRODUCTOS WHERE ID_PRODUCTO_PK = :id FOR UPDATE",
            { id },
            OBJECT
        );
        if (!current.rows[0]) throw new AppError("El producto no existe.", 404);

        if (changes.name !== undefined) {
            await assertUniqueName(connection, changes.name, id);
        }

        if (changes.supplierId !== undefined && changes.supplierId !== current.rows[0].ID_PROVEEDOR_FK) {
            await assertActiveSupplier(connection, changes.supplierId);
            const receptions = await connection.execute(
                `SELECT COUNT(*) AS TOTAL
                   FROM RECEPCION C
                   JOIN REFERENCIA_PRODUCTO R ON R.ID_REFERENCIA_PK = C.ID_REFERENCIA_FK
                  WHERE R.ID_PRODUCTO_FK = :id`,
                { id },
                OBJECT
            );
            if (receptions.rows[0].TOTAL > 0) {
                throw new AppError("No se puede cambiar el proveedor de un producto que ya tiene recepciones.", 409);
            }
        }

        const { clause, binds } = buildSetClause(changes, PRODUCT_COLUMNS);
        await connection.execute(`UPDATE PRODUCTOS SET ${clause} WHERE ID_PRODUCTO_PK = :id`, { ...binds, id });
        return fetchProduct(connection, id);
    });
}

export function addProductSize(productId, sizeId) {
    return withTransaction(async (connection) => {
        const product = await connection.execute(
            "SELECT 1 FROM PRODUCTOS WHERE ID_PRODUCTO_PK = :productId",
            { productId }
        );
        if (!product.rows.length) throw new AppError("El producto no existe.", 404);
        await assertSizesExist(connection, [sizeId]);

        const existing = await connection.execute(
            "SELECT 1 FROM REFERENCIA_PRODUCTO WHERE ID_PRODUCTO_FK = :productId AND ID_TALLA_FK = :sizeId",
            { productId, sizeId }
        );
        if (existing.rows.length) {
            throw new AppError("Esa talla ya está asociada al producto. Si está inactiva, actívala en la lista.", 409);
        }

        await addReference(connection, productId, sizeId);
        return fetchProduct(connection, productId);
    });
}

export function setReferenceStatus(productId, referenceId, status) {
    return withTransaction(async (connection) => {
        const result = await connection.execute(
            `UPDATE REFERENCIA_PRODUCTO SET ESTADO = :status
              WHERE ID_REFERENCIA_PK = :referenceId AND ID_PRODUCTO_FK = :productId`,
            { status, referenceId, productId }
        );
        if (result.rowsAffected === 0) throw new AppError("La talla del producto no existe.", 404);
        return fetchProduct(connection, productId);
    });
}
