import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { searchModules } from "../../data/adminModules";

function AdminSearch() {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const results = useMemo(() => searchModules(query), [query]);
    const showPanel = isOpen && query.trim() !== "";

    // Cierra el desplegable al hacer clic fuera.
    useEffect(() => {
        const handleOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const openModule = (module) => {
        if (!module || module.planned) return;
        navigate(module.path);
        setQuery("");
        setIsOpen(false);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            setIsOpen(false);
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((previous) => Math.min(previous + 1, Math.max(results.length - 1, 0)));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((previous) => Math.max(previous - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            openModule(results[activeIndex]);
        }
    };

    return (
        <div className="adm-search" ref={containerRef}>
            <Search size={16} className="adm-search__icon" />
            <input
                type="search"
                className="adm-search__input"
                placeholder="Buscar servicios (productos, stock, recepciones…)"
                aria-label="Buscar servicios"
                autoComplete="off"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
            />

            {showPanel && (
                <div className="adm-search__panel" role="listbox">
                    <div className="adm-search__title">Servicios</div>
                    {results.map((module, index) => {
                        const Icon = module.icon;
                        return (
                            <button
                                key={module.id}
                                type="button"
                                role="option"
                                aria-selected={index === activeIndex}
                                aria-disabled={module.planned || undefined}
                                className={`adm-search__item ${index === activeIndex ? "adm-search__item--active" : ""} ${module.planned ? "adm-search__item--planned" : ""}`}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => openModule(module)}
                            >
                                <span className="adm-search__badge" style={{ "--tile": module.color }}><Icon size={15} /></span>
                                <span className="adm-search__text">
                                    <strong>{module.title}</strong>
                                    <small>{module.group}</small>
                                </span>
                                {module.planned && <em>Próximamente</em>}
                            </button>
                        );
                    })}
                    {results.length === 0 && <p className="adm-search__empty">No hay servicios que coincidan con "{query.trim()}".</p>}
                </div>
            )}
        </div>
    );
}

export default AdminSearch;