import { NavLink } from "react-router-dom";
import { ArrowLeftRight, Boxes, Package, PackagePlus, Truck, Users } from "lucide-react";

const linkClass = ({ isActive }) =>
    `admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`;

function AdminSidebar({ isCollapsed }) {
    return (
        <aside className={`admin-sidebar ${isCollapsed ? "admin-sidebar--collapsed" : ""}`}>
            <nav className="admin-sidebar__nav">
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
