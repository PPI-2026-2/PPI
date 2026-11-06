import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Boxes, Menu } from "lucide-react";

import AdminNotifications from "../../components/AdminNotifications/AdminNotifications";
import AdminSearch from "../../components/AdminSearch/AdminSearch";
import AdminSidebar from "../../components/AdminSidebar/AdminSidebar";
import AdminThemeMenu from "../../components/AdminThemeMenu/AdminThemeMenu";
import AdminUserMenu from "../../components/AdminUserMenu/AdminUserMenu";
import { findModuleByPath } from "../../data/adminModules";
import { readStoredDarkMode, readStoredPalette, storeTheme } from "../../data/adminThemes";
import { clearAuthSession, getSessionUser } from "../../services/auth";
import { recordVisit } from "../../utils/recentModules";

import "../../assets/style/admin.css";
import "../../assets/style/admin-home.css";
import "../../assets/style/admin-theme.css";

function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < 768);
    const [palette, setPalette] = useState(readStoredPalette);
    const [isDarkMode, setIsDarkMode] = useState(readStoredDarkMode);
    const currentUser = getSessionUser();
    const userId = currentUser?.id;

    // Cada vez que el administrador entra a un servicio, queda como "reciente" en el inicio.
    useEffect(() => {
        const module = findModuleByPath(location.pathname);
        if (module && !module.planned) recordVisit(userId, module.id);
    }, [location.pathname, userId]);

    useEffect(() => {
        storeTheme({ palette, isDarkMode });
    }, [palette, isDarkMode]);

    const handleLogout = () => {
        clearAuthSession();
        navigate("/", { replace: true });
    };

    return (
        <div className={`admin-layout ${isDarkMode ? "admin-layout--dark" : ""}`} data-palette={palette}>
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
                    <Link to="/administrador" className="admin-layout__home-link" aria-label="Ir al inicio">
                        <span className="admin-layout__mark"><Boxes size={19} /></span>
                        <strong>STOCKPLAN</strong>
                    </Link>
                </div>

                <AdminSearch />

                <div className="admin-layout__actions">
                    <AdminThemeMenu
                        palette={palette}
                        onChangePalette={setPalette}
                        isDarkMode={isDarkMode}
                        onToggleDarkMode={() => setIsDarkMode((previous) => !previous)}
                    />
                    <AdminNotifications refreshKey={location.pathname} />
                    <AdminUserMenu user={currentUser} onLogout={handleLogout} />
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
