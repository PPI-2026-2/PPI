import * as service from "../services/employee-orders.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { optionalString, requireId, requireInt, requireOneOf } from "../utils/validators.js";

export const getOrders = asyncHandler(async (req, res) => {
    // ?estado=PENDIENTE,INCOMPLETO  (sin parámetro = todos)
    const statuses = req.query.estado
        ? String(req.query.estado).split(",").map((status) => requireOneOf(status.trim(), "El estado", service.ORDER_STATUSES))
        : undefined;
    res.status(200).json({ orders: await service.listOrders({ statuses }) });
});

export const getOrdersSummary = asyncHandler(async (_req, res) => {
    res.status(200).json({ counts: await service.getOrdersSummary() });
});

export const getOrder = asyncHandler(async (req, res) => {
    res.status(200).json({ order: await service.getOrder(requireId(req.params.id, "El pedido")) });
});

export const verifyOrder = asyncHandler(async (req, res) => {
    const orderId = requireId(req.params.id, "El pedido");
    const rawLines = req.body?.lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0 || rawLines.length > 100) {
        throw new AppError("Indica la cantidad confirmada de cada producto del pedido.");
    }
    const lines = rawLines.map((line) => ({
        detailId: requireId(line?.detailId, "La línea del pedido"),
        quantity: requireInt(line?.quantity, "La cantidad confirmada", { min: 0, max: 1000 })
    }));
    const observation = optionalString(req.body?.observation, "El motivo", { max: 500 });
    const userId = requireId(req.auth.sub, "El usuario");
    res.status(200).json(await service.verifyOrder(orderId, userId, lines, observation));
});

export const deliverOrder = asyncHandler(async (req, res) => {
    const orderId = requireId(req.params.id, "El pedido");
    res.status(200).json({ order: await service.deliverOrder(orderId, requireId(req.auth.sub, "El usuario")) });
});
