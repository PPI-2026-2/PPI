import { Menu, ShieldCheck } from "lucide-react";

import AdminAccountMenu from "./AdminAccountMenu";
import AdminNotifications from "./AdminNotifications";
import AdminSearch from "./AdminSearch";

// Barra superior: menú lateral, nombre, buscador, notificaciones y cuenta.
function AdminTopbar({ user, onToggleSidebar, onLogout }) {
    return (
        <header className="adm-top">
            <div className="adm-top__left">
                <button type="button" className="adm-top__icon-button" onClick={onToggleSidebar} aria-label="Mostrar u ocultar el menú">
                    <Menu size={19} />
                </button>
                <span className="adm-top__brand">
                    <span className="adm-top__mark"><ShieldCheck size={17} /></span>
                    <strong>STOCKPLAN</strong>
                </span>
            </div>

            <AdminSearch />

            <div className="adm-top__right">
                <AdminNotifications />
                <AdminAccountMenu user={user} onLogout={onLogout} />
            </div>
        </header>
    );
}

export default AdminTopbar;