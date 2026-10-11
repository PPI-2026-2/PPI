import { Router } from "express";
import rateLimit from "express-rate-limit";
import { currentUser, login, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const authRouter = Router();

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: { message: "Demasiados intentos. Espera unos minutos y vuelve a intentar." }
});

const registrationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: 5,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: { message: "Se alcanzó el máximo de registros desde esta conexión. Intenta más tarde." }
});

authRouter.post("/login", loginLimiter, login);
authRouter.post("/register", registrationLimiter, register);
authRouter.get("/me", requireAuth, currentUser);

export default authRouter;
