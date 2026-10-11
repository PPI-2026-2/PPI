import { Router } from "express";
import rateLimit from "express-rate-limit";

import { createManagedUser, getUsers } from "../controllers/users.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

const usersRouter = Router();
const administratorsOnly = [requireAuth, authorizeRoles("ADMINISTRADOR")];
const createUserLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Se alcanzó el máximo de altas permitidas por ahora." }
});

usersRouter.get("/", ...administratorsOnly, getUsers);
usersRouter.post("/", ...administratorsOnly, createUserLimiter, createManagedUser);

export default usersRouter;
