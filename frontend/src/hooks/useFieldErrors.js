import { useCallback, useState } from "react";

import { collectErrors } from "../utils/validation";

// Errores por campo de un formulario. `prefix` hace únicos los id de los mensajes.
export function useFieldErrors(prefix) {
    const [errors, setErrors] = useState({});

    // Calcula los errores, los muestra y enfoca el primer campo marcado. Devuelve true si todo está bien.
    const validate = useCallback((checks, form) => {
        const next = collectErrors(checks);
        setErrors(next);
        if (form && Object.keys(next).length) {
            requestAnimationFrame(() => form.querySelector("[aria-invalid='true']")?.focus());
        }
        return next;
    }, []);

    const clear = useCallback((name) => {
        setErrors((current) => {
            if (!current[name]) return current;
            const next = { ...current };
            delete next[name];
            return next;
        });
    }, []);

    const reset = useCallback(() => setErrors({}), []);

    const errorId = (name) => `${prefix}-${name}-error`;

    // Atributos para el control: lo marca en rojo y lo enlaza con su mensaje.
    const fieldProps = (name) => (errors[name]
        ? { "aria-invalid": "true", "aria-describedby": errorId(name) }
        : {});

    return { errors, validate, clear, reset, errorId, fieldProps };
}
