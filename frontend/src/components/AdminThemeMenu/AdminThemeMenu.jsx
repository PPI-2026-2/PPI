import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

import { adminPalettes } from "../../data/adminThemes";

function AdminThemeMenu({ palette, onChangePalette, isDarkMode, onToggleDarkMode }) {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
        };
    }, []);

    return (
        <div className="adm-theme">
            <div className="adm-popover-anchor" ref={containerRef}>
                <button
                    type="button"
                    className="admin-layout__icon-button"
                    onClick={() => setIsOpen((previous) => !previous)}
                    aria-label="Panel de colores"
                    aria-expanded={isOpen}
                    title="Panel de colores"
                >
                    <Palette size={18} />
                </button>

                {isOpen && (
                    <div className="adm-popover adm-popover--palette" role="group" aria-label="Paleta de colores">
                        <div className="adm-popover__title">Ideas de color</div>
                        {adminPalettes.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                aria-pressed={option.id === palette}
                                className={`adm-palette ${option.id === palette ? "is-selected" : ""}`}
                                onClick={() => { onChangePalette(option.id); setIsOpen(false); }}
                            >
                                <span className="adm-palette__dot" style={{ "--swatch": option.swatch }} />
                                <span className="adm-palette__copy">
                                    <strong>{option.name}</strong>
                                    <small>{option.description}</small>
                                </span>
                                {option.id === palette && <Check size={15} className="adm-palette__check" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                type="button"
                className="admin-layout__icon-button"
                onClick={onToggleDarkMode}
                aria-pressed={isDarkMode}
                aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
                title={isDarkMode ? "Modo claro" : "Modo oscuro"}
            >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
        </div>
    );
}

export default AdminThemeMenu;
