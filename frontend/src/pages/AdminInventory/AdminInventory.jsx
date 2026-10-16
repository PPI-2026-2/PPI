import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";

import ProductImage from "../../components/ProductImage/ProductImage";
import { adjustInventory, getInventory, setInventoryMinimum } from "../../services/admin";

const levelBadge = {
    OK: "adm-badge--active",
    BAJO: "adm-badge--warn",
    AGOTADO: "adm-badge--inactive"
};
const levelLabel = { OK: "Normal", BAJO: "Bajo", AGOTADO: "Agotado" };

const emptySummary = { references: 0, units: 0, reserved: 0, soldOut: 0, low: 0 };

function AdminInventory() {
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(emptySummary);
    const [filters, setFilters] = useState({ q: "", level: "" });
    const [editing, setEditing] = useState(null); // { referenceId, mode: "adjust" | "minimum" }
    const [editForm, setEditForm] = useState({ quantity: "", observation: "", minimum: "" });
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const load = useCallback(async (currentFilters) => {
        setError("");
        setIsLoading(true);
        try {
            const data = await getInventory(currentFilters);
            setItems(data.items);
            setSummary(data.summary);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load({ q: "", level: "" });
    }, [load]);

    const handleSearch = (event) => {
        event.preventDefault();
        load(filters);
    };

    const handleLevel = (level) => {
        const next = { ...filters, level };
        setFilters(next);
        load(next);
    };

    const openEditor = (item, mode) => {
        setError("");
        setNotice("");
        setEditing({ referenceId: item.referenceId, mode });
        setEditForm({ quantity: "", observation: "", minimum: String(item.minimum) });
    };

    const handleSubmit = async (event, item) => {
        event.preventDefault();
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            if (editing.mode === "adjust") {
                await adjustInventory(item.referenceId, editForm.quantity, editForm.observation.trim());
                setNotice(`Ajuste guardado para ${item.productName} talla ${item.sizeName}.`);
            } else {
                await setInventoryMinimum(item.referenceId, editForm.minimum);
                setNotice(`Stock mínimo actualizado para ${item.productName} talla ${item.sizeName}.`);
            }
            setEditing(null);
            await load(filters);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div>
            <header className="adm-heading">
                <span>INVENTARIO / STOCK</span>
                <h1>Control de inventario</h1>
                <p>Existencias por producto y talla. El stock sube con las recepciones confirmadas y baja con las entregas de pedidos; los ajustes manuales quedan registrados.</p>
            </header>

            <div className="adm-stats">
                <div className="adm-stat"><span>Referencias</span><strong>{summary.references}</strong></div>
                <div className="adm-stat"><span>Unidades en stock</span><strong>{summary.units}</strong></div>
                <div className="adm-stat"><span>Reservadas</span><strong>{summary.reserved}</strong></div>
                <div className="adm-stat"><span>Agotadas</span><strong>{summary.soldOut}</strong></div>
                <div className="adm-stat"><span>Bajo mínimo</span><strong>{summary.low}</strong></div>
            </div>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}

            <section className="adm-card" style={{ marginTop: 18 }}>
                <div className="adm-card__header">
                    <div className="adm-toolbar">
                        <form onSubmit={handleSearch}>
                            <input className="adm-input" style={{ width: 230 }} placeholder="Buscar por producto…" value={filters.q}
                                onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
                            <button type="submit" className="adm-btn" aria-label="Buscar"><Search size={15} /></button>
                        </form>
                        <select className="adm-input" style={{ width: 170 }} value={filters.level} onChange={(event) => handleLevel(event.target.value)}>
                            <option value="">Todos los niveles</option>
                            <option value="OK">Normal</option>
                            <option value="BAJO">Bajo mínimo</option>
                            <option value="AGOTADO">Agotado</option>
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
                                <th>Producto</th><th>Talla</th>
                                <th className="adm-num">En stock</th><th className="adm-num">Reservado</th>
                                <th className="adm-num">Disponible</th><th className="adm-num">Mínimo</th>
                                <th>Nivel</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const isOpen = editing?.referenceId === item.referenceId;
                                const inactive = item.productStatus !== "ACTIVO" || item.referenceStatus !== "ACTIVO";
                                return (
                                    <Fragment key={item.referenceId}>
                                        <tr>
                                            <td>
                                                <div className="adm-product">
                                                    <span className="adm-thumb"><ProductImage key={item.imageUrl} src={item.imageUrl} /></span>
                                                    <div>
                                                        <Link to={`/administrador/productos/${item.productId}`}><strong>{item.productName}</strong></Link>
                                                        {inactive && <div><small>Inactivo en catálogo</small></div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{item.sizeName}</td>
                                            <td className="adm-num">{item.onHand}</td>
                                            <td className="adm-num">{item.reserved}</td>
                                            <td className="adm-num"><strong>{item.available}</strong></td>
                                            <td className="adm-num">{item.minimum}</td>
                                            <td><span className={`adm-badge ${levelBadge[item.level]}`}>{levelLabel[item.level]}</span></td>
                                            <td className="adm-num">
                                                <div className="adm-row-actions">
                                                    <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => openEditor(item, "adjust")}>Ajustar</button>
                                                    <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => openEditor(item, "minimum")}>Mínimo</button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr>
                                                <td colSpan="8" className="adm-editor-cell">
                                                    <form className="adm-inline-form" onSubmit={(event) => handleSubmit(event, item)}>
                                                        {editing.mode === "adjust" ? (
                                                            <>
                                                                <label className="adm-field">Cantidad (+ suma, − resta)
                                                                    <input className="adm-input" type="number" step="1" value={editForm.quantity} required disabled={isBusy}
                                                                        onChange={(event) => setEditForm({ ...editForm, quantity: event.target.value })} />
                                                                </label>
                                                                <label className="adm-field adm-field--grow">Motivo del ajuste
                                                                    <input className="adm-input" value={editForm.observation} maxLength={500} required disabled={isBusy}
                                                                        placeholder="Ej.: conteo físico, merma, daño…"
                                                                        onChange={(event) => setEditForm({ ...editForm, observation: event.target.value })} />
                                                                </label>
                                                            </>
                                                        ) : (
                                                            <label className="adm-field">Stock mínimo
                                                                <input className="adm-input" type="number" min="0" step="1" value={editForm.minimum} required disabled={isBusy}
                                                                    onChange={(event) => setEditForm({ ...editForm, minimum: event.target.value })} />
                                                                <small>Se marca "Bajo" cuando lo disponible llega a este valor.</small>
                                                            </label>
                                                        )}
                                                        <div className="adm-row-actions">
                                                            <button type="submit" className="adm-btn adm-btn--primary adm-btn--sm" disabled={isBusy}>Guardar</button>
                                                            <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => setEditing(null)}>Cancelar</button>
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                            {!isLoading && items.length === 0 && <tr><td colSpan="8" className="adm-empty">No hay existencias para mostrar.</td></tr>}
                            {isLoading && <tr><td colSpan="8" className="adm-empty">Cargando inventario…</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminInventory;
