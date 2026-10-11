import { authenticateUser, AuthError, createAccessToken } from "../services/auth.service.js";
import { createUser, UserServiceError } from "../services/users.service.js";

function validateRegistration(body) {
    const { firstName, lastName, email, password } = body ?? {};
    if ([firstName, lastName, email, password].some((value) => typeof value !== "string" || !value.trim())) {
        throw new UserServiceError("Completa todos los campos para crear la cuenta.");
    }
    if (firstName.trim().length > 50 || lastName.trim().length > 50 || email.trim().length > 100) {
        throw new UserServiceError("Uno o más campos superan el tamaño permitido.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new UserServiceError("Ingresa un correo electrónico válido.");
    }
    return { firstName, lastName, email, password };
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body ?? {};
        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(400).json({ message: "Ingresa un correo y una contraseña válidos." });
        }
        if (email.length > 100 || password.length > 150) {
            return res.status(400).json({ message: "El correo o la contraseña superan el tamaño permitido." });
        }

        const user = await authenticateUser(email, password);
        const accessToken = createAccessToken(user);
        return res.status(200).json({ accessToken, tokenType: "Bearer", expiresIn: process.env.JWT_EXPIRES_IN || "15m", user });
    } catch (error) {
        if (error instanceof AuthError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        return next(error);
    }
}

export async function register(req, res, next) {
    try {
        const userData = validateRegistration(req.body);
        const user = await createUser({ ...userData, role: "USUARIO" });
        const accessToken = createAccessToken(user);
        return res.status(201).json({ accessToken, tokenType: "Bearer", expiresIn: process.env.JWT_EXPIRES_IN || "15m", user });
    } catch (error) {
        if (error instanceof UserServiceError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        return next(error);
    }
}

export function currentUser(req, res) {
    return res.status(200).json({
        user: {
            id: req.auth.sub,
            name: req.auth.name,
            email: req.auth.email,
            role: req.auth.role
        }
    });
}
