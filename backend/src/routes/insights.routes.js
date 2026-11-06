import { Router } from "express";

import { getAlerts, getBehavior, getReplenishment, getSales } from "../controllers/insights.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

// Reposición, comportamiento del inventario, ventas y alertas (solo ADMINISTRADOR; lectura).
const insightsRouter = Router();

insightsRouter.use(requireAuth, authorizeRoles("ADMINISTRADOR"));
insightsRouter.get("/reposicion", getReplenishment);
insightsRouter.get("/comportamiento", getBehavior);
insightsRouter.get("/ventas", getSales);
insightsRouter.get("/alertas", getAlerts);

export default insightsRouter;
