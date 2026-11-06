import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import ProductImage from "../../components/ProductImage/ProductImage";
import {
    clearCart,
    formatCartPrice,
    getCartChangeEventName,
    getCartItems,
    getCartTotal,
    removeCartItem,
    updateCartItemQuantity
} from "../../data/shoppingCart";
import { getAuthChangeEventName, getSessionUser } from "../../services/auth";
import { createOrder } from "../../services/orders";
import { getPurchaseBlock } from "../../utils/purchaseAccess";

import "./Cart.css";
import "./CartLive.css";

function Cart() {
    const [items, setItems] = useState(getCartItems);
    const [placedOrder, setPlacedOrder] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderError, setOrderError] = useState("");
    const [currentUser, setCurrentUser] = useState(getSessionUser);
    const purchaseBlock = getPurchaseBlock(currentUser);
    const total = getCartTotal(items);

    useEffect(() => {
        const refreshSession = () => {
            setCurrentUser(getSessionUser());
            setOrderError("");
        };
        window.addEventListener(getAuthChangeEventName(), refreshSession);
        window.addEventListener("storage", refreshSession);
        return () => {
            window.removeEventListener(getAuthChangeEventName(), refreshSession);
            window.removeEventListener("storage", refreshSession);
        };
    }, []);

    useEffect(() => {
        const refreshCart = () => setItems(getCartItems());
        window.addEventListener(getCartChangeEventName(), refreshCart);
        window.addEventListener("storage", refreshCart);
        return () => {
            window.removeEventListener(getCartChangeEventName(), refreshCart);
            window.removeEventListener("storage", refreshCart);
        };
    }, []);

    const handleQuantityChange = (item, quantity) => {
        setItems(updateCartItemQuantity(item.productId, item.size, quantity));
    };

    const handleRemoveItem = (item) => {
        setItems(removeCartItem(item.productId, item.size));
    };

    const handlePlaceOrder = async () => {
        if (!items.length || isSubmitting) return;
        if (purchaseBlock) {
            setOrderError(purchaseBlock.message);
            return;
        }
        setIsSubmitting(true);
        setOrderError("");
        try {
            const order = await createOrder(items);
            clearCart();
            setItems([]);
            setPlacedOrder(order);
        } catch (error) {
            setOrderError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="cart-page">
            <Navbar />
            <main className="cart-page__main">
                <Link className="cart-page__back" to="/"><ArrowLeft size={16} /> Seguir comprando</Link>

                {placedOrder ? (
                    <section className="cart-confirmation">
                        <div className="cart-confirmation__icon"><CheckCircle2 size={30} /></div>
                        <span>STOCKPLAN / PEDIDO</span>
                        <h1>Pedido registrado</h1>
                        <p>Tu pedido <strong>{placedOrder.code}</strong> quedó pendiente por un valor de <strong>{formatCartPrice(placedOrder.total)}</strong>. La entrega se hace en nuestra tienda local, donde nuestro equipo prepara tu pedido. Puedes cancelarlo durante los primeros {placedOrder.cancelWindowMinutes ?? 15} minutos desde <Link className="cart-confirmation__text-link" to="/mis-pedidos">Mis pedidos</Link>; después la tienda lo verifica.</p>
                        <p className="cart-confirmation__follow"><strong>Durante las próximas 72 horas</strong> debes estar pendiente de la página: allí se te notificará cualquier novedad de tu pedido, en la campana y en <Link className="cart-confirmation__text-link" to="/mis-pedidos">Mis pedidos</Link>.</p>
                        <ul className="cart-confirmation__items">
                            {placedOrder.items.map((item) => (
                                <li key={item.referenceId}>
                                    <span>{item.quantity} × {item.productName} · Talla {item.sizeName}</span>
                                    <span>{formatCartPrice(item.subtotal)}</span>
                                </li>
                            ))}
                        </ul>
                        <Link to="/">Volver al catálogo</Link>
                    </section>
                ) : (
                    <>
                        <header className="cart-page__heading">
                            <div>
                                <span className="cart-page__eyebrow">STOCKPLAN / TU SELECCIÓN</span>
                                <h1>Tu carro de la compra</h1>
                                <p>Revisa los productos antes de hacer tu pedido.</p>
                            </div>
                            <span className="cart-page__item-count">{items.reduce((sum, item) => sum + item.quantity, 0)} artículos</span>
                        </header>

                        {!items.length ? (
                            <section className="cart-empty">
                                <div className="cart-empty__icon"><ShoppingBag size={25} /></div>
                                <h2>Tu carrito está vacío</h2>
                                <p>Explora el catálogo y añade los productos que te interesan.</p>
                                <Link to="/#productos">Ver productos</Link>
                            </section>
                        ) : (
                            <div className="cart-page__layout">
                                <section className="cart-items" aria-label="Productos en el carrito">
                                    <div className="cart-items__heading"><span>Producto</span><span>Precio</span></div>
                                    {items.map((item) => (
                                        <article className="cart-item" key={`${item.productId}-${item.size}`}>
                                            <div className="cart-item__product">
                                                <div className="cart-item__image"><ProductImage src={item.image} alt={item.name} /></div>
                                                <div className="cart-item__information">
                                                    <span>Calzado</span>
                                                    <h2>{item.name}</h2>
                                                    <p>Talla {item.size}</p>
                                                    <button className="cart-item__remove" type="button" onClick={() => handleRemoveItem(item)}><Trash2 size={14} /> Quitar</button>
                                                </div>
                                            </div>
                                            <div className="cart-item__purchase">
                                                <strong>{formatCartPrice(item.price)}</strong>
                                                <div className="cart-item__quantity" aria-label={`Cantidad para ${item.name}`}>
                                                    <button type="button" aria-label={`Disminuir cantidad de ${item.name}`} disabled={item.quantity <= 1} onClick={() => handleQuantityChange(item, item.quantity - 1)}><Minus size={14} /></button>
                                                    <output>{item.quantity}</output>
                                                    <button type="button" aria-label={`Aumentar cantidad de ${item.name}`} disabled={item.quantity >= Math.min(10, item.maxQuantity ?? 10)} onClick={() => handleQuantityChange(item, item.quantity + 1)}><Plus size={14} /></button>
                                                </div>
                                                <span className="cart-item__subtotal">Subtotal: {formatCartPrice(item.price * item.quantity)}</span>
                                            </div>
                                        </article>
                                    ))}
                                    <div className="cart-items__delivery"><Store size={17} /><span>Entrega disponible en nuestra tienda local.</span></div>
                                </section>

                                <aside className="cart-summary">
                                    <span className="cart-summary__eyebrow">RESUMEN</span>
                                    <h2>Tu pedido</h2>
                                    <div className="cart-summary__line"><span>Productos ({items.reduce((sum, item) => sum + item.quantity, 0)})</span><span>{formatCartPrice(total)}</span></div>
                                    <div className="cart-summary__line"><span>Entrega</span><span>En tienda local</span></div>
                                    <div className="cart-summary__total"><span>Total</span><strong>{formatCartPrice(total)}</strong></div>
                                    {orderError && (
                                        <div className="cart-summary__error" role="alert">
                                            <p>{orderError}</p>
                                            {purchaseBlock?.type === "guest" && (
                                                <span className="cart-summary__error-links">
                                                    <Link to="/login">Iniciar sesión</Link>
                                                    <Link to="/registro">Registrar cuenta</Link>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <button className="cart-summary__order" type="button" onClick={handlePlaceOrder} disabled={isSubmitting}>{isSubmitting ? "Registrando pedido..." : "Hacer pedido"}</button>
                                    <p>Tu pedido queda pendiente y lo recoges en nuestra tienda local.</p>
                                </aside>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default Cart;