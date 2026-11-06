import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getMyNotifications } from "../../services/orders";

import "./NotificationBell.css";

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" });
const seenKey = (userId) => `stockplan-notifications-seen-${userId}`;

function readSeen(userId) {
    try { return Number(localStorage.getItem(seenKey(userId))) || 0; } catch { return 0; }
}
function writeSeen(userId, value) {
    try { localStorage.setItem(seenKey(userId), String(value)); } catch { /* sin almacenamiento: se muestran como nuevas */ }
}

// Campana de avisos del cliente: cambios de estado de sus pedidos hechos por la tienda.
function NotificationBell({ user }) {
    const ref = useRef(null);
    const [notifications, setNotifications] = useState([]);
    const [seenId, setSeenId] = useState(() => readSeen(user.id));
    const [isOpen, setIsOpen] = useState(false);

    const load = useCallback(async () => {
        try { setNotifications(await getMyNotifications()); } catch { /* sin conexión: se conserva lo último */ }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
    }, [load]);

    useEffect(() => {
        const handleOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const unread = notifications.filter((item) => item.id > seenId).length;

    const toggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next) load();
        if (!next && notifications.length) markSeen();
    };
    const markSeen = () => {
        const newest = Math.max(seenId, ...notifications.map((item) => item.id));
        setSeenId(newest);
        writeSeen(user.id, newest);
    };

    return (
        <div className="notification-bell" ref={ref}>
            <button type="button" className="navbar__icon" onClick={toggle} aria-label="Avisos de tus pedidos" title="Avisos de tus pedidos" aria-expanded={isOpen}>
                <Bell size={22} strokeWidth={1.8} />
                {unread > 0 && <span className="navbar__cart-count">{unread}</span>}
            </button>
            {isOpen && (
                <div className="notification-bell__panel" role="menu">
                    <strong>Avisos de tus pedidos</strong>
                    {notifications.length === 0 && <p className="notification-bell__empty">Aún no tienes avisos.</p>}
                    <ul>
                        {notifications.map((item) => (
                            <li key={item.id} className={item.id > seenId ? "is-new" : ""}>
                                <p>{item.message}</p>
                                <span>{dateFormat.format(new Date(item.at))}</span>
                            </li>
                        ))}
                    </ul>
                    <Link to="/mis-pedidos" onClick={() => { markSeen(); setIsOpen(false); }}>Ver mis pedidos</Link>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
