import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, RefreshCw, Save, X } from "lucide-react";

import FieldError from "../../components/FieldError/FieldError";
import Pagination from "../../components/Pagination/Pagination";
import ProductImage from "../../components/ProductImage/ProductImage";
import { useFieldErrors } from "../../hooks/useFieldErrors";
import {
    cancelReception,
    confirmReception,
    formatDateTime,
    getInventory,
    getReceptions,
    receiveDelivery
} from "../../services/admin";
import { fieldError, isBlank, isWholeNumber, REQUIRED_MESSAGE, summaryMessage } from "../../utils/validation";

const PAGE_SIZE = 100;
// quantities: { [referenceId]: { received, rejected } } solo de las tallas elegidas, en el orden en que se eligieron.
const emptyForm = { productId: "", selected: [], quantities: {}, rejectionReason: "", observation: "" };

const statusBadge = {
    REGISTRADA: "adm-badge--warn",
    CONFIRMADA: "adm-badge--active",
    ANULADA: "adm-badge--inactive"
};

const toCount = (value) => (isWholeNumber(value) ? Number(value) : 0);

function AdminReceptions() {
    const [receptions, setReceptions] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [references, setReferences] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const { errors, validate, clear, reset, errorId, fieldProps } = useFieldErrors("reception");

    const loadReceptions = useCallback(async (status, page = 1) => {
        setError("");
        setIsLoading(true);
        try {
            const data = await getReceptions({ status, page, pageSize: PAGE_SIZE });
            setReceptions(data.receptions);
            setPagination(data.pagination);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadReferences = useCallback(() => getInventory()
        .then(({ items }) => setReferences(items.filter((item) => item.productStatus === "ACTIVO" && item.referenceStatus === "ACTIVO")))
        .catch((requestError) => setError(requestError.message)), []);

    useEffect(() => {
        loadReceptions("", 1);
        loadReferences();
    }, [loadReceptions, loadReferences]);

    const products = useMemo(() => {
        const byId = new Map();
        references.forEach((item) => byId.set(item.productId, item.productName));
        return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [references]);

    const sizesOfProduct = useMemo(
        () => references.filter((item) => String(item.productId) === String(form.productId)),
        [references, form.productId]
    );

    // Filas de la entrega en el mismo orden que las tallas del producto.
    const lines = useMemo(
        () => sizesOfProduct
            .filter((item) => form.selected.includes(item.referenceId))
            .map((item) => {
                const quantity = form.quantities[item.referenceId] ?? { received: "", rejected: "" };
                const received = toCount(quantity.received);
                const rejected = toCount(quantity.rejected);
                return { ...item, ...quantity, receivedCount: received, rejectedCount: rejected, accepted: received - rejected };
            }),
        [sizesOfProduct, form.selected, form.quantities]
    );

    const totals = lines.reduce(
        (sum, line) => ({ received: sum.received + line.receivedCount, rejected: sum.rejected + line.rejectedCount }),
        { received: 0, rejected: 0 }
    );
    const hasRejected = totals.rejected > 0;

    const handleFilter = (status) => {
        setStatusFilter(status);
        loadReceptions(status, 1);
    };

    const goToPage = (page) => {
        loadReceptions(statusFilter, page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeForm = () => {
        setForm(emptyForm);
        reset();
        setShowForm(false);
    };

    const selectProduct = (productId) => {
        setForm({ ...emptyForm, productId });
        reset();
    };

    const toggleSize = (referenceId) => {
        setForm((current) => {
            const isSelected = current.selected.includes(referenceId);
            const quantities = { ...current.quantities };
            if (isSelected) delete quantities[referenceId];
            else quantities[referenceId] = { received: "", rejected: "" };
            return {
                ...current,
                selected: isSelected ? current.selected.filter((id) => id !== referenceId) : [...current.selected, referenceId],
                quantities
            };
        });
        clear("sizes");
        clear(`received-${referenceId}`);
        clear(`rejected-${referenceId}`);
    };

    const updateQuantity = (referenceId, field, value) => {
        setForm((current) => ({
            ...current,
            quantities: { ...current.quantities, [referenceId]: { ...current.quantities[referenceId], [field]: value } }
        }));
        clear(`${field}-${referenceId}`);
        if (field === "received") clear(`rejected-${referenceId}`);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");

        const checks = {
            productId: fieldError(form.productId),
            sizes: form.productId && !lines.length ? "Selecciona al menos una talla de la entrega." : "",
            rejectionReason: hasRejected ? fieldError(form.rejectionReason) : ""
        };
        lines.forEach((line) => {
            checks[`received-${line.referenceId}`] = fieldError(line.received, [
                (value) => isWholeNumber(value) && Number(value) >= 1,
                "Escribe un número entero de 1 o más."
            ]);
            checks[`rejected-${line.referenceId}`] = isBlank(line.rejected)
                ? ""
                : fieldError(line.rejected,
                    [isWholeNumber, "Escribe un número entero de 0 o más."],
                    [(value) => Number(value) <= line.receivedCount, "No puede superar la cantidad recibida."]);
        });
        const found = validate(checks, event.currentTarget);
        if (Object.keys(found).length) {
            const onlySizes = Object.keys(found).length === 1 && found.sizes;
            setError(onlySizes ? found.sizes : summaryMessage(found));
            return;
        }

        const product = products.find((item) => String(item.id) === String(form.productId));
        setIsBusy(true);
        try {
            const saved = await receiveDelivery({
                productId: Number(form.productId),
                lines: lines.map((line) => ({
                    referenceId: line.referenceId,
                    received: line.receivedCount,
                    rejected: line.rejectedCount
                })),
                rejectionReason: hasRejected ? form.rejectionReason.trim() : "",
                observation: form.observation.trim()
            });
            const accepted = saved.reduce((sum, reception) => sum + reception.accepted, 0);
            const sizes = saved.map((reception) => reception.sizeName).join(", ");
            setNotice(`Entrega de ${product?.name ?? "el producto"} guardada: ${accepted} unidad(es) aceptadas ya están en inventario (tallas ${sizes}).`);
            closeForm();
            await Promise.all([loadReceptions(statusFilter, 1), loadReferences()]);
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
            await loadReceptions(statusFilter, pagination?.page ?? 1);
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
            await loadReceptions(statusFilter, pagination?.page ?? 1);
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
                <p>Registra lo que entrega el proveedor: elige el producto, marca las tallas que llegaron y escribe por cada una lo recibido y lo rechazado. Al guardar, lo aceptado entra al inventario y queda en los movimientos.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}

            <section className="adm-card">
                <div className="adm-card__header">
                    <div className="adm-toolbar">
                        <label className="adm-filter-label">Filtro por estado
                            <select className="adm-input" style={{ width: 170 }} value={statusFilter} onChange={(event) => handleFilter(event.target.value)}>
                                <option value="">Todas</option>
                                <option value="REGISTRADA">Registradas</option>
                                <option value="CONFIRMADA">Confirmadas</option>
                                <option value="ANULADA">Anuladas</option>
                            </select>
                        </label>
                        <button type="button" className="adm-btn" onClick={() => loadReceptions(statusFilter, pagination?.page ?? 1)} disabled={isLoading} aria-label="Actualizar">
                            <RefreshCw size={15} />
                        </button>
                    </div>
                    <button type="button" className="adm-btn adm-btn--primary" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
                        {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? "Cancelar" : "Nueva recepción"}
                    </button>
                </div>

                {showForm && (
                    <form className="adm-card__body" onSubmit={handleSubmit} noValidate style={{ borderBottom: "1px solid var(--adm-border-soft)" }}>
                        {products.length === 0 && (
                            <p className="adm-message adm-message--info" style={{ margin: "0 0 16px" }}>
                                No hay productos activos con tallas activas. Crea productos primero en Catálogo.
                            </p>
                        )}
                        <div className="adm-grid">
                            <label className="adm-field">Producto
                                <select className="adm-input" value={form.productId} required disabled={isBusy}
                                    {...fieldProps("productId")}
                                    onChange={(event) => selectProduct(event.target.value)}>
                                    <option value="">Selecciona…</option>
                                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                </select>
                                <FieldError id={errorId("productId")} message={errors.productId} />
                                <small>El proveedor es el asignado al producto.</small>
                            </label>

                            <div className="adm-field adm-field--full" role="group" aria-label="Tallas que llegaron"
                                aria-describedby={errors.sizes ? errorId("sizes") : undefined}>
                                Tallas que llegaron
                                {form.productId ? (
                                    <div className="adm-chip-list">
                                        {sizesOfProduct.map((item) => {
                                            const isOn = form.selected.includes(item.referenceId);
                                            return (
                                                <label key={item.referenceId} className={`adm-chip ${isOn ? "adm-chip--on" : ""}`}>
                                                    <input type="checkbox" checked={isOn} disabled={isBusy} onChange={() => toggleSize(item.referenceId)} />
                                                    {item.sizeName}
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <small>Elige primero el producto.</small>
                                )}
                                <FieldError id={errorId("sizes")} message={errors.sizes} />
                            </div>

                            {lines.length > 0 && (
                                <div className="adm-field adm-field--full">
                                    Cantidades por talla
                                    <div className="adm-table-wrap adm-reception-lines">
                                        <table className="adm-table">
                                            <thead>
                                                <tr>
                                                    <th>Talla</th>
                                                    <th>Recibida</th>
                                                    <th>Rechazada</th>
                                                    <th className="adm-num">Aceptada (entra al stock)</th>
                                                    <th><span className="visually-hidden">Quitar</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line) => {
                                                    const receivedKey = `received-${line.referenceId}`;
                                                    const rejectedKey = `rejected-${line.referenceId}`;
                                                    return (
                                                        <tr key={line.referenceId}>
                                                            <td><strong>{line.sizeName}</strong></td>
                                                            <td>
                                                                <input className="adm-input" type="number" min="1" step="1" inputMode="numeric" value={line.received} required disabled={isBusy}
                                                                    aria-label={`Cantidad recibida talla ${line.sizeName}`} {...fieldProps(receivedKey)}
                                                                    onChange={(event) => updateQuantity(line.referenceId, "received", event.target.value)} />
                                                                <FieldError id={errorId(receivedKey)} message={errors[receivedKey]} />
                                                            </td>
                                                            <td>
                                                                <input className="adm-input" type="number" min="0" step="1" inputMode="numeric" value={line.rejected} placeholder="0" disabled={isBusy}
                                                                    aria-label={`Cantidad rechazada talla ${line.sizeName}`} {...fieldProps(rejectedKey)}
                                                                    onChange={(event) => updateQuantity(line.referenceId, "rejected", event.target.value)} />
                                                                <FieldError id={errorId(rejectedKey)} message={errors[rejectedKey]} />
                                                            </td>
                                                            <td className="adm-num"><strong>{line.accepted >= 0 ? line.accepted : "—"}</strong></td>
                                                            <td className="adm-num">
                                                                <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => toggleSize(line.referenceId)} aria-label={`Quitar talla ${line.sizeName}`}>
                                                                    <X size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td><strong>Total</strong></td>
                                                    <td><strong>{totals.received}</strong></td>
                                                    <td><strong>{totals.rejected}</strong></td>
                                                    <td className="adm-num"><strong>{totals.received - totals.rejected}</strong></td>
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    <small>La rechazada es opcional: si la dejas vacía cuenta como 0.</small>
                                </div>
                            )}

                            {hasRejected && (
                                <label className="adm-field adm-field--full">Motivo del rechazo
                                    <input className="adm-input" value={form.rejectionReason} maxLength={200} required disabled={isBusy}
                                        placeholder="Ej.: suela despegada, talla equivocada…"
                                        {...fieldProps("rejectionReason")}
                                        onChange={(event) => { setForm({ ...form, rejectionReason: event.target.value }); clear("rejectionReason"); }} />
                                    <FieldError id={errorId("rejectionReason")} message={errors.rejectionReason === REQUIRED_MESSAGE ? "Escribe el motivo: hay unidades rechazadas." : errors.rejectionReason} />
                                    <small>Se guarda en las tallas que tienen unidades rechazadas.</small>
                                </label>
                            )}
                            <label className="adm-field adm-field--full">Observación (opcional)
                                <textarea className="adm-input" value={form.observation} maxLength={500} disabled={isBusy}
                                    onChange={(event) => setForm({ ...form, observation: event.target.value })} />
                            </label>
                        </div>
                        <div className="adm-actions">
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}>
                                <Save size={15} /> {isBusy ? "Guardando…" : lines.length > 1 ? `Guardar ${lines.length} tallas en inventario` : "Guardar en inventario"}
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
                <Pagination pagination={pagination} onChange={goToPage} disabled={isLoading} label="recepciones" />
            </section>
        </div>
    );
}

export default AdminReceptions;
