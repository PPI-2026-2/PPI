import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ShoppingBag, Store } from "lucide-react";

import Navbar from "../../components/Navbar/Navbar";
import ProductImage from "../../components/ProductImage/ProductImage";
import { addToCart } from "../../data/shoppingCart";
import { getAuthChangeEventName, getSessionUser } from "../../services/auth";
import { getStoreProduct } from "../../services/store";
import { getPurchaseBlock } from "../../utils/purchaseAccess";

import "./ProductDetails.css";
import "./ProductDetailsLive.css";

function formatPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(price);
}

function ProductDetails() {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isAdded, setIsAdded] = useState(false);
    const [selectedSize, setSelectedSize] = useState(null);
    const [currentUser, setCurrentUser] = useState(getSessionUser);
    const [showPurchaseNotice, setShowPurchaseNotice] = useState(false);

    // Si la sesión cambia (inicia o cierra sesión), el aviso se vuelve a calcular.
    useEffect(() => {
        const updateSession = () => {
            setCurrentUser(getSessionUser());
            setShowPurchaseNotice(false);
        };
        window.addEventListener(getAuthChangeEventName(), updateSession);
        window.addEventListener("storage", updateSession);
        return () => {
            window.removeEventListener(getAuthChangeEventName(), updateSession);
            window.removeEventListener("storage", updateSession);
        };
    }, []);

    useEffect(() => {
        let isActive = true;
        setIsLoading(true);
        setErrorMessage("");
        setSelectedSize(null);
        setIsAdded(false);
        getStoreProduct(productId)
            .then((data) => { if (isActive) setProduct({ ...data, image: data.imageUrl }); })
            .catch((error) => {
                if (!isActive) return;
                setProduct(null);
                setErrorMessage(error.status === 404 ? "" : error.message);
            })
            .finally(() => { if (isActive) setIsLoading(false); });
        return () => { isActive = false; };
    }, [productId]);

    if (isLoading) {
        return (
            <div className="product-detail-page">
                <Navbar />
                <main className="product-detail__not-found">
                    <span>STOCKPLAN</span>
                    <h1>Cargando producto...</h1>
                </main>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-detail-page">
                <Navbar />
                <main className="product-detail__not-found">
                    <span>{errorMessage ? "NO SE PUDO CARGAR" : "PRODUCTO NO ENCONTRADO"}</span>
                    <h1>{errorMessage || "No encontramos ese producto"}</h1>
                    <Link to="/">Volver al catálogo</Link>
                </main>
            </div>
        );
    }

    const isAvailable = product.isAvailable;
    const statusLabel = isAvailable ? "Disponible" : "Agotado";
    const availableSizes = product.sizes.filter((size) => size.isAvailable);
    const purchaseBlock = getPurchaseBlock(currentUser);

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
                            <ProductImage src={product.image} alt={product.name} />
                        </div>
                        <p className="product-detail__image-caption">Diseñado para acompañar tu ritmo.</p>
                    </div>

                    <div className="product-detail__information">
                        <span className="product-detail__category">Calzado</span>
                        <h1>{product.name}</h1>
                        <p className="product-detail__subtitle">Comodidad y estilo para todos tus días.</p>
                        <p className="product-detail__price">{formatPrice(product.price)} <span>COP</span></p>

                        <div className={`product-detail__availability ${isAvailable ? "is-available" : "is-unavailable"}`}>
                            <span className="product-detail__availability-dot" />
                            <strong>{statusLabel}</strong>
                            <span>{isAvailable ? "Listo para acompañarte" : "Este producto no está disponible por ahora"}</span>
                        </div>

                        <div className="product-detail__separator" />

                        <h2>Descripción</h2>
                        <p className="product-detail__description">{product.description || "Calzado disponible en nuestra tienda."}</p>

                        <div className="product-detail__size-selector">
                            <span className="product-detail__size-label">Tallas</span>
                            <div className="product-detail__size-grid" role="group" aria-label="Tallas">
                                {product.sizes.map((size) => (
                                    <button
                                        type="button"
                                        key={size.referenceId}
                                        className={`product-detail__size-cell ${selectedSize?.referenceId === size.referenceId ? "is-selected" : ""} ${size.isAvailable ? "" : "is-soldout"}`}
                                        aria-pressed={selectedSize?.referenceId === size.referenceId}
                                        disabled={!size.isAvailable}
                                        title={size.isAvailable ? undefined : "Talla no disponible"}
                                        aria-label={size.isAvailable ? `Talla ${size.sizeName}` : `Talla ${size.sizeName}, no disponible`}
                                        onClick={() => {
                                            setSelectedSize(size);
                                            setIsAdded(false);
                                        }}
                                    >
                                        {size.sizeName}
                                    </button>
                                ))}
                            </div>
                            <span className="product-detail__size-hint">
                                {availableSizes.length
                                    ? (selectedSize ? `Talla seleccionada: ${selectedSize.sizeName}` : "Las tallas tachadas no están disponibles")
                                    : "Por ahora no hay tallas disponibles"}
                            </span>
                        </div>

                        <div className="product-detail__perks">
                            <Store size={18} />
                            <span>Entrega disponible en nuestra tienda local.</span>
                        </div>

                        <button
                            type="button"
                            className={`product-detail__add-button ${isAdded ? "is-added" : ""}`}
                            disabled={!isAvailable || (!purchaseBlock && !selectedSize)}
                            onClick={() => {
                                if (purchaseBlock) {
                                    setShowPurchaseNotice(true);
                                    return;
                                }
                                // Aquí solo se añade 1 unidad; la cantidad (máx. 10) se elige en el carrito.
                                addToCart(product, selectedSize, 1);
                                setIsAdded(true);
                            }}
                        >
                            {isAdded ? <Check size={19} /> : <ShoppingBag size={19} />}
                            {isAdded ? "Añadido al carrito" : isAvailable ? "Añadir al carrito" : "Producto agotado"}
                        </button>
                        {purchaseBlock && showPurchaseNotice && (
                            <div className="product-detail__auth-notice" role="alert">
                                <p>{purchaseBlock.message}</p>
                                {purchaseBlock.type === "guest" && (
                                    <div className="product-detail__auth-links">
                                        <Link to="/login">Iniciar sesión</Link>
                                        <Link to="/registro">Registrar cuenta</Link>
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="product-detail__note">
                            {!selectedSize && isAvailable ? "Selecciona una talla para continuar." : "Disponibilidad según el inventario actual."}
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default ProductDetails;