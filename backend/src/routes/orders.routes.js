import { Router } from "express";

import { cancelMyOrder, createOrder, getMyNotifications, getMyOrders } from "../controllers/orders.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

// Pedidos del cliente (rol USUARIO).
const ordersRouter = Router();

ordersRouter.use(requireAuth, authorizeRoles("USUARIO"));
ordersRouter.get("/", getMyOrders);
ordersRouter.get("/notificaciones", getMyNotifications);
ordersRouter.post("/", createOrder);
ordersRouter.post("/:id/cancelar", cancelMyOrder);

export default ordersRouter;
