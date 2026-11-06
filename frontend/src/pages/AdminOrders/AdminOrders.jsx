import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Hourglass, RefreshCw, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Pagination from "../../components/Pagination/Pagination";
import {
    cancelIncompleteOrder,
    cancelUnclaimedOrder,
    formatOrderDateTime,
    formatOrderMoney,
    getAdminOrder,
    getAdminOrders,
    getClaimedValue,
    ORDER_STATUS_LABEL
} from "../../services/adminOrders";

import "./AdminOrders.css";

const STATUSES = ["PENDIENTE", "INCOMPLETO", "COMPLETO", "RECLAMADO", "CANCELADO"];
const PAGE_SIZE = 100;
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const emptyFilters = { status: "", q: "", from: "", to: "", unclaimed: false };
const emptyClaim = { month: "", year: String(new Date().getFullYear()), from: "", to: "" };

const formatShortDate = (value) => {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
};

// Texto del periodo elegido para el valor reclamado.
function claimLabel({ month, year, from, to }) {
    if (month) return `${MONTHS[Number(month) - 1]} de ${year}`;
    if (from && to) return `Del ${formatShortDate(from)} al ${formatShortDate(to)}`;
    if (from) return `Desde el ${formatShortDate(from)}`;
    if (to) return `Hasta el ${formatShortDate(to)}`;
    return "Todo el histórico";
}

// Valor de lo reclamado en tienda (fecha de entrega), por mes o por rango de fechas.
function ClaimedValue() {
    const [claim, setClaim] = useState(emptyClaim);
    const [result, setResult] = useState({ total: 0, orders: 0 });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const requestId = useRef(0);

    const load = useCallback(async (next) => {
        const current = ++requestId.current;
        setError("");
        setIsLoading(true);
        try {
            const params = next.month
                ? { month: `${next.year}-${String(next.month).padStart(2, "0")}` }
                : { from: next.from, to: next.to };
            const data = await getClaimedValue(params);
            if (current === requestId.current) setResult(data);
        } catch (requestError) {
            if (current === requestId.current) setError(requestError.message);
        } finally {
            if (current === requestId.current) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load(emptyClaim);
    }, [load]);

    // Elegir mes limpia el rango y elegir fechas limpia el mes: un solo filtro activo a la vez.
    const update = (changes) => {
        const next = { ...claim, ...changes };
        if ("month" in changes && changes.month) Object.assign(next, { from: "", to: "" });
        if (("from" in changes && changes.from) || ("to" in changes && changes.to)) next.month = "";
        setClaim(next);
        if (next.from && next.to && next.from > next.to) {
            setError("La fecha inicial no puede ser posterior a la final.");
            return;
        }
        load(next);
    };

    const year = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, index) => String(year - index));
    const hasFilter = Boolean(claim.month || claim.from || claim.to);

    return (
        <section className="adm-card adm-claimed">
            <div className="adm-claimed__summary">
                <span>Valor reclamado</span>
                <strong>{isLoading ? "…" : formatOrderMoney(result.total)}</strong>
                <small>{claimLabel(claim)} · {isLoading ? "…" : `${result.orders} ${result.orders === 1 ? "pedido reclamado" : "pedidos reclamados"}`}</small>
            </div>
            <div className="adm-claimed__filters">
                <label className="adm-orders-date">Mes
                    <select className="adm-input" value={claim.month} onChange={(event) => update({ month: event.target.value })}>
                        <option value="">Todos</option>
                        {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                    </select>
                </label>
                <label className="adm-orders-date">Año
                    <select className="adm-input" value={claim.year} onChange={(event) => update({ year: event.target.value })} disabled={!claim.month}>
                        {years.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                </label>
                <span className="adm-claimed__or">o por fechas</span>
                <label className="adm-orders-date">Desde
                    <input className="adm-input" type="date" value={claim.from} max={claim.to || undefined} onChange={(event) => update({ from: event.target.value })} />
                </label>
                <label className="adm-orders-date">Hasta
                    <input className="adm-input" type="date" value={claim.to} min={claim.from || undefined} onChange={(event) => update({ to: event.target.value })} />
                </label>
                {hasFilter && <button type="button" className="adm-btn" onClick={() => { setClaim(emptyClaim); load(emptyClaim); }}>Ver todo</button>}
            </div>
            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
        </section>
    );
}

const emptyCounts = { PENDIENTE: 0, INCOMPLETO: 0, COMPLETO: 0, RECLAMADO: 0, CANCELADO: 0 };

function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState(emptyCounts);
    const [unclaimedCount, setUnclaimedCount] = useState(0);
    const [unclaimedDays, setUnclaimedDays] = useState(4);
    const [pagination, setPagination] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [confirmId, setConfirmId] = useState(null);
    const [closeReason, setCloseReason] = useState("");
    const [isBusy, setIsBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const startUnclaimed = searchParams.get("vista") === "sin-reclamar";
    const [filters, setFilters] = useState({ ...emptyFilters, unclaimed: startUnclaimed });
    const [openId, setOpenId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailError, setDetailError] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async (currentFilters, page = 1) => {
        setError("");
        setIsLoading(true);
        try {
            const data = await getAdminOrders({ ...currentFilters, page, pageSize: PAGE_SIZE });
            setOrders(data.orders);
            setCounts(data.counts);
            setUnclaimedCount(data.unclaimedCount);
            setUnclaimedDays(data.unclaimedDays);
            setPagination(data.pagination);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load({ ...emptyFilters, unclaimed: startUnclaimed });
        // Solo al abrir la página; después los filtros se aplican con sus propios controles.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    const apply = (next, page = 1) => {
        setFilters(next);
        setOpenId(null);
        setConfirmId(null);
        load(next, page);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        apply(filters);
    };

    const handleStatus = (status) => apply({ ...filters, status, unclaimed: false });

    const handleUnclaimed = () => apply({ ...filters, status: "", unclaimed: !filters.unclaimed });

    const handleClear = () => {
        if (searchParams.has("vista")) setSearchParams({}, { replace: true });
        apply(emptyFilters);
    };

    const goToPage = (page) => {
        apply(filters, page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelUnclaimed = async (order) => {
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            await cancelUnclaimedOrder(order.id);
            setNotice(`Pedido ${order.code} cancelado. Los productos separados volvieron al stock y ya están disponibles para otros clientes.`);
            setConfirmId(null);
            setOpenId(null);
            await load(filters, pagination?.page ?? 1);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const openConfirm = (order) => {
        setCloseReason("");
        setConfirmId(confirmId === order.id ? null : order.id);
    };

    const handleCloseIncomplete = async (order) => {
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            await cancelIncompleteOrder(order.id, closeReason.trim());
            setNotice(`Pedido ${order.code} cerrado. Lo que tenía separado volvió al stock y se avisó al cliente.`);
            setConfirmId(null);
            setOpenId(null);
            await load(filters, pagination?.page ?? 1);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const toggleDetail = async (order) => {
        if (openId === order.id) {
            setOpenId(null);
            return;
        }
        setOpenId(order.id);
        setDetail(null);
        setDetailError("");
        try {
            setDetail(await getAdminOrder(order.id));
        } catch (requestError) {
            setDetailError(requestError.message);
        }
    };

    return (
        <div>
            <header className="adm-heading">
                <span>PEDIDOS / SEGUIMIENTO</span>
                <h1>Pedidos de clientes</h1>
                <p>Consulta de todos los pedidos y su recorrido: quién los verificó, el motivo de los incompletos y cuándo se reclamaron. Los pedidos los gestiona el personal de tienda; aquí cancelas los que llevan demasiados días sin reclamar y cierras los incompletos que no se van a completar. Se muestran 100 pedidos por página.</p>
            </header>

            <div className="adm-orders-stats">
                {STATUSES.map((status) => (
                    <button type="button" key={status} className={`adm-stat adm-orders-stat ${filters.status === status ? "is-active" : ""}`} onClick={() => handleStatus(filters.status === status ? "" : status)}>
                        <span>{ORDER_STATUS_LABEL[status]}s</span><strong>{counts[status]}</strong>
                    </button>
                ))}
                <button type="button" className={`adm-stat adm-orders-stat adm-orders-stat--warn ${filters.unclaimed ? "is-active" : ""}`} onClick={handleUnclaimed}
                    title={`Pedidos completos avisados hace más de ${unclaimedDays} días`}>
                    <span>Sin reclamar (+{unclaimedDays} d)</span><strong>{unclaimedCount}</strong>
                </button>
            </div>

            <ClaimedValue />

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}

            {filters.unclaimed && (
                <p className="adm-message adm-orders-unclaimed-note" role="note">
                    <Hourglass size={14} /> Pedidos que la tienda ya avisó como reservados y separados, y que llevan más de {unclaimedDays} días sin reclamarse. Cancélalos para liberar los productos y dejarlos disponibles para otros clientes.
                </p>
            )}

            <section className="adm-card" style={{ marginTop: 18 }}>
                <div className="adm-card__header">
                    <form className="adm-toolbar" onSubmit={handleSubmit}>
                        <input className="adm-input" style={{ width: 220 }} placeholder="Código, cliente o correo…" value={filters.q}
                            onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
                        <select className="adm-input" style={{ width: 150 }} value={filters.unclaimed ? "SIN_RECLAMAR" : filters.status} onChange={(event) => (event.target.value === "SIN_RECLAMAR" ? apply({ ...filters, status: "", unclaimed: true }) : handleStatus(event.target.value))}>
                            <option value="">Todos los estados</option>
                            {STATUSES.map((status) => <option key={status} value={status}>{ORDER_STATUS_LABEL[status]}</option>)}
                            <option value="SIN_RECLAMAR">Sin reclamar</option>
                        </select>
                        <label className="adm-orders-date" title="Fecha en que se hizo el pedido">Pedido desde
                            <input className="adm-input" type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
                        </label>
                        <label className="adm-orders-date" title="Fecha en que se hizo el pedido">Pedido hasta
                            <input className="adm-input" type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
                        </label>
                        <button type="submit" className="adm-btn" aria-label="Buscar"><Search size={15} /></button>
                        <button type="button" className="adm-btn" onClick={handleClear}>Limpiar</button>
                        <button type="button" className="adm-btn" onClick={() => load(filters, pagination?.page ?? 1)} disabled={isLoading} aria-label="Actualizar"><RefreshCw size={15} /></button>
                    </form>
                </div>

                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th className="adm-num">Unidades</th><th className="adm-num">Total</th><th>Estado</th><th /></tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <Fragment key={order.id}>
                                    <tr>
                                        <td><strong>{order.code}</strong></td>
                                        <td>{order.customer}<div><small>{order.email}</small></div></td>
                                        <td>{formatOrderDateTime(order.createdAt)}</td>
                                        <td className="adm-num">{order.units}</td>
                                        <td className="adm-num">{formatOrderMoney(order.status === "RECLAMADO" ? order.confirmedTotal : order.total)}</td>
                                        <td>
                                            <span className={`adm-badge adm-order-badge--${order.status.toLowerCase()}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                                            {order.unclaimed && <div><small className="adm-orders-overdue">Sin reclamar · {Math.floor(order.readyDays)} días</small></div>}
                                        </td>
                                        <td className="adm-num adm-orders-actions">
                                            {order.unclaimed && <button type="button" className="adm-btn adm-btn--sm adm-btn--danger-soft" onClick={() => openConfirm(order)} disabled={isBusy}>Cancelar pedido</button>}
                                            {order.status === "INCOMPLETO" && <button type="button" className="adm-btn adm-btn--sm adm-btn--danger-soft" onClick={() => openConfirm(order)} disabled={isBusy}>Cerrar pedido</button>}
                                            <button type="button" className="adm-btn adm-btn--sm" onClick={() => toggleDetail(order)}>{openId === order.id ? "Ocultar" : "Ver detalle"}</button>
                                        </td>
                                    </tr>
                                    {confirmId === order.id && order.status === "INCOMPLETO" && (
                                        <tr>
                                            <td colSpan="7" className="adm-editor-cell">
                                                <div className="adm-orders-confirm" role="alertdialog" aria-label={`Cerrar pedido ${order.code}`}>
                                                    <p><strong>¿Cerrar el pedido {order.code}?</strong> Quedará cancelado, lo que tenía separado volverá al stock disponible y el cliente verá el motivo en su campana de notificaciones. Esta acción no se puede deshacer.</p>
                                                    <textarea className="adm-input" style={{ width: "100%" }} rows="2" maxLength="500" placeholder="Motivo del cierre (obligatorio)" aria-label="Motivo del cierre" value={closeReason} onChange={(event) => setCloseReason(event.target.value)} />
                                                    <div>
                                                        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => handleCloseIncomplete(order)} disabled={isBusy || !closeReason.trim()}>{isBusy ? "Cerrando…" : "Sí, cerrar y liberar stock"}</button>
                                                        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setConfirmId(null)} disabled={isBusy}>Volver</button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {confirmId === order.id && order.status !== "INCOMPLETO" && (
                                        <tr>
                                            <td colSpan="7" className="adm-editor-cell">
                                                <div className="adm-orders-confirm" role="alertdialog" aria-label={`Cancelar pedido ${order.code}`}>
                                                    <p><strong>¿Cancelar el pedido {order.code}?</strong> Lleva {Math.floor(order.readyDays)} días listo y sin reclamar. Se liberarán {order.units} unidad(es) separadas, volverán al stock disponible y se avisará al cliente en su campana de notificaciones. Esta acción no se puede deshacer.</p>
                                                    <div>
                                                        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => handleCancelUnclaimed(order)} disabled={isBusy}>{isBusy ? "Cancelando…" : "Sí, cancelar y liberar stock"}</button>
                                                        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setConfirmId(null)} disabled={isBusy}>Volver</button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {openId === order.id && (
                                        <tr>
                                            <td colSpan="7" className="adm-editor-cell">
                                                {detailError && <p className="adm-message adm-message--error" role="alert">{detailError}</p>}
                                                {!detail && !detailError && <p className="adm-empty">Cargando detalle…</p>}
                                                {detail && (
                                                    <div className="adm-order-detail">
                                                        {detail.status === "INCOMPLETO" && detail.incompleteReason && (
                                                            <p className="adm-order-detail__reason"><strong>Motivo del pedido incompleto:</strong> {detail.incompleteReason}</p>
                                                        )}
                                                        <table className="adm-table">
                                                            <thead><tr><th>Producto</th><th>Talla</th><th className="adm-num">Pedidas</th><th className="adm-num">Confirmadas</th><th className="adm-num">Precio</th><th className="adm-num">Subtotal</th></tr></thead>
                                                            <tbody>
                                                                {detail.items.map((item) => (
                                                                    <tr key={item.detailId}>
                                                                        <td>{item.productName}</td><td>{item.sizeName}</td>
                                                                        <td className="adm-num">{item.requested}</td><td className="adm-num">{item.confirmed}</td>
                                                                        <td className="adm-num">{formatOrderMoney(item.unitPrice)}</td><td className="adm-num">{formatOrderMoney(item.subtotal)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <h3 className="adm-order-detail__title">Historial</h3>
                                                        <ol className="adm-order-detail__history">
                                                            <li><span className="adm-badge adm-order-badge--pendiente">Pendiente</span><span>{formatOrderDateTime(detail.createdAt)} · Pedido realizado por {detail.customer}</span></li>
                                                            {detail.history.map((entry, index) => (
                                                                <li key={`${entry.at}-${index}`}>
                                                                    <span className={`adm-badge adm-order-badge--${String(entry.status).toLowerCase()}`}>{ORDER_STATUS_LABEL[entry.status] ?? entry.status}</span>
                                                                    <span>{formatOrderDateTime(entry.at)} · {entry.employee}{entry.observation ? ` — ${entry.observation}` : ""}</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                            {!isLoading && orders.length === 0 && <tr><td colSpan="7" className="adm-empty">No hay pedidos para estos filtros.</td></tr>}
                            {isLoading && <tr><td colSpan="7" className="adm-empty">Cargando pedidos…</td></tr>}
                        </tbody>
                    </table>
                </div>
                <Pagination pagination={pagination} onChange={goToPage} disabled={isLoading} label="pedidos" />
            </section>
        </div>
    );
}

export default AdminOrders;
