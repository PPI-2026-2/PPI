import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import { formatCartPrice } from "../../data/shoppingCart";
import { cancelMyOrder, getMyOrders } from "../../services/orders";

import "../Cart/Cart.css";
import "./MyOrders.css";

const STATUS_LABEL = {
    PENDIENTE: "Pendiente de verificación",
    INCOMPLETO: "Incompleto",
    COMPLETO: "Listo para reclamar",
    RECLAMADO: "Entregado",
    CANCELADO: "Cancelado"
};

const STATUS_HINT = {
    PENDIENTE: "El equipo de la tienda verificará tu pedido cuando termine el plazo de cancelación. Revisa esta página para ver las novedades.",
    COMPLETO: "Tu pedido está completo. Recógelo en nuestra tienda local.",
    RECLAMADO: "Pedido reclamado en tienda."
};

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function formatCountdown(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [windowMinutes, setWindowMinutes] = useState(15);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [busyId, setBusyId] = useState(null);
    // Pedido que está pidiendo confirmación de cancelación (confirmación dentro de la página, sin alert del navegador).
    const [confirmingId, setConfirmingId] = useState(null);
    const [actionIsError, setActionIsError] = useState(false);
    // Segundos restantes para cancelar por pedido; se descuentan cada segundo en pantalla.
    const [secondsLeft, setSecondsLeft] = useState({});

    const load = useCallback(async () => {
        try {
            const data = await getMyOrders();
            setOrders(data.orders);
            setWindowMinutes(data.cancelWindowMinutes);
            setSecondsLeft(Object.fromEntries(data.orders.filter((order) => order.canCancel).map((order) => [order.id, order.cancelSecondsLeft])));
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const refresh = setInterval(load, 30000);
        return () => clearInterval(refresh);
    }, [load]);

    useEffect(() => {
        const tick = setInterval(() => {
            setSecondsLeft((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, Math.max(0, value - 1)])));
        }, 1000);
        return () => clearInterval(tick);
    }, []);

    const handleCancel = async (order) => {
        setConfirmingId(null);
        setBusyId(order.id);
        setActionMessage("");
        try {
            await cancelMyOrder(order.id);
            setActionIsError(false);
            setActionMessage(`El pedido ${order.code} fue cancelado. Las unidades no se descontaron del inventario.`);
        } catch (error) {
            setActionIsError(true);
            setActionMessage(error.message);
        } finally {
            setBusyId(null);
            load();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <div className="cart-page">
            <Navbar />
            <main className="cart-page__main my-orders">
                <Link className="cart-page__back" to="/"><ArrowLeft size={16} /> Volver al catálogo</Link>
                <header className="my-orders__header">
                    <span>STOCKPLAN / MIS PEDIDOS</span>
                    <h1>Historial de pedidos</h1>
                    <p>Puedes cancelar un pedido durante los primeros {windowMinutes} minutos. Después, la tienda lo verifica y aquí mismo, en esta página y en la campana, verás si queda incompleto o listo para reclamar. Revísala durante las 72 horas siguientes a tu pedido.</p>
                </header>

                {actionMessage && <p className={`my-orders__notice ${actionIsError ? "my-orders__notice--error" : ""}`} role={actionIsError ? "alert" : "status"}>{actionMessage}</p>}
                {isLoading && <p className="my-orders__state">Cargando tus pedidos...</p>}
                {!isLoading && errorMessage && <p className="my-orders__state my-orders__state--error" role="alert">{errorMessage}</p>}
                {!isLoading && !errorMessage && orders.length === 0 && (
                    <div className="my-orders__empty"><ClipboardList size={28} /><p>Aún no has hecho pedidos.</p><Link to="/">Ver catálogo</Link></div>
                )}

                <div className="my-orders__list">
                    {orders.map((order) => {
                        const remaining = secondsLeft[order.id] ?? 0;
                        const canCancel = order.canCancel && remaining > 0;
                        return (
                            <article className="my-orders__card" key={order.id}>
                                <div className="my-orders__top">
                                    <div>
                                        <strong>{order.code}</strong>
                                        <span>{dateFormat.format(new Date(order.createdAt))}</span>
                                    </div>
                                    <span className={`my-orders__status my-orders__status--${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</span>
                                </div>

                                <ul className="my-orders__items">
                                    {order.items.map((item, index) => (
                                        <li key={`${item.productName}-${item.sizeName}-${index}`}>
                                            <span>{item.requested} × {item.productName} · Talla {item.sizeName}
                                                {order.status === "INCOMPLETO" && <em> ({item.confirmed} de {item.requested} disponibles)</em>}
                                            </span>
                                            <span>{formatCartPrice(item.subtotal)}</span>
                                        </li>
                                    ))}
                                </ul>

                                {order.status === "INCOMPLETO" && (
                                    <p className="my-orders__reason"><strong>Pedido incompleto:</strong> {order.incompleteReason || "Faltan productos en el inventario."} Tu pedido sigue en espera de inventario: aquí verás el cambio cuando la tienda lo complete.</p>
                                )}
                                {STATUS_HINT[order.status] && <p className="my-orders__hint">{STATUS_HINT[order.status]}{order.status === "RECLAMADO" && order.deliveredAt ? ` (${dateFormat.format(new Date(order.deliveredAt))})` : ""}</p>}

                                <div className="my-orders__bottom">
                                    <span>Total: <strong>{formatCartPrice(order.total)}</strong></span>
                                    {canCancel && (
                                        confirmingId === order.id ? (
                                            <div className="my-orders__confirm" role="alertdialog" aria-label={`Confirmar cancelación del pedido ${order.code}`}>
                                                <span>¿Seguro que quieres cancelar el pedido {order.code}?</span>
                                                <button type="button" className="my-orders__confirm-yes" onClick={() => handleCancel(order)}>Sí, cancelar</button>
                                                <button type="button" className="my-orders__confirm-no" onClick={() => setConfirmingId(null)}>No, conservarlo</button>
                                            </div>
                                        ) : (
                                            <div className="my-orders__cancel">
                                                <span><Clock3 size={14} /> Puedes cancelar: {formatCountdown(remaining)}</span>
                                                <button type="button" onClick={() => setConfirmingId(order.id)} disabled={busyId === order.id}>{busyId === order.id ? "Cancelando..." : "Cancelar pedido"}</button>
                                            </div>
                                        )
                                    )}
                                    {!canCancel && ["PENDIENTE", "INCOMPLETO", "COMPLETO"].includes(order.status) && <span className="my-orders__locked">Plazo de cancelación terminado</span>}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

export default MyOrders;
