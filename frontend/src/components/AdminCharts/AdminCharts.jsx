import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import "./AdminCharts.css";

// Gráficas en SVG/HTML sin librerías externas. Colores y superficies salen de variables CSS (claro/oscuro).

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
export const compactNumber = (value) => (Math.abs(value) >= 1000 ? compact.format(value) : String(Math.round(value * 10) / 10));

// Escala "bonita": máximo redondeado y 4-5 marcas.
function niceScale(maxValue) {
    const max = Math.max(maxValue, 1);
    const rough = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough);
    const top = Math.ceil(max / step) * step;
    return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step) };
}

export function Legend({ items }) {
    if (items.length < 2) return null;
    return (
        <ul className="viz-legend">
            {items.map((item) => (
                <li key={item.name}>
                    <span className={`viz-legend__key ${item.dashed ? "is-dashed" : ""} ${item.shape === "bar" ? "is-bar" : ""}`} style={{ "--key": item.color }} />
                    {item.name}
                </li>
            ))}
        </ul>
    );
}

function DataTable({ labels, series, format }) {
    return (
        <details className="viz-table">
            <summary>Ver datos en tabla</summary>
            <div className="viz-table__wrap">
                <table>
                    <thead><tr><th>Categoría</th>{series.map((item) => <th key={item.name} className="viz-num">{item.name}</th>)}</tr></thead>
                    <tbody>
                        {labels.map((label, index) => (
                            <tr key={`${label}-${index}`}><td>{label}</td>{series.map((item) => <td key={item.name} className="viz-num">{item.values[index] == null ? "—" : format(item.values[index])}</td>)}</tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );
}

const DEFAULT_WIDTH = 720;

// Ancho real del contenedor: el SVG se dibuja a su tamaño verdadero, así la gráfica aprovecha todo el ancho disponible
// sin deformarse ni agrandar el texto.
function useChartWidth() {
    const ref = useRef(null);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        const update = () => setWidth(Math.max(320, Math.round(element.getBoundingClientRect().width)) || DEFAULT_WIDTH);
        update();
        if (typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return { ref, width };
}
const M = { left: 46, right: 18, top: 14, bottom: 30 };

// ---------- Líneas (varias series, periodo anterior punteado) ----------
export function LineChart({ labels, series, height = 260, format = compactNumber, tableFormat = (value) => String(value), showTable = true, ariaLabel, markerIndex = null, markerLabel = "Hoy" }) {
    const svgRef = useRef(null);
    const { ref: plotRef, width: W } = useChartWidth();
    const [hover, setHover] = useState(null);
    const plotW = W - M.left - M.right;
    const plotH = height - M.top - M.bottom;
    const count = labels.length;
    const { top, ticks } = niceScale(Math.max(0, ...series.flatMap((item) => item.values)));
    const x = (index) => M.left + (count <= 1 ? plotW / 2 : (index / (count - 1)) * plotW);
    const y = (value) => M.top + plotH - (value / top) * plotH;
    const step = Math.max(1, Math.ceil(count / Math.max(4, Math.floor(plotW / 85))));
    const pathOf = (values) => {
        let path = "";
        let pen = false;
        values.forEach((value, index) => {
            if (value == null) { pen = false; return; }
            path += `${pen ? "L" : "M"}${x(index)},${y(value)}`;
            pen = true;
        });
        return path;
    };
    const lastIndexOf = (values) => { for (let index = values.length - 1; index >= 0; index -= 1) if (values[index] != null) return index; return -1; };

    const handleMove = (event) => {
        const rect = svgRef.current.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * W;
        const index = count <= 1 ? 0 : Math.round(((px - M.left) / plotW) * (count - 1));
        setHover(Math.max(0, Math.min(count - 1, index)));
    };

    return (
        <div className="viz-chart">
            <Legend items={series.map((item) => ({ name: item.name, color: item.color, dashed: item.dashed }))} />
            <div className="viz-chart__plot" ref={plotRef}>
                <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
                    {ticks.map((tick) => (
                        <g key={tick}>
                            <line className="viz-grid" x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
                            <text className="viz-axis" x={M.left - 8} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
                        </g>
                    ))}
                    {labels.map((label, index) => (index % step === 0 ? <text key={`${label}-${index}`} className="viz-axis" x={x(index)} y={height - 8} textAnchor="middle">{label}</text> : null))}
                    {markerIndex !== null && (
                        <g>
                            <line className="viz-cross" x1={x(markerIndex)} x2={x(markerIndex)} y1={M.top} y2={M.top + plotH} strokeDasharray="3 4" />
                            <text className="viz-axis" x={x(markerIndex) + 5} y={M.top + 10}>{markerLabel}</text>
                        </g>
                    )}
                    {series.map((item) => (
                        <path key={item.name} d={pathOf(item.values)}
                            fill="none" stroke={item.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={item.dashed ? "5 5" : undefined} />
                    ))}
                    {series.filter((item) => !item.dashed && lastIndexOf(item.values) >= 0).map((item) => (
                        <circle key={item.name} className="viz-dot" cx={x(lastIndexOf(item.values))} cy={y(item.values[lastIndexOf(item.values)])} r="4" fill={item.color} />
                    ))}
                    {hover !== null && (
                        <g>
                            <line className="viz-cross" x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} />
                            {series.filter((item) => item.values[hover] != null).map((item) => <circle key={item.name} className="viz-dot" cx={x(hover)} cy={y(item.values[hover])} r="4.5" fill={item.color} />)}
                        </g>
                    )}
                </svg>
                {hover !== null && (
                    <div className="viz-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
                        <strong>{labels[hover]}</strong>
                        {series.filter((item) => item.values[hover] != null).map((item) => (
                            <span key={item.name}><i style={{ background: item.color }} />{item.name}: <b>{tableFormat(item.values[hover])}</b></span>
                        ))}
                    </div>
                )}
            </div>
            {showTable && <DataTable labels={labels} series={series} format={tableFormat} />}
        </div>
    );
}

// ---------- Columnas agrupadas ----------
export function ColumnChart({ labels, series, height = 250, format = compactNumber, tableFormat = (value) => String(value), showTable = true, ariaLabel }) {
    const { ref: plotRef, width: W } = useChartWidth();
    const [hover, setHover] = useState(null);
    const plotW = W - M.left - M.right;
    const plotH = height - M.top - M.bottom - 10;
    const { top, ticks } = niceScale(Math.max(0, ...series.flatMap((item) => item.values)));
    const group = plotW / Math.max(labels.length, 1);
    const labelStep = Math.max(1, Math.ceil(64 / group)); // evita que se encimen las etiquetas cuando hay muchas columnas
    const barWidth = Math.min(24, (group - 14) / series.length - 2);
    const y = (value) => M.top + plotH - (value / top) * plotH;
    const short = (text) => (text.length > 13 ? `${text.slice(0, 12)}…` : text);
    const columnPath = (cx, value) => {
        const h = Math.max(0, plotH - (y(value) - M.top));
        if (h <= 0) return "";
        const r = Math.min(4, h, barWidth / 2);
        const left = cx;
        const topY = y(value);
        return `M${left},${topY + h} V${topY + r} Q${left},${topY} ${left + r},${topY} H${left + barWidth - r} Q${left + barWidth},${topY} ${left + barWidth},${topY + r} V${topY + h} Z`;
    };

    return (
        <div className="viz-chart">
            <Legend items={series.map((item) => ({ name: item.name, color: item.color, shape: "bar" }))} />
            <div className="viz-chart__plot" ref={plotRef}>
                <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
                    {ticks.map((tick) => (
                        <g key={tick}>
                            <line className="viz-grid" x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
                            <text className="viz-axis" x={M.left - 8} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
                        </g>
                    ))}
                    {labels.map((label, index) => {
                        const start = M.left + index * group + (group - (barWidth * series.length + 2 * (series.length - 1))) / 2;
                        return (
                            <g key={`${label}-${index}`} onMouseEnter={() => setHover(index)}>
                                <rect x={M.left + index * group} y={M.top} width={group} height={plotH + 24} fill="transparent" />
                                {series.map((item, seriesIndex) => <path key={item.name} d={columnPath(start + seriesIndex * (barWidth + 2), item.values[index] ?? 0)} fill={item.color} />)}
                                {index % labelStep === 0 && <text className="viz-axis" x={M.left + index * group + group / 2} y={height - 10} textAnchor="middle">{short(label)}<title>{label}</title></text>}
                            </g>
                        );
                    })}
                </svg>
                {hover !== null && (
                    <div className="viz-tooltip" style={{ left: `${((M.left + hover * group + group / 2) / W) * 100}%` }} role="status">
                        <strong>{labels[hover]}</strong>
                        {series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: <b>{tableFormat(item.values[hover] ?? 0)}</b></span>)}
                    </div>
                )}
            </div>
            {showTable && <DataTable labels={labels} series={series} format={tableFormat} />}
        </div>
    );
}

// ---------- Barras horizontales de ranking ----------
export function RankBars({ items, color = "var(--viz-1)", empty = "Sin datos para mostrar." }) {
    if (!items.length) return <p className="viz-empty">{empty}</p>;
    const max = Math.max(...items.map((item) => item.value), 1);
    return (
        <ol className="viz-rank">
            {items.map((item) => (
                <li key={item.label} title={item.title}>
                    <span className="viz-rank__label">{item.label}{item.sub && <small>{item.sub}</small>}</span>
                    <span className="viz-rank__track"><span className="viz-rank__bar" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: item.color ?? color }} /></span>
                    <span className="viz-rank__value">{item.valueLabel ?? item.value}</span>
                </li>
            ))}
        </ol>
    );
}

// ---------- Dona ----------
export function DonutChart({ items, centerLabel = "Total", size = 168 }) {
    const gradientId = useId();
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const radius = 62;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return (
        <div className="viz-donut">
            <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-labelledby={gradientId}>
                <title id={gradientId}>{items.map((item) => `${item.label}: ${item.value}`).join(", ")}</title>
                <circle className="viz-donut__track" cx="80" cy="80" r={radius} fill="none" strokeWidth="22" />
                {total > 0 && items.filter((item) => item.value > 0).map((item) => {
                    const length = (item.value / total) * circumference;
                    const gap = items.filter((entry) => entry.value > 0).length > 1 ? 2 : 0;
                    const segment = <circle key={item.label} cx="80" cy="80" r={radius} fill="none" stroke={item.color} strokeWidth="22" strokeDasharray={`${Math.max(length - gap, 0.5)} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" />;
                    offset += length;
                    return segment;
                })}
                <text className="viz-donut__total" x="80" y="82" textAnchor="middle">{total}</text>
                <text className="viz-axis" x="80" y="99" textAnchor="middle">{centerLabel}</text>
            </svg>
            <ul className="viz-donut__legend">
                {items.map((item) => (
                    <li key={item.label}>
                        <span className="viz-legend__key is-bar" style={{ "--key": item.color }} />
                        <span>{item.label}</span>
                        <b>{item.value}{total > 0 ? ` · ${Math.round((item.value / total) * 100)}%` : ""}</b>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ---------- Tarjeta de cifra con variación ----------
// upIsGood=false invierte el color (p. ej. la demanda no atendida: subir es malo).
export function StatTile({ label, value, change, upIsGood = true, compare = "vs periodo anterior", icon: Icon }) {
    let tone = "flat";
    let DeltaIcon = Minus;
    if (change !== null && change !== undefined && change !== 0) {
        DeltaIcon = change > 0 ? ArrowUp : ArrowDown;
        tone = (change > 0) === upIsGood ? "good" : "bad";
    }
    return (
        <div className="viz-stat">
            <span className="viz-stat__label">{Icon && <Icon size={14} />}{label}</span>
            <strong className="viz-stat__value">{value}</strong>
            <span className={`viz-stat__delta viz-stat__delta--${tone}`}>
                <DeltaIcon size={12} />
                {change === null || change === undefined ? "Sin base de comparación" : `${change > 0 ? "+" : ""}${String(change).replace(".", ",")} %`}
                <small>{change === null || change === undefined ? "" : compare}</small>
            </span>
        </div>
    );
}
