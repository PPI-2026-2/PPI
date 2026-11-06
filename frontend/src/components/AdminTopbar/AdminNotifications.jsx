import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, PackageMinus, PackagePlus, PackageX } from "lucide-react";

import { getInventory, getReceptions } from "../../services/admin";

const REFRESH_MS = 120000;
const toneIcon = { warn: PackagePlus, danger: PackageX, low: PackageMinus };

const plural = (count, singular, pluralText) => (count === 1 ? singular : pluralText);

// Campana de alertas y pendientes. Por ahora se calculan con los datos que ya existen
// (recepciones sin confirmar y stock agotado o bajo el mínimo).
function AdminNotifications() {
    const rootRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error

    const load = useCallback(async () => {
        try {
            const [inventory, pending] = await Promise.all([
                getInventory(),
                getReceptions({ status: "REGISTRADA" })
            ]);
            const active = inventory.items.filter(
                (item) => item.productStatus === "ACTIVO" && item.referenceStatus === "ACTIVO"
            );
            const soldOut = active.filter((item) => item.level === "AGOTADO").length;
            const low = active.filter((item) => item.level === "BAJO").length;

            const list = [];
            if (pending.length) {
                list.push({
                    id: "pending-receptions",
                    tone: "warn",
                    title: `${pending.length} ${plural(pending.length, "recepción", "recepciones")} por confirmar`,
                    detail: "El stock no sube hasta que se confirmen.",
                    to: "/administrador/recepciones"
                });
            }
            if (soldOut) {
                list.push({
                    id: "sold-out",
                    tone: "danger",
                    title: `${soldOut} ${plural(soldOut, "referencia agotada", "referencias agotadas")}`,
                    detail: "Productos activos sin unidades disponibles.",
                    to: "/administrador/inventario"
                });
            }
            if (low) {
                list.push({
                    id: "low-stock",
                    tone: "low",
                    title: `${low} ${plural(low, "referencia", "referencias")} bajo el stock mínimo`,
                    detail: "Conviene reponer pronto.",
                    to: "/administrador/inventario"
                });
            }
            setItems(list);
            setStatus("ready");
        } catch {
            setStatus("error");
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

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

    const toggle = () => {
        if (!isOpen) load();
        setIsOpen((previous) => !previous);
    };

    return (
        <div className="adm-top__menu" ref={rootRef}>
            <button
                type="button"
                className="adm-top__icon-button"
                onClick={toggle}
                aria-label={items.length ? `Notificaciones: ${items.length} pendientes` : "Notificaciones"}
                aria-expanded={isOpen}
            >
                <Bell size={18} />
                {items.length > 0 && <span className="adm-top__badge">{items.length}</span>}
            </button>

            {isOpen && (
                <div className="adm-top__panel adm-top__panel--right">
                    <div className="adm-top__panel-title">Notificaciones</div>

                    {status === "loading" && <p className="adm-top__panel-empty">Cargando…</p>}
                    {status === "error" && <p className="adm-top__panel-empty">No se pudieron cargar las alertas.</p>}
                    {status === "ready" && items.length === 0 && (
                        <p className="adm-top__panel-empty adm-top__panel-empty--ok">
                            <Check size={16} /> Todo en orden. No hay pendientes.
                        </p>
                    )}

                    {status === "ready" && items.length > 0 && (
                        <ul className="adm-top__notifications">
                            {items.map((item) => {
                                const Icon = toneIcon[item.tone];
                                return (
                                    <li key={item.id}>
                                        <Link to={item.to} className="adm-top__notification" onClick={() => setIsOpen(false)}>
                                            <span className={`adm-top__notification-icon adm-top__notification-icon--${item.tone}`}>
                                                <Icon size={16} />
                                            </span>
                                            <span className="adm-top__result-text">
                                                <strong>{item.title}</strong>
                                                <small>{item.detail}</small>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <p className="adm-top__panel-note">
                        Próximamente: alertas de reposición y recomendaciones según las ventas.
                    </p>
                </div>
            )}
        </div>
    );
}

export default AdminNotifications;