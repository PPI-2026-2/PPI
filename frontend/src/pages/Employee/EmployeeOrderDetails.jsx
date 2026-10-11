import { useEffect, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, Check, CheckCircle2, CircleAlert, Clock3, Mail, PackageCheck, Save, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { formatOrderPrice, getEmployeeOrder, markOrderAsDelivered, updateEmployeeOrderStatus } from "../../data/employeeOrders";

import "./EmployeeDashboard.css";

function EmployeeOrderDetails() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [isNotified, setIsNotified] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState("");
    const [incompleteReason, setIncompleteReason] = useState(() => getEmployeeOrder(orderId)?.incompleteReason ?? "");
    const [formMessage, setFormMessage] = useState("");
    const [order, setOrder] = useState(() => getEmployeeOrder(orderId));
    const [selectedStatus, setSelectedStatus] = useState(() => getEmployeeOrder(orderId)?.status ?? "Pendiente");

    useEffect(() => {
        const currentOrder = getEmployeeOrder(orderId);
        setOrder(currentOrder);
        setSelectedStatus(currentOrder?.status ?? "Pendiente");
        setIncompleteReason(currentOrder?.incompleteReason ?? "");
        setIsNotified(false);
        setNotificationMessage("");
        setFormMessage("");
    }, [orderId]);

    if (!order) return <Navigate to="/empleado" replace />;

    const isComplete = order.status === "Completo";
    const StatusIcon = isComplete ? CheckCircle2 : order.status === "Incompleto" ? CircleAlert : Clock3;

    const handleMarkDelivered = () => {
        if (!isComplete || order.delivered) return;
        const updatedOrders = markOrderAsDelivered(order.id);
        setOrder(updatedOrders.find((item) => item.id === order.id));
    };

    const handleStatusChange = (event) => {
        setSelectedStatus(event.target.value);
    };

    const handleUpdateStatus = () => {
        if (selectedStatus === "Incompleto" && !incompleteReason.trim()) {
            setFormMessage("Escribe el motivo por el que el pedido está incompleto.");
            return;
        }

        const updatedOrders = updateEmployeeOrderStatus(
            order.id,
            selectedStatus,
            selectedStatus === "Incompleto" ? incompleteReason : undefined
        );
        setOrder(updatedOrders.find((item) => item.id === order.id));
        setIsNotified(false);
        setNotificationMessage("");
        setFormMessage("");
    };

    const handleNotifyCustomer = () => {
        if (selectedStatus !== order.status || (selectedStatus === "Incompleto" && incompleteReason.trim() !== (order.incompleteReason ?? ""))) {
            setFormMessage("Actualiza primero el estado y el motivo antes de preparar la notificación.");
            return;
        }

        if (order.status === "Incompleto" && !order.incompleteReason?.trim()) {
            setFormMessage("Agrega y actualiza el motivo del pedido incompleto antes de notificar.");
            return;
        }

        const productsSummary = order.products
            .map((product) => `${product.name} (talla ${product.size ?? "N/A"}) x${product.quantity}: ${formatOrderPrice(product.price * product.quantity)}`)
            .join(", ");
        const reasonText = order.status === "Incompleto"
            ? ` Observación: ${order.incompleteReason}`
            : "";

        setNotificationMessage(
            `Hola ${order.customer}, el pedido ${order.id}, realizado el ${order.date}, está ${order.status.toLowerCase()}. Productos: ${productsSummary}. Total: ${formatOrderPrice(order.total)}.${reasonText}`
        );
        setIsNotified(true);
        setFormMessage("");
    };

    return (
        <div className="employee-dashboard employee-order-detail-page">
            <div className="employee-dashboard__header">
                <div>
                    <Link className="employee-order-detail__back" to="/empleado"><ArrowLeft size={16} /> Volver a pedidos</Link>
                    <span className="employee-dashboard__eyebrow">GESTIÓN / DETALLE DEL PEDIDO</span>
                    <h1>Pedido {order.id}</h1>
                    <p>Consulta los datos del cliente y los productos solicitados.</p>
                </div>
            </div>

            <section className="employee-order-detail__card">
                <div className="employee-order-detail__top">
                    <div>
                        <span className="employee-dashboard__eyebrow">REFERENCIA DEL PEDIDO</span>
                        <h2>{order.id}</h2>
                    </div>
                    <div className="employee-order-detail__status-editor">
                        <label className="employee-order-detail__status-control">
                            <span>Estado del pedido</span>
                            <select value={selectedStatus} onChange={handleStatusChange} aria-label="Modificar estado del pedido">
                                <option value="Pendiente">Pendiente</option>
                                <option value="Incompleto">Incompleto</option>
                                <option value="Completo">Completo</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            className="employee-order-detail__update-status"
                            onClick={handleUpdateStatus}
                            disabled={selectedStatus === order.status && (selectedStatus !== "Incompleto" || incompleteReason.trim() === (order.incompleteReason ?? ""))}
                        >
                            <Save size={15} /> Actualizar
                        </button>
                    </div>
                </div>

                <div className="employee-order-detail__facts">
                    <div><UserRound size={18} /><span>Nombre del usuario</span><strong>{order.customer}</strong></div>
                    <div><Mail size={18} /><span>Correo electrónico</span><strong>{order.email}</strong></div>
                    <div><CalendarDays size={18} /><span>Fecha del pedido</span><strong>{order.date}</strong></div>
                    <div><StatusIcon size={18} /><span>Estado actual</span><strong>{order.status}</strong></div>
                </div>

                {selectedStatus === "Incompleto" && (
                    <div className="employee-order-detail__observation">
                        <label htmlFor="incomplete-reason">Motivo del pedido incompleto</label>
                        <p>Esta observación se incluirá en la notificación de demostración al cliente.</p>
                        <textarea
                            id="incomplete-reason"
                            value={incompleteReason}
                            onChange={(event) => {
                                setIncompleteReason(event.target.value);
                                setFormMessage("");
                                setIsNotified(false);
                            }}
                            maxLength={500}
                            rows={3}
                            placeholder="Describe qué producto falta o por qué no se puede completar el pedido."
                        />
                        <span className="employee-order-detail__character-count">{incompleteReason.length}/500</span>
                    </div>
                )}

                <div className="employee-order-detail__products">
                    <div className="employee-order-detail__section-heading">
                        <div><h3>Productos solicitados</h3><p>Artículos incluidos en este pedido</p></div>
                        <span>{order.products.length} {order.products.length === 1 ? "artículo" : "artículos"}</span>
                    </div>
                    <div className="employee-order-detail__product-list">
                        {order.products.map((product, index) => (
                            <div className="employee-order-detail__product" key={`${product.name}-${index}`}>
                                <div className="employee-order-detail__product-icon"><PackageCheck size={19} /></div>
                                <div className="employee-order-detail__product-name"><strong>{product.name}</strong><span>{product.size ? `Talla ${product.size}` : "Accesorio"} · Cantidad: {product.quantity}</span></div>
                                <strong>{formatOrderPrice(product.price * product.quantity)}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="employee-order-detail__total"><span>Precio total</span><strong>{formatOrderPrice(order.total)}</strong></div>
                </div>

                <div className="employee-order-detail__actions">
                    <button type="button" className={`employee-order-detail__notify ${isNotified ? "is-confirmed" : ""}`} onClick={handleNotifyCustomer} title="Preparar notificación para el correo del cliente">
                        {isNotified ? <Check size={17} /> : <Bell size={17} />}
                        {isNotified ? `Notificación preparada para ${order.email}` : "Notificar al correo"}
                    </button>
                    <button type="button" className="employee-order-detail__delivered" onClick={handleMarkDelivered} disabled={!isComplete || order.delivered} title={!isComplete ? "Cambia el estado a Completo para poder marcarlo como entregado" : order.delivered ? "Este pedido ya fue entregado" : "Marcar pedido como entregado"}>
                        <CheckCircle2 size={17} />
                        {order.delivered ? "Pedido entregado" : "Marcar como entregado"}
                    </button>
                </div>
                {formMessage && <p className="employee-order-detail__form-message" role="alert">{formMessage}</p>}
                {notificationMessage && (
                    <div className="employee-order-detail__notification-preview" role="status">
                        <strong>Vista previa de la notificación a {order.email}</strong>
                        <p>{notificationMessage}</p>
                    </div>
                )}
                <p className="employee-order-detail__note">{!isComplete ? "Para marcar el pedido como entregado, primero cambia su estado a Completo." : order.delivered ? "El pedido quedó marcado como entregado." : "La notificación es una confirmación visual; no se envía correo real."}</p>
            </section>
        </div>
    );
}

export default EmployeeOrderDetails;
