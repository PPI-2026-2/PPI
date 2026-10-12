import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import authRouter from "./routes/auth.routes.js";
import staffRouter from "./routes/staff.routes.js";

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
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/admin/staff", staffRouter);

app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada." }));

app.use((error, _req, res, _next) => {
    if (error.message === "Origen no permitido por CORS.") {
        return res.status(403).json({ message: "Origen no permitido." });
    }
    console.error("Error de API:", error);
    return res.status(500).json({ message: "Ocurrió un error interno." });
});

export default app;
