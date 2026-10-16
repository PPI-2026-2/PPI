import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, RefreshCw, X } from "lucide-react";

import ProductImage from "../../components/ProductImage/ProductImage";
import {
    cancelReception,
    confirmReception,
    createReception,
    formatDateTime,
    getInventory,
    getReceptions
} from "../../services/admin";

const emptyForm = { productId: "", referenceId: "", expected: "", received: "", rejected: "0", rejectionReason: "", observation: "" };

const statusBadge = {
    REGISTRADA: "adm-badge--warn",
    CONFIRMADA: "adm-badge--active",
    ANULADA: "adm-badge--inactive"
};

function AdminReceptions() {
    const [receptions, setReceptions] = useState([]);
    const [references, setReferences] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const loadReceptions = useCallback(async (status) => {
        setError("");
        setIsLoading(true);
        try {
            setReceptions(await getReceptions({ status }));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReceptions("");
        getInventory()
            .then(({ items }) => setReferences(items.filter((item) => item.productStatus === "ACTIVO" && item.referenceStatus === "ACTIVO")))
            .catch((requestError) => setError(requestError.message));
    }, [loadReceptions]);

    const products = useMemo(() => {
        const byId = new Map();
        references.forEach((item) => byId.set(item.productId, item.productName));
        return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [references]);

    const sizesOfProduct = useMemo(
        () => references.filter((item) => String(item.productId) === String(form.productId)),
        [references, form.productId]
    );

    const received = Number(form.received) || 0;
    const rejected = Number(form.rejected) || 0;
    const accepted = received - rejected;

    const handleFilter = (status) => {
        setStatusFilter(status);
        loadReceptions(status);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            const reception = await createReception({
                referenceId: Number(form.referenceId),
                expected: form.expected,
                received: form.received,
                rejected: form.rejected,
                rejectionReason: form.rejectionReason.trim(),
                observation: form.observation.trim()
            });
            setNotice(`Recepción #${reception.id} registrada. El stock no cambia hasta que la confirmes.`);
            setForm(emptyForm);
            setShowForm(false);
            await loadReceptions(statusFilter);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const handleConfirm = async (reception) => {
        if (!window.confirm(`¿Confirmar la recepción #${reception.id}? Se sumarán ${reception.accepted} unidad(es) al inventario.`)) return;
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            await confirmReception(reception.id);
            setNotice(`Recepción #${reception.id} confirmada: ${reception.accepted} unidad(es) sumadas a ${reception.productName} talla ${reception.sizeName}.`);
            await loadReceptions(statusFilter);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const handleCancel = async (reception) => {
        const reason = window.prompt(`Motivo para anular la recepción #${reception.id} (opcional):`);
        if (reason === null) return;
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            await cancelReception(reception.id, reason.trim());
            setNotice(`Recepción #${reception.id} anulada. El inventario no se modificó.`);
            await loadReceptions(statusFilter);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div>
            <header className="adm-heading">
                <span>INVENTARIO / RECEPCIONES</span>
                <h1>Recepción de mercancía</h1>
                <p>Registra lo que entrega el proveedor, separando lo aceptado de lo rechazado. Al confirmar, lo aceptado entra al inventario y queda en los movimientos.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}

            <section className="adm-card">
                <div className="adm-card__header">
                    <div className="adm-toolbar">
                        <select className="adm-input" style={{ width: 170 }} value={statusFilter} onChange={(event) => handleFilter(event.target.value)}>
                            <option value="">Todas</option>
                            <option value="REGISTRADA">Registradas</option>
                            <option value="CONFIRMADA">Confirmadas</option>
                            <option value="ANULADA">Anuladas</option>
                        </select>
                        <button type="button" className="adm-btn" onClick={() => loadReceptions(statusFilter)} disabled={isLoading} aria-label="Actualizar">
                            <RefreshCw size={15} />
                        </button>
                    </div>
                    <button type="button" className="adm-btn adm-btn--primary" onClick={() => setShowForm((previous) => !previous)}>
                        <Plus size={15} /> {showForm ? "Cerrar formulario" : "Nueva recepción"}
                    </button>
                </div>

                {showForm && (
                    <form className="adm-card__body" onSubmit={handleSubmit} style={{ borderBottom: "1px solid var(--adm-border-soft)" }}>
                        {products.length === 0 && (
                            <p className="adm-message adm-message--info" style={{ margin: "0 0 16px" }}>
                                No hay productos activos con tallas activas. Crea productos primero en Catálogo.
                            </p>
                        )}
                        <div className="adm-grid">
                            <label className="adm-field">Producto
                                <select className="adm-input" value={form.productId} required disabled={isBusy}
                                    onChange={(event) => setForm({ ...form, productId: event.target.value, referenceId: "" })}>
                                    <option value="">Selecciona…</option>
                                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                </select>
                                <small>El proveedor es el asignado al producto.</small>
                            </label>
                            <label className="adm-field">Talla
                                <select className="adm-input" value={form.referenceId} required disabled={isBusy || !form.productId}
                                    onChange={(event) => setForm({ ...form, referenceId: event.target.value })}>
                                    <option value="">Selecciona…</option>
                                    {sizesOfProduct.map((item) => <option key={item.referenceId} value={item.referenceId}>{item.sizeName}</option>)}
                                </select>
                            </label>
                            <label className="adm-field">Cantidad esperada
                                <input className="adm-input" type="number" min="0" step="1" value={form.expected} required disabled={isBusy}
                                    onChange={(event) => setForm({ ...form, expected: event.target.value })} />
                                <small>Lo que el proveedor debía entregar.</small>
                            </label>
                            <label className="adm-field">Cantidad recibida
                                <input className="adm-input" type="number" min="1" step="1" value={form.received} required disabled={isBusy}
                                    onChange={(event) => setForm({ ...form, received: event.target.value })} />
                            </label>
                            <label className="adm-field">Cantidad rechazada
                                <input className="adm-input" type="number" min="0" step="1" value={form.rejected} disabled={isBusy}
                                    onChange={(event) => setForm({ ...form, rejected: event.target.value })} />
                                <small>Aceptada (entra al stock): <strong>{accepted >= 0 ? accepted : "—"}</strong></small>
                            </label>
                            {rejected > 0 && (
                                <label className="adm-field">Motivo del rechazo
                                    <input className="adm-input" value={form.rejectionReason} maxLength={200} required disabled={isBusy}
                                        onChange={(event) => setForm({ ...form, rejectionReason: event.target.value })} />
                                </label>
                            )}
                            <label className="adm-field adm-field--full">Observación (opcional)
                                <textarea className="adm-input" value={form.observation} maxLength={500} disabled={isBusy}
                                    onChange={(event) => setForm({ ...form, observation: event.target.value })} />
                            </label>
                        </div>
                        <div className="adm-actions">
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy || accepted < 0}>
                                <Plus size={15} /> {isBusy ? "Guardando…" : "Registrar recepción"}
                            </button>
                        </div>
                    </form>
                )}

                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>#</th><th>Fecha</th><th>Producto</th><th>Talla</th><th>Proveedor</th>
                                <th className="adm-num">Esperada</th><th className="adm-num">Recibida</th>
                                <th className="adm-num">Aceptada</th><th className="adm-num">Rechazada</th>
                                <th>Estado</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {receptions.map((reception) => (
                                <tr key={reception.id}>
                                    <td>{reception.id}</td>
                                    <td>{formatDateTime(reception.date)}</td>
                                    <td>
                                        <div className="adm-product">
                                            <span className="adm-thumb"><ProductImage key={reception.imageUrl} src={reception.imageUrl} /></span>
                                            <strong>{reception.productName}</strong>
                                        </div>
                                    </td>
                                    <td>{reception.sizeName}</td>
                                    <td>{reception.supplierName}</td>
                                    <td className="adm-num">{reception.expected}</td>
                                    <td className="adm-num">{reception.received}</td>
                                    <td className="adm-num">{reception.accepted}</td>
                                    <td className="adm-num" title={reception.rejectionReason || ""}>{reception.rejected}</td>
                                    <td><span className={`adm-badge ${statusBadge[reception.status]}`}>{reception.status}</span></td>
                                    <td className="adm-num">
                                        {reception.status === "REGISTRADA" && (
                                            <div className="adm-row-actions">
                                                <button type="button" className="adm-btn adm-btn--sm adm-btn--primary" disabled={isBusy} onClick={() => handleConfirm(reception)}>
                                                    <Check size={13} /> Confirmar
                                                </button>
                                                <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => handleCancel(reception)}>
                                                    <X size={13} /> Anular
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && receptions.length === 0 && <tr><td colSpan="11" className="adm-empty">No hay recepciones para mostrar.</td></tr>}
                            {isLoading && <tr><td colSpan="11" className="adm-empty">Cargando recepciones…</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminReceptions;
