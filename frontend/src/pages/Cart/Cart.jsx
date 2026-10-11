import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import {
    clearCart,
    formatCartPrice,
    getCartChangeEventName,
    getCartItems,
    getCartTotal,
    removeCartItem,
    updateCartItemQuantity
} from "../../data/shoppingCart";

import "./Cart.css";

function Cart() {
    const [items, setItems] = useState(getCartItems);
    const [isOrderPlaced, setIsOrderPlaced] = useState(false);
    const total = getCartTotal(items);

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

    const handlePlaceOrder = () => {
        if (!items.length) return;
        clearCart();
        setItems([]);
        setIsOrderPlaced(true);
    };

    return (
        <div className="cart-page">
            <Navbar />
            <main className="cart-page__main">
                <Link className="cart-page__back" to="/"><ArrowLeft size={16} /> Seguir comprando</Link>

                {isOrderPlaced ? (
                    <section className="cart-confirmation">
                        <div className="cart-confirmation__icon"><CheckCircle2 size={30} /></div>
                        <span>STOCKPLAN / PEDIDO</span>
                        <h1>Pedido registrado</h1>
                        <p>Esta confirmación es una demostración. La creación real de pedidos estará disponible cuando se conecte el backend.</p>
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
                                                <div className="cart-item__image"><img src={item.image} alt={item.name} /></div>
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
                                                    <button type="button" aria-label={`Aumentar cantidad de ${item.name}`} disabled={item.quantity >= 10} onClick={() => handleQuantityChange(item, item.quantity + 1)}><Plus size={14} /></button>
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
                                    <button className="cart-summary__order" type="button" onClick={handlePlaceOrder}>Hacer pedido</button>
                                    <p>El pedido es una demostración local; todavía no se envía al backend.</p>
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
