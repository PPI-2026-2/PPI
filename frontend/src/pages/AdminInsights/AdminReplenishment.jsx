import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, Boxes, CalendarClock, CheckCircle2, PackagePlus, Truck } from "lucide-react";

import { DonutChart, RankBars } from "../../components/AdminCharts/AdminCharts";
import { formatDay, formatNumber, getReplenishment } from "../../services/adminInsights";
import { Card, HorizonSelect, PeriodSelect, RefreshButton, Tile } from "./shared";

import "./AdminInsights.css";

const URGENCY = {
    CRITICA: { label: "Crítica", icon: AlertOctagon },
    ALTA: { label: "Alta", icon: AlertTriangle },
    NORMAL: { label: "Normal", icon: CheckCircle2 }
};

function UrgencyBadge({ value }) {
    const { label, icon: Icon } = URGENCY[value];
    return <span className={`ins-badge ins-badge--${value.toLowerCase()}`}><Icon size={13} />{label}</span>;
}

function AdminReplenishment() {
    const [days, setDays] = useState(90);
    const [horizon, setHorizon] = useState(90);
    const [data, setData] = useState(null);
    const [supplier, setSupplier] = useState("");
    const [urgency, setUrgency] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async (period, ahead) => {
        setError("");
        setIsLoading(true);
        try {
            setData(await getReplenishment(period, ahead));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(days, horizon); }, [load, days, horizon]);

    const items = useMemo(
        () => (data?.items ?? []).filter((item) => (!supplier || String(item.supplierId) === supplier) && (!urgency || item.urgency === urgency)),
        [data, supplier, urgency]
    );

    // Los rankings y KPIs se recalculan con los filtros activos.
    const derived = useMemo(() => {
        const products = new Map();
        const suppliers = new Map();
        for (const item of items) {
            products.set(item.productName, (products.get(item.productName) ?? 0) + item.suggested);
            const entry = suppliers.get(item.supplierId) ?? { id: item.supplierId, name: item.supplierName, leadDays: item.leadDays, lines: 0, units: 0 };
            entry.lines += 1;
            entry.units += item.suggested;
            suppliers.set(item.supplierId, entry);
        }
        return {
            topProducts: [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
            suppliers: [...suppliers.values()].sort((a, b) => b.units - a.units),
            units: items.reduce((sum, item) => sum + item.suggested, 0),
            critical: items.filter((item) => item.urgency === "CRITICA").length
        };
    }, [items]);

    const supplierOptions = useMemo(() => {
        const map = new Map();
        (data?.items ?? []).forEach((item) => map.set(String(item.supplierId), item.supplierName));
        return [...map.entries()];
    }, [data]);

    const distribution = data?.distribution ?? { CRITICA: 0, ALTA: 0, NORMAL: 0 };

    return (
        <div className="adm-viz">
            <header className="adm-heading">
                <span>ANÁLISIS / REPOSICIÓN</span>
                <h1>Reposición de inventario</h1>
                <p>Qué reponer, cuánto y cuándo pedirlo para cubrir los próximos {horizon} días. Se calcula con el consumo de los últimos {days} días, el tiempo de entrega de cada proveedor, el stock mínimo, los pedidos sin confirmar y las recepciones en camino.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}

            <div className="ins-layout">
                <aside className="ins-filters" aria-label="Filtros">
                    <div className="ins-filter">
                        <h3>Periodo</h3>
                        <PeriodSelect value={days} onChange={setDays} disabled={isLoading} />
                    </div>
                    <div className="ins-filter">
                        <h3>Previsión</h3>
                        <HorizonSelect value={horizon} onChange={setHorizon} disabled={isLoading} />
                    </div>
                    <div className="ins-filter">
                        <h3>Urgencia</h3>
                        {["", "CRITICA", "ALTA"].map((value) => (
                            <button type="button" key={value || "all"} className={`ins-chip ${urgency === value ? "is-on" : ""}`} onClick={() => setUrgency(value)}>{value ? URGENCY[value].label : "Todas"}</button>
                        ))}
                    </div>
                    <div className="ins-filter">
                        <h3>Proveedor</h3>
                        <button type="button" className={`ins-chip ${supplier === "" ? "is-on" : ""}`} onClick={() => setSupplier("")}>Todos</button>
                        {supplierOptions.map(([id, name]) => (
                            <button type="button" key={id} className={`ins-chip ${supplier === id ? "is-on" : ""}`} onClick={() => setSupplier(id)}>{name}</button>
                        ))}
                    </div>
                    <RefreshButton onClick={() => load(days, horizon)} disabled={isLoading} />
                </aside>

                <div className="ins-main">
                    <div className="ins-tiles ins-tiles--4">
                        <Tile icon={Boxes} label="Producto con más por pedir" value={derived.topProducts[0]?.[0] ?? "—"} hint={derived.topProducts[0] ? `${formatNumber(derived.topProducts[0][1])} unidades sugeridas` : "Nada por reponer"} color="var(--viz-1)" />
                        <Tile icon={Truck} label="Proveedor principal" value={derived.suppliers[0]?.name ?? "—"} hint={derived.suppliers[0] ? `${formatNumber(derived.suppliers[0].units)} unidades · entrega en ${derived.suppliers[0].leadDays} días` : "Sin pedidos sugeridos"} color="var(--viz-2)" />
                        <Tile icon={PackagePlus} label={`Unidades a pedir (${horizon} días)`} value={formatNumber(derived.units)} hint={`${items.length} referencias · ${derived.critical} críticas`} color="var(--viz-3)" />
                        <Tile icon={CalendarClock} label="Próximo agotamiento" value={data?.kpis.nextStockout ? formatDay(data.kpis.nextStockout.date) : "—"} hint={data?.kpis.nextStockout ? `${data.kpis.nextStockout.productName} talla ${data.kpis.nextStockout.sizeName} · ${data.kpis.orderNow} por pedir ya` : "Sin historial de ventas"} color="var(--viz-prev)" />
                    </div>

                    <div className="ins-grid ins-grid--2">
                        <Card title="Unidades sugeridas por producto" subtitle={`Para cubrir ${horizon} días, de mayor a menor`}>
                            <RankBars items={derived.topProducts.map(([label, units]) => ({ label, value: units, valueLabel: formatNumber(units) }))} empty="No hay productos por reponer." />
                        </Card>
                        <Card title="Unidades por proveedor" subtitle="Pedido sugerido a cada proveedor">
                            <RankBars color="var(--viz-2)" items={derived.suppliers.map((entry) => ({ label: entry.name, sub: `Entrega en ${entry.leadDays} días`, value: entry.units, valueLabel: formatNumber(entry.units) }))} empty="No hay pedidos sugeridos." />
                        </Card>
                        <Card title="Referencias por urgencia" subtitle="Todas las referencias activas">
                            <DonutChart centerLabel="referencias" items={[
                                { label: "Crítica", value: distribution.CRITICA, color: "var(--viz-critical)" },
                                { label: "Alta", value: distribution.ALTA, color: "var(--viz-serious)" },
                                { label: "Normal", value: distribution.NORMAL, color: "var(--viz-ok)" }
                            ]} />
                        </Card>
                        <Card title="Pedido por proveedor" subtitle="Referencias y unidades sugeridas por proveedor">
                            {derived.suppliers.length === 0 && <p className="viz-empty">No hay pedidos sugeridos.</p>}
                            <ul className="ins-suppliers">
                                {derived.suppliers.map((entry) => (
                                    <li key={entry.id}>
                                        <div><strong>{entry.name}</strong><small>{entry.lines} referencias · {formatNumber(entry.units)} unidades</small></div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>

                    <Card title="Detalle de reposición" subtitle={`Qué pedir para cubrir ${horizon} días, cuándo se agota y hasta cuándo se puede pedir`}>
                        <div className="adm-table-wrap">
                            <table className="adm-table">
                                <thead>
                                    <tr><th>Producto</th><th>Talla</th><th>Proveedor</th><th className="adm-num">Disponible</th><th className="adm-num">En camino</th><th className="adm-num">Consumo/día</th><th className="adm-num">Demanda {horizon} d</th><th>Se agota</th><th>Pedir antes de</th><th className="adm-num">Sugerido</th><th>Urgencia</th></tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.referenceId}>
                                            <td><strong>{item.productName}</strong></td>
                                            <td>{item.sizeName}</td>
                                            <td>{item.supplierName}<div><small>{item.leadDays} días de entrega</small></div></td>
                                            <td className="adm-num">{item.available}{item.pendingDemand > 0 && <div><small>{item.pendingDemand} pedidas sin confirmar</small></div>}</td>
                                            <td className="adm-num">{item.inTransit}</td>
                                            <td className="adm-num">{item.noHistory ? "—" : String(item.dailyUse).replace(".", ",")}</td>
                                            <td className="adm-num">{item.noHistory ? "—" : formatNumber(item.horizonDemand)}</td>
                                            <td>{item.stockoutDate ? <>{formatDay(item.stockoutDate)}<div><small>en {item.stockoutInDays} días</small></div></> : "Sin historial"}</td>
                                            <td>{item.orderByDate && item.suggested > 0 ? (item.orderInDays <= 0 ? <strong className="ins-now">Pedir ya</strong> : <>{formatDay(item.orderByDate)}<div><small>en {item.orderInDays} días</small></div></>) : "—"}</td>
                                            <td className="adm-num">
                                                <strong>{item.suggested}</strong>
                                                {item.urgency === "CRITICA" && item.suggested === 0 && (
                                                    <div className="ins-suggested-note"><small>{item.inTransit > 0 ? "Ya viene en camino" : "Sin ventas ni mínimo: define un stock mínimo"}</small></div>
                                                )}
                                            </td>
                                            <td><UrgencyBadge value={item.urgency} /></td>
                                        </tr>
                                    ))}
                                    {!isLoading && items.length === 0 && <tr><td colSpan="11" className="adm-empty">Nada por reponer con estos filtros.</td></tr>}
                                    {isLoading && <tr><td colSpan="11" className="adm-empty">Calculando…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <p className="ins-note">Urgencia: crítica si no hay disponible o alcanza menos días que la entrega del proveedor; alta si ya está en el punto de reorden (el mayor entre el stock mínimo y el consumo de los días de entrega + {data?.params.safetyDays ?? 2} de seguridad). Sugerido = demanda prevista del horizonte ({horizon} días al ritmo de los últimos {days}, o del tiempo de entrega si es mayor) + stock mínimo − lo disponible y lo que ya viene en camino. Se agota = hoy + disponible ÷ consumo diario. Pedir antes de = fecha de agotamiento − días de entrega del proveedor. Las referencias sin ventas en el periodo no tienen fecha de agotamiento.</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default AdminReplenishment;
