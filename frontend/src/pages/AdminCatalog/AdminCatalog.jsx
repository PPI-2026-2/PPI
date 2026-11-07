import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Ruler, Save, Trash2, X } from "lucide-react";

import {
    createSize,
    createSupplier,
    deleteSupplier,
    getSizes,
    getSuppliers,
    updateSupplier
} from "../../services/admin";
import { useConfirm } from "../../components/ConfirmDialog/ConfirmDialog";
import FieldError from "../../components/FieldError/FieldError";
import { useFieldErrors } from "../../hooks/useFieldErrors";
import { fieldError, summaryMessage } from "../../utils/validation";

const DAYS_MESSAGE = "Escribe un número entero de días entre 0 y 365.";
const isDeliveryDays = (value) => /^\d+$/.test(String(value).trim()) && Number(value) <= 365;

const emptySupplier = { name: "", lastName: "", phone: "", deliveryDays: "7" };

function AdminCatalog() {
    const [suppliers, setSuppliers] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [supplierForm, setSupplierForm] = useState(emptySupplier);
    const [sizeName, setSizeName] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [confirm, confirmDialog] = useConfirm();
    const supplierErrors = useFieldErrors("supplier");
    const sizeErrors = useFieldErrors("size");

    // Nombre distinto de updateSupplier (servicio): si se llamaran igual, este tapaba la llamada a la API.
    const updateSupplierField = (name, value) => {
        setSupplierForm((current) => ({ ...current, [name]: value }));
        supplierErrors.clear(name);
    };

    const startEdit = (supplier) => {
        setError("");
        setNotice("");
        supplierErrors.reset();
        setEditingId(supplier.id);
        setSupplierForm({
            name: supplier.name ?? "",
            lastName: supplier.lastName ?? "",
            phone: supplier.phone ?? "",
            deliveryDays: String(supplier.deliveryDays ?? 7)
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setSupplierForm(emptySupplier);
        supplierErrors.reset();
    };

    const load = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const [supplierList, sizeList] = await Promise.all([getSuppliers(), getSizes()]);
            setSuppliers(supplierList);
            setSizes(sizeList);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const run = async (action, successMessage) => {
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            await action();
            if (successMessage) setNotice(successMessage);
            await load();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const handleCreateSupplier = (event) => {
        event.preventDefault();
        setNotice("");
        sizeErrors.reset();
        const found = supplierErrors.validate({
            name: fieldError(supplierForm.name),
            phone: fieldError(supplierForm.phone),
            deliveryDays: fieldError(supplierForm.deliveryDays, [isDeliveryDays, DAYS_MESSAGE])
        }, event.currentTarget);
        if (Object.keys(found).length) {
            setError(summaryMessage(found));
            return;
        }
        const data = {
            name: supplierForm.name.trim(),
            lastName: supplierForm.lastName.trim(),
            phone: supplierForm.phone.trim(),
            deliveryDays: Number(supplierForm.deliveryDays)
        };
        const isEditing = editingId !== null;
        run(async () => {
            if (isEditing) await updateSupplier(editingId, data);
            else await createSupplier(data);
            setEditingId(null);
            setSupplierForm(emptySupplier);
        }, isEditing ? `Proveedor ${data.name} actualizado.` : "Proveedor creado.");
    };

    const handleToggleSupplier = (supplier) => {
        const status = supplier.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        run(() => updateSupplier(supplier.id, { status }),
            status === "ACTIVO"
                ? `Proveedor ${supplier.name} activado.`
                : `Proveedor ${supplier.name} desactivado: ya no aparece para asignar a productos nuevos.`);
    };

    const handleDeleteSupplier = async (supplier) => {
        const accepted = await confirm({
            title: "Eliminar proveedor",
            message: <>¿Eliminar a <strong>{supplier.name}</strong>? Esta acción no se puede deshacer. Si tiene productos o recepciones no se eliminará; en ese caso, desactívalo.</>,
            confirmLabel: "Sí, eliminar",
            tone: "danger"
        });
        if (!accepted) return;
        run(async () => {
            await deleteSupplier(supplier.id);
            if (editingId === supplier.id) cancelEdit();
        }, `Proveedor ${supplier.name} eliminado.`);
    };

    const handleCreateSize = (event) => {
        event.preventDefault();
        setNotice("");
        supplierErrors.reset();
        const found = sizeErrors.validate({ sizeName: fieldError(sizeName) }, event.currentTarget);
        if (Object.keys(found).length) {
            setError(summaryMessage(found));
            return;
        }
        run(async () => {
            await createSize(sizeName.trim());
            setSizeName("");
        }, "Talla creada.");
    };

    const handleSeedSizes = () => {
        const existing = new Set(sizes.map((size) => size.name));
        const missing = [];
        for (let number = 35; number <= 43; number += 1) {
            if (!existing.has(String(number))) missing.push(String(number));
        }
        if (!missing.length) {
            setNotice("Las tallas 35 a 43 ya existen.");
            return;
        }
        run(async () => {
            for (const name of missing) await createSize(name);
        }, `Se crearon las tallas: ${missing.join(", ")}.`);
    };

    return (
        <div>
            <header className="adm-heading">
                <span>CATÁLOGO / BASE</span>
                <h1>Proveedores y tallas</h1>
                <p>Un producto necesita un proveedor activo y al menos una talla. Créalos aquí primero.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}
            {confirmDialog}

            <div className="adm-two-cols">
                <section className="adm-card">
                    <div className="adm-card__header">
                        <div><h2>Proveedores</h2><p>Quién entrega la mercancía y en cuántos días.</p></div>
                        <button type="button" className="adm-btn adm-btn--sm" onClick={load} disabled={isLoading} aria-label="Actualizar">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <form className="adm-card__body" onSubmit={handleCreateSupplier} noValidate>
                        {editingId !== null && (
                            <p className="adm-message adm-message--info" style={{ margin: "0 0 14px" }}>
                                Editando a <strong>{suppliers.find((supplier) => supplier.id === editingId)?.name ?? "el proveedor"}</strong>. Guarda los cambios o cancela.
                            </p>
                        )}
                        <div className="adm-grid">
                            <label className="adm-field">Nombre o empresa
                                <input className="adm-input" value={supplierForm.name} maxLength={100} required disabled={isBusy}
                                    {...supplierErrors.fieldProps("name")}
                                    onChange={(event) => updateSupplierField("name", event.target.value)} />
                                <FieldError id={supplierErrors.errorId("name")} message={supplierErrors.errors.name} />
                            </label>
                            <label className="adm-field">Apellido (opcional)
                                <input className="adm-input" value={supplierForm.lastName} maxLength={50} disabled={isBusy}
                                    onChange={(event) => updateSupplierField("lastName", event.target.value)} />
                            </label>
                            <label className="adm-field">Teléfono
                                <input className="adm-input" type="tel" inputMode="tel" autoComplete="tel" value={supplierForm.phone} maxLength={30} required disabled={isBusy}
                                    {...supplierErrors.fieldProps("phone")}
                                    onChange={(event) => updateSupplierField("phone", event.target.value)} />
                                <FieldError id={supplierErrors.errorId("phone")} message={supplierErrors.errors.phone} />
                            </label>
                            <label className="adm-field">Días de entrega
                                <input className="adm-input" type="number" min="0" max="365" step="1" value={supplierForm.deliveryDays} required disabled={isBusy}
                                    {...supplierErrors.fieldProps("deliveryDays")}
                                    onChange={(event) => updateSupplierField("deliveryDays", event.target.value)} />
                                <FieldError id={supplierErrors.errorId("deliveryDays")} message={supplierErrors.errors.deliveryDays} />
                            </label>
                        </div>
                        <div className="adm-actions">
                            {editingId !== null ? (
                                <>
                                    <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}><Save size={15} /> Guardar cambios</button>
                                    <button type="button" className="adm-btn" disabled={isBusy} onClick={cancelEdit}><X size={15} /> Cancelar</button>
                                </>
                            ) : (
                                <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}><Plus size={15} /> Crear proveedor</button>
                            )}
                        </div>
                    </form>
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Proveedor</th><th>Entrega</th><th>Estado</th><th /></tr></thead>
                            <tbody>
                                {suppliers.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td>{supplier.name} {supplier.lastName || ""}{supplier.phone ? <small> · {supplier.phone}</small> : null}</td>
                                        <td>{supplier.deliveryDays} días</td>
                                        <td><span className={`adm-badge ${supplier.status === "ACTIVO" ? "adm-badge--active" : "adm-badge--inactive"}`}>{supplier.status}</span></td>
                                        <td className="adm-num">
                                            <div className="adm-row-actions">
                                                <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => startEdit(supplier)} aria-label={`Editar ${supplier.name}`}>
                                                    <Pencil size={13} /> Editar
                                                </button>
                                                <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => handleToggleSupplier(supplier)}>
                                                    {supplier.status === "ACTIVO" ? "Desactivar" : "Activar"}
                                                </button>
                                                <button type="button" className="adm-btn adm-btn--sm adm-btn--danger-soft" disabled={isBusy} onClick={() => handleDeleteSupplier(supplier)} aria-label={`Eliminar ${supplier.name}`}>
                                                    <Trash2 size={13} /> Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!isLoading && suppliers.length === 0 && <tr><td colSpan="4" className="adm-empty">Aún no hay proveedores.</td></tr>}
                                {isLoading && <tr><td colSpan="4" className="adm-empty">Cargando…</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="adm-card">
                    <div className="adm-card__header">
                        <div><h2>Tallas</h2><p>Se asignan a cada producto al registrarlo.</p></div>
                        <button type="button" className="adm-btn adm-btn--sm" onClick={handleSeedSizes} disabled={isBusy || isLoading}>
                            <Ruler size={14} /> Cargar tallas 35–43
                        </button>
                    </div>
                    <form className="adm-card__body" onSubmit={handleCreateSize} noValidate>
                        <div className="adm-toolbar">
                            <input className="adm-input" style={{ maxWidth: 220 }} placeholder="Ej.: 44 o XL" value={sizeName} maxLength={20} required disabled={isBusy}
                                aria-label="Nombre de la talla" {...sizeErrors.fieldProps("sizeName")}
                                onChange={(event) => { setSizeName(event.target.value); sizeErrors.clear("sizeName"); }} />
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}><Plus size={15} /> Añadir talla</button>
                        </div>
                        <FieldError id={sizeErrors.errorId("sizeName")} message={sizeErrors.errors.sizeName} />
                    </form>
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Talla</th><th className="adm-num">Productos que la usan</th></tr></thead>
                            <tbody>
                                {sizes.map((size) => (
                                    <tr key={size.id}><td>{size.name}</td><td className="adm-num">{size.products}</td></tr>
                                ))}
                                {!isLoading && sizes.length === 0 && <tr><td colSpan="2" className="adm-empty">Aún no hay tallas.</td></tr>}
                                {isLoading && <tr><td colSpan="2" className="adm-empty">Cargando…</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default AdminCatalog;
