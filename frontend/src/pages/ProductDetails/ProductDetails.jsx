import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Heart, Minus, Plus, ShoppingBag, Store } from "lucide-react";

import Navbar from "../../components/Navbar/Navbar";
import products from "../../data/products";
import { addToCart } from "../../data/shoppingCart";

import "./ProductDetails.css";

function formatPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(price);
}

function ProductDetails() {
    const { productId } = useParams();
    const product = products.find((item) => String(item.id) === productId);
    const [isAdded, setIsAdded] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [selectedSize, setSelectedSize] = useState("");
    const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);

    if (!product) {
        return (
            <div className="product-detail-page">
                <Navbar />
                <main className="product-detail__not-found">
                    <span>PRODUCTO NO ENCONTRADO</span>
                    <h1>No encontramos ese producto</h1>
                    <Link to="/">Volver al catálogo</Link>
                </main>
            </div>
        );
    }

    const isAvailable = product.status === "Disponible";
    const selectedTotal = product.price * quantity;

    return (
        <div className="product-detail-page">
            <Navbar />
            <main className="product-detail">
                <nav className="product-detail__breadcrumb" aria-label="Migas de pan">
                    <Link to="/">Inicio</Link>
                    <span>/</span>
                    <a href="/#productos">Productos</a>
                    <span>/</span>
                    <span>{product.name}</span>
                </nav>

                <Link className="product-detail__back" to="/">
                    <ArrowLeft size={17} /> Volver a productos
                </Link>

                <section className="product-detail__layout">
                    <div className="product-detail__visual">
                        <div className="product-detail__image-wrap">
                            <span className="product-detail__image-tag">STOCKPLAN / SELECCIÓN</span>
                            <img src={product.image} alt={product.name} />
                            <button
                                type="button"
                                className={`product-detail__favorite ${isFavorite ? "is-active" : ""}`}
                                aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                aria-pressed={isFavorite}
                                onClick={() => setIsFavorite((previous) => !previous)}
                            >
                                <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <p className="product-detail__image-caption">Diseñado para acompañar tu ritmo.</p>
                    </div>

                    <div className="product-detail__information">
                        <span className="product-detail__category">{product.category}</span>
                        <h1>{product.name}</h1>
                        <p className="product-detail__subtitle">Comodidad y estilo para todos tus días.</p>
                        <p className="product-detail__price">{formatPrice(product.price)} <span>COP</span></p>

                        <div className={`product-detail__availability ${isAvailable ? "is-available" : "is-unavailable"}`}>
                            <span className="product-detail__availability-dot" />
                            <strong>{product.status}</strong>
                            <span>{isAvailable ? "Listo para acompañarte" : "Este producto no está disponible por ahora"}</span>
                        </div>

                        <div className="product-detail__separator" />

                        <h2>Descripción</h2>
                        <p className="product-detail__description">{product.description}</p>

                        <div className="product-detail__size-selector">
                            <span className="product-detail__size-label">Selecciona tu talla</span>
                            <div className="product-detail__size-control">
                                <button
                                    type="button"
                                    className="product-detail__size-trigger"
                                    aria-expanded={isSizeMenuOpen}
                                    aria-controls="product-size-options"
                                    onClick={() => setIsSizeMenuOpen((open) => !open)}
                                >
                                    <span>{selectedSize ? `Talla ${selectedSize}` : "Talla"}</span>
                                    <ChevronDown size={17} />
                                </button>
                                {isSizeMenuOpen && (
                                    <div className="product-detail__size-menu" id="product-size-options" role="group" aria-label="Opciones de talla">
                                        {Array.from({ length: 9 }, (_, index) => index + 35).map((size) => (
                                            <button
                                                type="button"
                                                key={size}
                                                className={selectedSize === size ? "is-selected" : ""}
                                                aria-pressed={selectedSize === size}
                                                onClick={() => {
                                                    setSelectedSize(size);
                                                    setIsSizeMenuOpen(false);
                                                    setIsAdded(false);
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="product-detail__size-hint">
                                {selectedSize ? `Talla seleccionada: ${selectedSize}` : "Tallas disponibles del 35 al 43"}
                            </span>
                        </div>

                        <div className="product-detail__quantity-selector">
                            <span className="product-detail__size-label">Cantidad</span>
                            <div className="product-detail__quantity-control" aria-label="Cantidad del producto">
                                <button
                                    type="button"
                                    aria-label="Reducir cantidad"
                                    disabled={quantity <= 1}
                                    onClick={() => {
                                        setQuantity((current) => Math.max(1, current - 1));
                                        setIsAdded(false);
                                    }}
                                >
                                    <Minus size={15} />
                                </button>
                                <output aria-live="polite">{quantity}</output>
                                <button
                                    type="button"
                                    aria-label="Aumentar cantidad"
                                    disabled={quantity >= 10}
                                    onClick={() => {
                                        setQuantity((current) => Math.min(10, current + 1));
                                        setIsAdded(false);
                                    }}
                                >
                                    <Plus size={15} />
                                </button>
                            </div>
                            <span className="product-detail__size-hint">Máximo 10 unidades por pedido</span>
                        </div>

                        <div className="product-detail__perks">
                            <Store size={18} />
                            <span>Entrega disponible en nuestra tienda local.</span>
                        </div>

                        <button
                            type="button"
                            className={`product-detail__add-button ${isAdded ? "is-added" : ""}`}
                            disabled={!isAvailable || !selectedSize}
                            onClick={() => {
                                addToCart(product, selectedSize, quantity);
                                setIsAdded(true);
                            }}
                        >
                            {isAdded ? <Check size={19} /> : <ShoppingBag size={19} />}
                            {isAdded ? `${quantity} ${quantity === 1 ? "unidad añadida" : "unidades añadidas"} · ${formatPrice(selectedTotal)}` : isAvailable ? "Añadir al carrito" : "Producto agotado"}
                        </button>
                        <p className="product-detail__note">
                            {!selectedSize && isAvailable ? "Selecciona una talla para continuar." : "Vista de demostración · disponibilidad y carrito son ilustrativos."}
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default ProductDetails;
