import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Search, X } from "lucide-react";

import FieldError from "../../components/FieldError/FieldError";
import ProductImage from "../../components/ProductImage/ProductImage";
import { useFieldErrors } from "../../hooks/useFieldErrors";
import { createProduct, formatPrice, getProducts, getSizes, getSuppliers } from "../../services/admin";
import { expectedImageFile } from "../../utils/productImage";
import { fieldError, isPrice, PRICE_MESSAGE, summaryMessage } from "../../utils/validation";

const emptyForm = { name: "", description: "", price: "", supplierId: "", sizeIds: [] };

function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [filters, setFilters] = useState({ q: "", status: "" });
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { errors, validate, clear, reset, errorId, fieldProps } = useFieldErrors("product");

    const updateField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
        clear(name);
    };

    const loadProducts = useCallback(async (currentFilters) => {
        setError("");
        setIsLoading(true);
        try {
            setProducts(await getProducts(currentFilters));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts({ q: "", status: "" });
        Promise.all([getSuppliers("ACTIVO"), getSizes()])
            .then(([supplierList, sizeList]) => {
                setSuppliers(supplierList);
                setSizes(sizeList);
            })
            .catch((requestError) => setError(requestError.message));
    }, [loadProducts]);

    const handleSearch = (event) => {
        event.preventDefault();
        loadProducts(filters);
    };

    const handleStatusFilter = (status) => {
        const next = { ...filters, status };
        setFilters(next);
        loadProducts(next);
    };

    const toggleSize = (sizeId) => {
        setForm((previous) => ({
            ...previous,
            sizeIds: previous.sizeIds.includes(sizeId)
                ? previous.sizeIds.filter((id) => id !== sizeId)
                : [...previous.sizeIds, sizeId]
        }));
        clear("sizeIds");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");
        const found = validate({
            name: fieldError(form.name),
            price: fieldError(form.price, [isPrice, PRICE_MESSAGE]),
            supplierId: fieldError(form.supplierId),
            sizeIds: form.sizeIds.length ? "" : "Selecciona al menos una talla para el producto."
        }, event.currentTarget);
        if (Object.keys(found).length) {
            setError(found.sizeIds && Object.keys(found).length === 1 ? found.sizeIds : summaryMessage(found));
            return;
        }
        setIsSubmitting(true);
        try {
            const product = await createProduct({
                name: form.name.trim(),
                description: form.description.trim(),
                price: form.price,
                supplierId: Number(form.supplierId),
                sizeIds: form.sizeIds
            });
            setNotice(
                `Producto "${product.name}" creado con ${product.sizes.length} talla(s) e inventario en 0. ` +
                `Guarda su imagen como ${product.imageFile} en frontend/public/images/products/.`
            );
            setForm(emptyForm);
            reset();
            setShowForm(false);
            await loadProducts(filters);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const canCreate = suppliers.length > 0 && sizes.length > 0;
    const imageHint = expectedImageFile(form.name);

    return (
        <div>
            <header className="adm-heading">
                <span>CATÁLOGO / PRODUCTOS</span>
                <h1>Productos</h1>
                <p>Registra productos, sus tallas y mantén su información al día. Las existencias se cargan al recibir mercancía.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}
            {notice && <p className="adm-message adm-message--success" role="status">{notice}</p>}

            <section className="adm-card">
                <div className="adm-card__header">
                    <div className="adm-toolbar">
                        <form onSubmit={handleSearch}>
                            <input className="adm-input" style={{ width: 230 }} placeholder="Buscar por nombre…" value={filters.q}
                                onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
                            <button type="submit" className="adm-btn" aria-label="Buscar"><Search size={15} /></button>
                        </form>
                        <select className="adm-input" style={{ width: 150 }} value={filters.status} onChange={(event) => handleStatusFilter(event.target.value)}>
                            <option value="">Todos</option>
                            <option value="ACTIVO">Activos</option>
                            <option value="INACTIVO">Inactivos</option>
                        </select>
                        <button type="button" className="adm-btn" onClick={() => loadProducts(filters)} disabled={isLoading} aria-label="Actualizar">
                            <RefreshCw size={15} />
                        </button>
                    </div>
                    <button type="button" className="adm-btn adm-btn--primary" onClick={() => setShowForm((previous) => !previous)}>
                        {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? "Cerrar formulario" : "Nuevo producto"}
                    </button>
                </div>

                {showForm && (
                    <form className="adm-card__body" onSubmit={handleSubmit} noValidate style={{ borderBottom: "1px solid var(--adm-border-soft)" }}>
                        {!canCreate && (
                            <p className="adm-message adm-message--info" style={{ margin: "0 0 16px" }}>
                                Para crear un producto necesitas al menos un proveedor activo y una talla.{" "}
                                <Link to="/administrador/catalogo">Ir a Proveedores y tallas</Link>
                            </p>
                        )}
                        <div className="adm-grid">
                            <label className="adm-field">Nombre
                                <input className="adm-input" value={form.name} maxLength={100} required disabled={isSubmitting}
                                    {...fieldProps("name")}
                                    onChange={(event) => updateField("name", event.target.value)} />
                                <FieldError id={errorId("name")} message={errors.name} />
                                <small>
                                    Imagen esperada: <strong>{imageHint || "—"}</strong> en frontend/public/images/products/
                                </small>
                            </label>
                            <label className="adm-field">Precio (COP)
                                <input className="adm-input" type="number" min="0" step="0.01" value={form.price} required disabled={isSubmitting}
                                    {...fieldProps("price")}
                                    onChange={(event) => updateField("price", event.target.value)} />
                                <FieldError id={errorId("price")} message={errors.price} />
                            </label>
                            <label className="adm-field">Proveedor
                                <select className="adm-input" value={form.supplierId} required disabled={isSubmitting}
                                    {...fieldProps("supplierId")}
                                    onChange={(event) => updateField("supplierId", event.target.value)}>
                                    <option value="">Selecciona…</option>
                                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                                </select>
                                <FieldError id={errorId("supplierId")} message={errors.supplierId} />
                            </label>
                            <label className="adm-field adm-field--full">Descripción (opcional)
                                <textarea className="adm-input" value={form.description} maxLength={500} disabled={isSubmitting}
                                    onChange={(event) => updateField("description", event.target.value)} />
                            </label>
                            <div className="adm-field adm-field--full" role="group" aria-label="Tallas del producto" aria-describedby={errors.sizeIds ? errorId("sizeIds") : undefined}>
                                Tallas del producto
                                <div className="adm-chip-list">
                                    {sizes.map((size) => (
                                        <label key={size.id} className={`adm-chip ${form.sizeIds.includes(size.id) ? "adm-chip--on" : ""}`}>
                                            <input type="checkbox" checked={form.sizeIds.includes(size.id)} onChange={() => toggleSize(size.id)} disabled={isSubmitting} />
                                            {size.name}
                                        </label>
                                    ))}
                                </div>
                                <FieldError id={errorId("sizeIds")} message={errors.sizeIds} />
                            </div>
                        </div>
                        <div className="adm-actions">
                            <button type="submit" className="adm-btn adm-btn--primary" disabled={isSubmitting || !canCreate}>
                                <Plus size={15} /> {isSubmitting ? "Creando…" : "Crear producto"}
                            </button>
                        </div>
                    </form>
                )}

                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr><th>Producto</th><th>Proveedor</th><th className="adm-num">Precio</th><th className="adm-num">Tallas activas</th><th>Estado</th><th /></tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="adm-product">
                                            <span className="adm-thumb">
                                                <ProductImage key={product.imageUrl} src={product.imageUrl} />
                                            </span>
                                            <strong>{product.name}</strong>
                                        </div>
                                    </td>
                                    <td>{product.supplierName}</td>
                                    <td className="adm-num">{formatPrice(product.price)}</td>
                                    <td className="adm-num">{product.activeSizes}</td>
                                    <td><span className={`adm-badge ${product.status === "ACTIVO" ? "adm-badge--active" : "adm-badge--inactive"}`}>{product.status}</span></td>
                                    <td className="adm-num"><Link className="adm-btn adm-btn--sm" to={`/administrador/productos/${product.id}`}>Gestionar</Link></td>
                                </tr>
                            ))}
                            {!isLoading && products.length === 0 && <tr><td colSpan="6" className="adm-empty">No hay productos para mostrar.</td></tr>}
                            {isLoading && <tr><td colSpan="6" className="adm-empty">Cargando productos…</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminProducts;