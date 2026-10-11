import "dotenv/config";
import app from "./app.js";
import { closeOraclePool, initOraclePool } from "./config/oracle.js";

const port = Number(process.env.PORT || 3000);

async function start() {
    if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
        throw new Error("Configura JWT_SECRET con al menos 32 bytes aleatorios en backend/.env.");
    }

    await initOraclePool();
    const server = app.listen(port, () => {
        console.log(`StockPlan API escuchando en http://localhost:${port}`);
    });

    const shutdown = async () => {
        server.close(async () => {
            try {
                await closeOraclePool();
            } finally {
                process.exit(0);
            }
        });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}

start().catch((error) => {
    console.error("No se pudo iniciar StockPlan API:", error.message);
    process.exit(1);
});
