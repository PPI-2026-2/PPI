// Reglas de validación compartidas por los formularios. El backend aplica las mismas reglas.

export const REQUIRED_MESSAGE = "Este campo es obligatorio.";
export const FORM_INCOMPLETE_MESSAGE = "Completa los campos obligatorios antes de guardar.";
export const FORM_INVALID_MESSAGE = "Revisa los campos marcados antes de guardar.";

// texto@dominio.ext, sin espacios.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MESSAGE = "Escribe un correo válido, con @ y dominio. Ejemplo: nombre@correo.com.";

export const PASSWORD_RULES = [
    { id: "length", label: "Mínimo 8 caracteres", test: (value) => value.length >= 8 },
    { id: "upper", label: "Una letra mayúscula", test: (value) => /\p{Lu}/u.test(value) },
    { id: "lower", label: "Una letra minúscula", test: (value) => /\p{Ll}/u.test(value) },
    { id: "number", label: "Un número", test: (value) => /\p{Nd}/u.test(value) },
    { id: "symbol", label: "Un símbolo, por ejemplo * _ - $", test: (value) => /[^\p{L}\p{N}\s]/u.test(value) }
];
export const PASSWORD_MESSAGE = "La contraseña no cumple todos los requisitos.";

// Precio: NUMBER(12,2), 0 o más con máximo 2 decimales.
export const PRICE_MESSAGE = "Escribe un precio de 0 o más, con máximo 2 decimales.";
export const isPrice = (value) => /^\d{1,10}(\.\d{1,2})?$/.test(String(value).trim());

// Cantidades: enteros sin signo.
export const isWholeNumber = (value) => /^\d+$/.test(String(value).trim());

export function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === "";
}

export function isValidEmail(value) {
    return EMAIL_PATTERN.test(String(value ?? "").trim());
}

export function isStrongPassword(value) {
    return PASSWORD_RULES.every((rule) => rule.test(String(value ?? "")));
}

// Mensaje del campo: obligatorio si está vacío; si no, el de la primera regla que falle.
// Uso: fieldError(form.email, [isValidEmail, EMAIL_MESSAGE]).
export function fieldError(value, ...rules) {
    if (isBlank(value)) return REQUIRED_MESSAGE;
    const failed = rules.find(([test]) => !test(value));
    return failed ? failed[1] : "";
}

// Recibe { campo: mensaje } y deja solo los campos con error.
export function collectErrors(checks) {
    return Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
}

// Aviso general sobre el formulario según el tipo de errores.
export function summaryMessage(errors) {
    const messages = Object.values(errors);
    if (!messages.length) return "";
    return messages.includes(REQUIRED_MESSAGE) ? FORM_INCOMPLETE_MESSAGE : FORM_INVALID_MESSAGE;
}
