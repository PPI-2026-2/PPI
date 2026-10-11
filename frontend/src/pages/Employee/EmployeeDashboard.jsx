import { CheckCircle2, ChevronRight, CircleAlert, Clock3 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import DashboardCard from "../../components/DashboardCard/DashboardCard";
import { formatOrderPrice, getEmployeeOrders } from "../../data/employeeOrders";

import "../../components/DashboardCard/DashboardCard.css";
import "./EmployeeDashboard.css";

const filters = ["Todos", "Pendiente", "Incompleto"];

function getStatusIcon(status) {
    if (status === "Incompleto") return <CircleAlert size={15} />;
    return <Clock3 size={15} />;
}

function EmployeeDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedFilter = searchParams.get("estado") || "Todos";
    const orders = getEmployeeOrders();
    const activeOrders = orders.filter((order) => order.status !== "Completo");
    const visibleOrders = selectedFilter === "Todos"
        ? activeOrders
        : activeOrders.filter((order) => order.status === selectedFilter);
    const counts = {
        pending: activeOrders.filter((order) => order.status === "Pendiente").length,
        complete: orders.filter((order) => order.status === "Completo").length,
        incomplete: activeOrders.filter((order) => order.status === "Incompleto").length
    };

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
                <DashboardCard title="Pedidos pendientes" value={counts.pending} description="Pendientes de gestión" icon={Clock3} />
                <Link className="employee-dashboard__stat-link" to="/empleado/pedidos/completos" aria-label="Abrir pedidos completos">
                    <DashboardCard title="Pedidos completos" value={counts.complete} description="Ver pedidos procesados" icon={CheckCircle2} />
                </Link>
                <DashboardCard title="Pedidos incompletos" value={counts.incomplete} description="Requieren seguimiento" icon={CircleAlert} />
            </section>

            <section className="employee-orders">
                <div className="employee-orders__heading">
                    <div>
                        <span className="employee-dashboard__eyebrow">SEGUIMIENTO</span>
                        <h2>Pedidos por gestionar</h2>
                        <p>Los pedidos completos se encuentran en su sección independiente.</p>
                    </div>
                    <span className="employee-orders__updated"><span /> Datos de demostración</span>
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
                            {filter === "Todos" ? "Todos" : `${filter}${filter === "Pendiente" ? "s" : "s"}`}
                            {filter !== "Todos" && <span>{activeOrders.filter((order) => order.status === filter).length}</span>}
                        </button>
                    ))}
                </div>

                <div className="employee-orders__table-wrap">
                    <table className="employee-orders__table">
                        <thead>
                            <tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th aria-label="Acciones" /></tr>
                        </thead>
                        <tbody>
                            {visibleOrders.map((order) => (
                                <tr key={order.id}>
                                    <td><span className="employee-orders__id">{order.id}</span><small>StockPlan</small></td>
                                    <td>{order.customer}</td>
                                    <td>{order.date}</td>
                                    <td>{order.products.length} {order.products.length === 1 ? "producto" : "productos"}</td>
                                    <td>{formatOrderPrice(order.total)}</td>
                                    <td><span className={`order-status order-status--${order.status.toLowerCase()}`}>{getStatusIcon(order.status)}{order.status}</span></td>
                                    <td><Link className="employee-orders__details" to={`/empleado/pedidos/${order.id}`}>Ver detalles <ChevronRight size={16} /></Link></td>
                                </tr>
                            ))}
                            {visibleOrders.length === 0 && <tr><td className="employee-orders__empty" colSpan="7">No hay pedidos para este filtro.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default EmployeeDashboard;
