import { Router } from "express";

import { adjustInventory, getInventory, setInventoryMinimum } from "../controllers/inventory.controller.js";

const inventoryRouter = Router();

inventoryRouter.get("/", getInventory);
inventoryRouter.patch("/:referenceId/minimo", setInventoryMinimum);
inventoryRouter.post("/:referenceId/ajuste", adjustInventory);

export default inventoryRouter;
