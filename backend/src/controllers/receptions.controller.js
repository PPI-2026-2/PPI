import * as service from "../services/receptions.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { optionalString, requireId, requireInt, requireOneOf } from "../utils/validators.js";

const STATUSES = ["REGISTRADA", "CONFIRMADA", "ANULADA"];
const MAX_UNITS = 1000000;

export const getReceptions = asyncHandler(async (req, res) => {
    const status = req.query.estado ? requireOneOf(req.query.estado, "El estado", STATUSES) : undefined;
    const productId = req.query.productId ? requireId(req.query.productId, "El producto") : undefined;
    const page = req.query.pagina ? requireInt(req.query.pagina, "La página", { min: 1, max: 1000000 }) : undefined;
    const pageSize = req.query.tamano ? requireInt(req.query.tamano, "El tamaño de página", { min: 1, max: 200 }) : 100;
    const { receptions, pagination } = await service.listReceptions({ status, productId, page, pageSize });
    res.status(200).json({ receptions, ...(pagination ? { pagination } : {}) });
});

export const getReception = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "La recepción");
    res.status(200).json({ reception: await service.getReception(id) });
});

export const createReception = asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const received = requireInt(body.received, "La cantidad recibida", { min: 1, max: MAX_UNITS });
    const rejected = body.rejected === undefined || body.rejected === ""
        ? 0
        : requireInt(body.rejected, "La cantidad rechazada", { min: 0, max: MAX_UNITS });
    if (rejected > received) {
        throw new AppError("La cantidad rechazada no puede superar la cantidad recibida.");
    }
    const rejectionReason = rejected > 0
        ? optionalString(body.rejectionReason, "El motivo del rechazo", { max: 200 })
        : null;
    if (rejected > 0 && !rejectionReason) {
        throw new AppError("Indica el motivo del rechazo.");
    }

    const reception = await service.createReception(
        {
            referenceId: requireId(body.referenceId, "La referencia (producto y talla)"),
            expected: requireInt(body.expected, "La cantidad esperada", { min: 0, max: MAX_UNITS }),
            received,
            rejected,
            rejectionReason,
            observation: optionalString(body.observation, "La observación", { max: 500 })
        },
        requireId(req.auth.sub, "El usuario")
    );
    res.status(201).json({ reception });
});

const MAX_LINES = 100;

// Entrega de un producto en varias tallas: se guarda y entra al inventario en un solo paso.
export const receiveDelivery = asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    if (body.supplierId === undefined || body.supplierId === null || body.supplierId === "") {
        throw new AppError("El proveedor es obligatorio.");
    }
    const supplierId = requireId(body.supplierId, "El proveedor");
    const productId = requireId(body.productId, "El producto");
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
        throw new AppError("Selecciona al menos una talla.");
    }
    if (body.lines.length > MAX_LINES) {
        throw new AppError(`Una entrega admite máximo ${MAX_LINES} tallas.`);
    }

    const seen = new Set();
    const lines = body.lines.map((line) => {
        const referenceId = requireId(line?.referenceId, "La talla");
        if (seen.has(referenceId)) throw new AppError("Una talla está repetida en la entrega.");
        seen.add(referenceId);
        const received = requireInt(line.received, "La cantidad recibida", { min: 1, max: MAX_UNITS });
        const rejected = line.rejected === undefined || line.rejected === null || line.rejected === ""
            ? 0
            : requireInt(line.rejected, "La cantidad rechazada", { min: 0, max: MAX_UNITS });
        if (rejected > received) {
            throw new AppError("La cantidad rechazada no puede superar la cantidad recibida.");
        }
        return { referenceId, received, rejected };
    });

    const hasRejected = lines.some((line) => line.rejected > 0);
    const rejectionReason = hasRejected
        ? optionalString(body.rejectionReason, "El motivo del rechazo", { max: 200 })
        : null;
    if (hasRejected && !rejectionReason) {
        throw new AppError("Indica el motivo del rechazo.");
    }

    const receptions = await service.receiveDelivery(
        {
            supplierId,
            productId,
            lines,
            rejectionReason,
            observation: optionalString(body.observation, "La observación", { max: 500 })
        },
        requireId(req.auth.sub, "El usuario")
    );
    res.status(201).json({ receptions });
});

export const confirmReception = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "La recepción");
    res.status(200).json({ reception: await service.confirmReception(id, requireId(req.auth.sub, "El usuario")) });
});

export const cancelReception = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "La recepción");
    const note = optionalString(req.body?.observation, "La observación", { max: 200 });
    res.status(200).json({ reception: await service.cancelReception(id, note) });
});
