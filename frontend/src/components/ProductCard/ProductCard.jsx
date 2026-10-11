import { Link } from "react-router-dom";

import "./ProductCard.css";

function ProductCard({ product }) {
    const formatPrice = (price) => {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(price);
    };

    return (
        <Link
            to={`/productos/${product.id}`}
            className="product-card"
            aria-label={`Ver detalles de ${product.name}`}
        >

            <div className="product-card__image-container">
                <img
                    src={product.image}
                    alt={product.name}
                    className="product-card__image"
                />
            </div>

            <div className="product-card__info">

                <div>
                    <h3>{product.name}</h3>
                    <p>{product.category}</p>
                </div>

                <span className="product-card__price">
                    {formatPrice(product.price)}
                </span>

            </div>

        </Link>
    );
}

export default ProductCard;