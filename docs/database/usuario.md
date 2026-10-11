# Esquema de USUARIO y requisitos

El esquema completo está guardado en `database/script/stockplan_schema.sql`; `database/script/usuario.sql` contiene las tablas centrales `ROL` y `USUARIO`. El backend actual consulta `USUARIO.ID_USUARIO_PK`, `NOMBRE_US`, `APELLIDO_US`, `EMAIL`, `PASSWORD_HASH`, `ESTADO`, `ID_ROL_FK` y `ROL.NOMBRE_ROL`.

Recomendaciones antes de probar el login:

1. `EMAIL` es único según la constraint `USUARIO_EMAIL_UK`.
2. `PASSWORD_HASH` debe almacenar hashes bcrypt, nunca contraseñas en texto plano. El registro público y el alta administrativa generan bcrypt en el backend.
3. `ESTADO` esperado para cuenta activa: `ACTIVO`; `INACTIVO` rechaza login.
4. `ID_ROL_FK` referencia `ROL.ID_ROL_PK`; los roles admitidos son `EMPLEADO`, `USUARIO` y `ADMINISTRADOR`.
5. Oracle genera `ID_USUARIO_PK` y `ID_ROL_PK` mediante identity; no se usa `SEQ_USUARIO`.

El servicio necesita `SELECT` e `INSERT` en `USUARIO` y `SELECT` en `ROL`. La constraint única existente protege correo duplicado concurrente.

## Flujo de altas

- El formulario público `/registro` solo crea cuentas `USUARIO`; nombre, apellido, correo y contraseña se envían a `POST /api/auth/register`.
- La API normaliza el correo, valida los campos, almacena bcrypt en `PASSWORD_HASH`, resuelve `ID_ROL_FK` por `NOMBRE_ROL` y deja que Oracle genere el ID.
- `EMPLEADO` y `ADMINISTRADOR` se crean desde la consola autenticada `/administrador/usuarios`, usando `POST /api/admin/users` que exige rol `ADMINISTRADOR`.
- Para la primera cuenta administradora (antes de que exista el panel) se ejecuta una vez `npm run bootstrap:admin` en `backend/`. No se escriben contraseñas ni hashes a mano en SQL.

## Relación de roles actual

El backend ya usa `JOIN ROL` para autenticación, altas administrativas y lista de usuarios.

## Datos de conexión aún requeridos

No incluir secretos en Git ni en el chat. Completar localmente `backend/.env` (copiando `.env.example`) con:

- host y puerto Oracle
- `SERVICE_NAME` de la PDB (o connect string completo); ej. `localhost:1521/XEPDB1` es solo ejemplo
- usuario de BD con permiso mínimo de `SELECT` sobre la tabla
- contraseña de ese usuario
- origen local/frontend permitido por CORS
- `JWT_SECRET` aleatorio de al menos 32 bytes

El proyecto no puede conectar todavía hasta completar esas variables y confirmar que Oracle está escuchando y que las contraseñas de la tabla están hasheadas.
