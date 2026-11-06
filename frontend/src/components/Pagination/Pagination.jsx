import { ChevronLeft, ChevronRight } from "lucide-react";

import "./Pagination.css";

// Números de página a mostrar: siempre la primera y la última, la actual con sus vecinas y "…" en los huecos.
// Se calcula con el total real, así crece solo cuando haya más registros.
export function getPageItems(page, totalPages, siblings = 1) {
    const visible = new Set([1, totalPages]);
    for (let number = page - siblings; number <= page + siblings; number += 1) {
        if (number >= 1 && number <= totalPages) visible.add(number);
    }
    const sorted = [...visible].sort((a, b) => a - b);
    const items = [];
    sorted.forEach((number, index) => {
        if (index > 0 && number - sorted[index - 1] > 1) items.push(`gap-${number}`);
        items.push(number);
    });
    return items;
}

function Pagination({ pagination, onChange, disabled = false, label = "registros" }) {
    if (!pagination || pagination.total === 0) return null;
    const { page, pageSize, total, totalPages } = pagination;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);

    return (
        <nav className="adm-pagination" aria-label="Paginación">
            <span className="adm-pagination__summary">Mostrando {from}–{to} de {total} {label}</span>
            {totalPages > 1 && (
                <ul className="adm-pagination__list">
                    <li>
                        <button type="button" className="adm-pagination__step" onClick={() => onChange(page - 1)} disabled={disabled || page <= 1} aria-label="Página anterior"><ChevronLeft size={15} /></button>
                    </li>
                    {getPageItems(page, totalPages).map((item) => (
                        typeof item === "string" ? (
                            <li key={item} className="adm-pagination__gap" aria-hidden="true">…</li>
                        ) : (
                            <li key={item}>
                                <button type="button" className={`adm-pagination__page ${item === page ? "is-current" : ""}`} onClick={() => onChange(item)} disabled={disabled} aria-label={`Página ${item}`} aria-current={item === page ? "page" : undefined}>{item}</button>
                            </li>
                        )
                    ))}
                    <li>
                        <button type="button" className="adm-pagination__step" onClick={() => onChange(page + 1)} disabled={disabled || page >= totalPages} aria-label="Página siguiente"><ChevronRight size={15} /></button>
                    </li>
                </ul>
            )}
        </nav>
    );
}

export default Pagination;
