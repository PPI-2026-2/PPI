import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save } from "lucide-react";

import ProductImage from "../../components/ProductImage/ProductImage";
import {
    addProductSize,
    getProduct,
    getSizes,
    getSuppliers,
    setProductSizeStatus,
    setProductStatus,
    updateProduct
} from "../../services/admin";

function toForm(product) {
    return {
        name: product.name,
        description: product.description ?? "",
        price: String(product.price),
        supplierId: String(product.supplierId)
    };
}

function AdminProductDetail() {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [form, setForm] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [allSizes, setAllSizes] = useState([]);
    const [newSizeId, setNewSizeId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const load = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const [loaded, supplierList, sizeList] = await Promise.all([getProduct(productId), getSuppliers(), getSizes()]);
            setProduct(loaded);
            setForm(toForm(loaded));
            setSuppliers(supplierList);
            setAllSizes(sizeList);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        load();
    }, [load]);

    // La acción puede devolver un texto para reemplazar el mensaje de éxito.
    const run = async (action, successMessage) => {
        setError("");
        setNotice("");
        setIsBusy(true);
        try {
            const result = await action();
            const text = typeof result === "string" ? result : successMessage;
            if (text) setNotice(text);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const handleSave = (event) => {
        event.preventDefault();
        run(async () => {
            const previousFile = product.imageFile;
            const updated = await updateProduct(product.id, {
                name: form.name.trim(),
                description: form.description.trim(),
                price: form.price,
                supplierId: Number(form.supplierId)
            });
            setProduct(updated);
            setForm(toForm(updated));
            if (updated.imageFile !== previousFile) {
                return `Producto actualizado. Su imagen esperada ahora es ${updated.imageFile}: renombra el archivo en frontend/public/images/products/.`;
            }
            return undefined;
        }, "Producto actualizado.");
    };

    const handleToggleProduct = () => {
        const status = product.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        run(async () => {
            setProduct(await setProductStatus(product.id, status));
        }, status === "ACTIVO" ? "Producto activado." : "Producto desactivado: ya no aparecerá en el catálogo.");
    };

    const handleToggleSize = (entry) => {
        const status = entry.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        run(async () => {
            setProduct(await setProductSizeStatus(product.id, entry.referenceId, status));
        }, `Talla ${entry.sizeName} ${status === "ACTIVO" ? "activada" : "desactivada"}.`);
    };

    const handleAddSize = (event) => {
        event.preventDefault();
        run(async () => {
            setProduct(await addProductSize(product.id, Number(newSizeId)));
            setNewSizeId("");
        }, "Talla añadida con inventario en 0.");
    };

    if (isLoading) return <p className="adm-message adm-message--info">Cargando producto…</p>;
    if (!product) {
        return (
            <div>
                <Link to="/administrador/productos" className="adm-back"><ArrowLeft size={14} /> Volver a productos</Link>
                {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            </div>
        );
    }

    const usedSizeIds = new Set(product.sizes.map((entry) => entry.sizeId));
    const freeSizes = allSizes.filter((size) => !usedSizeIds.has(size.id));
    const supplierOptions = suppliers.filter((supplier) => supplier.status === "ACTIVO" || supplier.id === product.supplierId);

    return (
        <div>
            <Link to="/administrador/productos" className="adm-back"><ArrowLeft size={14} /> Volver a productos</Link>

            <header className="adm-heading">
                <span>CATÁLOGO / PRODUCTO #{product.id}</span>
                <h1>{product.name}</h1>
                <p>
                    <span className={`adm-badge ${product.status === "ACTIVO" ? "adm-badge--active" : "adm-badge--inactive"}`}>{product.status}</span>
                </p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}

            <section className="adm-card">
                <div className="adm-card__header">
                    <div><h2>Información del producto</h2><p>Un cambio de precio no afecta pedidos ya hechos: guardan su propio precio.</p></div>
                    <button type="button" className="adm-btn" onClick={handleToggleProduct} disabled={isBusy}>
                        {product.status === "ACTIVO" ? "Desactivar producto" : "Activar producto"}
                    </button>
                </div>
                <form className="adm-card__body" onSubmit={handleSave}>
                    <div className="adm-grid">
                        <label className="adm-field">Nombre
                            <input className="adm-input" value={form.name} maxLength={100} required disabled={isBusy}
                                onChange={(event) => setForm({ ...form, name: event.target.value })} />
                        </label>
                        <label className="adm-field">Precio (COP)
                            <input className="adm-input" type="number" min="0" step="0.01" value={form.price} required disabled={isBusy}
                                onChange={(event) => setForm({ ...form, price: event.target.value })} />
                        </label>
                        <label className="adm-field">Proveedor
                            <select className="adm-input" value={form.supplierId} required disabled={isBusy}
                                onChange={(event) => setForm({ ...form, supplierId: event.target.value })}>
                                {supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                            </select>
                            <small>No se puede cambiar si el producto ya tiene recepciones.</small>
                        </label>
                        <label className="adm-field adm-field--full">Descripción
                            <textarea className="adm-input" value={form.description} maxLength={500} disabled={isBusy}
                                onChange={(event) => setForm({ ...form, description: event.target.value })} />
                        </label>
                    </div>
                    <div className="adm-actions">
                        <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy}><Save size={15} /> Guardar cambios</button>
                    </div>
                </form>
            </section>

            <section className="adm-card">
                <div className="adm-card__header">
                    <div><h2>Imagen</h2><p>Se deduce del nombre del producto; no se guarda en la base de datos.</p></div>
                </div>
                <div className="adm-image-box">
                    <span className="adm-thumb adm-thumb--lg">
                        <ProductImage key={product.imageUrl} src={product.imageUrl} alt={product.name} />
                    </span>
                    <div>
                        <p>Archivo esperado: <code>{product.imageFile}</code></p>
                        <p>Carpeta: <code>frontend/public/images/products/</code>, en minúsculas y formato PNG.</p>
                        <p>Si cambias el nombre del producto, renombra el archivo.</p>
                    </div>
                </div>
            </section>

            <section className="adm-card">
                <div className="adm-card__header">
                    <div><h2>Tallas e inventario</h2><p>Las existencias cambian al recibir mercancía, no desde aquí.</p></div>
                    <form className="adm-toolbar" onSubmit={handleAddSize}>
                        <select className="adm-input" style={{ width: 150 }} value={newSizeId} required disabled={isBusy || freeSizes.length === 0}
                            onChange={(event) => setNewSizeId(event.target.value)}>
                            <option value="">{freeSizes.length ? "Añadir talla…" : "Sin tallas libres"}</option>
                            {freeSizes.map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}
                        </select>
                        <button type="submit" className="adm-btn adm-btn--primary" disabled={isBusy || !newSizeId}><Plus size={15} /> Añadir</button>
                    </form>
                </div>
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr><th>Talla</th><th>Estado</th><th className="adm-num">En inventario</th><th className="adm-num">Reservadas</th><th className="adm-num">Disponibles</th><th className="adm-num">Mínimo</th><th /></tr>
                        </thead>
                        <tbody>
                            {product.sizes.map((entry) => (
                                <tr key={entry.referenceId}>
                                    <td><strong>{entry.sizeName}</strong></td>
                                    <td><span className={`adm-badge ${entry.status === "ACTIVO" ? "adm-badge--active" : "adm-badge--inactive"}`}>{entry.status}</span></td>
                                    <td className="adm-num">{entry.onHand}</td>
                                    <td className="adm-num">{entry.reserved}</td>
                                    <td className="adm-num">{entry.available}</td>
                                    <td className="adm-num">{entry.minimum}</td>
                                    <td className="adm-num">
                                        <button type="button" className="adm-btn adm-btn--sm" disabled={isBusy} onClick={() => handleToggleSize(entry)}>
                                            {entry.status === "ACTIVO" ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {product.sizes.length === 0 && <tr><td colSpan="7" className="adm-empty">Este producto no tiene tallas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminProductDetail;
