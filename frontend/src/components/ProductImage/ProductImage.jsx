import { useState } from "react";

function ProductImage({ src, alt = "", className = "", fallback = "Sin foto" }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) return <span className="product-image-fallback">{fallback}</span>;

    return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}

export default ProductImage;
