import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerRequest, saveAuthSession } from "../../services/auth";

import "../Login/Login.css";
import "../../components/LoginForm/LoginForm.css";
import "./Register.css";

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        if (formData.password !== formData.confirmPassword) {
            setMessage("Las contraseñas no coinciden.");
            return;
        }

        setIsSubmitting(true);
        try {
            const session = await registerRequest({
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                password: formData.password
            });
            saveAuthSession(session);
            navigate("/", { replace: true });
        } catch (error) {
            setMessage(error instanceof TypeError
                ? "No se pudo conectar con el servidor. Intenta nuevamente más tarde."
                : error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="login-page register-page">
            <section className="login-page__container register-page__container">
                <div className="login-page__header">
                    <Link to="/" className="login-page__logo">StockPlan</Link>
                    <h1>Crear cuenta</h1>
                    <p>Regístrate para explorar y realizar pedidos.</p>
                </div>

                <form className="login-form register-form" onSubmit={handleSubmit}>
                    {message && <p className="login-form__error" role="alert">{message}</p>}

                    <div className="login-form__field">
                        <label htmlFor="register-first-name">Nombre</label>
                        <input id="register-first-name" name="firstName" value={formData.firstName} onChange={handleChange} autoComplete="given-name" maxLength={50} required disabled={isSubmitting} />
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-last-name">Apellido</label>
                        <input id="register-last-name" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="family-name" maxLength={50} required disabled={isSubmitting} />
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-email">Correo electrónico</label>
                        <input id="register-email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" maxLength={100} required disabled={isSubmitting} />
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-password">Contraseña</label>
                        <input id="register-password" name="password" type="password" value={formData.password} onChange={handleChange} autoComplete="new-password" minLength={8} maxLength={72} required disabled={isSubmitting} />
                        <small className="register-form__hint">Mínimo 8 caracteres.</small>
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-confirm-password">Confirmar contraseña</label>
                        <input id="register-confirm-password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" minLength={8} maxLength={72} required disabled={isSubmitting} />
                    </div>

                    <button type="submit" className="login-form__button" disabled={isSubmitting}>
                        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                    </button>
                </form>

                <div className="login-page__back">
                    <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
                    <Link to="/">Volver al inicio</Link>
                </div>
            </section>
        </main>
    );
}

export default Register;
