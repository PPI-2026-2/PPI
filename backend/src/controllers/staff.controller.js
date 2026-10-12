import { createUser, listUsers, UserServiceError } from "../services/users.service.js";

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

export async function createStaffAccount(req, res, next) {
    try {
        const { firstName, lastName, email, password, role } = req.body ?? {};
        if ([firstName, lastName, email, password, role].some((value) => typeof value !== "string" || !value.trim())) {
            throw new UserServiceError("Completa todos los campos para crear la cuenta.");
        }
        if (firstName.trim().length > 50 || lastName.trim().length > 50 || email.trim().length > 100) {
            throw new UserServiceError("Uno o más campos superan el tamaño permitido.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new UserServiceError("Ingresa un correo electrónico válido.");
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