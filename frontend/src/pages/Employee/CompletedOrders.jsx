import { CheckCircle2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { formatOrderPrice, getEmployeeOrders } from "../../data/employeeOrders";

import "./EmployeeDashboard.css";

function CompletedOrders() {
    const orders = getEmployeeOrders().filter((order) => order.status === "Completo");

    return (
        <div className="employee-dashboard employee-orders-page">
            <div className="employee-dashboard__header">
                <div>
                    <span className="employee-dashboard__eyebrow">ESPACIO DE TRABAJO / PEDIDOS</span>
                    <h1>Pedidos completos</h1>
                    <p>Pedidos que ya fueron procesados y entregados.</p>
                </div>
                <Link className="employee-orders-page__back" to="/empleado">Volver al panel</Link>
            </div>

            <section className="employee-orders">
                <div className="employee-orders__heading">
                    <div>
                        <span className="employee-dashboard__eyebrow">HISTORIAL</span>
                        <h2>Pedidos completados</h2>
                        <p>{orders.length} pedidos en esta sección</p>
                    </div>
                    <span className="employee-orders-page__completed-label"><CheckCircle2 size={16} /> Completados</span>
                </div>

                <div className="employee-orders__table-wrap">
                    <table className="employee-orders__table">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Correo</th><th>Fecha</th><th>Total</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id}>
                                    <td><span className="employee-orders__id">{order.id}</span><small>StockPlan</small></td>
                                    <td>{order.customer}</td>
                                    <td>{order.email}</td>
                                    <td>{order.date}</td>
                                    <td>{formatOrderPrice(order.total)}</td>
                                    <td><span className="order-status order-status--completo"><CheckCircle2 size={15} />Completo</span></td>
                                    <td><Link className="employee-orders__details" to={`/empleado/pedidos/${order.id}`}>Ver detalles <ChevronRight size={16} /></Link></td>
                                </tr>
                            ))}
                            {orders.length === 0 && <tr><td className="employee-orders__empty" colSpan="7">Todavía no hay pedidos completos.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default CompletedOrders;
