import { getAccessToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const priceFormat = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

export const formatPrice = (value) => priceFormat.format(Number(value));

async function request(path, { method = "GET", body } = {}) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("La sesión no está activa. Vuelve a iniciar sesión.");

    const response = await fetch(`${API_BASE_URL}/admin${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || "No fue posible completar la solicitud.");
        error.status = response.status;
        throw error;
    }
    return data;
}

// Proveedores
export async function getSuppliers(status) {
    const query = status ? `?estado=${encodeURIComponent(status)}` : "";
    return (await request(`/proveedores${query}`)).suppliers;
}
export async function createSupplier(supplier) {
    return (await request("/proveedores", { method: "POST", body: supplier })).supplier;
}
export async function updateSupplier(id, changes) {
    return (await request(`/proveedores/${id}`, { method: "PATCH", body: changes })).supplier;
}

// Tallas
export async function getSizes() {
    return (await request("/tallas")).sizes;
}
export async function createSize(name) {
    return (await request("/tallas", { method: "POST", body: { name } })).size;
}

// Productos
export async function getProducts({ q, status } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("estado", status);
    const query = params.toString();
    return (await request(`/productos${query ? `?${query}` : ""}`)).products;
}
export async function getProduct(id) {
    return (await request(`/productos/${id}`)).product;
}
export async function createProduct(product) {
    return (await request("/productos", { method: "POST", body: product })).product;
}
export async function updateProduct(id, changes) {
    return (await request(`/productos/${id}`, { method: "PATCH", body: changes })).product;
}
export async function setProductStatus(id, status) {
    return (await request(`/productos/${id}/estado`, { method: "PATCH", body: { status } })).product;
}
export async function addProductSize(id, sizeId) {
    return (await request(`/productos/${id}/tallas`, { method: "POST", body: { sizeId } })).product;
}
export async function setProductSizeStatus(id, referenceId, status) {
    return (await request(`/productos/${id}/tallas/${referenceId}/estado`, {
        method: "PATCH",
        body: { status }
    })).product;
}
