import { Router } from "express";

import { createSupplier, getSuppliers, updateSupplier } from "../controllers/suppliers.controller.js";

const suppliersRouter = Router();

suppliersRouter.get("/", getSuppliers);
suppliersRouter.post("/", createSupplier);
suppliersRouter.patch("/:id", updateSupplier);

export default suppliersRouter;
