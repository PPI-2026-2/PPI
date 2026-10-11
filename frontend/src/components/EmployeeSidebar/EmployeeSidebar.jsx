import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
    LayoutDashboard,
    ShoppingBag,
    Clock3,
    CheckCircle2,
    CircleAlert
} from "lucide-react";
import { getEmployeeOrder } from "../../data/employeeOrders";

import "./EmployeeSidebar.css";

function EmployeeSidebar({ isCollapsed }) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const selectedStatus = searchParams.get("estado");
    const isCompletedPage = location.pathname === "/empleado/pedidos/completos";
    const isOrderDetail = location.pathname.startsWith("/empleado/pedidos/") && !isCompletedPage;
    const detailOrder = isOrderDetail
        ? getEmployeeOrder(location.pathname.split("/").pop())
        : null;
    const getLinkClass = (isActive) => `employee-sidebar__link ${isActive ? "employee-sidebar__link--active" : ""}`;

    return (
        <aside
            className={`employee-sidebar ${
                isCollapsed ? "employee-sidebar--collapsed" : ""
            }`}
        >

            <div className="employee-sidebar__content">

                <nav className="employee-sidebar__navigation">

                    <Link
                        to="/empleado"
                        className={getLinkClass(location.pathname === "/empleado" && !selectedStatus)}
                    >
                        <LayoutDashboard size={20} />

                        <span>
                            Dashboard
                        </span>
                    </Link>


                    <div className="employee-sidebar__section">

                        <div className="employee-sidebar__section-title">

                            <ShoppingBag size={17} />

                            <span>
                                Pedidos
                            </span>

                        </div>


                        <div className="employee-sidebar__submenu">

                            <Link
                                to="/empleado?estado=Pendiente"
                                className={getLinkClass(selectedStatus === "Pendiente" || detailOrder?.status === "Pendiente")}
                            >
                                <Clock3 size={18} />

                                <span>
                                    Pendientes
                                </span>
                            </Link>


                            <Link
                                to="/empleado/pedidos/completos"
                                className={getLinkClass(isCompletedPage || detailOrder?.status === "Completo")}
                            >
                                <CheckCircle2 size={18} />

                                <span>
                                    Completos
                                </span>
                            </Link>


                            <Link
                                to="/empleado?estado=Incompleto"
                                className={getLinkClass(selectedStatus === "Incompleto" || detailOrder?.status === "Incompleto")}
                            >
                                <CircleAlert size={18} />

                                <span>
                                    Incompletos
                                </span>
                            </Link>

                        </div>

                    </div>

                </nav>

            </div>

        </aside>
    );
}

export default EmployeeSidebar;