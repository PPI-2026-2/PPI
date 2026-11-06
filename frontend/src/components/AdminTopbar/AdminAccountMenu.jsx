import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

const ROLE_LABELS = {
    ADMINISTRADOR: "Administrador",
    EMPLEADO: "Empleado",
    USUARIO: "Usuario"
};

function getInitials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "A";
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

// Nombre del administrador, su rol debajo y un avatar circular. Al hacer clic: cerrar sesión.
function AdminAccountMenu({ user, onLogout }) {
    const rootRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClick = (event) => {
            if (!rootRef.current?.contains(event.target)) setIsOpen(false);
        };
        const handleKey = (event) => {
            if (event.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [isOpen]);

    const name = user?.name || "Administrador";
    const role = ROLE_LABELS[user?.role] || "Administrador";

    return (
        <div className="adm-top__menu" ref={rootRef}>
            <button
                type="button"
                className="adm-top__account"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-expanded={isOpen}
                aria-label="Cuenta"
            >
                <span className="adm-top__account-text">
                    <strong>{name}</strong>
                    <small>{role}</small>
                </span>
                <span className="adm-top__avatar" aria-hidden="true">{getInitials(name)}</span>
                <ChevronDown size={14} className="adm-top__account-chevron" aria-hidden="true" />
            </button>

            {isOpen && (
                <div className="adm-top__panel adm-top__panel--right adm-top__panel--account">
                    <div className="adm-top__account-card">
                        <span className="adm-top__avatar adm-top__avatar--lg" aria-hidden="true">{getInitials(name)}</span>
                        <span className="adm-top__result-text">
                            <strong>{name}</strong>
                            {user?.email && <small>{user.email}</small>}
                            <small>{role}</small>
                        </span>
                    </div>
                    <button type="button" className="adm-top__menu-item" onClick={onLogout}>
                        <LogOut size={15} /> Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

export default AdminAccountMenu;