const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Tienda pública: no necesita sesión.
async function request(path) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/store${path}`);
    } catch {
        throw new Error("No fue posible conectar con el servidor. Intenta de nuevo en unos minutos.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || "No fue posible cargar la información.");
        error.status = response.status;
        throw error;
    }
    return data;
}

// Solo productos con unidades disponibles en inventario.
export async function getStoreProducts() {
    return (await request("/productos")).products;
}

// Producto con todas sus tallas activas (cada una con isAvailable y maxQuantity).
export async function getStoreProduct(id) {
    return (await request(`/productos/${encodeURIComponent(id)}`)).product;
}
