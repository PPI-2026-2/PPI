import { AppError } from "./app-error.js";

export function requireString(value, label, { max, min = 1 } = {}) {
    if (typeof value !== "string") throw new AppError(`${label} es obligatorio.`);
    const text = value.trim();
    if (text.length < min) throw new AppError(`${label} es obligatorio.`);
    if (max && text.length > max) throw new AppError(`${label} no puede superar ${max} caracteres.`);
    return text;
}

// Vacío o ausente => null (se guarda como NULL).
export function optionalString(value, label, { max } = {}) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string" && !value.trim()) return null;
    return requireString(value, label, { max });
}

export function requireId(value, label) {
    const number = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
    if (!Number.isSafeInteger(number) || number <= 0) throw new AppError(`${label} no es válido.`);
    return number;
}

export function requireInt(value, label, { min = 0, max = 2147483647 } = {}) {
    const number = typeof value === "string" && /^-?\d+$/.test(value.trim()) ? Number(value) : value;
    if (!Number.isSafeInteger(number) || number < min || number > max) {
        throw new AppError(`${label} debe ser un entero entre ${min} y ${max}.`);
    }
    return number;
}

// Dinero: NUMBER(12,2) => hasta 9.999.999.999,99 y máximo 2 decimales.
export function requireMoney(value, label) {
    const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > 9999999999.99) {
        throw new AppError(`${label} debe ser un valor numérico válido.`);
    }
    if (Math.abs(number * 100 - Math.round(number * 100)) > 1e-6) {
        throw new AppError(`${label} admite máximo 2 decimales.`);
    }
    return Math.round(number * 100) / 100;
}

export function requireOneOf(value, label, allowed) {
    const text = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (!allowed.includes(text)) throw new AppError(`${label} debe ser uno de: ${allowed.join(", ")}.`);
    return text;
}
