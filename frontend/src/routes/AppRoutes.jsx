import {
    BrowserRouter,
    Navigate,
    Routes,
    Route
} from "react-router-dom";

import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import AdminUsers from "../pages/AdminUsers/AdminUsers";
import AdminCatalog from "../pages/AdminCatalog/AdminCatalog";
import AdminProducts from "../pages/AdminProducts/AdminProducts";
import AdminProductDetail from "../pages/AdminProducts/AdminProductDetail";
import AdminReceptions from "../pages/AdminReceptions/AdminReceptions";
import AdminInventory from "../pages/AdminInventory/AdminInventory";
import AdminMovements from "../pages/AdminMovements/AdminMovements";
import ProductDetails from "../pages/ProductDetails/ProductDetails";
import Cart from "../pages/Cart/Cart";
import ProtectedRoute from "./ProtectedRoute";

import AdminLayout
    from "../layouts/AdminLayout/AdminLayout";
import EmployeeLayout
    from "../layouts/EmployeeLayout/EmployeeLayout";

import EmployeeDashboard
    from "../pages/Employee/EmployeeDashboard";
import CompletedOrders
    from "../pages/Employee/CompletedOrders";
import EmployeeOrderDetails
    from "../pages/Employee/EmployeeOrderDetails";

function AppRoutes() {

    return (
        <BrowserRouter>

            <Routes>

                {/* Página principal */}

                <Route
                    path="/"
                    element={<Home />}
                />


                {/* Login */}

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/registro"
                    element={<Register />}
                />


                {/* Detalle de producto */}

                <Route
                    path="/productos/:productId"
                    element={<ProductDetails />}
                />

                <Route
                    path="/carrito"
                    element={<Cart />}
                />


                {/* Panel del empleado */}

                <Route element={<ProtectedRoute allowedRoles={["EMPLEADO"]} />}>
                    <Route
                        path="/empleado"
                        element={<EmployeeLayout />}
                    >
                        <Route
                            index
                            element={<EmployeeDashboard />}
                        />

                        <Route
                            path="pedidos/completos"
                            element={<CompletedOrders />}
                        />

                        <Route
                            path="pedidos/:orderId"
                            element={<EmployeeOrderDetails />}
                        />
                    </Route>
                </Route>


                {/* Panel del administrador */}

                <Route element={<ProtectedRoute allowedRoles={["ADMINISTRADOR"]} />}>
                    <Route
                        path="/administrador"
                        element={<AdminLayout />}
                    >
                        <Route
                            index
                            element={<Navigate to="productos" replace />}
                        />

                        <Route
                            path="productos"
                            element={<AdminProducts />}
                        />

                        <Route
                            path="productos/:productId"
                            element={<AdminProductDetail />}
                        />

                        <Route
                            path="catalogo"
                            element={<AdminCatalog />}
                        />

                        <Route
                            path="recepciones"
                            element={<AdminReceptions />}
                        />

                        <Route
                            path="inventario"
                            element={<AdminInventory />}
                        />

                        <Route
                            path="movimientos"
                            element={<AdminMovements />}
                        />

                        <Route
                            path="usuarios"
                            element={<AdminUsers />}
                        />
                    </Route>
                </Route>


            </Routes>

        </BrowserRouter>
    );
}

export default AppRoutes;
