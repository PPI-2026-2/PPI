import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { clearAuthSession, getSessionUser, verifySession } from "../services/auth";
import "./ProtectedRoute.css";

function ProtectedRoute({ allowedRoles = [] }) {
    const [status, setStatus] = useState("checking");
    const [role, setRole] = useState(() => getSessionUser()?.role ?? null);

    useEffect(() => {
        let isMounted = true;

        verifySession()
            .then((user) => {
                if (!isMounted) return;
                setRole(user.role);
                setStatus("authenticated");
            })
            .catch(() => {
                clearAuthSession();
                if (isMounted) setStatus("unauthenticated");
            });

        return () => {
            isMounted = false;
        };
    }, []);

    if (status === "checking") {
        return <main className="employee-route-loading" aria-live="polite">Verificando sesión…</main>;
    }

    if (status === "unauthenticated") {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
