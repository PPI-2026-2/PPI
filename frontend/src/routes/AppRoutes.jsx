import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import AdminUsers from "../pages/AdminUsers/AdminUsers";
import ProductDetails from "../pages/ProductDetails/ProductDetails";
import Cart from "../pages/Cart/Cart";
import ProtectedRoute from "./ProtectedRoute";

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

                <Route element={<ProtectedRoute allowedRoles={["ADMINISTRADOR"]} />}>
                    <Route
                        path="/administrador/usuarios"
                        element={<AdminUsers />}
                    />
                </Route>


            </Routes>

        </BrowserRouter>
    );
}

export default AppRoutes;