import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Se requiere autenticación." });
    }

    try {
        req.auth = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "stockplan-api",
            audience: "stockplan-frontend",
            algorithms: ["HS256"]
        });
        return next();
    } catch {
        return res.status(401).json({ message: "La sesión expiró o el token no es válido." });
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
