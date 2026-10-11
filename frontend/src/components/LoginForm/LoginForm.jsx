import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginRequest, saveAuthSession } from "../../services/auth";

import "./LoginForm.css";

function LoginForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {

        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
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
                navigate("/administrador/usuarios", { replace: true });
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
        >

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
                    required
                />

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
                />

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