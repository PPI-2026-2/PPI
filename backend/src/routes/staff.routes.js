import { Router } from "express";
import rateLimit from "express-rate-limit";

import { createStaffAccount, getStaff } from "../controllers/staff.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.middleware.js";

const staffRouter = Router();
const administratorsOnly = [requireAuth, authorizeRoles("ADMINISTRADOR")];
const createStaffLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Se alcanzó el máximo de altas permitidas por ahora." }
});

staffRouter.get("/", ...administratorsOnly, getStaff);
staffRouter.post("/", ...administratorsOnly, createStaffLimiter, createStaffAccount);

export default staffRouter;