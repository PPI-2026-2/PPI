import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { getAlerts } from "../../services/adminInsights";
import { RefreshButton } from "./shared";

import "./AdminInsights.css";

const SEVERITY = {
    CRITICA: { label: "Crítica", icon: AlertOctagon },
    ALTA: { label: "Alta", icon: AlertTriangle },
    MEDIA: { label: "Media", icon: AlertTriangle },
    INFO: { label: "Informativa", icon: Info }
};
const TYPE_LABEL = { INVENTARIO: "Inventario", REPOSICION: "Reposición", RECEPCIONES: "Recepciones", PEDIDOS: "Pedidos" };

function AdminAlerts() {
    const [alerts, setAlerts] = useState([]);
    const [severity, setSeverity] = useState("");
    const [type, setType] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setAlerts((await getAlerts()).alerts);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const visible = useMemo(() => alerts.filter((alert) => (!severity || alert.severity === severity) && (!type || alert.type === type)), [alerts, severity, type]);
    const countOf = (value) => alerts.filter((alert) => alert.severity === value).length;

    return (
        <div className="adm-viz">
            <header className="adm-heading">
                <span>ANÁLISIS / ALERTAS</span>
                <h1>Alertas y notificaciones</h1>
                <p>Todo lo que requiere atención en el inventario, las recepciones y los pedidos. Se recalcula cada vez que abres esta página; desaparece sola cuando el problema se resuelve.</p>
            </header>

            {error && <p className="adm-message adm-message--error" role="alert">{error}</p>}

            <div className="ins-tiles ins-tiles--4">
                {Object.entries(SEVERITY).map(([key, { label, icon: Icon }]) => (
                    <button type="button" key={key} className={`ins-count ins-count--${key.toLowerCase()} ${severity === key ? "is-on" : ""}`} onClick={() => setSeverity(severity === key ? "" : key)}>
                        <Icon size={18} /><span>{label}s</span><strong>{countOf(key)}</strong>
                    </button>
                ))}
            </div>

            <section className="adm-card ins-card" style={{ marginTop: 18 }}>
                <div className="adm-card__header">
                    <div className="adm-toolbar">
                        <select className="adm-input" style={{ width: 170 }} value={type} onChange={(event) => setType(event.target.value)} aria-label="Tipo de alerta">
                            <option value="">Todos los tipos</option>
                            {Object.entries(TYPE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        <RefreshButton onClick={load} disabled={isLoading} />
                    </div>
                </div>
                <ul className="ins-alerts">
                    {visible.map((alert) => {
                        const { label, icon: Icon } = SEVERITY[alert.severity];
                        return (
                            <li key={alert.id} className={`ins-alert ins-alert--${alert.severity.toLowerCase()}`}>
                                <span className="ins-alert__icon"><Icon size={18} /></span>
                                <div>
                                    <strong>{alert.title}</strong>
                                    <p>{alert.detail}</p>
                                    <small>{label} · {TYPE_LABEL[alert.type]}</small>
                                </div>
                                <Link className="adm-btn adm-btn--sm" to={alert.path}>Revisar <ArrowRight size={13} /></Link>
                            </li>
                        );
                    })}
                </ul>
                {!isLoading && visible.length === 0 && (
                    <p className="ins-ok"><CheckCircle2 size={18} /> {alerts.length === 0 ? "Todo en orden: no hay alertas activas." : "No hay alertas con estos filtros."}</p>
                )}
                {isLoading && <p className="viz-empty" style={{ padding: "0 20px 16px" }}>Calculando alertas…</p>}
            </section>
        </div>
    );
}

export default AdminAlerts;
