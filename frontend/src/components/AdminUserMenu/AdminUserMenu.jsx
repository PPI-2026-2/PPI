import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";

const roleLabels = { ADMINISTRADOR: "Administrador", EMPLEADO: "Empleado", USUARIO: "Usuario" };

function AdminUserMenu({ user, onLogout }) {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        const handleEscape = (event) => { if (event.key === "Escape") setIsOpen(false); };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const name = user?.name || "Administrador";
    const role = roleLabels[user?.role] || "Administrador";

    return (
        <div className="adm-popover-anchor" ref={containerRef}>
            <button
                type="button"
                className="adm-user"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <span className="adm-user__text">
                    <strong>{name}</strong>
                    <small>{role}</small>
                </span>
                <span className="adm-user__avatar"><User size={18} /></span>
            </button>

            {isOpen && (
                <div className="adm-popover adm-popover--narrow" role="menu">
                    <div className="adm-popover__profile">
                        <strong>{name}</strong>
                        {user?.email && <small>{user.email}</small>}
                    </div>
                    <button type="button" role="menuitem" className="adm-menu-item" onClick={onLogout}>
                        <LogOut size={16} /> Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

export default AdminUserMenu;