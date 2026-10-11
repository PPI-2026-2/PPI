import oracledb from "oracledb";

let pool;

export async function initOraclePool() {
    if (pool) return pool;

    const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING } = process.env;
    if (!DB_USER || !DB_PASSWORD || !DB_CONNECT_STRING) {
        throw new Error("Faltan DB_USER, DB_PASSWORD o DB_CONNECT_STRING en backend/.env.");
    }

    pool = await oracledb.createPool({
        user: DB_USER,
        password: DB_PASSWORD,
        connectString: DB_CONNECT_STRING,
        poolMin: Number(process.env.DB_POOL_MIN || 1),
        poolMax: Number(process.env.DB_POOL_MAX || 5),
        poolIncrement: 1
    });

    return pool;
}

export async function getOracleConnection() {
    if (!pool) throw new Error("El pool de Oracle no está inicializado.");
    return pool.getConnection();
}

export async function closeOraclePool() {
    if (!pool) return;
    await pool.close(10);
    pool = undefined;
}
