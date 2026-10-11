import { Link } from "react-router-dom";

import LoginForm from "../../components/LoginForm/LoginForm";

import "./Login.css";

function Login() {
    return (
        <main className="login-page">

            <section className="login-page__container">

                <div className="login-page__header">

                    <Link
                        to="/"
                        className="login-page__logo"
                    >
                        StockPlan
                    </Link>

                    <h1>
                        Iniciar sesión
                    </h1>

                    <p>
                        Ingresa tus datos para acceder a tu cuenta.
                    </p>

                </div>

                <LoginForm />

                <div className="login-page__back">

                    <p className="login-page__register">
                        ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
                    </p>

                    <Link to="/">
                        Volver al inicio
                    </Link>

                </div>

            </section>

        </main>
    );
}

export default Login;