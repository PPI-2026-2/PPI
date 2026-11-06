import { getAccessToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const ORDER_STATUS_LABEL = {
    PENDIENTE: "Pendiente",
    INCOMPLETO: "Incompleto",
    COMPLETO: "Completo",
    RECLAMADO: "Entregado",
    CANCELADO: "Cancelado"
};

const priceFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export const formatOrderPrice = (value) => priceFormat.format(Number(value) || 0);
export const formatOrderDate = (value) => (value ? dateFormat.format(new Date(value)) : "—");

async function request(path, { method = "GET", body } = {}) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("La sesión no está activa. Vuelve a iniciar sesión.");

    let response;
    try {
        response = await fetch(`${API_BASE_URL}/empleado${path}`, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: body === undefined ? undefined : JSON.stringify(body)
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

// statuses: ["PENDIENTE", "INCOMPLETO"]; sin argumento devuelve todos los pedidos.
export async function getEmployeeOrders(statuses) {
    const query = statuses?.length ? `?estado=${statuses.join(",")}` : "";
    return (await request(`/pedidos${query}`)).orders;
}

export async function getOrdersSummary() {
    return (await request("/pedidos/resumen")).counts;
}

export async function getEmployeeOrder(id) {
    return (await request(`/pedidos/${encodeURIComponent(id)}`)).order;
}

// lines: [{ detailId, quantity }] con todas las líneas; quantity = unidades confirmadas en tienda.
export async function verifyEmployeeOrder(id, lines, observation) {
    // Devuelve { order, notification }: notification.status = "sent" | "simulated" | "failed" | "unchanged".
    return request(`/pedidos/${encodeURIComponent(id)}/verificar`, { method: "POST", body: { lines, observation } });
}

export async function deliverEmployeeOrder(id) {
    return (await request(`/pedidos/${encodeURIComponent(id)}/entregar`, { method: "POST", body: {} })).order;
}
