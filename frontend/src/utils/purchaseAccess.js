// Solo las cuentas de tipo USUARIO (clientes) pueden añadir al carrito y hacer pedidos.
// Devuelve null si puede comprar, o el motivo para mostrarlo en pantalla.
export function getPurchaseBlock(user) {
    if (!user) {
        return { type: "guest", message: "Para añadir productos y hacer pedidos debes iniciar sesión o registrar una cuenta." };
    }
    if (user.role !== "USUARIO") {
        const roleName = String(user.role || "").toLowerCase();
        return {
            type: "role",
            message: `Iniciaste sesión con una cuenta de ${roleName || "otro tipo"}. Solo las cuentas de usuario (clientes) pueden comprar; cierra sesión e ingresa con una cuenta de usuario.`
        };
    }
    return null;
}
