import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import oracledb from "oracledb";

import { getOracleConnection } from "../config/oracle.js";

const ALLOWED_ROLES = new Set(["EMPLEADO", "USUARIO", "ADMINISTRADOR"]);

export class AuthError extends Error {
    constructor(message, statusCode = 401) {
        super(message);
        this.name = "AuthError";
        this.statusCode = statusCode;
    }
}

export async function authenticateUser(email, password) {
    const connection = await getOracleConnection();

    try {
        const result = await connection.execute(
            `SELECT U.ID_USUARIO_PK, U.NOMBRE_US, U.APELLIDO_US, U.EMAIL,
                    U.PASSWORD_HASH, U.ESTADO, R.NOMBRE_ROL
               FROM USUARIO U
               JOIN ROL R ON R.ID_ROL_PK = U.ID_ROL_FK
              WHERE LOWER(TRIM(U.EMAIL)) = LOWER(TRIM(:email))`,
            { email: email.trim() },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const row = result.rows?.[0];

        if (!row) throw new AuthError("Correo o contraseña incorrectos.");

        const estado = String(row.ESTADO ?? "").trim().toUpperCase();
        const role = String(row.NOMBRE_ROL ?? "").trim().toUpperCase();
        if (estado !== "ACTIVO") throw new AuthError("La cuenta está inactiva.", 403);
        if (!ALLOWED_ROLES.has(role)) throw new AuthError("El rol de la cuenta no está habilitado.", 403);

        const passwordHash = String(row.PASSWORD_HASH ?? "");
        const isValidPassword = await bcrypt.compare(password, passwordHash).catch(() => false);
        if (!isValidPassword) throw new AuthError("Correo o contraseña incorrectos.");

        return {
            id: String(row.ID_USUARIO_PK),
            name: `${row.NOMBRE_US} ${row.APELLIDO_US}`.trim(),
            email: row.EMAIL,
            role
        };
    } finally {
        await connection.close();
    }
}

export function createAccessToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
        throw new Error("JWT_SECRET debe configurarse con al menos 32 bytes aleatorios.");
    }

    return jwt.sign(
        { email: user.email, role: user.role, name: user.name },
        secret,
        { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || "15m", issuer: "stockplan-api", audience: "stockplan-frontend" }
    );
}
