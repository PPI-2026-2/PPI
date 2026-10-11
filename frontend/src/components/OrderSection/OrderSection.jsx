import {
    Clock3,
    Package,
    ChevronRight
} from "lucide-react";

import "./OrderSection.css";

const pendingOrders = [
    {
        id: "SP-0001",
        products: 3,
        status: "Pendiente"
    },
    {
        id: "SP-0002",
        products: 2,
        status: "Pendiente"
    },
    {
        id: "SP-0003",
        products: 5,
        status: "Pendiente"
    }
];

function OrderSection() {

    return (
        <section className="order-section">

            <div className="order-section__header">

                <div>
                    <h2>
                        Pedidos pendientes
                    </h2>

                    <p>
                        Pedidos que requieren atención.
                    </p>
                </div>

            </div>


            <div className="order-section__list">

                {pendingOrders.map((order) => (

                    <article
                        key={order.id}
                        className="order-item"
                    >

                        <div className="order-item__main">

                            <div className="order-item__icon">
                                <Package size={20} />
                            </div>


                            <div className="order-item__information">

                                <h3>
                                    Pedido #{order.id}
                                </h3>

                                <span>
                                    {order.products} productos
                                </span>

                            </div>

                        </div>


                        <div className="order-item__right">

                            <span className="order-item__status">
                                <Clock3 size={15} />
                                {order.status}
                            </span>


                            <button
                                type="button"
                                className="order-item__button"
                            >
                                Ver pedido

                                <ChevronRight size={17} />
                            </button>

                        </div>

                    </article>

                ))}

            </div>

        </section>
    );
}

export default OrderSection;