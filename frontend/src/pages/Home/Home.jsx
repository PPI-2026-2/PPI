import Navbar from "../../components/Navbar/Navbar";
import ProductCarousel from "../../components/ProductCarousel/ProductCarousel";
import products from "../../data/products";

import "./Home.css";

function Home() {
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

                    <ProductCarousel
                        products={products}
                    />

                </section>

            </main>

        </div>
    );
}

export default Home;