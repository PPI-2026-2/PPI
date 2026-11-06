import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, Clock3, Mail, Minus, PackageCheck, Plus, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import {
    deliverEmployeeOrder,
    formatOrderDate,
    formatOrderPrice,
    getEmployeeOrder,
    ORDER_STATUS_LABEL,
    verifyEmployeeOrder
} from "../../services/employeeOrders";

import "./EmployeeDashboard.css";
import "./EmployeeOrders.css";

const EDITABLE = ["PENDIENTE", "INCOMPLETO"];

function describeNotification(notification, email) {
    const inApp = "El cliente ve el aviso en la campana de su cuenta y en Mis pedidos.";
    if (notification.status === "sent") return `Correo enviado a ${email}. ${inApp}`;
    if (notification.status === "simulated") return `Correo simulado para ${email} (SMTP sin configurar; el texto quedó en la consola del backend). ${inApp}`;
    if (notification.status === "limit") return `Se alcanzó el tope diario de correos; no se envió el correo. ${inApp}`;
    if (notification.status === "disabled") return `El envío de correos está desactivado. ${inApp}`;
    if (notification.status === "failed") return `La verificación se guardó, pero no se pudo enviar el correo a ${email}. ${inApp}`;
    return "Sin cambios: no se generó un nuevo aviso.";
}

function buildQuantities(order) {
    const result = {};
    order.items.forEach((item) => {
        result[item.detailId] = order.status === "PENDIENTE"
            ? Math.min(item.requested, item.maxConfirmable)
            : item.confirmed;
    });
    return result;
}

function EmployeeOrderDetails() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [quantities, setQuantities] = useState({});
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [isBusy, setIsBusy] = useState(false);
    const [formMessage, setFormMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [notificationMessage, setNotificationMessage] = useState("");

    const applyOrder = useCallback((next) => {
        setOrder(next);
        setQuantities(buildQuantities(next));
        setReason(next.incompleteReason ?? "");
    }, []);

    useEffect(() => {
        let isActive = true;
        setIsLoading(true);
        setNotFound(false);
        setLoadError("");
        setFormMessage("");
        setSuccessMessage("");
        setNotificationMessage("");
        getEmployeeOrder(orderId)
            .then((next) => { if (isActive) applyOrder(next); })
            .catch((error) => {
                if (!isActive) return;
                if (error.status === 404 || error.status === 400) setNotFound(true);
                else setLoadError(error.message);
            })
            .finally(() => { if (isActive) setIsLoading(false); });
        return () => { isActive = false; };
    }, [orderId, applyOrder]);

    const derivedStatus = useMemo(() => {
        if (!order) return "PENDIENTE";
        return order.items.every((item) => (quantities[item.detailId] ?? 0) === item.requested) ? "COMPLETO" : "INCOMPLETO";
    }, [order, quantities]);

    if (notFound) return <Navigate to="/empleado" replace />;
    if (isLoading) return <div className="employee-dashboard"><p className="employee-orders__state">Cargando pedido...</p></div>;
    if (loadError || !order) {
        return (
            <div className="employee-dashboard">
                <Link className="employee-order-detail__back" to="/empleado"><ArrowLeft size={16} /> Volver a pedidos</Link>
                <p className="employee-orders__state employee-orders__state--error" role="alert">{loadError || "No fue posible cargar el pedido."}</p>
            </div>
        );
    }

    const isEditable = EDITABLE.includes(order.status);
    const canDeliver = order.status === "COMPLETO";
    const mustWait = order.status === "PENDIENTE" && order.verifyInSeconds > 0;
    const StatusIcon = order.status === "COMPLETO" || order.status === "RECLAMADO" ? CheckCircle2 : order.status === "INCOMPLETO" ? CircleAlert : order.status === "CANCELADO" ? XCircle : Clock3;
    const previewTotal = order.items.reduce((sum, item) => sum + (quantities[item.detailId] ?? 0) * item.unitPrice, 0);

    const clearMessages = () => { setFormMessage(""); setSuccessMessage(""); };

    const changeQuantity = (item, delta) => {
        setQuantities((current) => {
            const next = Math.max(0, Math.min(item.requested, (current[item.detailId] ?? 0) + delta));
            return { ...current, [item.detailId]: next };
        });
        clearMessages();
    };

    const run = async (action, success) => {
        setIsBusy(true);
        clearMessages();
        try {
            const result = await action();
            applyOrder(result.order ?? result);
            setNotificationMessage(result.notification ? describeNotification(result.notification, result.order.email) : "");
            setSuccessMessage(success);
        } catch (error) {
            setFormMessage(error.message);
            if (error.status === 409) {
                getEmployeeOrder(order.id).then(applyOrder).catch(() => {});
            }
        } finally {
            setIsBusy(false);
        }
    };

    const handleVerify = () => {
        if (derivedStatus === "INCOMPLETO" && !reason.trim()) {
            setFormMessage("Escribe el motivo por el que el pedido está incompleto.");
            return;
        }
        const lines = order.items.map((item) => ({ detailId: item.detailId, quantity: quantities[item.detailId] ?? 0 }));
        run(() => verifyEmployeeOrder(order.id, lines, derivedStatus === "INCOMPLETO" ? reason.trim() : ""), "Pedido verificado y unidades reservadas en inventario.");
    };

    const handleDeliver = () => {
        if (!window.confirm(`¿Marcar el pedido ${order.code} como reclamado? Se descontará el inventario.`)) return;
        run(() => deliverEmployeeOrder(order.id), "Pedido reclamado e inventario actualizado.");
    };

    return (
        <div className="employee-dashboard employee-order-detail-page">
            <div className="employee-dashboard__header">
                <div>
                    <Link className="employee-order-detail__back" to="/empleado"><ArrowLeft size={16} /> Volver a pedidos</Link>
                    <span className="employee-dashboard__eyebrow">GESTIÓN / DETALLE DEL PEDIDO</span>
                    <h1>Pedido {order.code}</h1>
                    <p>Verifica en tienda las unidades de cada producto, reserva y entrega al cliente.</p>
                </div>
            </div>

            <section className="employee-order-detail__card">
                <div className="employee-order-detail__top">
                    <div>
                        <span className="employee-dashboard__eyebrow">REFERENCIA DEL PEDIDO</span>
                        <h2>{order.code}</h2>
                    </div>
                    <div className="employee-order-detail__status-badge">
                        <span>ESTADO</span>
                        <span className={`order-status order-status--${order.status.toLowerCase()}`}><StatusIcon size={15} />{ORDER_STATUS_LABEL[order.status]}</span>
                    </div>
                </div>

                <div className="employee-order-detail__facts">
                    <div><UserRound size={18} /><span>Nombre del usuario</span><strong>{order.customer}</strong></div>
                    <div><Mail size={18} /><span>Correo electrónico</span><strong>{order.email}</strong></div>
                    <div><CalendarDays size={18} /><span>Fecha del pedido</span><strong>{formatOrderDate(order.createdAt)}</strong></div>
                    <div><StatusIcon size={18} /><span>{order.deliveredAt ? "Entregado el" : "Estado actual"}</span><strong>{order.deliveredAt ? formatOrderDate(order.deliveredAt) : ORDER_STATUS_LABEL[order.status]}</strong></div>
                </div>

                {mustWait && (
                    <div className="employee-order-detail__observation">
                        <label>Pedido en plazo de cancelación</label>
                        <p>El cliente aún puede cancelar este pedido. Podrás verificarlo y reservar stock en aproximadamente {Math.ceil(order.verifyInSeconds / 60)} min. Actualiza la página para ver el tiempo restante.</p>
                    </div>
                )}

                {isEditable && !mustWait && derivedStatus === "INCOMPLETO" && (
                    <div className="employee-order-detail__observation">
                        <label htmlFor="incomplete-reason">Motivo del pedido incompleto</label>
                        <p>Obligatorio: se guarda en el historial y se incluye en la notificación al cliente.</p>
                        <textarea
                            id="incomplete-reason"
                            value={reason}
                            onChange={(event) => { setReason(event.target.value); clearMessages(); }}
                            maxLength={500}
                            rows={3}
                            placeholder="Describe qué producto falta o por qué no se puede completar el pedido."
                        />
                        <span className="employee-order-detail__character-count">{reason.length}/500</span>
                    </div>
                )}

                {order.status === "INCOMPLETO" && !isEditable && order.incompleteReason && (
                    <div className="employee-order-detail__observation"><label>Motivo registrado</label><p>{order.incompleteReason}</p></div>
                )}

                <div className="employee-order-detail__products">
                    <div className="employee-order-detail__section-heading">
                        <div><h3>Productos solicitados</h3><p>{isEditable ? "Indica cuántas unidades confirmaste en tienda" : "Unidades confirmadas por producto"}</p></div>
                        <span>{order.items.length} {order.items.length === 1 ? "artículo" : "artículos"}</span>
                    </div>
                    <div className="employee-order-detail__product-list">
                        {order.items.map((item) => {
                            const value = quantities[item.detailId] ?? 0;
                            return (
                                <div className="employee-order-detail__product employee-order-detail__product--verify" key={item.detailId}>
                                    <div className="employee-order-detail__product-icon"><PackageCheck size={19} /></div>
                                    <div className="employee-order-detail__product-name">
                                        <strong>{item.productName}</strong>
                                        <span>{item.sizeName ? `Talla ${item.sizeName}` : "Accesorio"} · Solicitadas: {item.requested} · {formatOrderPrice(item.unitPrice)} c/u</span>
                                    </div>
                                    <div className="employee-order-detail__confirm">
                                        {isEditable ? (
                                            <>
                                                <div className="employee-order-detail__stepper">
                                                    <button type="button" onClick={() => changeQuantity(item, -1)} disabled={isBusy || value <= 0} aria-label={`Menos unidades de ${item.productName}`}><Minus size={14} /></button>
                                                    <output aria-label="Unidades confirmadas">{value}</output>
                                                    <button type="button" onClick={() => changeQuantity(item, 1)} disabled={isBusy || value >= Math.min(item.requested, item.maxConfirmable)} aria-label={`Más unidades de ${item.productName}`}><Plus size={14} /></button>
                                                </div>
                                                <small>Disponibles para reservar: {item.maxConfirmable}</small>
                                            </>
                                        ) : (
                                            <span className="employee-order-detail__confirmed-label">Confirmadas: {item.confirmed}/{item.requested}</span>
                                        )}
                                    </div>
                                    <strong>{formatOrderPrice((isEditable ? value : item.confirmed) * item.unitPrice)}</strong>
                                </div>
                            );
                        })}
                    </div>
                    <div className="employee-order-detail__totals">
                        <div className="employee-order-detail__total employee-order-detail__total--soft"><span>Total solicitado</span><strong>{formatOrderPrice(order.total)}</strong></div>
                        <div className="employee-order-detail__total"><span>{isEditable ? "Total a confirmar" : "Total confirmado"}</span><strong>{formatOrderPrice(isEditable ? previewTotal : order.confirmedTotal)}</strong></div>
                    </div>
                </div>

                <div className="employee-order-detail__actions">
                    <span className="employee-order-detail__spacer" />
                    {isEditable && (
                        <button type="button" className="employee-order-detail__verify employee-order-detail__delivered" onClick={handleVerify} disabled={isBusy || mustWait} title={mustWait ? "El cliente aún puede cancelar el pedido" : "Marcar como verificado y separar las unidades"}>
                            <ShieldCheck size={17} /> Verificado y separado
                        </button>
                    )}
                    <button
                        type="button"
                        className="employee-order-detail__delivered"
                        onClick={handleDeliver}
                        disabled={isBusy || !canDeliver}
                        title={order.status === "RECLAMADO" ? "Este pedido ya fue reclamado" : order.status === "CANCELADO" ? "Pedido cancelado" : !canDeliver ? "Se habilita cuando el pedido está Completo" : "Marcar el pedido como reclamado"}
                    >
                        <CheckCircle2 size={17} />
                        {order.status === "RECLAMADO" ? "Pedido reclamado" : "Marcar como reclamado"}
                    </button>
                </div>

                {formMessage && <p className="employee-order-detail__form-message" role="alert">{formMessage}</p>}
                {successMessage && <p className="employee-order-detail__success" role="status">{successMessage}</p>}
                {notificationMessage && <p className="employee-order-detail__success" role="status">{notificationMessage}</p>}
                <p className="employee-order-detail__note">
                    {order.status === "PENDIENTE" && "Al verificar se reservan las unidades confirmadas y se avisa al cliente en su cuenta."}
                    {order.status === "INCOMPLETO" && "Vuelve a verificar cuando llegue inventario: al quedar completo el cliente verá en su cuenta que el pedido está listo para reclamar."}
                    {order.status === "COMPLETO" && "Pedido completo y reservado. Cuando el cliente lo reclame en tienda, márcalo como reclamado."}
                    {order.status === "RECLAMADO" && "Pedido reclamado; el descuento quedó registrado en Movimientos como salida de pedido."}
                    {order.status === "CANCELADO" && "Pedido cancelado; las reservas fueron liberadas."}
                </p>

                {order.history?.length > 0 && (
                    <div className="employee-order-detail__history">
                        <h3>Historial</h3>
                        <ol>
                            {order.history.map((entry, index) => (
                                <li key={`${entry.at}-${index}`}>
                                    <span className={`order-status order-status--${String(entry.status).toLowerCase()}`}>{ORDER_STATUS_LABEL[entry.status] ?? entry.status}</span>
                                    <span>{formatOrderDate(entry.at)}{entry.employee ? ` · ${entry.employee}` : ""}</span>
                                    {entry.observation && <p>{entry.observation}</p>}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </section>
        </div>
    );
}

export default EmployeeOrderDetails;
