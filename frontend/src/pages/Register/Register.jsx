import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import FieldError from "../../components/FieldError/FieldError";
import PasswordChecklist from "../../components/PasswordChecklist/PasswordChecklist";
import { useFieldErrors } from "../../hooks/useFieldErrors";
import { registerRequest, saveAuthSession } from "../../services/auth";
import {
    EMAIL_MESSAGE,
    fieldError,
    isStrongPassword,
    isValidEmail,
    PASSWORD_MESSAGE,
    summaryMessage
} from "../../utils/validation";

import "../Login/Login.css";
import "../../components/LoginForm/LoginForm.css";
import "./Register.css";
import "./RegisterValidation.css";

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
    const [emailInUse, setEmailInUse] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { errors, validate, clear, errorId, fieldProps } = useFieldErrors("register");
    const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
        clear(name);
        if (name === "email") setEmailInUse(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setEmailInUse(false);

        const found = validate({
            firstName: fieldError(formData.firstName),
            lastName: fieldError(formData.lastName),
            email: fieldError(formData.email, [isValidEmail, EMAIL_MESSAGE]),
            password: fieldError(formData.password, [isStrongPassword, PASSWORD_MESSAGE]),
            confirmPassword: fieldError(formData.confirmPassword, [(value) => value === formData.password, "Las contraseñas no coinciden."])
        }, event.currentTarget);
        if (Object.keys(found).length) {
            setMessage(summaryMessage(found));
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
            if (error instanceof TypeError) {
                setMessage("No se pudo conectar con el servidor. Intenta nuevamente más tarde.");
            } else if (/ya está en uso|ya existe/i.test(error.message)) {
                // El correo ya está registrado: el aviso se muestra junto al campo del correo.
                setEmailInUse(true);
            } else {
                setMessage(error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const emailProps = emailInUse
        ? { "aria-invalid": "true", "aria-describedby": "register-email-in-use" }
        : fieldProps("email");
    const confirmError = errors.confirmPassword || (passwordsMismatch ? "Las contraseñas no coinciden." : "");

    return (
        <main className="login-page register-page">
            <section className="login-page__container register-page__container">
                <div className="login-page__header">
                    <Link to="/" className="login-page__logo">StockPlan</Link>
                    <h1>Crear cuenta</h1>
                    <p>Regístrate para explorar y realizar pedidos.</p>
                </div>

                <form className="login-form register-form" onSubmit={handleSubmit} noValidate>
                    {message && <p className="login-form__error" role="alert">{message}</p>}

                    <div className="login-form__field">
                        <label htmlFor="register-first-name">Nombre</label>
                        <input id="register-first-name" name="firstName" value={formData.firstName} onChange={handleChange} autoComplete="given-name" maxLength={50} required disabled={isSubmitting} {...fieldProps("firstName")} />
                        <FieldError id={errorId("firstName")} message={errors.firstName} />
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-last-name">Apellido</label>
                        <input id="register-last-name" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="family-name" maxLength={50} required disabled={isSubmitting} {...fieldProps("lastName")} />
                        <FieldError id={errorId("lastName")} message={errors.lastName} />
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-email">Correo electrónico</label>
                        <input id="register-email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" maxLength={100} required disabled={isSubmitting} placeholder="nombre@correo.com" {...emailProps} />
                        <FieldError id={errorId("email")} message={errors.email} />
                        {emailInUse && (
                            <small id="register-email-in-use" className="register-form__field-error" role="alert">
                                Esta cuenta de correo ya está en uso. <Link to="/login">Inicia sesión</Link> o usa otro correo.
                            </small>
                        )}
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-password">Contraseña</label>
                        <input id="register-password" name="password" type="password" value={formData.password} onChange={handleChange} autoComplete="new-password" maxLength={72} required disabled={isSubmitting}
                            aria-invalid={errors.password ? "true" : undefined}
                            aria-describedby={errors.password ? `${errorId("password")} register-password-rules` : "register-password-rules"} />
                        <FieldError id={errorId("password")} message={errors.password} />
                        <PasswordChecklist id="register-password-rules" password={formData.password} />
                    </div>

                    <div className="login-form__field">
                        <label htmlFor="register-confirm-password">Confirmar contraseña</label>
                        <input id="register-confirm-password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" maxLength={72} required disabled={isSubmitting}
                            aria-invalid={confirmError ? "true" : undefined}
                            aria-describedby={confirmError ? errorId("confirmPassword") : undefined} />
                        <FieldError id={errorId("confirmPassword")} message={confirmError} />
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
