const initialOrders = [
    {
        id: "SP-1048",
        customer: "Camila Rojas",
        email: "camila.rojas@example.com",
        date: "03 oct 2026, 10:42",
        status: "Pendiente",
        total: 489900,
        products: [
            { name: "Runfalcon 5", size: 38, quantity: 1, price: 299900 },
            { name: "Breaknet 2.0", size: 37, quantity: 1, price: 190000 }
        ]
    },
    {
        id: "SP-1047",
        customer: "Mateo García",
        email: "mateo.garcia@example.com",
        date: "03 oct 2026, 09:18",
        status: "Pendiente",
        total: 319900,
        products: [
            { name: "Galaxy 7", size: 40, quantity: 1, price: 289900 },
            { name: "Accesorio deportivo", size: null, quantity: 1, price: 30000 }
        ]
    },
    {
        id: "SP-1046",
        customer: "Valentina Pérez",
        email: "valentina.perez@example.com",
        date: "02 oct 2026, 16:05",
        status: "Pendiente",
        total: 729900,
        products: [
            { name: "Response Super", size: 39, quantity: 1, price: 399900 },
            { name: "Duramo SL", size: 39, quantity: 1, price: 330000 }
        ]
    },
    {
        id: "SP-1045",
        customer: "Santiago López",
        email: "santiago.lopez@example.com",
        date: "02 oct 2026, 13:30",
        status: "Completo",
        total: 259900,
        products: [{ name: "Breaknet 2.0", size: 41, quantity: 1, price: 259900 }]
    },
    {
        id: "SP-1044",
        customer: "Daniela Torres",
        email: "daniela.torres@example.com",
        date: "01 oct 2026, 11:12",
        status: "Completo",
        total: 619900,
        products: [{ name: "Response Super", size: 37, quantity: 1, price: 399900 }, { name: "Duramo SL", size: 37, quantity: 1, price: 220000 }]
    },
    {
        id: "SP-1043",
        customer: "Juan Martínez",
        email: "juan.martinez@example.com",
        date: "01 oct 2026, 08:54",
        status: "Completo",
        total: 399900,
        products: [{ name: "Response Super", size: 42, quantity: 1, price: 399900 }]
    },
    {
        id: "SP-1042",
        customer: "Isabella Castro",
        email: "isabella.castro@example.com",
        date: "30 sep 2026, 15:06",
        status: "Incompleto",
        incompleteReason: "Uno de los productos solicitados no está disponible actualmente.",
        total: 459900,
        products: [{ name: "Runfalcon 5", size: 36, quantity: 1, price: 299900 }, { name: "Galaxy 7", size: 36, quantity: 1, price: 160000 }]
    },
    {
        id: "SP-1041",
        customer: "Nicolás Herrera",
        email: "nicolas.herrera@example.com",
        date: "30 sep 2026, 12:21",
        status: "Incompleto",
        incompleteReason: "Falta confirmar la disponibilidad del accesorio solicitado.",
        total: 339900,
        products: [{ name: "Duramo SL", size: 43, quantity: 1, price: 279900 }, { name: "Accesorio deportivo", size: null, quantity: 1, price: 60000 }]
    }
];

const STORAGE_KEY = "stockplan-demo-orders";

export function getEmployeeOrders() {
    try {
        const savedOrders = localStorage.getItem(STORAGE_KEY);
        return savedOrders ? JSON.parse(savedOrders) : initialOrders;
    } catch {
        return initialOrders;
    }
}

export function getEmployeeOrder(orderId) {
    return getEmployeeOrders().find((order) => order.id === orderId);
}

export function markOrderAsComplete(orderId) {
    return updateEmployeeOrderStatus(orderId, "Completo");
}

export function updateEmployeeOrderStatus(orderId, status, incompleteReason) {
    const validStatuses = ["Pendiente", "Incompleto", "Completo"];
    if (!validStatuses.includes(status)) return getEmployeeOrders();

    const updatedOrders = getEmployeeOrders().map((order) => {
        if (order.id !== orderId) return order;
        if (
            order.status === status
            && (status !== "Incompleto" || incompleteReason === undefined || incompleteReason.trim() === (order.incompleteReason ?? ""))
        ) return order;
        return {
            ...order,
            status,
            delivered: false,
            ...(status === "Incompleto" && incompleteReason !== undefined
                ? { incompleteReason: incompleteReason.trim() }
                : {})
        };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    return updatedOrders;
}

export function markOrderAsDelivered(orderId) {
    const updatedOrders = getEmployeeOrders().map((order) =>
        order.id === orderId && order.status === "Completo"
            ? { ...order, delivered: true }
            : order
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    return updatedOrders;
}

export function formatOrderPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(price);
}
