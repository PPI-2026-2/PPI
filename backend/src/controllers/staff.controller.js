import { createUser, listUsers, setStaffStatus, UserServiceError } from "../services/users.service.js";
import { EMAIL_MESSAGE, isStrongPassword, isValidEmail, PASSWORD_MESSAGE } from "../utils/credentials.js";
import { requireId, requireOneOf } from "../utils/validators.js";

// Solo el personal interno se gestiona desde aquí.
// Los clientes (USUARIO) se crean únicamente con el registro público.
const STAFF_ROLES = new Set(["EMPLEADO", "ADMINISTRADOR"]);

export async function getStaff(_req, res, next) {
    try {
        const users = await listUsers();
        return res.status(200).json({ users: users.filter((user) => STAFF_ROLES.has(user.role)) });
    } catch (error) {
        return next(error);
    }
}

// El administrador activa o desactiva cuentas de empleados y administradores.
export async function changeStaffStatus(req, res, next) {
    try {
        const targetId = requireId(req.params.id, "La cuenta");
        const status = requireOneOf(req.body?.status, "El estado", ["ACTIVO", "INACTIVO"]);
        const user = await setStaffStatus(targetId, status, requireId(req.auth.sub, "El usuario"));
        return res.status(200).json({ user });
    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        return next(error);
    }
}

export async function createStaffAccount(req, res, next) {
    try {
        const { firstName, lastName, email, password, role } = req.body ?? {};
        if ([firstName, lastName, email, password, role].some((value) => typeof value !== "string" || !value.trim())) {
            throw new UserServiceError("Completa todos los campos para crear la cuenta.");
        }
        if (firstName.trim().length > 50 || lastName.trim().length > 50 || email.trim().length > 100) {
            throw new UserServiceError("Uno o más campos superan el tamaño permitido.");
        }
        if (!isValidEmail(email)) {
            throw new UserServiceError(EMAIL_MESSAGE);
        }
        if (!isStrongPassword(password)) {
            throw new UserServiceError(PASSWORD_MESSAGE);
        }

        const normalizedRole = role.trim().toUpperCase();
        if (!STAFF_ROLES.has(normalizedRole)) {
            throw new UserServiceError("Solo se pueden crear cuentas EMPLEADO o ADMINISTRADOR. Los clientes se registran desde el registro público.");
        }

        // Sin token: quien sigue autenticado es el administrador que hace la alta.
        const user = await createUser({ firstName, lastName, email, password, role: normalizedRole });
        return res.status(201).json({ user });
    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        return next(error);
    }
}