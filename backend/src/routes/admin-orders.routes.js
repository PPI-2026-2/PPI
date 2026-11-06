import { Router } from "express";

import { cancelIncompleteOrder, cancelUnclaimedOrder, getClaimedValue, getOrder, getOrders } from "../controllers/admin-orders.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

// Pedidos para el ADMINISTRADOR: consulta, cancelación de los "sin reclamar" y cierre de los incompletos.
const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAuth, authorizeRoles("ADMINISTRADOR"));
adminOrdersRouter.get("/", getOrders);
adminOrdersRouter.get("/reclamado", getClaimedValue);
adminOrdersRouter.post("/:id/cancelar-sin-reclamar", cancelUnclaimedOrder);
adminOrdersRouter.post("/:id/cerrar-incompleto", cancelIncompleteOrder);
adminOrdersRouter.get("/:id", getOrder);

export default adminOrdersRouter;
