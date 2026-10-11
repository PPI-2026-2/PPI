# API de autenticación

## Login

`POST /api/auth/login`

Cuerpo JSON: `{ "email": "...", "password": "..." }`.

Devuelve `accessToken`, `tokenType`, `expiresIn` y `user` (id, nombre, correo y rol). El token es un JWT firmado con HS256, tiene expiración configurable y debe enviarse como `Authorization: Bearer <token>`.

## Registro público

`POST /api/auth/register`

Acepta `firstName`, `lastName`, `email` y `password`. Nunca acepta un rol desde el cliente: crea siempre una cuenta `USUARIO`, estado `ACTIVO`, hashea la contraseña con bcrypt (coste 12) en backend y devuelve una sesión JWT. El backend resuelve `ID_ROL_FK` consultando `ROL`, e Oracle genera el ID de usuario mediante identity. El correo debe ser único. El registro está limitado por IP.

El esquema completo está en `database/script/stockplan_schema.sql`. Si las tablas ya existen, `database/script/usuario_registration_migration.sql` puede usarse para insertar idempotentemente los tres nombres base en `ROL`; no crea secuencias, ya que las identidades Oracle generan IDs.

## Sesión actual

`GET /api/auth/me` requiere JWT. Devuelve los datos del sujeto autenticado. El frontend usa este endpoint antes de renderizar la zona protegida de empleado.

## Roles y estado

El backend une `USUARIO.ID_ROL_FK` con `ROL.ID_ROL_PK`, y solo permite cuentas `ACTIVO` con uno de los roles `EMPLEADO`, `USUARIO` o `ADMINISTRADOR`. Las rutas de la interfaz empleado requieren `EMPLEADO`; la API incluye middleware `authorizeRoles(...)` para proteger las operaciones según rol.

Los intentos de login están limitados por IP. Los errores de usuario/contraseña no revelan si el correo existe.

## Administración de usuarios

`GET /api/admin/users` y `POST /api/admin/users` requieren un JWT cuyo rol sea `ADMINISTRADOR`. El POST puede asignar `USUARIO`, `EMPLEADO` o `ADMINISTRADOR`; la contraseña siempre se hashea en el backend. No se deben crear estos endpoints sin middleware de rol.

La primera cuenta `ADMINISTRADOR` se provisiona una sola vez con `npm run bootstrap:admin` desde `backend/`, después de ejecutar la migración Oracle y completar `.env`. El script solicita la contraseña de forma oculta y se niega a crear otro administrador inicial si ya existe uno.

El registro inicia la sesión del nuevo `USUARIO`. La interfaz de empleado solo acepta `EMPLEADO`; la consola de administración solo acepta `ADMINISTRADOR`. El catálogo público es visible en `/`.
