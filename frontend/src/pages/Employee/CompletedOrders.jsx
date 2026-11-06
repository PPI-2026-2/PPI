import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import {
    formatOrderDate,
    formatOrderPrice,
    getEmployeeOrders,
    ORDER_STATUS_LABEL
} from "../../services/employeeOrders";

import "./EmployeeDashboard.css";
import "./EmployeeOrders.css";

const filters = [
    { key: "Todos", label: "Todos" },
    { key: "COMPLETO", label: "Por entregar" },
    { key: "RECLAMADO", label: "Entregados" },
    { key: "CANCELADO", label: "Cancelados" }
];

function CompletedOrders() {
    const [orders, setOrders] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState("Todos");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isActive = true;
        getEmployeeOrders(["COMPLETO", "RECLAMADO", "CANCELADO"])
            .then((list) => { if (isActive) setOrders(list); })
            .catch((error) => { if (isActive) setErrorMessage(error.message); })
            .finally(() => { if (isActive) setIsLoading(false); });
        return () => { isActive = false; };
    }, []);

    const visibleOrders = selectedFilter === "Todos" ? orders : orders.filter((order) => order.status === selectedFilter);

    return (
        <div className="employee-dashboard employee-orders-page">
            <div className="employee-dashboard__header">
                <div>
                    <span className="employee-dashboard__eyebrow">ESPACIO DE TRABAJO / PEDIDOS</span>
                    <h1>Pedidos completos</h1>
                    <p>Pedidos ya verificados, entregados o cancelados.</p>
                </div>
                <Link className="employee-orders-page__back" to="/empleado">Volver al panel</Link>
            </div>

            <section className="employee-orders">
                <div className="employee-orders__heading">
                    <div>
                        <span className="employee-dashboard__eyebrow">HISTORIAL</span>
                        <h2>Pedidos procesados</h2>
                        <p>{visibleOrders.length} {visibleOrders.length === 1 ? "pedido" : "pedidos"} en esta sección</p>
                    </div>
                    <span className="employee-orders-page__completed-label"><CheckCircle2 size={16} /> Procesados</span>
                </div>

                <div className="employee-orders__filters" role="tablist" aria-label="Filtrar pedidos procesados">
                    {filters.map((filter) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={selectedFilter === filter.key}
                            className={selectedFilter === filter.key ? "is-active" : ""}
                            key={filter.key}
                            onClick={() => setSelectedFilter(filter.key)}
                        >
                            {filter.label}
                            <span>{filter.key === "Todos" ? orders.length : orders.filter((order) => order.status === filter.key).length}</span>
                        </button>
                    ))}
                </div>

                {isLoading && <p className="employee-orders__state">Cargando pedidos...</p>}
                {!isLoading && errorMessage && <p className="employee-orders__state employee-orders__state--error" role="alert">{errorMessage}</p>}

                {!isLoading && !errorMessage && (
                    <div className="employee-orders__table-wrap">
                        <table className="employee-orders__table">
                            <thead><tr><th>Pedido</th><th>Cliente</th><th>Correo</th><th>Fecha</th><th>Total</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
                            <tbody>
                                {visibleOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td><span className="employee-orders__id">{order.code}</span><small>StockPlan</small></td>
                                        <td>{order.customer}</td>
                                        <td>{order.email}</td>
                                        <td>{formatOrderDate(order.createdAt)}</td>
                                        <td>{formatOrderPrice(order.status === "RECLAMADO" ? order.confirmedTotal : order.total)}</td>
                                        <td><span className={`order-status order-status--${order.status.toLowerCase()}`}>{ORDER_STATUS_LABEL[order.status]}</span></td>
                                        <td><Link className="employee-orders__details" to={`/empleado/pedidos/${order.id}`}>Ver detalles <ChevronRight size={16} /></Link></td>
                                    </tr>
                                ))}
                                {visibleOrders.length === 0 && <tr><td className="employee-orders__empty" colSpan="7">No hay pedidos en esta sección.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default CompletedOrders;
