import { Router } from "express";

import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";
import productsRouter from "./products.routes.js";
import sizesRouter from "./sizes.routes.js";
import staffRouter from "./staff.routes.js";
import suppliersRouter from "./suppliers.routes.js";

const adminRouter = Router();

adminRouter.use(requireAuth, authorizeRoles("ADMINISTRADOR"));

adminRouter.use("/staff", staffRouter);
adminRouter.use("/proveedores", suppliersRouter);
adminRouter.use("/tallas", sizesRouter);
adminRouter.use("/productos", productsRouter);

export default adminRouter;
