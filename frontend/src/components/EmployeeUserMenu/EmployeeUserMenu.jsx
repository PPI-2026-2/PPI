import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";

import "./EmployeeUserMenu.css";

// Nombre con el rol debajo + icono circular. El menú solo tiene "Cerrar sesión";
// la sesión se cierra únicamente al hacer clic en ese botón.
function EmployeeUserMenu({ user, onLogout }) {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    return (
        <div className="emp-user" ref={containerRef}>
            <button
                type="button"
                className="emp-user__button"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <span className="emp-user__text">
                    <strong>{user?.name || "Empleado"}</strong>
                    <small>Empleado</small>
                </span>
                <span className="emp-user__avatar"><UserRound size={19} /></span>
            </button>

            {isOpen && (
                <div className="emp-user__menu">
                    <button type="button" className="emp-user__item" onClick={onLogout}>
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

export default EmployeeUserMenu;
