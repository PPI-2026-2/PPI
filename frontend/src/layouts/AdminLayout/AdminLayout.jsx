import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, ShieldCheck } from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar/AdminSidebar";
import { clearAuthSession, getSessionUser } from "../../services/auth";

import "../../assets/style/admin.css";

function AdminLayout() {
    const navigate = useNavigate();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < 768);
    const currentUser = getSessionUser();

    const handleLogout = () => {
        clearAuthSession();
        navigate("/", { replace: true });
    };

    return (
        <div className="admin-layout">
            <header className="admin-layout__navbar">
                <div className="admin-layout__brand">
                    <button
                        type="button"
                        className="admin-layout__icon-button"
                        onClick={() => setIsSidebarCollapsed((previous) => !previous)}
                        aria-label="Mostrar u ocultar el menú"
                    >
                        <Menu size={18} />
                    </button>
                    <span className="admin-layout__mark"><ShieldCheck size={19} /></span>
                    <strong>StockPlan</strong>
                    <small>Administración</small>
                </div>
                <div className="admin-layout__account">
                    <span>{currentUser?.name || "Administrador"}</span>
                    <button type="button" className="admin-layout__logout" onClick={handleLogout}>
                        <LogOut size={15} /> Cerrar sesión
                    </button>
                </div>
            </header>

            <div className="admin-layout__body">
                <AdminSidebar isCollapsed={isSidebarCollapsed} />
                <main className="admin-layout__content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
