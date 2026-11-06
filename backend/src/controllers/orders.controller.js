import { cancelOrderAsCustomer } from "../services/employee-orders.service.js";
import * as service from "../services/orders.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireId, requireInt } from "../utils/validators.js";

export const createOrder = asyncHandler(async (req, res) => {
    const userId = requireId(req.auth.sub, "El usuario");
    const rawItems = req.body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new AppError("Tu carrito está vacío.");
    if (rawItems.length > 50) throw new AppError("El pedido tiene demasiados productos.");

    const items = rawItems.map((item) => ({
        referenceId: requireId(item?.referenceId, "El producto"),
        quantity: requireInt(item?.quantity, "La cantidad", { min: 1, max: 10 })
    }));
    res.status(201).json({ order: await service.createOrder(userId, items) });
});

// Historial de pedidos del usuario autenticado.
export const getMyOrders = asyncHandler(async (req, res) => {
    const userId = requireId(req.auth.sub, "El usuario");
    res.status(200).json({ orders: await service.listMyOrders(userId), cancelWindowMinutes: service.cancelWindowMinutes() });
});

// El cliente cancela su propio pedido dentro del plazo.
export const cancelMyOrder = asyncHandler(async (req, res) => {
    const userId = requireId(req.auth.sub, "El usuario");
    const orderId = requireId(req.params.id, "El pedido");
    res.status(200).json({ order: await cancelOrderAsCustomer(orderId, userId) });
});

export const getMyNotifications = asyncHandler(async (req, res) => {
    const userId = requireId(req.auth.sub, "El usuario");
    res.status(200).json({ notifications: await service.listMyNotifications(userId) });
});
