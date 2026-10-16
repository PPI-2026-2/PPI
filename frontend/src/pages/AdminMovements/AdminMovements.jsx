import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import ProductImage from "../../components/ProductImage/ProductImage";
import { formatDateTime, getMovements, getProducts } from "../../services/admin";

const typeLabel = {
    ENTRADA_RECEPCION: "Entrada por recepción",
    SALIDA_PEDIDO: "Salida por pedido",
    AJUSTE: "Ajuste manual"
};

function movementDetail(movement) {
    const parts = [];
    if (movement.receptionId) parts.push(`Recepción #${movement.receptionId}`);
    if (movement.orderDetailId) parts.push(`Detalle de pedido #${movement.orderDetailId}`);
    if (movement.observation && movement.type === "AJUSTE") parts.push(movement.observation);
    return parts.join(" · ") || "—";
}

function AdminMovements() {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState({ type: "", productId: "" });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async (currentFilters) => {
        setError("");
        setIsLoading(true);
        try {
            setMovements(await getMovements({ ...currentFilters, limit: 200 }));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load({ type: "", productId: "" });
        getProducts().then(setProducts).catch((requestError) => setError(requestError.message));
    }, [load]);

    const updateFilter = (key, value) => {
        const next = { ...filters, [key]: value };
        setFilters(next);
        load(next);
    };

    return (
        <div>
            <header className="adm-heading">
                <span>INVENTARIO / MOVIMIENTOS</span>
                <h1>Trazabilidad de movimientos</h1>
                <p>Historial de cada cambio de stock: quién lo hizo, cuándo, de qué tipo y de dónde viene. Muestra los últimos 200 movimientos.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}

            <section className="adm-card">
                <div className="adm-card__header">
                    <div className="adm-toolbar">
                        <select className="adm-input" style={{ width: 210 }} value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
                            <option value="">Todos los tipos</option>
                            <option value="ENTRADA_RECEPCION">Entradas por recepción</option>
                            <option value="SALIDA_PEDIDO">Salidas por pedido</option>
                            <option value="AJUSTE">Ajustes manuales</option>
                        </select>
                        <select className="adm-input" style={{ width: 210 }} value={filters.productId} onChange={(event) => updateFilter("productId", event.target.value)}>
                            <option value="">Todos los productos</option>
                            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                        <button type="button" className="adm-btn" onClick={() => load(filters)} disabled={isLoading} aria-label="Actualizar">
                            <RefreshCw size={15} />
                        </button>
                    </div>
                </div>

                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>Fecha</th><th>Tipo</th><th>Producto</th><th>Talla</th>
                                <th className="adm-num">Cantidad</th><th>Responsable</th><th>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((movement) => (
                                <tr key={movement.id}>
                                    <td>{formatDateTime(movement.date)}</td>
                                    <td>{typeLabel[movement.type] || movement.type}</td>
                                    <td>
                                        <div className="adm-product">
                                            <span className="adm-thumb"><ProductImage key={movement.imageUrl} src={movement.imageUrl} /></span>
                                            <strong>{movement.productName}</strong>
                                        </div>
                                    </td>
                                    <td>{movement.sizeName}</td>
                                    <td className={`adm-num ${movement.quantity > 0 ? "adm-qty--in" : "adm-qty--out"}`}>
                                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                                    </td>
                                    <td>{movement.userName}</td>
                                    <td>{movementDetail(movement)}</td>
                                </tr>
                            ))}
                            {!isLoading && movements.length === 0 && <tr><td colSpan="7" className="adm-empty">Aún no hay movimientos registrados.</td></tr>}
                            {isLoading && <tr><td colSpan="7" className="adm-empty">Cargando movimientos…</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminMovements;
