import { CircleAlert } from "lucide-react";

// Mensaje bajo un campo inválido. No muestra nada si no hay mensaje.
function FieldError({ id, message }) {
    if (!message) return null;
    return (
        <small id={id} className="field-error">
            <CircleAlert size={12} aria-hidden="true" /> {message}
        </small>
    );
}

export default FieldError;
