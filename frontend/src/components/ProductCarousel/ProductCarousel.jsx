import ProductCard from "../ProductCard/ProductCard";
import "./ProductCarousel.css";

function ProductCarousel({ products }) {

    return (
        <div
            className="product-carousel"
        >

            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                />
            ))}

        </div>
    );
}

export default ProductCarousel;
