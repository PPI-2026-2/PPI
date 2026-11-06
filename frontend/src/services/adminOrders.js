import { getAccessToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const priceFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatOrderMoney = (value) => priceFormat.format(Number(value) || 0);
export const formatOrderDateTime = (value) =>
    value ? new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—";

export const ORDER_STATUS_LABEL = {
    PENDIENTE: "Pendiente",
    INCOMPLETO: "Incompleto",
    COMPLETO: "Completo",
    RECLAMADO: "Reclamado",
    CANCELADO: "Cancelado"
};

async function request(path, { method = "GET", body } = {}) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("La sesión no está activa. Vuelve a iniciar sesión.");
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/admin/pedidos${path}`, {
            method,
            headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
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

// filters: { status, q, from, to, unclaimed, page, pageSize }
//   -> { orders, counts, unclaimedCount, unclaimedDays, pagination? }
export function getAdminOrders({ status, q, from, to, unclaimed, page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("pagina", page);
    if (pageSize) params.set("tamano", pageSize);
    if (unclaimed) params.set("sinReclamar", "1");
    else if (status) params.set("estado", status);
    if (q?.trim()) params.set("q", q.trim());
    if (from) params.set("desde", from);
    if (to) params.set("hasta", to);
    const query = params.toString();
    return request(query ? `?${query}` : "");
}

// Valor reclamado en tienda: { month: "2026-10" } o { from, to } -> { total, orders }
export function getClaimedValue({ month, from, to } = {}) {
    const params = new URLSearchParams();
    if (month) params.set("mes", month);
    else {
        if (from) params.set("desde", from);
        if (to) params.set("hasta", to);
    }
    const query = params.toString();
    return request(`/reclamado${query ? `?${query}` : ""}`);
}

export async function getAdminOrder(id) {
    return (await request(`/${encodeURIComponent(id)}`)).order;
}

// Solo pedidos COMPLETO que superaron los días sin reclamar: libera el stock separado.
export function cancelUnclaimedOrder(id) {
    return request(`/${encodeURIComponent(id)}/cancelar-sin-reclamar`, { method: "POST", body: {} });
}
