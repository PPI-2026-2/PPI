import { Router } from "express";
import rateLimit from "express-rate-limit";

import { changeStaffStatus, createStaffAccount, getStaff } from "../controllers/staff.controller.js";

const staffRouter = Router();
const createStaffLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Se alcanzó el máximo de altas permitidas por ahora." }
});

staffRouter.get("/", getStaff);
staffRouter.post("/", createStaffLimiter, createStaffAccount);
staffRouter.patch("/:id/estado", changeStaffStatus);

export default staffRouter;
