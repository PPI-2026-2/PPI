import { useCallback, useEffect, useState } from "react";
import { RefreshCw, UserPlus, Users } from "lucide-react";

import { createStaffAccount, getSessionUser, getStaffAccounts, setStaffStatus } from "../../services/auth";

import "./AdminUsers.css";

const emptyForm = { firstName: "", lastName: "", email: "", password: "", role: "EMPLEADO" };

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmingId, setConfirmingId] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const currentUserId = String(getSessionUser()?.id ?? "");

    const loadUsers = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setUsers(await getStaffAccounts());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");
        setIsSubmitting(true);
        try {
            const user = await createStaffAccount({
                ...form,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim()
            });
            setNotice(`Se creó la cuenta de ${user.name} con rol ${user.role}.`);
            setForm(emptyForm);
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatus = async (user, status) => {
        setError("");
        setNotice("");
        setBusyId(user.id);
        try {
            const updated = await setStaffStatus(user.id, status);
            setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setNotice(status === "INACTIVO"
                ? `${user.firstName} ${user.lastName} ya no puede entrar al sistema; su sesión abierta se cerró.`
                : `${user.firstName} ${user.lastName} puede volver a entrar al sistema.`);
            setConfirmingId(null);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusyId(null);
        }
    };

    const renderAction = (user) => {
        if (user.id === currentUserId) return <small className="admin-users-self">Tu cuenta</small>;
        if (user.status === "INACTIVO") {
            return <button type="button" className="admin-users-action" disabled={busyId === user.id} onClick={() => handleStatus(user, "ACTIVO")}>Activar</button>;
        }
        if (confirmingId === user.id) {
            return (
                <span className="admin-users-confirm" role="group" aria-label={`Confirmar desactivar a ${user.firstName} ${user.lastName}`}>
                    <button type="button" className="admin-users-action admin-users-action--danger" disabled={busyId === user.id} onClick={() => handleStatus(user, "INACTIVO")}>Sí, desactivar</button>
                    <button type="button" className="admin-users-action" disabled={busyId === user.id} onClick={() => setConfirmingId(null)}>No</button>
                </span>
            );
        }
        return <button type="button" className="admin-users-action" onClick={() => setConfirmingId(user.id)}>Desactivar</button>;
    };

    return (
        <div className="admin-users-page">
            <div className="admin-users-content">
                <header className="admin-users-heading">
                    <span>GESTIÓN / CUENTAS</span>
                    <h1>Personal y roles</h1>
                    <p>Crea cuentas de empleados y administradores, y desactiva las que ya no deban entrar. Los clientes se registran por su cuenta desde el registro público.</p>
                </header>

                <section className="admin-users-card admin-users-create">
                    <div className="admin-users-card__heading"><div className="admin-users-card__icon"><UserPlus size={19} /></div><div><h2>Crear cuenta</h2><p>La contraseña se almacena como hash y no se muestra en el listado.</p></div></div>
                    {error && <p className="admin-users-message admin-users-message--error" role="alert">{error}</p>}
                    {notice && <p className="admin-users-message admin-users-message--success" role="status">{notice}</p>}
                    <form className="admin-users-form" onSubmit={handleSubmit}>
                        <label>Nombre<input name="firstName" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} maxLength={50} autoComplete="given-name" required disabled={isSubmitting} /></label>
                        <label>Apellido<input name="lastName" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={50} autoComplete="family-name" required disabled={isSubmitting} /></label>
                        <label>Correo electrónico<input name="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={100} autoComplete="email" required disabled={isSubmitting} /></label>
                        <label>Contraseña inicial<input name="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} maxLength={72} autoComplete="new-password" required disabled={isSubmitting} /><small>8 caracteres mínimo; el backend genera un hash antes de guardarla.</small></label>
                        <label>Rol<select name="role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} disabled={isSubmitting}><option value="EMPLEADO">Empleado</option><option value="ADMINISTRADOR">Administrador</option></select></label>
                        <button type="submit" disabled={isSubmitting}><UserPlus size={16} />{isSubmitting ? "Creando…" : "Crear cuenta"}</button>
                    </form>
                </section>

                <section className="admin-users-card admin-users-list">
                    <div className="admin-users-card__heading"><div className="admin-users-card__icon"><Users size={19} /></div><div><h2>Personal</h2><p>Empleados y administradores registrados en Oracle.</p></div><button className="admin-users-refresh" type="button" onClick={loadUsers} disabled={isLoading} aria-label="Actualizar lista"><RefreshCw size={17} /></button></div>
                    {error && !users.length && <p className="admin-users-message admin-users-message--error" role="alert">{error}</p>}
                    <div className="admin-users-table-wrap">
                        <table className="admin-users-table">
                            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead>
                            <tbody>
                                {users.map((user) => <tr key={user.id}><td>{user.firstName} {user.lastName}</td><td>{user.email}</td><td><span className={`admin-role admin-role--${user.role.toLowerCase()}`}>{user.role}</span></td><td><span className={`admin-users-status admin-users-status--${user.status.toLowerCase()}`}>{user.status === "ACTIVO" ? "Activo" : "Inactivo"}</span></td><td>{renderAction(user)}</td></tr>)}
                                {!isLoading && users.length === 0 && <tr><td colSpan="5" className="admin-users-empty">No hay personal para mostrar.</td></tr>}
                                {isLoading && <tr><td colSpan="5" className="admin-users-empty">Cargando personal…</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default AdminUsers;
