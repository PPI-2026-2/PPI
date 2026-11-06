import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, CheckCircle2, PackageX } from "lucide-react";

import { ColumnChart, DonutChart, LineChart } from "../../components/AdminCharts/AdminCharts";
import { formatDate, formatDay, formatNumber, getBehavior } from "../../services/adminInsights";
import { Card, HorizonSelect, PeriodSelect, RefreshButton, Tile } from "./shared";

import "./AdminInsights.css";

function AdminBehavior() {
    const [days, setDays] = useState(30);
    const [horizon, setHorizon] = useState(90);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async (period, ahead) => {
        setError("");
        setIsLoading(true);
        try {
            setData(await getBehavior(period, ahead));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(days, horizon); }, [load, days, horizon]);

    const kpis = data?.kpis;
    const levels = data?.levels ?? { OK: 0, BAJO: 0, AGOTADO: 0 };

    return (
        <div className="adm-viz">
            <header className="adm-heading">
                <span>ANÁLISIS / COMPORTAMIENTO</span>
                <h1>Comportamiento del inventario</h1>
                <p>Cómo se mueve el stock: entradas por recepción, salidas por pedidos y ajustes, qué productos rotan más y cuáles están quietos.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}

            <div className="ins-toolbar">
                <PeriodSelect value={days} onChange={setDays} disabled={isLoading} />
                <HorizonSelect value={horizon} onChange={setHorizon} disabled={isLoading} />
                <RefreshButton onClick={() => load(days, horizon)} disabled={isLoading} />
            </div>

            <div className="ins-tiles ins-tiles--5">
                <Tile icon={Boxes} label="Unidades en stock" value={formatNumber(kpis?.stockUnits)} hint={`${formatNumber(kpis?.reservedUnits)} reservadas`} color="var(--viz-1)" />
                <Tile icon={ArrowDownToLine} label="Entradas" value={formatNumber(kpis?.entries)} hint={`Recepciones en ${days} días`} color="var(--viz-3)" />
                <Tile icon={ArrowUpFromLine} label="Salidas" value={formatNumber(kpis?.exits)} hint="Entregas de pedidos" color="var(--viz-2)" />
                <Tile icon={PackageX} label="Sin movimiento" value={formatNumber(kpis?.stagnantReferences)} hint="Con stock y sin ventas" color="var(--viz-prev)" />
                <Tile icon={AlertTriangle} label={`Se agotan en ${horizon} días`} value={formatNumber(kpis?.atRisk)} hint="Productos al ritmo actual" color="var(--viz-critical)" />
            </div>

            <Card title="Entradas, salidas y ajustes por día" subtitle={`Unidades movidas en los últimos ${days} días`}>
                {data && (
                    <LineChart
                        ariaLabel="Entradas, salidas y ajustes de inventario por día"
                        labels={data.series.labels}
                        series={[
                            { name: "Entradas", color: "var(--viz-1)", values: data.series.entries },
                            { name: "Salidas", color: "var(--viz-2)", values: data.series.exits },
                            { name: "Ajustes", color: "var(--viz-3)", values: data.series.adjustments }
                        ]}
                    />
                )}
                {!data && <p className="viz-empty">{isLoading ? "Cargando…" : "Sin datos."}</p>}
            </Card>

            <Card title={`Cobertura proyectada a ${horizon} días`} subtitle="Cuánto stock disponible quedará de los productos que más se venden si el ritmo actual se mantiene; al llegar a cero se agota">
                {data && data.forecast.series.length > 0 ? (
                    <LineChart
                        ariaLabel="Stock proyectado por producto"
                        markerIndex={0}
                        labels={data.forecast.labels}
                        series={data.forecast.series.map((item, index) => ({ name: item.name, color: `var(--viz-${index + 1})`, values: item.values }))}
                    />
                ) : <p className="viz-empty">{isLoading ? "Cargando…" : "Aún no hay ventas en este periodo para proyectar el stock."}</p>}
                {data && data.forecast.stockouts.length > 0 && (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Producto</th><th className="adm-num">Disponible</th><th className="adm-num">En camino</th><th className="adm-num">Ritmo/día</th><th>Se agota</th><th>Estado</th></tr></thead>
                            <tbody>
                                {data.forecast.stockouts.map((entry) => (
                                    <tr key={entry.name}>
                                        <td><strong>{entry.name}</strong></td>
                                        <td className="adm-num">{entry.available}</td>
                                        <td className="adm-num">{entry.inTransit}</td>
                                        <td className="adm-num">{String(entry.dailyUse).replace(".", ",")}</td>
                                        <td>{formatDay(entry.date)}<div><small>en {entry.inDays} días</small></div></td>
                                        <td>{entry.withinHorizon
                                            ? <span className="ins-badge ins-badge--alta"><AlertTriangle size={13} />Se agota antes de {horizon} d</span>
                                            : <span className="ins-badge ins-badge--normal"><CheckCircle2 size={13} />Cubierto</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <div className="ins-grid ins-grid--2">
                <Card title="Productos que más rotan" subtitle="Unidades vendidas frente al stock actual">
                    {data && data.topMoved.length > 0 ? (
                        <ColumnChart
                            ariaLabel="Unidades vendidas y stock actual por producto"
                            labels={data.topMoved.map((product) => product.name)}
                            series={[
                                { name: "Vendidas", color: "var(--viz-2)", values: data.topMoved.map((product) => product.sold) },
                                { name: "En stock", color: "var(--viz-1)", values: data.topMoved.map((product) => product.stock) }
                            ]}
                        />
                    ) : <p className="viz-empty">Aún no hay ventas en este periodo.</p>}
                </Card>
                <Card title="Nivel de stock" subtitle="Referencias activas por estado">
                    <DonutChart centerLabel="referencias" items={[
                        { label: "Normal", value: levels.OK, color: "var(--viz-ok)" },
                        { label: "Bajo mínimo", value: levels.BAJO, color: "var(--viz-warning)" },
                        { label: "Agotado", value: levels.AGOTADO, color: "var(--viz-critical)" }
                    ]} />
                </Card>
            </div>

            <div className="ins-grid ins-grid--2">
                <Card title="Rotación por producto" subtitle="Rotación = vendidas ÷ stock actual. Cobertura = días que alcanza el stock al ritmo actual">
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Producto</th><th className="adm-num">Stock</th><th className="adm-num">Vendidas</th><th className="adm-num">Rotación</th><th className="adm-num">Cobertura</th></tr></thead>
                            <tbody>
                                {(data?.products ?? []).map((product) => (
                                    <tr key={product.productId}>
                                        <td><strong>{product.name}</strong></td>
                                        <td className="adm-num">{product.stock}</td>
                                        <td className="adm-num">{product.sold}</td>
                                        <td className="adm-num">{product.rotation === null ? "—" : `${String(product.rotation).replace(".", ",")}×`}</td>
                                        <td className="adm-num">{product.coverageDays === null ? "Sin ventas" : `${String(product.coverageDays).replace(".", ",")} d`}</td>
                                    </tr>
                                ))}
                                {data && data.products.length === 0 && <tr><td colSpan="5" className="adm-empty">No hay productos activos.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card title="Sin movimiento" subtitle={`Con stock y sin ventas en ${days} días`}>
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Producto</th><th>Talla</th><th className="adm-num">En stock</th><th>Última venta</th></tr></thead>
                            <tbody>
                                {(data?.stagnant ?? []).map((ref) => (
                                    <tr key={ref.referenceId}><td>{ref.productName}</td><td>{ref.sizeName}</td><td className="adm-num">{ref.onHand}</td><td>{ref.lastExit ? formatDate(ref.lastExit) : "Nunca"}</td></tr>
                                ))}
                                {data && data.stagnant.length === 0 && <tr><td colSpan="4" className="adm-empty">Todo el stock tuvo ventas en el periodo.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default AdminBehavior;
