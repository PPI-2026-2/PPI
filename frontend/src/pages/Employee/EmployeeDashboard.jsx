import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, CircleAlert, Clock3, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import DashboardCard from "../../components/DashboardCard/DashboardCard";
import {
    formatOrderDate,
    formatOrderPrice,
    getEmployeeOrders,
    getOrdersSummary,
    ORDER_STATUS_LABEL
} from "../../services/employeeOrders";

import "../../components/DashboardCard/DashboardCard.css";
import "./EmployeeDashboard.css";
import "./EmployeeOrders.css";

const filters = ["Todos", "Pendiente", "Incompleto"];
const FILTER_TO_STATUS = { Pendiente: "PENDIENTE", Incompleto: "INCOMPLETO" };
const REFRESH_MS = 30000;

function getStatusIcon(status) {
    if (status === "INCOMPLETO") return <CircleAlert size={15} />;
    return <Clock3 size={15} />;
}

function EmployeeDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedFilter = filters.includes(searchParams.get("estado")) ? searchParams.get("estado") : "Todos";
    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState({ PENDIENTE: 0, INCOMPLETO: 0, COMPLETO: 0, RECLAMADO: 0, CANCELADO: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const load = useCallback(async () => {
        try {
            const [list, summary] = await Promise.all([
                getEmployeeOrders(["PENDIENTE", "INCOMPLETO"]),
                getOrdersSummary()
            ]);
            setOrders(list);
            setCounts(summary);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const visibleOrders = selectedFilter === "Todos"
        ? orders
        : orders.filter((order) => order.status === FILTER_TO_STATUS[selectedFilter]);

    const setFilter = (filter) => {
        setSearchParams(filter === "Todos" ? {} : { estado: filter });
    };

    return (
        <div className="employee-dashboard">
            <div className="employee-dashboard__header">
                <div>
                    <span className="employee-dashboard__eyebrow">ESPACIO DE TRABAJO / OPERACIONES</span>
                    <h1>Administración de pedidos</h1>
                    <p>Gestiona los pedidos pendientes e incompletos.</p>
                </div>
            </div>

            <section className="employee-dashboard__statistics">
                <DashboardCard title="Pedidos pendientes" value={counts.PENDIENTE} description="Pendientes de gestión" icon={Clock3} />
                <Link className="employee-dashboard__stat-link" to="/empleado/pedidos/completos" aria-label="Abrir pedidos completos">
                    <DashboardCard title="Pedidos completos" value={counts.COMPLETO + counts.RECLAMADO} description="Ver pedidos procesados" icon={CheckCircle2} />
                </Link>
                <DashboardCard title="Pedidos incompletos" value={counts.INCOMPLETO} description="Requieren seguimiento" icon={CircleAlert} />
            </section>

            <section className="employee-orders">
                <div className="employee-orders__heading">
                    <div>
                        <span className="employee-dashboard__eyebrow">SEGUIMIENTO</span>
                        <h2>Pedidos por revisar</h2>
                        <p>Los pedidos completos se encuentran en su sección independiente.</p>
                    </div>
                    <button type="button" className="employee-orders__refresh" onClick={load}>
                        <RefreshCw size={14} /> Actualizar
                    </button>
                </div>

                <div className="employee-orders__filters" role="tablist" aria-label="Filtrar pedidos por estado">
                    {filters.map((filter) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={selectedFilter === filter}
                            className={selectedFilter === filter ? "is-active" : ""}
                            key={filter}
                            onClick={() => setFilter(filter)}
                        >
                            {filter === "Todos" ? "Todos" : `${filter}s`}
                            {filter !== "Todos" && <span>{counts[FILTER_TO_STATUS[filter]]}</span>}
                        </button>
                    ))}
                </div>

                {isLoading && <p className="employee-orders__state">Cargando pedidos...</p>}
                {!isLoading && errorMessage && <p className="employee-orders__state employee-orders__state--error" role="alert">{errorMessage}</p>}

                {!isLoading && !errorMessage && (
                    <div className="employee-orders__table-wrap">
                        <table className="employee-orders__table">
                            <thead>
                                <tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th aria-label="Acciones" /></tr>
                            </thead>
                            <tbody>
                                {visibleOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td><span className="employee-orders__id">{order.code}</span><small>StockPlan</small></td>
                                        <td>{order.customer}</td>
                                        <td>{formatOrderDate(order.createdAt)}</td>
                                        <td>{order.units} {order.units === 1 ? "unidad" : "unidades"} · {order.lines} {order.lines === 1 ? "producto" : "productos"}</td>
                                        <td>{formatOrderPrice(order.total)}</td>
                                        <td><span className={`order-status order-status--${order.status.toLowerCase()}`}>{getStatusIcon(order.status)}{ORDER_STATUS_LABEL[order.status]}</span></td>
                                        <td><Link className="employee-orders__details" to={`/empleado/pedidos/${order.id}`}>Ver detalles <ChevronRight size={16} /></Link></td>
                                    </tr>
                                ))}
                                {visibleOrders.length === 0 && <tr><td className="employee-orders__empty" colSpan="7">No hay pedidos para este filtro.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default EmployeeDashboard;
