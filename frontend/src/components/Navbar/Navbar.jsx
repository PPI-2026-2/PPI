import { LogOut, UserRound, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCartChangeEventName, getCartItemCount } from "../../data/shoppingCart";
import { clearAuthSession, getAuthChangeEventName, getSessionUser } from "../../services/auth";

import "./Navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(getCartItemCount);
    const [currentUser, setCurrentUser] = useState(getSessionUser);

    useEffect(() => {
        const updateCartCount = () => setCartCount(getCartItemCount());
        window.addEventListener(getCartChangeEventName(), updateCartCount);
        window.addEventListener("storage", updateCartCount);
        return () => {
            window.removeEventListener(getCartChangeEventName(), updateCartCount);
            window.removeEventListener("storage", updateCartCount);
        };
    }, []);

    useEffect(() => {
        const updateSession = () => setCurrentUser(getSessionUser());
        window.addEventListener(getAuthChangeEventName(), updateSession);
        window.addEventListener("storage", updateSession);
        return () => {
            window.removeEventListener(getAuthChangeEventName(), updateSession);
            window.removeEventListener("storage", updateSession);
        };
    }, []);

    const getAccountPath = () => {
        if (currentUser?.role === "EMPLEADO") return "/empleado";
        if (currentUser?.role === "ADMINISTRADOR") return "/administrador/usuarios";
        return "/";
    };

    const handleLogout = () => {
        clearAuthSession();
        navigate("/", { replace: true });
    };

    return (
        <header className="navbar">

            <div className="navbar__logo">
                StockPlan
            </div>

            <nav className="navbar__menu">
                <Link to="/">
                    Inicio
                </Link>
            </nav>

            <div className="navbar__actions">

                <Link
                    to={currentUser ? getAccountPath() : "/login"}
                    className="navbar__icon"
                    aria-label={currentUser ? `Cuenta de ${currentUser.name}` : "Iniciar sesión"}
                    title={currentUser ? currentUser.name : "Iniciar sesión"}
                >
                    <UserRound
                        size={22}
                        strokeWidth={1.8}
                    />
                </Link>

                {currentUser && (
                    <>
                        <span className="navbar__account-name">{currentUser.name}</span>
                        <button
                            type="button"
                            className="navbar__logout"
                            onClick={handleLogout}
                            title="Cerrar sesión"
                        >
                            <LogOut size={16} />
                            <span>Cerrar sesión</span>
                        </button>
                    </>
                )}

                <Link
                    to="/carrito"
                    className="navbar__icon"
                    aria-label="Carrito de compras"
                    title="Carrito de compras"
                >
                    <ShoppingBag
                        size={22}
                        strokeWidth={1.8}
                    />
                    {cartCount > 0 && <span className="navbar__cart-count">{cartCount}</span>}
                </Link>

            </div>

        </header>
    );
}

export default Navbar;