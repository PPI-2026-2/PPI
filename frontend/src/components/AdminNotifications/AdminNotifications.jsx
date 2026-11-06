import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon, AlertTriangle, Bell, Info } from "lucide-react";

import { getAlerts } from "../../services/adminInsights";

const REFRESH_EVERY_MS = 120000;
const MIN_GAP_MS = 30000;
const SEVERITY_ICON = { CRITICA: AlertOctagon, ALTA: AlertTriangle, MEDIA: AlertTriangle, INFO: Info };

// Las alertas las calcula el backend (reglas de negocio de inventario, recepciones y pedidos).
function toNotifications(alerts) {
    return alerts.map((alert) => ({
        id: alert.id,
        icon: SEVERITY_ICON[alert.severity] ?? Info,
        title: alert.title,
        detail: alert.detail,
        path: alert.path
    }));
}

function AdminNotifications({ refreshKey }) {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const lastLoadRef = useRef(0);
    const [notifications, setNotifications] = useState([]);
    const [hasError, setHasError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const load = useCallback(async () => {
        lastLoadRef.current = Date.now();
        try {
            const { alerts } = await getAlerts();
            setNotifications(toNotifications(alerts));
            setHasError(false);
        } catch {
            setHasError(true);
        }
    }, []);

    // Carga inicial, cada dos minutos y al cambiar de pantalla (máximo una vez cada 30 s).
    useEffect(() => {
        if (Date.now() - lastLoadRef.current > MIN_GAP_MS) load();
    }, [load, refreshKey]);

    useEffect(() => {
        const timer = setInterval(load, REFRESH_EVERY_MS);
        return () => clearInterval(timer);
    }, [load]);

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

    const toggle = () => {
        if (!isOpen) load();
        setIsOpen((previous) => !previous);
    };

    const openItem = (item) => {
        setIsOpen(false);
        navigate(item.path);
    };

    return (
        <div className="adm-popover-anchor" ref={containerRef}>
            <button
                type="button"
                className="admin-layout__icon-button adm-bell"
                onClick={toggle}
                aria-label={`Notificaciones${notifications.length ? `, ${notifications.length} pendientes` : ""}`}
                aria-expanded={isOpen}
            >
                <Bell size={18} />
                {notifications.length > 0 && <span className="adm-bell__badge">{notifications.length}</span>}
            </button>

            {isOpen && (
                <div className="adm-popover" role="menu">
                    <div className="adm-popover__title">Notificaciones</div>
                    {notifications.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.id} type="button" role="menuitem" className="adm-notice" onClick={() => openItem(item)}>
                                <span className="adm-notice__icon"><Icon size={17} /></span>
                                <span>
                                    <strong>{item.title}</strong>
                                    <small>{item.detail}</small>
                                </span>
                            </button>
                        );
                    })}
                    {notifications.length > 0 && (
                        <button type="button" role="menuitem" className="adm-notice" onClick={() => openItem({ path: "/administrador/alertas" })}>
                            <span className="adm-notice__icon"><Bell size={17} /></span>
                            <span><strong>Ver todas las alertas</strong></span>
                        </button>
                    )}
                    {!hasError && notifications.length === 0 && <p className="adm-popover__empty">No tienes alertas ni pendientes.</p>}
                    {hasError && <p className="adm-popover__empty">No se pudieron cargar las alertas.</p>}
                </div>
            )}
        </div>
    );
}

export default AdminNotifications;
