import { NavLink } from "react-router-dom";
import { Activity, ArrowLeftRight, BellRing, Boxes, ClipboardList, LayoutGrid, Package, PackagePlus, Repeat, TrendingUp, Truck, Users } from "lucide-react";

const linkClass = ({ isActive }) =>
    `admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`;

function AdminSidebar({ isCollapsed }) {
    return (
        <aside className={`admin-sidebar ${isCollapsed ? "admin-sidebar--collapsed" : ""}`}>
            <nav className="admin-sidebar__nav">
                <NavLink to="/administrador" end className={linkClass}>
                    <LayoutGrid size={19} />
                    <span>Inicio</span>
                </NavLink>

                <div className="admin-sidebar__title">Catálogo</div>
                <NavLink to="/administrador/productos" className={linkClass}>
                    <Package size={19} />
                    <span>Productos</span>
                </NavLink>
                <NavLink to="/administrador/catalogo" className={linkClass}>
                    <Truck size={19} />
                    <span>Proveedores y tallas</span>
                </NavLink>

                <div className="admin-sidebar__title">Inventario</div>
                <NavLink to="/administrador/recepciones" className={linkClass}>
                    <PackagePlus size={19} />
                    <span>Recepciones</span>
                </NavLink>
                <NavLink to="/administrador/inventario" className={linkClass}>
                    <Boxes size={19} />
                    <span>Stock</span>
                </NavLink>
                <NavLink to="/administrador/movimientos" className={linkClass}>
                    <ArrowLeftRight size={19} />
                    <span>Movimientos</span>
                </NavLink>

                <div className="admin-sidebar__title">Pedidos</div>
                <NavLink to="/administrador/pedidos" className={linkClass}>
                    <ClipboardList size={19} />
                    <span>Pedidos</span>
                </NavLink>

                <div className="admin-sidebar__title">Análisis</div>
                <NavLink to="/administrador/reposicion" className={linkClass}>
                    <Repeat size={19} />
                    <span>Reposición</span>
                </NavLink>
                <NavLink to="/administrador/comportamiento" className={linkClass}>
                    <Activity size={19} />
                    <span>Comportamiento</span>
                </NavLink>
                <NavLink to="/administrador/ventas" className={linkClass}>
                    <TrendingUp size={19} />
                    <span>Ventas y recomendaciones</span>
                </NavLink>
                <NavLink to="/administrador/alertas" className={linkClass}>
                    <BellRing size={19} />
                    <span>Alertas</span>
                </NavLink>

                <div className="admin-sidebar__title">Sistema</div>
                <NavLink to="/administrador/usuarios" className={linkClass}>
                    <Users size={19} />
                    <span>Personal</span>
                </NavLink>
            </nav>
        </aside>
    );
}

export default AdminSidebar;
