import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CircleHelp, X } from "lucide-react";

import "./ConfirmDialog.css";

// Ventana de confirmación propia de StockPlan; reemplaza window.confirm y window.prompt.
// Se dibuja dentro de la página (no en document.body) para heredar los colores del tema y el modo oscuro.
function ConfirmDialog({ title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "primary", input, onClose }) {
    const titleId = useId();
    const messageId = useId();
    const inputId = useId();
    const dialogRef = useRef(null);
    const [value, setValue] = useState(input?.defaultValue ?? "");
    const [inputError, setInputError] = useState("");

    useEffect(() => {
        const previous = document.activeElement;
        const first = dialogRef.current?.querySelector(input ? "textarea, input" : "[data-autofocus]");
        first?.focus();
        return () => previous?.focus?.();
    }, [input]);

    const accept = () => {
        if (input?.required && !value.trim()) {
            setInputError("Este campo es obligatorio.");
            dialogRef.current?.querySelector("textarea, input")?.focus();
            return;
        }
        onClose(input ? value.trim() : true);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            onClose(input ? null : false);
            return;
        }
        if (event.key !== "Tab") return;
        // Mantiene el foco dentro de la ventana mientras está abierta.
        const focusable = [...dialogRef.current.querySelectorAll("button, textarea, input")].filter((element) => !element.disabled);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const Icon = tone === "danger" ? AlertTriangle : CircleHelp;

    return (
        <div className="sp-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(input ? null : false); }}>
            <div
                ref={dialogRef}
                className={`sp-dialog sp-dialog--${tone}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={messageId}
                onKeyDown={handleKeyDown}
            >
                <button type="button" className="sp-dialog__close" onClick={() => onClose(input ? null : false)} aria-label="Cerrar">
                    <X size={16} />
                </button>
                <div className="sp-dialog__head">
                    <span className="sp-dialog__icon" aria-hidden="true"><Icon size={20} /></span>
                    <h2 id={titleId}>{title}</h2>
                </div>
                <div id={messageId} className="sp-dialog__message">{message}</div>
                {input && (
                    <div className="sp-dialog__field">
                        <label htmlFor={inputId}>{input.label}</label>
                        <textarea
                            id={inputId}
                            rows={3}
                            value={value}
                            maxLength={input.maxLength}
                            placeholder={input.placeholder}
                            aria-invalid={inputError ? "true" : undefined}
                            onChange={(event) => { setValue(event.target.value); setInputError(""); }}
                        />
                        {inputError && <small className="field-error">{inputError}</small>}
                    </div>
                )}
                <div className="sp-dialog__actions">
                    <button type="button" className="sp-dialog__btn" onClick={() => onClose(input ? null : false)}>{cancelLabel}</button>
                    <button type="button" className={`sp-dialog__btn sp-dialog__btn--${tone}`} onClick={accept} data-autofocus>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

// const [confirm, dialog] = useConfirm();  ...  {dialog}  ...  if (!(await confirm({ title, message }))) return;
// Con `input`, resuelve el texto escrito o null si se cancela.
export function useConfirm() {
    const [request, setRequest] = useState(null);

    const confirm = useCallback((options) => new Promise((resolve) => setRequest({ ...options, resolve })), []);

    const dialog = request ? (
        <ConfirmDialog
            {...request}
            onClose={(result) => {
                request.resolve(result);
                setRequest(null);
            }}
        />
    ) : null;

    return [confirm, dialog];
}

export default ConfirmDialog;
