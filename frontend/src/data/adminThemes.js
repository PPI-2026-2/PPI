// Paletas del panel (las mismas Azure del panel del empleado) y claves donde se recuerda la elección.
export const adminPalettes = [
    { id: "azure-soft", name: "Suave", description: "Azul grisáceo y fondos opacos", swatch: "#176b9a" },
    { id: "azure-cloud", name: "Nube", description: "Azul acero con fondos fríos", swatch: "#386f93" },
    { id: "azure-portal", name: "Portal", description: "Azul Microsoft con contraste moderado", swatch: "#0f6cbd" },
    { id: "azure-night", name: "Equilibrado", description: "Claro y cálido; con variante nocturna", swatch: "#477b89" }
];

export const DEFAULT_PALETTE = "azure-portal";
export const PALETTE_STORAGE_KEY = "stockplan-admin-palette";
// Misma clave que usa el panel del empleado: el modo oscuro se recuerda para ambos.
export const THEME_STORAGE_KEY = "stockplan-theme";

export function readStoredPalette() {
    try {
        const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
        return adminPalettes.some((palette) => palette.id === stored) ? stored : DEFAULT_PALETTE;
    } catch {
        return DEFAULT_PALETTE;
    }
}

export function readStoredDarkMode() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
    } catch {
        return false;
    }
}

export function storeTheme({ palette, isDarkMode }) {
    try {
        localStorage.setItem(PALETTE_STORAGE_KEY, palette);
        localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
    } catch {
        // Sin almacenamiento: el tema funciona igual durante la sesión.
    }
}
