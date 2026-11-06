import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Lightbulb, PackageCheck, PackageX, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { ColumnChart, LineChart, RankBars, StatTile } from "../../components/AdminCharts/AdminCharts";
import { formatMoney, formatNumber, getSales } from "../../services/adminInsights";
import { Card, HorizonSelect, PeriodSelect, RefreshButton } from "./shared";

import "./AdminInsights.css";

const RECOMMENDATION = {
    REPONER: { label: "Reponer", icon: TrendingUp },
    DEMANDA: { label: "Demanda", icon: PackageX },
    EVITAR: { label: "Evitar compra", icon: PackageCheck }
};

function AdminSales() {
    const [days, setDays] = useState(30);
    const [horizon, setHorizon] = useState(90);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async (period, ahead) => {
        setError("");
        setIsLoading(true);
        try {
            setData(await getSales(period, ahead));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(days, horizon); }, [load, days, horizon]);

    const stats = data?.stats;
    const maxUnits = Math.max(1, ...(data?.products ?? []).map((product) => product.units));

    return (
        <div className="adm-viz">
            <header className="adm-heading">
                <span>ANÁLISIS / VENTAS</span>
                <h1>Ventas y recomendaciones</h1>
                <p>Lo que realmente se entregó a los clientes (pedidos reclamados), comparado con el periodo anterior, y qué comprar para los próximos {horizon} días según la demanda.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}

            <div className="ins-toolbar">
                <PeriodSelect value={days} onChange={setDays} disabled={isLoading} />
                <HorizonSelect value={horizon} onChange={setHorizon} disabled={isLoading} />
                <RefreshButton onClick={() => load(days, horizon)} disabled={isLoading} />
            </div>

            <div className="ins-grid ins-grid--sales">
                <section className="adm-card ins-card">
                    <div className="ins-stats">
                        <StatTile label="Unidades vendidas" value={formatNumber(stats?.units.value)} change={stats?.units.change} />
                        <StatTile label="Ingresos" value={formatMoney(stats?.revenue.value)} change={stats?.revenue.change} />
                        <StatTile label="Pedidos reclamados" value={formatNumber(stats?.orders.value)} change={stats?.orders.change} />
                        <StatTile label="Ticket promedio" value={formatMoney(stats?.ticket.value)} change={stats?.ticket.change} />
                        <StatTile label="Demanda no atendida" value={`${formatNumber(stats?.unmet.value)} u.`} change={stats?.unmet.change} upIsGood={false} />
                    </div>
                    <div className="ins-card__body">
                        {data ? (
                            <LineChart
                                height={250}
                                ariaLabel="Unidades vendidas por día frente al periodo anterior"
                                labels={data.daily.labels}
                                series={[
                                    { name: `Últimos ${days} días`, color: "var(--viz-1)", values: data.daily.current },
                                    { name: "Periodo anterior", color: "var(--viz-prev)", dashed: true, values: data.daily.previous }
                                ]}
                            />
                        ) : <p className="viz-empty">{isLoading ? "Cargando…" : "Sin datos."}</p>}
                    </div>
                </section>

                <Card title="Pedidos reclamados por día" subtitle={`Últimos ${days} días`}>
                    {data && (
                        <ColumnChart
                            height={200}
                            showTable={false}
                            ariaLabel="Pedidos reclamados por día"
                            labels={data.daily.labels}
                            series={[{ name: "Pedidos", color: "var(--viz-1)", values: data.daily.orders }]}
                        />
                    )}
                </Card>
            </div>

            <div className="ins-grid ins-grid--2">
                <Card title="Productos más vendidos" subtitle="Unidades, ingresos y participación">
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Producto</th><th>Unidades</th><th className="adm-num">Ingresos</th><th className="adm-num">%</th></tr></thead>
                            <tbody>
                                {(data?.products ?? []).map((product) => (
                                    <tr key={product.name}>
                                        <td><strong>{product.name}</strong></td>
                                        <td>
                                            <span className="ins-inline-bar"><span style={{ width: `${(product.units / maxUnits) * 100}%` }} /></span>
                                            <b className="ins-inline-value">{formatNumber(product.units)}</b>
                                        </td>
                                        <td className="adm-num">{formatMoney(product.revenue)}</td>
                                        <td className="adm-num">{String(product.share).replace(".", ",")} %</td>
                                    </tr>
                                ))}
                                {data && data.products.length === 0 && <tr><td colSpan="4" className="adm-empty">Aún no hay pedidos reclamados en este periodo.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card title="Tallas más vendidas" subtitle="Unidades por talla">
                    <RankBars color="var(--viz-2)" items={(data?.sizes ?? []).map((size) => ({ label: `Talla ${size.label}`, value: size.units, valueLabel: formatNumber(size.units) }))} empty="Aún no hay ventas en este periodo." />
                </Card>
            </div>

            <Card title={`Proyección de demanda a ${horizon} días`} subtitle={`Si el ritmo de los últimos ${days} días se mantiene: ~${formatNumber(data?.forecast.units)} unidades y ${formatMoney(data?.forecast.revenue)} en ingresos (${String(data?.forecast.dailyUnits ?? 0).replace(".", ",")} u./día)`}>
                {data ? (
                    <LineChart
                        ariaLabel="Unidades vendidas por semana y proyección"
                        markerIndex={data.forecast.weekly.history.findIndex((value) => value === null) - 1}
                        labels={data.forecast.weekly.labels}
                        series={[
                            { name: "Ventas por semana", color: "var(--viz-1)", values: data.forecast.weekly.history },
                            { name: "Proyección", color: "var(--viz-2)", dashed: true, values: data.forecast.weekly.projection }
                        ]}
                    />
                ) : <p className="viz-empty">{isLoading ? "Cargando…" : "Sin datos."}</p>}
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead><tr><th>Producto</th><th className="adm-num">Ritmo/día</th><th className="adm-num">Demanda {horizon} d</th><th className="adm-num">Disponible</th><th className="adm-num">En camino</th><th>Estado</th></tr></thead>
                        <tbody>
                            {(data?.forecast.products ?? []).map((product) => (
                                <tr key={product.name}>
                                    <td><strong>{product.name}</strong></td>
                                    <td className="adm-num">{String(product.dailyUnits).replace(".", ",")}</td>
                                    <td className="adm-num">{formatNumber(product.projectedUnits)}</td>
                                    <td className="adm-num">{product.available}</td>
                                    <td className="adm-num">{product.inTransit}</td>
                                    <td>{product.missing > 0
                                        ? <span className="ins-badge ins-badge--alta"><AlertTriangle size={13} />Faltan {formatNumber(product.missing)} u.</span>
                                        : <span className="ins-badge ins-badge--normal"><CheckCircle2 size={13} />Cubierto</span>}</td>
                                </tr>
                            ))}
                            {data && data.forecast.products.length === 0 && <tr><td colSpan="6" className="adm-empty">Aún no hay ventas para proyectar.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Recomendaciones de compra" subtitle={`Para los próximos ${horizon} días, calculadas con las ventas, el stock, lo que ya viene en camino y los pedidos que no se pudieron completar`}>
                {data && data.recommendations.length === 0 && <p className="viz-empty">Por ahora no hay recomendaciones: el stock cubre la demanda.</p>}
                <ul className="ins-reco">
                    {(data?.recommendations ?? []).map((item, index) => {
                        const { label, icon: Icon } = RECOMMENDATION[item.type];
                        return (
                            <li key={`${item.type}-${index}`} className={`ins-reco--${item.type.toLowerCase()}`}>
                                <span className="ins-reco__icon"><Icon size={16} /></span>
                                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
                                <span className="ins-reco__tag"><Lightbulb size={12} />{label}</span>
                                <Link className="adm-btn adm-btn--sm" to={item.path} aria-label={`Ir a ${item.title}`}><ArrowRight size={13} /></Link>
                            </li>
                        );
                    })}
                </ul>
            </Card>
        </div>
    );
}

export default AdminSales;
