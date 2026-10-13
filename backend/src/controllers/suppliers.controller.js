import * as service from "../services/suppliers.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { optionalString, requireId, requireInt, requireOneOf, requireString } from "../utils/validators.js";

const STATUSES = ["ACTIVO", "INACTIVO"];

export const getSuppliers = asyncHandler(async (req, res) => {
    const status = req.query.estado ? requireOneOf(req.query.estado, "El estado", STATUSES) : undefined;
    res.status(200).json({ suppliers: await service.listSuppliers({ status }) });
});

export const createSupplier = asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const supplier = await service.createSupplier({
        name: requireString(body.name, "El nombre", { max: 100 }),
        lastName: optionalString(body.lastName, "El apellido", { max: 50 }),
        phone: optionalString(body.phone, "El teléfono", { max: 30 }),
        deliveryDays: body.deliveryDays === undefined
            ? 7
            : requireInt(body.deliveryDays, "Los días de entrega", { min: 0, max: 365 })
    });
    res.status(201).json({ supplier });
});

export const updateSupplier = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El proveedor");
    const body = req.body ?? {};
    const changes = {};
    if ("name" in body) changes.name = requireString(body.name, "El nombre", { max: 100 });
    if ("lastName" in body) changes.lastName = optionalString(body.lastName, "El apellido", { max: 50 });
    if ("phone" in body) changes.phone = optionalString(body.phone, "El teléfono", { max: 30 });
    if ("deliveryDays" in body) {
        changes.deliveryDays = requireInt(body.deliveryDays, "Los días de entrega", { min: 0, max: 365 });
    }
    if ("status" in body) changes.status = requireOneOf(body.status, "El estado", STATUSES);
    if (!Object.keys(changes).length) throw new AppError("No hay cambios para guardar.");

    res.status(200).json({ supplier: await service.updateSupplier(id, changes) });
});
