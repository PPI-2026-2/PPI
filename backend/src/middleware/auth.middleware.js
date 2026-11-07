import jwt from "jsonwebtoken";

import { isUserActive } from "../services/users.service.js";

export async function requireAuth(req, res, next) {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Se requiere autenticación." });
    }

    let claims;
    try {
        claims = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "stockplan-api",
            audience: "stockplan-frontend",
            algorithms: ["HS256"]
        });
    } catch {
        return res.status(401).json({ message: "La sesión expiró o el token no es válido." });
    }

    // El token no basta: una cuenta desactivada pierde el acceso de inmediato, aunque su token siga vigente.
    try {
        if (!/^\d+$/.test(String(claims.sub)) || !(await isUserActive(Number(claims.sub)))) {
            return res.status(401).json({ message: "Tu cuenta fue desactivada. Contacta al administrador." });
        }
        req.auth = claims;
        return next();
    } catch (error) {
        return next(error);
    }
}

export function authorizeRoles(...allowedRoles) {
    const roles = new Set(allowedRoles.map((role) => role.toUpperCase()));
    return (req, res, next) => {
        const userRole = String(req.auth?.role ?? "").toUpperCase();
        if (!roles.has(userRole)) {
            return res.status(403).json({ message: "No tienes permisos para realizar esta acción." });
        }
        return next();
    };
}
