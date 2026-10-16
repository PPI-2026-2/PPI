import { Router } from "express";

import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";
import inventoryRouter from "./inventory.routes.js";
import movementsRouter from "./movements.routes.js";
import productsRouter from "./products.routes.js";
import receptionsRouter from "./receptions.routes.js";
import sizesRouter from "./sizes.routes.js";
import staffRouter from "./staff.routes.js";
import suppliersRouter from "./suppliers.routes.js";

const adminRouter = Router();

adminRouter.use(requireAuth, authorizeRoles("ADMINISTRADOR"));

adminRouter.use("/staff", staffRouter);
adminRouter.use("/proveedores", suppliersRouter);
adminRouter.use("/tallas", sizesRouter);
adminRouter.use("/productos", productsRouter);
adminRouter.use("/recepciones", receptionsRouter);
adminRouter.use("/inventario", inventoryRouter);
adminRouter.use("/movimientos", movementsRouter);

export default adminRouter;
