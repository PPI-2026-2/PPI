# Tablas ROL y USUARIO

Esquema Oracle: `STOCKPLAN` (servicio `XEPDB1`). El esquema completo está en
`database/script/esquema_stockplan.sql`.

## ROL

| Columna | Tipo | Notas |
|---|---|---|
| ID_ROL_PK | NUMBER IDENTITY | PK |
| NOMBRE_ROL | VARCHAR2(50) | Único. `ADMINISTRADOR`, `EMPLEADO` o `USUARIO` |
| DESCRIPCION | VARCHAR2(100) | Opcional |

## USUARIO

| Columna | Tipo | Notas |
|---|---|---|
| ID_USUARIO_PK | NUMBER IDENTITY | PK; no se envía en el INSERT |
| NOMBRE_US | VARCHAR2(50) | Obligatorio |
| APELLIDO_US | VARCHAR2(50) | Obligatorio |
| EMAIL | VARCHAR2(100) | Obligatorio y único (el backend lo guarda en minúsculas) |
| PASSWORD_HASH | VARCHAR2(255) | Hash bcrypt (coste 12) generado por el backend |
| ESTADO | VARCHAR2(20) | `ACTIVO` (por defecto) o `INACTIVO` |
| ID_ROL_FK | NUMBER | FK a `ROL.ID_ROL_PK` |

## Reglas del backend

- El registro público siempre crea cuentas con rol `USUARIO`.
- Los roles `EMPLEADO` y `ADMINISTRADOR` solo los crea un ADMINISTRADOR
  (`POST /api/admin/users`) o el comando `npm run bootstrap:admin`.
- El login exige `ESTADO = 'ACTIVO'` y comprueba la contraseña antes de revelar el estado.
- El usuario de conexión (`DB_USER`) debe ser `STOCKPLAN`, o tener `SELECT, INSERT`
  sobre `ROL` y `USUARIO` más sinónimos, porque las consultas no llevan prefijo de esquema.