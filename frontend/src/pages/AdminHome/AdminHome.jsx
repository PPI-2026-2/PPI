import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { adminModules, getModule } from "../../data/adminModules";
import { getSessionUser } from "../../services/auth";
import { formatRelative, readRecent } from "../../utils/recentModules";

function AdminHome() {
    const userId = getSessionUser()?.id;
    const scrollerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Se lee al abrir el inicio: lo último que visitó el administrador, con el servicio más reciente primero.
    const recent = useMemo(
        () => readRecent(userId)
            .map((entry) => ({ ...entry, module: getModule(entry.id) }))
            .filter((entry) => entry.module && !entry.module.planned),
        [userId]
    );

    // Muestra cada flecha solo si todavía hay servicios por ver hacia ese lado.
    const updateArrows = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        setCanScrollLeft(scroller.scrollLeft > 4);
        setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
    }, []);

    useEffect(() => {
        updateArrows();
        const scroller = scrollerRef.current;
        window.addEventListener("resize", updateArrows);
        const observer = typeof ResizeObserver === "function" ? new ResizeObserver(updateArrows) : null;
        if (observer && scroller) observer.observe(scroller);
        return () => {
            window.removeEventListener("resize", updateArrows);
            if (observer) observer.disconnect();
        };
    }, [updateArrows]);

    const scrollServices = (direction) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        scroller.scrollBy({ left: direction * Math.max(scroller.clientWidth * 0.8, 160), behavior: "smooth" });
    };

    return (
        <div className="adm-home">
            <section className="adm-home__panel" aria-labelledby="home-services">
                <h2 id="home-services">Servicios</h2>
                <div className="adm-scroller">
                    {canScrollLeft && (
                        <button type="button" className="adm-scroller__arrow adm-scroller__arrow--left" onClick={() => scrollServices(-1)} aria-label="Ver servicios anteriores">
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    <div className="adm-tiles" ref={scrollerRef} onScroll={updateArrows}>
                        {adminModules.map((module) => {
                            const Icon = module.icon;
                            const content = (
                                <>
                                    <span className="adm-tile__icon" style={{ "--tile": module.color }}><Icon size={24} /></span>
                                    <span className="adm-tile__name">{module.title}</span>
                                    {module.planned && <span className="adm-tile__soon">Próximamente</span>}
                                </>
                            );
                            return module.planned ? (
                                <div key={module.id} className="adm-tile adm-tile--planned" title={module.description} aria-disabled="true">
                                    {content}
                                </div>
                            ) : (
                                <Link key={module.id} to={module.path} className="adm-tile">
                                    {content}
                                </Link>
                            );
                        })}
                    </div>

                    {canScrollRight && (
                        <button type="button" className="adm-scroller__arrow adm-scroller__arrow--right" onClick={() => scrollServices(1)} aria-label="Ver más servicios">
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </section>

            <section className="adm-home__panel" aria-labelledby="home-recent">
                <h2 id="home-recent">Recientes</h2>
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr><th>Nombre</th><th>Tipo</th><th>Última visita</th></tr>
                        </thead>
                        <tbody>
                            {recent.map(({ id, at, module }) => {
                                const Icon = module.icon;
                                return (
                                    <tr key={id}>
                                        <td>
                                            <Link to={module.path} className="adm-recent__link">
                                                <span className="adm-recent__icon" style={{ "--tile": module.color }}><Icon size={15} /></span>
                                                {module.title}
                                            </Link>
                                        </td>
                                        <td>{module.group}</td>
                                        <td>{formatRelative(at)}</td>
                                    </tr>
                                );
                            })}
                            {recent.length === 0 && (
                                <tr><td colSpan="3" className="adm-empty">Aún no has abierto ningún servicio.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminHome;
