import bcrypt from "bcrypt";
import oracledb from "oracledb";

import { getOracleConnection } from "../config/oracle.js";

const ALLOWED_ROLES = new Set(["USUARIO", "EMPLEADO", "ADMINISTRADOR"]);

export class UserServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "UserServiceError";
        this.statusCode = statusCode;
    }
}

export async function createUser({ firstName, lastName, email, password, role = "USUARIO" }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role.trim().toUpperCase();
    const passwordBytes = Buffer.byteLength(password, "utf8");

    if (!ALLOWED_ROLES.has(normalizedRole)) {
        throw new UserServiceError("El rol solicitado no es válido.");
    }
    if (password.length < 8 || passwordBytes > 72) {
        throw new UserServiceError("La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const connection = await getOracleConnection();

    try {
        const existing = await connection.execute(
            "SELECT 1 FROM USUARIO WHERE LOWER(TRIM(EMAIL)) = :email FETCH FIRST 1 ROWS ONLY",
            { email: normalizedEmail }
        );
        if (existing.rows?.length) {
            throw new UserServiceError("Esta cuenta de correo ya está en uso.", 409);
        }

        const roleResult = await connection.execute(
            "SELECT ID_ROL_PK FROM ROL WHERE UPPER(TRIM(NOMBRE_ROL)) = :role",
            { role: normalizedRole },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const roleId = roleResult.rows[0]?.ID_ROL_PK;
        if (!roleId) throw new UserServiceError("El rol solicitado no está registrado en la tabla ROL.", 500);

        const insertResult = await connection.execute(
            `INSERT INTO USUARIO (
                NOMBRE_US, APELLIDO_US, EMAIL, PASSWORD_HASH, ESTADO, ID_ROL_FK
            ) VALUES (
                :firstName, :lastName, :email, :passwordHash, 'ACTIVO', :roleId
            ) RETURNING ID_USUARIO_PK INTO :userId`,
            {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: normalizedEmail,
                passwordHash,
                roleId,
                userId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: true }
        );
        const userId = insertResult.outBinds.userId[0];

        return {
            id: String(userId),
            name: `${firstName.trim()} ${lastName.trim()}`,
            email: normalizedEmail,
            role: normalizedRole
        };
    } catch (error) {
        if (error instanceof UserServiceError) throw error;
        if (error.errorNum === 1) {
            throw new UserServiceError("Esta cuenta de correo ya está en uso.", 409);
        }
        if (error.errorNum === 942 || error.errorNum === 904) {
            throw new UserServiceError("El esquema no coincide con ROL/USUARIO o faltan permisos en estas tablas.", 503);
        }
        throw error;
    } finally {
        await connection.close();
    }
}

const STAFF_ROLES = new Set(["EMPLEADO", "ADMINISTRADOR"]);

export async function isUserActive(userId) {
    const connection = await getOracleConnection();
    try {
        const result = await connection.execute(
            "SELECT ESTADO FROM USUARIO WHERE ID_USUARIO_PK = :userId",
            { userId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return String(result.rows[0]?.ESTADO ?? "").trim().toUpperCase() === "ACTIVO";
    } finally {
        await connection.close();
    }
}

// Datos para renovar la sesión; null si la cuenta no existe o no está activa.
export async function getActiveUser(userId) {
    const connection = await getOracleConnection();
    try {
        const result = await connection.execute(
            `SELECT U.ID_USUARIO_PK, U.NOMBRE_US, U.APELLIDO_US, U.EMAIL, R.NOMBRE_ROL
               FROM USUARIO U
               JOIN ROL R ON R.ID_ROL_PK = U.ID_ROL_FK
              WHERE U.ID_USUARIO_PK = :userId AND U.ESTADO = 'ACTIVO'`,
            { userId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            id: String(row.ID_USUARIO_PK),
            name: `${row.NOMBRE_US} ${row.APELLIDO_US}`.trim(),
            email: row.EMAIL,
            role: String(row.NOMBRE_ROL).trim().toUpperCase()
        };
    } finally {
        await connection.close();
    }
}

// Activa o desactiva una cuenta de personal. Una cuenta inactiva no puede entrar y pierde su sesión abierta.
// Nadie se desactiva a sí mismo: así siempre queda al menos un administrador activo.
export async function setStaffStatus(targetId, status, actingUserId) {
    if (targetId === actingUserId) {
        throw new UserServiceError("No puedes cambiar el estado de tu propia cuenta.", 409);
    }
    const connection = await getOracleConnection();
    try {
        const found = await connection.execute(
            `SELECT U.NOMBRE_US, U.APELLIDO_US, U.EMAIL, R.NOMBRE_ROL
               FROM USUARIO U
               JOIN ROL R ON R.ID_ROL_PK = U.ID_ROL_FK
              WHERE U.ID_USUARIO_PK = :targetId`,
            { targetId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const row = found.rows[0];
        const role = String(row?.NOMBRE_ROL ?? "").trim().toUpperCase();
        if (!row || !STAFF_ROLES.has(role)) {
            throw new UserServiceError("La cuenta de personal no existe.", 404);
        }
        await connection.execute(
            "UPDATE USUARIO SET ESTADO = :status WHERE ID_USUARIO_PK = :targetId",
            { status, targetId },
            { autoCommit: true }
        );
        return {
            id: String(targetId),
            firstName: row.NOMBRE_US,
            lastName: row.APELLIDO_US,
            email: row.EMAIL,
            status,
            role
        };
    } finally {
        await connection.close();
    }
}

export async function listUsers() {
    const connection = await getOracleConnection();
    try {
        const result = await connection.execute(
                        `SELECT U.ID_USUARIO_PK, U.NOMBRE_US, U.APELLIDO_US, U.EMAIL,
                                        U.ESTADO, R.NOMBRE_ROL
                             FROM USUARIO U
                             JOIN ROL R ON R.ID_ROL_PK = U.ID_ROL_FK
                            ORDER BY U.ID_USUARIO_PK DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((row) => ({
            id: String(row.ID_USUARIO_PK),
            firstName: row.NOMBRE_US,
            lastName: row.APELLIDO_US,
            email: row.EMAIL,
            status: row.ESTADO,
            role: String(row.NOMBRE_ROL).trim().toUpperCase()
        }));
    } finally {
        await connection.close();
    }
}

export async function hasAdministrator() {
    const connection = await getOracleConnection();
    try {
        const result = await connection.execute(
                        `SELECT 1
                             FROM USUARIO U
                             JOIN ROL R ON R.ID_ROL_PK = U.ID_ROL_FK
                            WHERE UPPER(TRIM(R.NOMBRE_ROL)) = 'ADMINISTRADOR'
                            FETCH FIRST 1 ROWS ONLY`
        );
        return result.rows.length > 0;
    } finally {
        await connection.close();
    }
}