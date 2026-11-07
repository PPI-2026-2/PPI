import { Router } from "express";

import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from "../controllers/suppliers.controller.js";

const suppliersRouter = Router();

suppliersRouter.get("/", getSuppliers);
suppliersRouter.post("/", createSupplier);
suppliersRouter.patch("/:id", updateSupplier);
suppliersRouter.post("/:id/eliminar", deleteSupplier);

export default suppliersRouter;
