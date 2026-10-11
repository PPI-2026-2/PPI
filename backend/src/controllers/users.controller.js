import { createUser, listUsers, UserServiceError } from "../services/users.service.js";

const MANAGED_ROLES = new Set(["USUARIO", "EMPLEADO", "ADMINISTRADOR"]);

export async function getUsers(_req, res, next) {
    try {
        return res.status(200).json({ users: await listUsers() });
    } catch (error) {
        return next(error);
    }
}

export async function createManagedUser(req, res, next) {
    try {
        const { firstName, lastName, email, password, role } = req.body ?? {};
        if ([firstName, lastName, email, password, role].some((value) => typeof value !== "string" || !value.trim())) {
            throw new UserServiceError("Completa todos los campos para crear el usuario.");
        }
        if (firstName.trim().length > 50 || lastName.trim().length > 50 || email.trim().length > 100) {
            throw new UserServiceError("Uno o más campos superan el tamaño permitido.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new UserServiceError("Ingresa un correo electrónico válido.");
        }

        const normalizedRole = role.trim().toUpperCase();
        if (!MANAGED_ROLES.has(normalizedRole)) {
            throw new UserServiceError("Selecciona un rol válido.");
        }

        const user = await createUser({ firstName, lastName, email, password, role: normalizedRole });
        return res.status(201).json({ user });
    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        return next(error);
    }
}
