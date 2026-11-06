import { getAccessToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const moneyFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatMoney = (value) => moneyFormat.format(Number(value) || 0);
export const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(Number(value) || 0);
export const formatDay = (key) => (key ? key.split("-").reverse().join("/") : "—");
export const formatDate = (value) => (value ? new Date(value).toLocaleDateString("es-CO", { dateStyle: "short" }) : "—");

async function request(path) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("La sesión no está activa. Vuelve a iniciar sesión.");
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/admin/analisis${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
        throw new Error("No fue posible conectar con el servidor.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || "No fue posible completar la solicitud.");
        error.status = response.status;
        throw error;
    }
    return data;
}

const withParams = (path, days, horizon) => {
    const params = new URLSearchParams();
    if (days) params.set("dias", days);
    if (horizon) params.set("horizonte", horizon);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
};

export const getReplenishment = (days, horizon) => request(withParams("/reposicion", days, horizon));
export const getBehavior = (days, horizon) => request(withParams("/comportamiento", days, horizon));
export const getSales = (days, horizon) => request(withParams("/ventas", days, horizon));
export const getAlerts = () => request("/alertas");
