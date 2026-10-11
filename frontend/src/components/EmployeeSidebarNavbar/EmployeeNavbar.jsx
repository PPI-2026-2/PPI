import {
    Menu,
    X,
    Moon,
    Sun,
    Palette,
    LogOut,
    Boxes
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, getSessionUser } from "../../services/auth";

import "./EmployeeNavbar.css";

function EmployeeNavbar({
    isSidebarCollapsed,
    onToggleSidebar,
    isDarkMode,
    onToggleDarkMode,
    palette,
    onChangePalette
}) {
    const navigate = useNavigate();
    const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
    const currentUser = getSessionUser();

    const palettes = [
        { id: "azure-soft", name: "Suave", description: "Azul grisáceo y fondos opacos", swatch: "#176b9a" },
        { id: "azure-cloud", name: "Nube", description: "Azul acero con fondos fríos", swatch: "#386f93" },
        { id: "azure-portal", name: "Portal", description: "Azul Microsoft con contraste moderado", swatch: "#0f6cbd" },
        { id: "azure-night", name: "Equilibrado", description: "Claro y cálido; con variante nocturna", swatch: "#477b89" }
    ];

    return (
        <header className="employee-navbar">

            <div className="employee-navbar__left">

                <button
                    type="button"
                    className="employee-navbar__menu-button"
                    onClick={onToggleSidebar}
                    aria-label={
                        isSidebarCollapsed
                            ? "Abrir menú"
                            : "Cerrar menú"
                    }
                >
                    {isSidebarCollapsed ? (
                        <Menu size={22} />
                    ) : (
                        <X size={22} />
                    )}
                </button>


                <div className="employee-navbar__brand">
                    <span className="employee-navbar__brand-icon"><Boxes size={19} /></span>
                    <span>StockPlan</span>
                    <span className="employee-navbar__divider" />
                    <span className="employee-navbar__workspace">Centro de operaciones</span>
                </div>

            </div>


            <div className="employee-navbar__right">

                <span className="employee-navbar__user-name">
                    <span className="employee-navbar__user-avatar">E</span>
                    <span>{currentUser?.name || "Empleado"}</span>
                </span>


                <div className="employee-navbar__palette-picker">
                    <button
                        type="button"
                        className="employee-navbar__icon-button"
                        onClick={() => setIsPaletteMenuOpen((isOpen) => !isOpen)}
                        aria-label="Elegir paleta de colores"
                        aria-expanded={isPaletteMenuOpen}
                    >
                        <Palette size={19} />
                    </button>
                    {isPaletteMenuOpen && (
                        <div className="employee-navbar__palette-menu" role="group" aria-label="Ideas de color Azure">
                            <span className="employee-navbar__palette-title">Ideas de color</span>
                            {palettes.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`employee-navbar__palette-option ${palette === option.id ? "is-selected" : ""}`}
                                    aria-pressed={palette === option.id}
                                    onClick={() => {
                                        onChangePalette(option.id);
                                        setIsPaletteMenuOpen(false);
                                    }}
                                >
                                    <span className="employee-navbar__palette-swatch" style={{ "--palette-swatch": option.swatch }} />
                                    <span className="employee-navbar__palette-copy">
                                        <strong>{option.name}</strong>
                                        <small>{option.description}</small>
                                    </span>
                                    {palette === option.id && <span className="employee-navbar__palette-check">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>


                <button
                    type="button"
                    className="employee-navbar__icon-button"
                    onClick={onToggleDarkMode}
                    aria-label={
                        isDarkMode
                            ? "Activar modo claro"
                            : "Activar modo oscuro"
                    }
                >
                    {isDarkMode ? (
                        <Sun size={20} />
                    ) : (
                        <Moon size={20} />
                    )}
                </button>

                <button
                    type="button"
                    className="employee-navbar__logout"
                    onClick={() => {
                        clearAuthSession();
                        navigate("/", { replace: true });
                    }}
                    title="Cerrar sesión"
                >
                    <LogOut size={17} />
                    <span>Cerrar sesión</span>
                </button>

            </div>

        </header>
    );
}

export default EmployeeNavbar;