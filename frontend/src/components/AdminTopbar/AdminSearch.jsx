import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Search } from "lucide-react";

import { getServiceById, searchServices } from "../../data/adminServices";
import { getRecents } from "../../utils/adminRecents";
import { getSessionUser } from "../../services/auth";

// Buscador de servicios del panel: escribe una palabra clave y salta al servicio.
function AdminSearch() {
    const navigate = useNavigate();
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [recents, setRecents] = useState([]);

    const results = useMemo(() => {
        if (query.trim()) return searchServices(query);
        return recents.map((entry) => getServiceById(entry.id)).filter(Boolean);
    }, [query, recents]);

    const hasQuery = query.trim().length > 0;

    // Cerrar al hacer clic fuera.
    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClick = (event) => {
            if (!rootRef.current?.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    // Atajo: "/" enfoca el buscador (si no se está escribiendo en otro campo).
    useEffect(() => {
        const handleKey = (event) => {
            const tag = event.target?.tagName;
            const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable;
            if (event.key === "/" && !isTyping && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    const openPanel = () => {
        setRecents(getRecents(getSessionUser()?.id));
        setActiveIndex(0);
        setIsOpen(true);
    };

    const closePanel = () => {
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
    };

    const choose = (service) => {
        if (!service || !service.available) return;
        navigate(service.path);
        closePanel();
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            closePanel();
            return;
        }
        if (!results.length) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((previous) => (previous + 1) % results.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((previous) => (previous - 1 + results.length) % results.length);
        } else if (event.key === "Enter") {
            event.preventDefault();
            choose(results[activeIndex]);
        }
    };

    return (
        <div className="adm-top__search" ref={rootRef}>
            <Search size={16} className="adm-top__search-icon" aria-hidden="true" />
            <input
                ref={inputRef}
                type="search"
                className="adm-top__search-input"
                placeholder="Buscar servicios (/)"
                value={query}
                autoComplete="off"
                role="combobox"
                aria-label="Buscar servicios del panel"
                aria-expanded={isOpen}
                aria-controls="adm-search-list"
                aria-activedescendant={isOpen && results[activeIndex] ? `adm-search-${results[activeIndex].id}` : undefined}
                onFocus={openPanel}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                    setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
            />

            {isOpen && (
                <div className="adm-top__panel adm-top__panel--search">
                    {results.length > 0 && (
                        <div className="adm-top__panel-title">{hasQuery ? "Servicios" : "Recientes"}</div>
                    )}
                    <ul id="adm-search-list" role="listbox" className="adm-top__results">
                        {results.map((service, index) => {
                            const Icon = service.icon;
                            return (
                                <li
                                    key={service.id}
                                    id={`adm-search-${service.id}`}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                    aria-disabled={!service.available}
                                    className={`adm-top__result ${index === activeIndex ? "adm-top__result--active" : ""} ${service.available ? "" : "adm-top__result--disabled"}`}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => choose(service)}
                                >
                                    <span className="adm-top__result-icon" style={{ "--tile-color": service.color }}>
                                        <Icon size={16} />
                                    </span>
                                    <span className="adm-top__result-text">
                                        <strong>{service.name}</strong>
                                        <small>{service.group}</small>
                                    </span>
                                    {!service.available && <span className="adm-top__soon">Próximamente</span>}
                                    {service.available && !hasQuery && <Clock size={13} className="adm-top__result-clock" aria-hidden="true" />}
                                </li>
                            );
                        })}
                    </ul>
                    {!results.length && (
                        <p className="adm-top__panel-empty">
                            {hasQuery
                                ? `Sin resultados para «${query.trim()}».`
                                : "Escribe una palabra clave: productos, stock, recepción, tallas…"}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminSearch;