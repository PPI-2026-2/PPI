# Backend StockPlan

El backend se implementa en Node.js/Express bajo `backend/`; `oracledb` usa modo Thin para conectarse a Oracle 19c sin Oracle Instant Client en los casos compatibles.

- `src/server.js`: valida configuración, crea el pool Oracle e inicia el servidor.
- `src/config/oracle.js`: conexión agrupada a Oracle.
- `src/routes/auth.routes.js`: endpoints de login y sesión.
- `src/controllers/auth.controller.js`: validación HTTP y respuesta.
- `src/services/auth.service.js`: lectura de usuario, comparación bcrypt y creación JWT.
- `src/services/users.service.js`: registro público como `USUARIO`, alta/listado de cuentas y bcrypt.
- `src/routes/users.routes.js`: API administrativa de usuarios protegida por rol.
- `src/middleware/auth.middleware.js`: validación JWT y autorización por rol.

React solo llama a la API. Nunca debe conectarse directamente a Oracle ni recibir credenciales de base de datos o el secreto JWT. La zona de empleado verifica `/api/auth/me` y exige rol `EMPLEADO`; la autorización definitiva de datos y operaciones debe ejecutarse también en middleware backend.

El alta pública no recibe el rol del navegador y siempre genera `USUARIO`. El primer administrador se crea mediante el script de bootstrap protegido localmente; después, administradores autenticados pueden crear usuarios, empleados y más administradores.
