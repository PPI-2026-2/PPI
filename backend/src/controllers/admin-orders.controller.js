import * as service from "../services/admin-orders.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireId, requireInt, requireOneOf } from "../utils/validators.js";

export const getOrders = asyncHandler(async (req, res) => {
    const status = req.query.estado ? requireOneOf(String(req.query.estado), "El estado", service.ORDER_STATUSES) : undefined;
    const page = req.query.pagina ? requireInt(req.query.pagina, "La página", { min: 1, max: 1000000 }) : undefined;
    const pageSize = req.query.tamano ? requireInt(req.query.tamano, "El tamaño de página", { min: 1, max: 200 }) : 100;
    const { orders, pagination } = await service.listAdminOrders({
        status,
        q: req.query.q ? String(req.query.q) : undefined,
        from: req.query.desde ? String(req.query.desde) : undefined,
        to: req.query.hasta ? String(req.query.hasta) : undefined,
        unclaimed: req.query.sinReclamar === "1" || req.query.sinReclamar === "true",
        page,
        pageSize
    });
    res.status(200).json({ orders, ...(pagination ? { pagination } : {}), ...(await service.getAdminSummary()) });
});

// Valor reclamado en tienda: por mes (?mes=2026-10) o por rango (?desde=...&hasta=...).
export const getClaimedValue = asyncHandler(async (req, res) => {
    res.status(200).json(
        await service.getClaimedValue({
            month: req.query.mes ? String(req.query.mes) : undefined,
            from: req.query.desde ? String(req.query.desde) : undefined,
            to: req.query.hasta ? String(req.query.hasta) : undefined
        })
    );
});

export const getOrder = asyncHandler(async (req, res) => {
    res.status(200).json({ order: await service.getAdminOrder(requireId(req.params.id, "El pedido")) });
});

// El administrador cancela un pedido que superó los días sin reclamar para liberar el stock separado.
export const cancelUnclaimedOrder = asyncHandler(async (req, res) => {
    const order = await service.cancelUnclaimedOrder(requireId(req.params.id, "El pedido"), requireId(req.auth.sub, "El usuario"));
    res.status(200).json({ order, message: "Pedido cancelado. Los productos separados volvieron al stock disponible." });
});
