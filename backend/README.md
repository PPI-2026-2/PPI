# StockPlan Backend

Requiere Node.js 20 o superior y Oracle 19c accesible desde el equipo.

1. Copiar `.env.example` a `.env` y completar localmente la conexión de Oracle, CORS y el secreto JWT.
2. Ejecutar `npm install`.
3. Confirmar que las tablas de `database/script/stockplan_schema.sql` están creadas. Si hace falta poblar roles en una BD existente, ejecutar `../database/script/usuario_registration_migration.sql` desde SQL Developer.
4. Ejecutar `npm run bootstrap:admin` para crear la primera cuenta administradora; la contraseña se pide sin mostrarla.
5. Ejecutar `npm run dev`.
6. Comprobar `GET http://localhost:3000/api/health`.

El esquema usa `USUARIO.PASSWORD_HASH`, estado `ACTIVO`, `ID_ROL_FK` y tablas `ROL` con IDs identity. Registro público: `POST /api/auth/register` (asigna únicamente `USUARIO`). Login: `POST /api/auth/login`; perfil autenticado: `GET /api/auth/me` con Bearer JWT. Gestión de roles: `/api/admin/users`, requiere JWT `ADMINISTRADOR`.

El servicio requiere que `PASSWORD_HASH` contenga hashes bcrypt y que `ROL` tenga sembrados los tres roles permitidos. No se incluye ni se sube un `.env` real. Ver `../docs/database/usuario.md` antes de probar una cuenta.
