// Reglas de correo y contraseña nueva. El frontend aplica las mismas (frontend/src/utils/validation.js).

// texto@dominio.ext, sin espacios.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MESSAGE = "Ingresa un correo electrónico válido, con @ y dominio (ejemplo: nombre@correo.com).";

export const PASSWORD_MESSAGE =
    "La contraseña debe tener mínimo 8 caracteres e incluir al menos una letra mayúscula, una minúscula, un número y un símbolo (por ejemplo * _ - $).";

export function isValidEmail(value) {
    return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

// Solo para contraseñas nuevas: el inicio de sesión no la aplica, para no bloquear cuentas anteriores.
export function isStrongPassword(value) {
    return typeof value === "string"
        && value.length >= 8
        && /\p{Lu}/u.test(value)
        && /\p{Ll}/u.test(value)
        && /\p{Nd}/u.test(value)
        && /[^\p{L}\p{N}\s]/u.test(value);
}
