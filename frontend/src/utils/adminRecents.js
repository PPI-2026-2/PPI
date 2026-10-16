// Servicios del panel a los que entró el administrador (el más reciente primero).
// Se guardan en este navegador, por usuario. Solo se guarda el id del servicio y la hora.
const MAX_RECENTS = 8;
const CHANGE_EVENT = "stockplan-admin-recents-changed";

const storageKey = (userId) => `stockplan-admin-recents-${userId || "anon"}`;

export function getRecents(userId) {
    try {
        const list = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
        if (!Array.isArray(list)) return [];
        return list
            .filter((entry) => entry && typeof entry.id === "string" && typeof entry.visitedAt === "number")
            .slice(0, MAX_RECENTS);
    } catch {
        return [];
    }
}

export function recordVisit(userId, serviceId) {
    try {
        const list = getRecents(userId).filter((entry) => entry.id !== serviceId);
        list.unshift({ id: serviceId, visitedAt: Date.now() });
        localStorage.setItem(storageKey(userId), JSON.stringify(list.slice(0, MAX_RECENTS)));
        window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
        // Sin almacenamiento disponible: el panel funciona igual, solo no recuerda lo reciente.
    }
}

export function getRecentsEventName() {
    return CHANGE_EVENT;
}

export function formatRelativeTime(timestamp, now = Date.now()) {
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 45) return "Ahora mismo";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;

    const visited = new Date(timestamp);
    const today = new Date(now);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (visited.toDateString() === yesterday.toDateString()) return "Ayer";
    return visited.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}