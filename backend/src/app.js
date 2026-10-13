import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import adminRouter from "./routes/admin.routes.js";
import authRouter from "./routes/auth.routes.js";
import { AppError } from "./utils/app-error.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origen no permitido por CORS."));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada." }));

app.use((error, _req, res, _next) => {
    if (error.message === "Origen no permitido por CORS.") {
        return res.status(403).json({ message: "Origen no permitido." });
    }
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ message: "El cuerpo de la solicitud no es un JSON válido." });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ message: "La solicitud es demasiado grande." });
    }
    if (error.errorNum === 1) {
        return res.status(409).json({ message: "Ya existe un registro con esos datos." });
    }
    console.error("Error de API:", error);
    return res.status(500).json({ message: "Ocurrió un error interno." });
});

export default app;
