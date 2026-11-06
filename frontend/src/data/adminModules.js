import {
    Activity,
    ArrowLeftRight,
    BellRing,
    Boxes,
    ClipboardList,
    Package,
    PackagePlus,
    Repeat,
    TrendingUp,
    Truck,
    Users
} from "lucide-react";

// Servicios del panel del administrador. Los que tienen `planned: true` son ideas por desarrollar:
// se ven en el inicio y en el buscador, pero todavía no abren ninguna pantalla.
export const adminModules = [
    {
        id: "productos", title: "Productos", group: "Catálogo", path: "/administrador/productos",
        icon: Package, color: "#0f6cbd",
        keywords: ["producto", "zapatos", "precio", "catalogo", "referencia", "descripcion", "imagen"]
    },
    {
        id: "catalogo", title: "Proveedores y tallas", group: "Catálogo", path: "/administrador/catalogo",
        icon: Truck, color: "#7a5cc7",
        keywords: ["proveedor", "proveedores", "talla", "tallas", "numero", "dias de entrega", "contacto"]
    },
    {
        id: "recepciones", title: "Recepciones", group: "Inventario", path: "/administrador/recepciones",
        icon: PackagePlus, color: "#2f855a",
        keywords: ["recepcion", "mercancia", "ingreso", "entrada", "rechazo", "aceptada", "confirmar"]
    },
    {
        id: "inventario", title: "Stock", group: "Inventario", path: "/administrador/inventario",
        icon: Boxes, color: "#d97706",
        keywords: ["inventario", "stock", "existencias", "cantidad", "minimo", "ajuste", "agotado", "disponible"]
    },
    {
        id: "movimientos", title: "Movimientos", group: "Inventario", path: "/administrador/movimientos",
        icon: ArrowLeftRight, color: "#0e7490",
        keywords: ["movimiento", "historial", "trazabilidad", "kardex", "entradas", "salidas"]
    },
    {
        id: "pedidos", title: "Pedidos", group: "Pedidos", path: "/administrador/pedidos",
        icon: ClipboardList, color: "#9333ea",
        keywords: ["pedido", "pedidos", "clientes", "reclamado", "incompleto", "completo", "pendiente", "cancelado", "ordenes", "entregas"]
    },
    {
        id: "usuarios", title: "Personal", group: "Sistema", path: "/administrador/usuarios",
        icon: Users, color: "#475569",
        keywords: ["personal", "usuarios", "empleados", "administradores", "cuentas", "roles"]
    },
    {
        id: "reposicion", title: "Reposición", group: "Análisis", path: "/administrador/reposicion",
        icon: Repeat, color: "#b45309",
        keywords: ["reposicion", "reponer", "reorden", "pedido a proveedor", "sugerencias"]
    },
    {
        id: "comportamiento", title: "Comportamiento del inventario", group: "Análisis", path: "/administrador/comportamiento",
        icon: Activity, color: "#be185d",
        keywords: ["comportamiento", "rotacion", "analisis", "tendencia", "estadisticas"]
    },
    {
        id: "ventas", title: "Ventas y recomendaciones", group: "Análisis", path: "/administrador/ventas",
        icon: TrendingUp, color: "#15803d",
        keywords: ["ventas", "venta", "recomendaciones", "demanda", "compras"]
    },
    {
        id: "alertas", title: "Alertas y notificaciones", group: "Análisis", path: "/administrador/alertas",
        icon: BellRing, color: "#b91c1c",
        keywords: ["alertas", "notificaciones", "avisos", "pendientes", "reglas"]
    }
];

export const getModule = (id) => adminModules.find((module) => module.id === id);

// Minúsculas y sin tildes, para que "recepción" y "recepcion" coincidan.
export function normalizeText(text) {
    return String(text ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

// Módulo al que pertenece una ruta (el detalle de un producto cuenta como "Productos").
export function findModuleByPath(pathname) {
    return adminModules.find(
        (module) => module.path && (pathname === module.path || pathname.startsWith(`${module.path}/`))
    );
}

// Todas las palabras escritas deben aparecer en el nombre, el grupo o las palabras clave.
export function searchModules(query) {
    const words = normalizeText(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return adminModules.filter((module) => {
        const haystack = normalizeText([module.title, module.group, ...module.keywords].join(" "));
        return words.every((word) => haystack.includes(word));
    });
}
