import { ClipboardList, LogOut, UserRound, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCartChangeEventName, getCartItemCount } from "../../data/shoppingCart";
import { clearAuthSession, getAuthChangeEventName, getSessionUser } from "../../services/auth";

import NotificationBell from "./NotificationBell";

import "./Navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const userMenuRef = useRef(null);
    const [cartCount, setCartCount] = useState(getCartItemCount);
    const [currentUser, setCurrentUser] = useState(getSessionUser);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

    // El menú de la cuenta se cierra al hacer clic fuera de él.
    useEffect(() => {
        const handleOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const handleLogout = () => {
        setIsUserMenuOpen(false);
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

                {currentUser?.role === "USUARIO" && <NotificationBell user={currentUser} />}

                {currentUser ? (
                    <div className="navbar__user" ref={userMenuRef}>
                        <button
                            type="button"
                            className="navbar__user-button"
                            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                            aria-haspopup="menu"
                            aria-expanded={isUserMenuOpen}
                            aria-label={`Cuenta de ${currentUser.name}`}
                        >
                            <span className="navbar__account-name">{currentUser.name}</span>
                            <span className="navbar__user-avatar">
                                <UserRound size={19} strokeWidth={1.8} />
                            </span>
                        </button>

                        {isUserMenuOpen && (
                            <div className="navbar__user-menu">
                                {currentUser.role === "USUARIO" && (
                                    <Link
                                        to="/mis-pedidos"
                                        className="navbar__user-menu-item"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        <ClipboardList size={16} />
                                        Mis pedidos
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    className="navbar__user-menu-item"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={16} />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="navbar__icon"
                        aria-label="Iniciar sesión"
                        title="Iniciar sesión"
                    >
                        <UserRound
                            size={22}
                            strokeWidth={1.8}
                        />
                    </Link>
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
