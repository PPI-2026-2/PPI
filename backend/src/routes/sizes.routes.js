import { Router } from "express";

import { createSize, getSizes } from "../controllers/sizes.controller.js";

const sizesRouter = Router();

sizesRouter.get("/", getSizes);
sizesRouter.post("/", createSize);

export default sizesRouter;
