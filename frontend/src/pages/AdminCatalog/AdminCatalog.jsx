import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Ruler } from "lucide-react";

import {
    createSize,
    createSupplier,
    getSizes,
    getSuppliers,
    updateSupplier
} from "../../services/admin";

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
        run(async () => {
            await createSupplier({
                name: supplierForm.name.trim(),
                lastName: supplierForm.lastName.trim(),
                phone: supplierForm.phone.trim(),
                deliveryDays: Number(supplierForm.deliveryDays)
            });
            setSupplierForm(emptySupplier);
        }, "Proveedor creado.");
    };

    const handleToggleSupplier = (supplier) => {
        const status = supplier.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        run(() => updateSupplier(supplier.id, { status }), `Proveedor ${status === "ACTIVO" ? "activado" : "desactivado"}.`);
    };

    const handleCreateSize = (event) => {
        event.preventDefault();
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

            <div className="adm-two-cols">
                <section className="adm-card">
                    <div className="adm-card__header">
                        <div><h2>Proveedores</h2><p>Quién entrega la mercancía y en cuántos días.</p></div>
                        <button type="button" className="adm-btn adm-btn--sm" onClick={load} disabled={isLoading} aria-label="Actualizar">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <form className="adm-card__body" onSubmit={handleCreateSupplier}>
                        <div className="adm-grid">
                            <label className="adm-field">Nombre o empresa
                                <input className="adm-input" value={supplierForm.name} maxLength={100} required disabled={isBusy}
                                    onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} />
                            </label>
                            <label className="adm-field">Apellido (opcional)
                                <input className="adm-input" value={supplierForm.lastName} maxLength={50} disabled={isBusy}
                                    onChange={(event) => setSupplierForm({ ...supplierForm, lastName: event.target.value })} />
                            </label>
                            <label className="adm-field">Teléfono (opcional)
                                <input className="adm-input" value={supplierForm.phone} maxLength={30} disabled={isBusy}
                                    onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} />
                            </label>
                            <label className="adm-field">Días de entrega
                                <input className="adm-input" type="number" min="0" max="365" value={supplierForm.deliveryDays} required disabled={isBusy}
                                    onChange={(event) => setSupplierForm({ ...supplierForm, deliveryDays: event.target.value })} />
                            </label>
                        </div>
                        <div className="adm-actions">
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}><Plus size={15} /> Crear proveedor</button>
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
                                            <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => handleToggleSupplier(supplier)}>
                                                {supplier.status === "ACTIVO" ? "Desactivar" : "Activar"}
                                            </button>
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
                    <form className="adm-card__body" onSubmit={handleCreateSize}>
                        <div className="adm-toolbar">
                            <input className="adm-input" style={{ maxWidth: 220 }} placeholder="Ej.: 44 o XL" value={sizeName} maxLength={20} required disabled={isBusy}
                                onChange={(event) => setSizeName(event.target.value)} />
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}><Plus size={15} /> Añadir talla</button>
                        </div>
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
