import {
    clearAuthSession,
    getAccessToken,
    getLastActivity,
    getTokenTime,
    touchActivity,
    updateAccessToken
} from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const NOTICE_KEY = "stockplan-session-notice";

// Reglas de la sesión: el token dura 30 minutos (JWT_EXPIRES_IN). Mientras la persona use el sistema, se renueva solo.
// Si pasa 20 minutos sin tocar nada, la sesión se cierra aunque el token todavía sea válido.
const IDLE_LIMIT_MS = 20 * 60 * 1000;
const RENEW_AFTER_MS = 10 * 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"];

export const IDLE_NOTICE = "Tu sesión se cerró porque estuvo inactiva durante 20 minutos.";
const EXPIRED_NOTICE = "Tu sesión terminó. Vuelve a iniciar sesión.";

const nativeFetch = window.fetch.bind(window);
let isEnding = false;
let isRenewing = false;

function endSession(notice) {
    if (isEnding) return;
    isEnding = true;
    clearAuthSession();
    try {
        sessionStorage.setItem(NOTICE_KEY, notice);
    } catch {
        /* sin almacenamiento: se llega al login sin el aviso */
    }
    window.location.assign("/login");
}

export function readSessionNotice() {
    return sessionStorage.getItem(NOTICE_KEY) ?? "";
}

export function clearSessionNotice() {
    sessionStorage.removeItem(NOTICE_KEY);
}

async function renewToken() {
    if (isRenewing) return;
    isRenewing = true;
    try {
        const response = await nativeFetch(`${API_BASE_URL}/auth/renovar`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getAccessToken()}` }
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) endSession(data.message || EXPIRED_NOTICE);
        else if (response.ok && getAccessToken()) updateAccessToken(data.accessToken);
    } catch {
        /* sin conexión: se reintenta en la siguiente revisión, el token aún tiene margen */
    } finally {
        isRenewing = false;
    }
}

function checkSession() {
    if (!getAccessToken()) return;
    const now = Date.now();
    const lastActivity = getLastActivity();
    // Sesión abierta antes de existir este control: empieza a contar desde ahora.
    if (!lastActivity) {
        touchActivity();
        return;
    }
    if (now - lastActivity >= IDLE_LIMIT_MS) {
        endSession(IDLE_NOTICE);
        return;
    }
    const tokenTime = getTokenTime();
    if (now - tokenTime >= RENEW_AFTER_MS && lastActivity > tokenTime) renewToken();
}

// Cualquier respuesta 401 con una sesión abierta significa que venció o que la cuenta se desactivó: se lleva al login.
async function fetchWithSessionCheck(...args) {
    const response = await nativeFetch(...args);
    const url = String(args[0]?.url ?? args[0]);
    if (response.status === 401 && getAccessToken() && url.startsWith(API_BASE_URL) && !url.endsWith("/auth/login")) {
        const data = await response.clone().json().catch(() => ({}));
        endSession(data.message || EXPIRED_NOTICE);
    }
    return response;
}

export function startSessionWatch() {
    window.fetch = fetchWithSessionCheck;
    const onActivity = () => {
        if (getAccessToken()) touchActivity();
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { capture: true, passive: true }));
    checkSession();
    window.setInterval(checkSession, CHECK_EVERY_MS);
}
