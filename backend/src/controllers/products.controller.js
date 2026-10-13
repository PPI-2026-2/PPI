import * as service from "../services/products.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
    optionalString,
    requireId,
    requireMoney,
    requireOneOf,
    requireString
} from "../utils/validators.js";

const STATUSES = ["ACTIVO", "INACTIVO"];

function parseSizeIds(value) {
    if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
        throw new AppError("Selecciona al menos una talla (máximo 30).");
    }
    const ids = value.map((id) => requireId(id, "La talla"));
    if (new Set(ids).size !== ids.length) throw new AppError("Hay tallas repetidas.");
    return ids;
}

export const getProducts = asyncHandler(async (req, res) => {
    const status = req.query.estado ? requireOneOf(req.query.estado, "El estado", STATUSES) : undefined;
    const search = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim().slice(0, 100) : undefined;
    res.status(200).json({ products: await service.listProducts({ status, search }) });
});

export const getProduct = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El producto");
    res.status(200).json({ product: await service.getProduct(id) });
});

export const createProduct = asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const product = await service.createProduct({
        name: requireString(body.name, "El nombre", { max: 100 }),
        description: optionalString(body.description, "La descripción", { max: 500 }),
        price: requireMoney(body.price, "El precio"),
        supplierId: requireId(body.supplierId, "El proveedor"),
        sizeIds: parseSizeIds(body.sizeIds)
    });
    res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El producto");
    const body = req.body ?? {};
    const changes = {};
    if ("name" in body) changes.name = requireString(body.name, "El nombre", { max: 100 });
    if ("description" in body) changes.description = optionalString(body.description, "La descripción", { max: 500 });
    if ("price" in body) changes.price = requireMoney(body.price, "El precio");
    if ("supplierId" in body) changes.supplierId = requireId(body.supplierId, "El proveedor");
    if (!Object.keys(changes).length) throw new AppError("No hay cambios para guardar.");

    res.status(200).json({ product: await service.updateProduct(id, changes) });
});

export const setProductStatus = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El producto");
    const status = requireOneOf(req.body?.status, "El estado", STATUSES);
    res.status(200).json({ product: await service.updateProduct(id, { status }) });
});

export const addProductSize = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El producto");
    const sizeId = requireId(req.body?.sizeId, "La talla");
    res.status(201).json({ product: await service.addProductSize(id, sizeId) });
});

export const setProductSizeStatus = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El producto");
    const referenceId = requireId(req.params.referenceId, "La talla del producto");
    const status = requireOneOf(req.body?.status, "El estado", STATUSES);
    res.status(200).json({ product: await service.setReferenceStatus(id, referenceId, status) });
});
