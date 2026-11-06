import { RefreshCw } from "lucide-react";

export const PERIODS = [7, 30, 90];

export function PeriodSelect({ value, onChange, disabled }) {
    return (
        <select className="adm-input ins-period" value={value} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} aria-label="Periodo analizado">
            {PERIODS.map((days) => <option key={days} value={days}>Últimos {days} días</option>)}
        </select>
    );
}

export const HORIZONS = [30, 60, 90];

export function HorizonSelect({ value, onChange, disabled }) {
    return (
        <select className="adm-input ins-period" value={value} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} aria-label="Horizonte de previsión">
            {HORIZONS.map((days) => <option key={days} value={days}>Previsión a {days} días</option>)}
        </select>
    );
}

export function RefreshButton({ onClick, disabled }) {
    return <button type="button" className="adm-btn" onClick={onClick} disabled={disabled} aria-label="Actualizar"><RefreshCw size={15} /></button>;
}

export function Card({ title, subtitle, children, className = "", actions }) {
    return (
        <section className={`adm-card ins-card ${className}`}>
            <div className="adm-card__header">
                <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
                {actions}
            </div>
            <div className="ins-card__body">{children}</div>
        </section>
    );
}

export function Tile({ icon: Icon, label, value, hint, color = "var(--viz-1)" }) {
    return (
        <div className="ins-tile">
            <span className="ins-tile__icon" style={{ "--tile": color }}><Icon size={22} /></span>
            <div>
                <span className="ins-tile__label">{label}</span>
                <strong className="ins-tile__value" title={String(value)}>{value}</strong>
                {hint && <small>{hint}</small>}
            </div>
        </div>
    );
}
