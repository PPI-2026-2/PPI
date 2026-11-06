import {
    Activity,
    ArrowLeftRight,
    BellRing,
    Boxes,
    ClipboardList,
    Package,
    PackagePlus,
    RefreshCcw,
    TrendingUp,
    Truck,
    Users
} from "lucide-react";

// Catálogo de servicios del panel del administrador.
// Lo usan: la página de inicio (iconos), la barra lateral, el buscador y "Recientes".
// available: false = idea planteada para más adelante (se muestra como "Próximamente").
export const ADMIN_SERVICES = [
    {
        id: "productos",
        name: "Productos",
        group: "Catálogo",
        path: "/administrador/productos",
        icon: Package,
        color: "#0f6cbd",
        available: true,
        keywords: ["zapatos", "tenis", "calzado", "precio", "descripcion", "catalogo", "referencia", "imagen", "foto"]
    },
    {
        id: "catalogo",
        name: "Proveedores y tallas",
        group: "Catálogo",
        path: "/administrador/catalogo",
        icon: Truck,
        color: "#00858a",
        available: true,
        keywords: ["proveedor", "talla", "numero", "35", "43", "entrega", "telefono", "empresa"]
    },
    {
        id: "recepciones",
        name: "Recepciones",
        group: "Inventario",
        path: "/administrador/recepciones",
        icon: PackagePlus,
        color: "#2f7d4f",
        available: true,
        keywords: ["recepcion", "mercancia", "ingreso", "entrada", "rechazo", "aceptada", "recibir", "confirmar"]
    },
    {
        id: "inventario",
        name: "Stock",
        group: "Inventario",
        path: "/administrador/inventario",
        icon: Boxes,
        color: "#c26a12",
        available: true,
        keywords: ["inventario", "existencias", "ajuste", "minimo", "agotado", "disponible", "reservado", "unidades"]
    },
    {
        id: "movimientos",
        name: "Movimientos",
        group: "Inventario",
        path: "/administrador/movimientos",
        icon: ArrowLeftRight,
        color: "#6b4fbb",
        available: true,
        keywords: ["trazabilidad", "historial", "entradas", "salidas", "ajustes", "kardex", "registro"]
    },
    {
        id: "usuarios",
        name: "Personal",
        group: "Sistema",
        path: "/administrador/usuarios",
        icon: Users,
        color: "#4a5b66",
        available: true,
        keywords: ["usuarios", "empleados", "administradores", "cuentas", "staff", "roles", "crear"]
    },

    // ----- Ideas para las siguientes fases -----
    {
        id: "reposicion",
        name: "Reposición",
        group: "Inventario",
        path: "/administrador/reposicion",
        icon: RefreshCcw,
        color: "#b4451f",
        available: false,
        keywords: ["reabastecer", "compra", "punto de reorden", "pedido a proveedor", "sugerencia"]
    },
    {
        id: "comportamiento",
        name: "Comportamiento del inventario",
        group: "Inventario",
        path: "/administrador/comportamiento",
        icon: Activity,
        color: "#0a7c9b",
        available: false,
        keywords: ["rotacion", "analisis", "consumo", "tendencia", "estadisticas"]
    },
    {
        id: "ventas",
        name: "Ventas y recomendaciones",
        group: "Ventas",
        path: "/administrador/ventas",
        icon: TrendingUp,
        color: "#a3358b",
        available: false,
        keywords: ["ventas", "recomendacion", "sugerencias", "demanda", "mas vendidos"]
    },
    {
        id: "pedidos",
        name: "Pedidos",
        group: "Ventas",
        path: "/administrador/pedidos",
        icon: ClipboardList,
        color: "#3a6ea5",
        available: false,
        keywords: ["ordenes", "clientes", "entrega", "validacion", "aprobacion", "preparacion"]
    },
    {
        id: "alertas",
        name: "Alertas y notificaciones",
        group: "Sistema",
        path: "/administrador/alertas",
        icon: BellRing,
        color: "#b3261e",
        available: false,
        keywords: ["notificaciones", "avisos", "pendientes", "alarmas"]
    }
];

const normalize = (text) =>
    String(text ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();

export function getServiceById(id) {
    return ADMIN_SERVICES.find((service) => service.id === id);
}

// Servicio al que pertenece una ruta (también las sub-rutas, como /productos/12).
export function findServiceByPath(pathname) {
    return ADMIN_SERVICES.find(
        (service) => pathname === service.path || pathname.startsWith(`${service.path}/`)
    );
}

// Busca por nombre, grupo y palabras clave. Todas las palabras escritas deben coincidir.
export function searchServices(query, limit = 8) {
    const text = normalize(query);
    if (!text) return [];
    const terms = text.split(/\s+/);

    return ADMIN_SERVICES
        .map((service) => {
            const name = normalize(service.name);
            const haystack = normalize([service.name, service.group, ...service.keywords].join(" "));
            if (!terms.every((term) => haystack.includes(term))) return null;
            const keywordText = normalize(service.keywords.join(" "));
            // 0 = el nombre empieza así, 1 = el nombre lo contiene, 2 = palabra clave, 3 = solo el grupo.
            const score = name.startsWith(text) ? 0 : name.includes(text) ? 1 : keywordText.includes(text) ? 2 : 3;
            return { service, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score || a.service.name.localeCompare(b.service.name))
        .map((entry) => entry.service)
        .slice(0, limit);
}