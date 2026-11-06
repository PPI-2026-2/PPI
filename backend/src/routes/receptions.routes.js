import { Router } from "express";

import {
    cancelReception,
    confirmReception,
    createReception,
    getReception,
    getReceptions
} from "../controllers/receptions.controller.js";

const receptionsRouter = Router();

receptionsRouter.get("/", getReceptions);
receptionsRouter.get("/:id", getReception);
receptionsRouter.post("/", createReception);
receptionsRouter.post("/:id/confirmar", confirmReception);
receptionsRouter.post("/:id/anular", cancelReception);

export default receptionsRouter;
