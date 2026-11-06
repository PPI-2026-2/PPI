import { Router } from "express";

import { cancelUnclaimedOrder, getClaimedValue, getOrder, getOrders } from "../controllers/admin-orders.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

// Pedidos para el ADMINISTRADOR: consulta y cancelación de los pedidos "sin reclamar".
const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAuth, authorizeRoles("ADMINISTRADOR"));
adminOrdersRouter.get("/", getOrders);
adminOrdersRouter.get("/reclamado", getClaimedValue);
adminOrdersRouter.post("/:id/cancelar-sin-reclamar", cancelUnclaimedOrder);
adminOrdersRouter.get("/:id", getOrder);

export default adminOrdersRouter;
