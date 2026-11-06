import { getAccessToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Crea el pedido del cliente con lo que hay en el carrito.
// Solo se envían la referencia (producto + talla) y la cantidad: el precio lo calcula el servidor.
export async function createOrder(cartItems) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Inicia sesión con tu cuenta de usuario para hacer el pedido.");

    let response;
    try {
        response = await fetch(`${API_BASE_URL}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
                items: cartItems.map((item) => ({ referenceId: item.referenceId, quantity: item.quantity }))
            })
        });
    } catch {
        throw new Error("No fue posible conectar con el servidor. Intenta de nuevo en unos minutos.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(
            response.status === 401
                ? "Tu sesión expiró. Inicia sesión de nuevo para hacer el pedido."
                : response.status === 403
                    ? "Tu cuenta no puede hacer pedidos: solo las cuentas de usuario (clientes) pueden comprar."
                    : data.message || "No fue posible registrar el pedido."
        );
        error.status = response.status;
        throw error;
    }
    return data.order;
}

async function authorizedRequest(path, options = {}) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }
        });
    } catch {
        throw new Error("No fue posible conectar con el servidor. Intenta de nuevo en unos minutos.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || "No fue posible completar la solicitud.");
        error.status = response.status;
        throw error;
    }
    return data;
}

// Historial de pedidos del usuario con sesión iniciada.
export async function getMyOrders() {
    return authorizedRequest("/pedidos");
}

// El usuario cancela su pedido (solo se permite dentro del plazo que define el servidor).
export async function cancelMyOrder(orderId) {
    return (await authorizedRequest(`/pedidos/${encodeURIComponent(orderId)}/cancelar`, { method: "POST", body: "{}" })).order;
}

// Avisos de la tienda sobre los pedidos del usuario (campana del navbar).
export async function getMyNotifications() {
    return (await authorizedRequest("/pedidos/notificaciones")).notifications;
}
