// Servicios abiertos recientemente. Es solo una comodidad de este navegador (localStorage),
// por eso todo va dentro de try/catch: si el almacenamiento falla, la pantalla funciona igual.
const MAX_RECENT = 8;

const storageKey = (userId) => `stockplan-admin-recent-${userId || "anonimo"}`;

export function readRecent(userId) {
    try {
        const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((entry) => entry && typeof entry.id === "string" && Number.isFinite(entry.at));
    } catch {
        return [];
    }
}

export function recordVisit(userId, moduleId) {
    try {
        const others = readRecent(userId).filter((entry) => entry.id !== moduleId);
        const next = [{ id: moduleId, at: Date.now() }, ...others].slice(0, MAX_RECENT);
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch {
        // Sin almacenamiento disponible: simplemente no se recuerda.
    }
}

export function formatRelative(timestamp, now = Date.now()) {
    const minutes = Math.floor((now - timestamp) / 60000);
    if (minutes < 1) return "Justo ahora";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
    return new Date(timestamp).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}