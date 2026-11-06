import { useEffect, useState } from "react";

import Navbar from "../../components/Navbar/Navbar";
import ProductCarousel from "../../components/ProductCarousel/ProductCarousel";
import { getStoreProducts } from "../../services/store";

import "./Home.css";
import "./HomeLive.css";

function Home() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isActive = true;
        getStoreProducts()
            .then((list) => {
                if (!isActive) return;
                // La tarjeta usa "image"; la API entrega "imageUrl".
                setProducts(list.map((product) => ({ ...product, image: product.imageUrl })));
            })
            .catch((error) => { if (isActive) setErrorMessage(error.message); })
            .finally(() => { if (isActive) setIsLoading(false); });
        return () => { isActive = false; };
    }, []);

    return (
        <div className="home">

            <Navbar />

            <main>

                <section
                    id="inicio"
                    className="home__hero"
                >
                    <div className="home__hero-content">

                        <p className="home__eyebrow">
                            STOCKPLAN
                        </p>

                        <h1>
                            Encuentra tu próximo par
                        </h1>

                        <p>
                            Explora nuestra selección de
                            calzado disponible.
                        </p>

                        <a
                            href="#productos"
                            className="home__hero-button"
                        >
                            Ver productos
                        </a>

                    </div>
                </section>


                <section
                    id="productos"
                    className="home__products"
                >

                    <div className="home__section-header">

                        <h2>
                            Productos destacados
                        </h2>

                        <p>
                            Descubre nuestro catálogo disponible.
                        </p>

                    </div>

                    {isLoading && <p className="home__status">Cargando productos...</p>}
                    {!isLoading && errorMessage && <p className="home__status home__status--error">{errorMessage}</p>}
                    {!isLoading && !errorMessage && products.length === 0 && (
                        <p className="home__status">Por ahora no hay productos disponibles. Vuelve pronto.</p>
                    )}
                    {!isLoading && !errorMessage && products.length > 0 && (
                        <ProductCarousel
                            products={products}
                        />
                    )}

                </section>

            </main>

        </div>
    );
}

export default Home;
