const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const TOKEN_KEY = "stockplan-access-token";
const USER_KEY = "stockplan-auth-user";
const AUTH_CHANGE_EVENT = "stockplan-auth-changed";

async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || "No fue posible completar la solicitud.");
        error.status = response.status;
        throw error;
    }
    return data;
}

export async function loginRequest(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return parseResponse(response);
}

export async function registerRequest({ firstName, lastName, email, password }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password })
    });
    return parseResponse(response);
}

async function adminRequest(path, options = {}) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("La sesión no está activa. Vuelve a iniciar sesión.");

    const response = await fetch(`${API_BASE_URL}/admin/staff${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...options.headers
        }
    });
    return parseResponse(response);
}

export async function getStaffAccounts() {
    const data = await adminRequest("");
    return data.users;
}

export async function createStaffAccount(account) {
    const data = await adminRequest("", {
        method: "POST",
        body: JSON.stringify(account)
    });
    return data.user;
}

export function saveAuthSession({ accessToken, user }) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function getSessionUser() {
    try {
        return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
    } catch {
        return null;
    }
}

export function clearAuthSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAuthChangeEventName() {
    return AUTH_CHANGE_EVENT;
}

export async function verifySession() {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("No hay una sesión activa.");

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await parseResponse(response);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
}