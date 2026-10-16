import { Router } from "express";

import { getMovements } from "../controllers/movements.controller.js";

const movementsRouter = Router();

movementsRouter.get("/", getMovements);

export default movementsRouter;
