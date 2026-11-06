import { Router } from "express";

import {
    deliverOrder,
    getOrder,
    getOrders,
    getOrdersSummary,
    verifyOrder
} from "../controllers/employee-orders.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

// Panel del empleado (rol EMPLEADO).
const employeeRouter = Router();

employeeRouter.use(requireAuth, authorizeRoles("EMPLEADO"));

employeeRouter.get("/pedidos/resumen", getOrdersSummary);
employeeRouter.get("/pedidos", getOrders);
employeeRouter.get("/pedidos/:id", getOrder);
employeeRouter.post("/pedidos/:id/verificar", verifyOrder);
employeeRouter.post("/pedidos/:id/entregar", deliverOrder);

export default employeeRouter;
