# Referencia de la API

[← Volver al README](../../README.md)

- **Base:** `http://localhost:3000/api`
- **Formato:** JSON. Los errores responden `{ "message": "..." }`.
- **Sesión:** las rutas privadas requieren `Authorization: Bearer <token>`.

| Código | Significado |
|---|---|
| 400 | Datos inválidos |
| 401 | Sin sesión, sesión vencida o cuenta desactivada |
| 403 | El rol no tiene permiso, o la cuenta está inactiva al iniciar sesión |
| 404 | No existe |
| 409 | La regla de negocio no lo permite en este momento |
| 413 | Cuerpo mayor a 10 kB |
| 429 | Demasiados intentos |

<details open>
<summary><strong>Autenticación: <code>/auth</code></strong></summary>

| Método | Ruta | Acceso | Cuerpo | Función |
|---|---|---|---|---|
| POST | `/auth/login` | Público, 10 cada 15 min | `email`, `password` | Devuelve `accessToken` y `user` |
| POST | `/auth/register` | Público, 5 por hora | `firstName`, `lastName`, `email`, `password` | Crea siempre un `USUARIO` e inicia su sesión. Correo `texto@dominio.ext`; contraseña de 8 o más con mayúscula, minúscula, número y símbolo |
| POST | `/auth/renovar` | Con sesión | | Entrega un token nuevo de 30 minutos |
| GET | `/auth/me` | Con sesión | | Datos de quien inició sesión |

</details>

<details>
<summary><strong>Tienda pública: <code>/store</code></strong></summary>

| Método | Ruta | Función |
|---|---|---|
| GET | `/store/productos` | Productos activos con unidades libres en alguna talla |
| GET | `/store/productos/:id` | Detalle con tallas, `isAvailable` y `maxQuantity` (máximo 10). No publica el stock real |

</details>

<details>
<summary><strong>Cliente: <code>/pedidos</code>, rol USUARIO</strong></summary>

| Método | Ruta | Cuerpo | Función |
|---|---|---|---|
| GET | `/pedidos` | | Historial propio |
| GET | `/pedidos/notificaciones` | | Avisos de la tienda de los últimos 30 días |
| POST | `/pedidos` | `items: [{ referenceId, quantity }]` | Crea el pedido; el precio sale de la base. Hasta 10 por talla |
| POST | `/pedidos/:id/cancelar` | | Cancela un pedido propio: dentro de la ventana o, si está INCOMPLETO, en cualquier momento. Libera lo separado |

</details>

<details>
<summary><strong>Empleado: <code>/empleado</code>, rol EMPLEADO</strong></summary>

| Método | Ruta | Cuerpo o parámetros | Función |
|---|---|---|---|
| GET | `/empleado/pedidos` | `?estado=PENDIENTE,INCOMPLETO` | Lista de pedidos |
| GET | `/empleado/pedidos/resumen` | | Conteo por estado |
| GET | `/empleado/pedidos/:id` | | Detalle e historial |
| POST | `/empleado/pedidos/:id/verificar` | `lines: [{ detailId, quantity }]`, `observation` | Separa unidades. Queda COMPLETO o INCOMPLETO; el incompleto exige motivo |
| POST | `/empleado/pedidos/:id/entregar` | | Baja el stock, deja el movimiento y queda RECLAMADO |

</details>

<details>
<summary><strong>Administrador: pedidos, <code>/admin/pedidos</code></strong></summary>

| Método | Ruta | Cuerpo o parámetros | Función |
|---|---|---|---|
| GET | `/admin/pedidos` | `?estado`, `q`, `desde`, `hasta`, `sinReclamar=1`, `pagina`, `tamano` | Consulta y resumen |
| GET | `/admin/pedidos/reclamado` | `?mes=2026-11` o `?desde&hasta` | Valor de lo entregado |
| GET | `/admin/pedidos/:id` | | Detalle e historial |
| POST | `/admin/pedidos/:id/cancelar-sin-reclamar` | | Cancela si supera el plazo y libera lo separado |
| POST | `/admin/pedidos/:id/cerrar-incompleto` | `reason` | Cierra un incompleto con motivo y libera lo separado |

</details>

<details>
<summary><strong>Administrador: análisis, <code>/admin/analisis</code></strong></summary>

Parámetros opcionales: `?dias=7|30|90` y `?horizonte=30|60|90`. Ambos valen 90 por defecto.

| Método | Ruta | Función |
|---|---|---|
| GET | `/admin/analisis/reposicion` | Referencias por reponer, urgencia, sugerido y fechas |
| GET | `/admin/analisis/comportamiento` | Movimientos, cobertura, rotación y referencias sin movimiento |
| GET | `/admin/analisis/ventas` | Ventas, comparación con el periodo anterior, proyección y recomendaciones |
| GET | `/admin/analisis/alertas` | Alertas abiertas (sin parámetros) |

</details>

<details>
<summary><strong>Administrador: personal, <code>/admin/staff</code></strong></summary>

| Método | Ruta | Cuerpo | Función |
|---|---|---|---|
| GET | `/admin/staff` | | Empleados y administradores |
| POST | `/admin/staff` | `firstName`, `lastName`, `email`, `password`, `role` | Crea una cuenta, con las mismas reglas de correo y contraseña del registro. Hasta 20 por hora |
| PATCH | `/admin/staff/:id/estado` | `status: ACTIVO o INACTIVO` | Activa o desactiva. No aplica a la cuenta propia ni a clientes |

</details>

<details>
<summary><strong>Administrador: catálogo</strong></summary>

| Método | Ruta | Cuerpo o parámetros | Función |
|---|---|---|---|
| GET | `/admin/proveedores` | `?estado` | Lista |
| POST | `/admin/proveedores` | `name`, `lastName`, `phone`, `deliveryDays` | Crea. `name` y `phone` son obligatorios; `lastName` es opcional |
| PATCH | `/admin/proveedores/:id` | Los mismos y `status` | Edita o activa y desactiva. Si se envía `phone`, no puede ir vacío |
| POST | `/admin/proveedores/:id/eliminar` | | Elimina, solo si no tiene productos ni recepciones (409 si los tiene; en ese caso se desactiva) |
| GET | `/admin/tallas` | | Lista |
| POST | `/admin/tallas` | `name` | Crea |
| GET | `/admin/productos` | `?estado`, `q` | Lista |
| GET | `/admin/productos/:id` | | Detalle |
| POST | `/admin/productos` | `name`, `description`, `price`, `supplierId`, `sizeIds` | Crea el producto con sus referencias e inventario en 0 |
| PATCH | `/admin/productos/:id` | `name`, `description`, `price`, `supplierId` | Edita |
| PATCH | `/admin/productos/:id/estado` | `status` | Activa o inactiva |
| POST | `/admin/productos/:id/tallas` | `sizeId` | Agrega una talla |
| PATCH | `/admin/productos/:id/tallas/:referenceId/estado` | `status` | Activa o inactiva una talla |

</details>

<details>
<summary><strong>Administrador: inventario</strong></summary>

| Método | Ruta | Cuerpo o parámetros | Función |
|---|---|---|---|
| GET | `/admin/recepciones` | `?estado`, `productId`, `pagina`, `tamano` | Lista |
| GET | `/admin/recepciones/:id` | | Detalle |
| POST | `/admin/recepciones/entrega` | `supplierId`, `productId`, `lines: [{ referenceId, received, rejected }]`, `rejectionReason`, `observation` | Lo que usa la pantalla. El proveedor es obligatorio, debe estar activo y ser el asignado al producto (409 si no). Guarda una recepción CONFIRMADA por talla con ese proveedor, con la esperada igual a la recibida, y suma lo aceptado al stock con su movimiento. Todo o nada; el motivo es obligatorio si alguna talla tiene rechazadas |
| POST | `/admin/recepciones` | `referenceId`, `expected`, `received`, `rejected`, `rejectionReason`, `observation` | Flujo anterior, una sola talla: registra sin tocar el stock |
| POST | `/admin/recepciones/:id/confirmar` | | Suma lo aceptado al stock y deja el movimiento |
| POST | `/admin/recepciones/:id/anular` | `observation` | Anula una recepción sin confirmar |
| GET | `/admin/inventario` | `?q`, `productId`, `nivel=OK,BAJO o AGOTADO`, `pagina`, `tamano` | Stock por talla y resumen |
| PATCH | `/admin/inventario/:referenceId/minimo` | `minimum` | Fija el stock mínimo |
| POST | `/admin/inventario/:referenceId/ajuste` | `quantity` (+ o −), `observation` | Ajuste manual con motivo; no baja de lo reservado |
| GET | `/admin/movimientos` | `?tipo`, `productId`, `referenceId`, `limit`, `pagina`, `tamano` | Trazabilidad |

</details>

<details>
<summary><strong>Ejemplo: iniciar sesión y consultar alertas</strong></summary>

```bash
# 1. Iniciar sesión
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu-correo","password":"tu-contraseña"}'

# 2. Usar el accessToken de la respuesta
curl http://localhost:3000/api/admin/analisis/alertas \
  -H "Authorization: Bearer EL_TOKEN"
```

</details>

`GET /api/health` responde si la API está encendida; no comprueba Oracle.
