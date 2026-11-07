import { Check, X } from "lucide-react";

import { PASSWORD_RULES } from "../../utils/validation";

// Requisitos de la contraseña nueva; cada uno se marca al cumplirse.
function PasswordChecklist({ id, password }) {
    return (
        <ul id={id} className="password-checklist" aria-label="Requisitos de la contraseña">
            {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                    <li key={rule.id} className={ok ? "is-ok" : undefined}>
                        {ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                        {rule.label}
                        <span className="visually-hidden">{ok ? " (cumplido)" : " (pendiente)"}</span>
                    </li>
                );
            })}
        </ul>
    );
}

export default PasswordChecklist;
