import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import FieldError from "../FieldError/FieldError";
import { useFieldErrors } from "../../hooks/useFieldErrors";
import { loginRequest, saveAuthSession } from "../../services/auth";
import { clearSessionNotice, readSessionNotice } from "../../services/session";
import { EMAIL_MESSAGE, fieldError, FORM_INCOMPLETE_MESSAGE, isValidEmail, summaryMessage } from "../../utils/validation";

import "./LoginForm.css";

function LoginForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice] = useState(readSessionNotice);
    const { errors, validate, clear, errorId, fieldProps } = useFieldErrors("login");

    useEffect(() => {
        clearSessionNotice();
    }, []);

    const handleChange = (event) => {

        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));
        clear(name);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        // Solo se exige que los campos estén llenos y el correo bien escrito: las cuentas
        // creadas antes de la regla de contraseña segura deben poder seguir entrando.
        const found = validate({
            email: fieldError(formData.email, [isValidEmail, EMAIL_MESSAGE]),
            password: fieldError(formData.password)
        }, event.currentTarget);
        if (Object.keys(found).length) {
            setError(summaryMessage(found) === FORM_INCOMPLETE_MESSAGE
                ? "Completa el correo y la contraseña para iniciar sesión."
                : "Revisa el correo electrónico.");
            return;
        }

        setIsSubmitting(true);

        try {
            const session = await loginRequest(
                formData.email.trim(),
                formData.password
            );
            saveAuthSession(session);

            if (session.user.role === "EMPLEADO") {
                navigate("/empleado", { replace: true });
                return;
            }

            if (session.user.role === "USUARIO") {
                navigate("/", { replace: true });
                return;
            }

            if (session.user.role === "ADMINISTRADOR") {
                navigate("/administrador", { replace: true });
                return;
            }

            setError(`La sesión se inició, pero la interfaz para el rol ${session.user.role} todavía no está disponible.`);
        } catch (requestError) {
            setError(requestError instanceof TypeError
                ? "No se pudo conectar con el servidor. Verifica que el backend esté iniciado y conectado a Oracle."
                : requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
        >

            {notice && !error && (
                <p className="login-form__notice" role="status">
                    {notice}
                </p>
            )}

            {error && (
                <p className="login-form__error" role="alert">
                    {error}
                </p>
            )}

            <div className="login-form__field">

                <label htmlFor="email">
                    Correo electrónico
                </label>

                <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Ingresa tu correo electrónico"
                    autoComplete="email"
                    maxLength={100}
                    required
                    {...fieldProps("email")}
                />
                <FieldError id={errorId("email")} message={errors.email} />

            </div>


            <div className="login-form__field">

                <label htmlFor="password">
                    Contraseña
                </label>

                <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                    {...fieldProps("password")}
                />
                <FieldError id={errorId("password")} message={errors.password} />

            </div>


            <button
                type="submit"
                className="login-form__button"
                disabled={isSubmitting}
            >
                {isSubmitting ? "Validando…" : "Iniciar sesión"}
            </button>

        </form>
    );
}

export default LoginForm;