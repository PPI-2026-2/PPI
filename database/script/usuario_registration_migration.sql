-- Esquema actual: ROL y USUARIO ya usan IDENTITY, EMAIL tiene UNIQUE,
-- y USUARIO.ID_ROL_FK referencia ROL.ID_ROL_PK. No crear SEQ_USUARIO.
-- Este script puede ejecutarse repetidamente para asegurar que existan los
-- tres roles base. Ejecutar como propietario de las tablas.

MERGE INTO ROL destino
USING (
  SELECT 'ADMINISTRADOR' AS NOMBRE_ROL, 'Administrador del sistema' AS DESCRIPCION FROM DUAL
  UNION ALL
  SELECT 'EMPLEADO', 'Empleado de tienda que gestiona pedidos' FROM DUAL
  UNION ALL
  SELECT 'USUARIO', 'Cliente registrado' FROM DUAL
) origen
ON (UPPER(TRIM(destino.NOMBRE_ROL)) = origen.NOMBRE_ROL)
WHEN NOT MATCHED THEN
  INSERT (NOMBRE_ROL, DESCRIPCION)
  VALUES (origen.NOMBRE_ROL, origen.DESCRIPCION);

COMMIT;

-- El usuario indicado en backend/.env necesita:
-- GRANT SELECT, INSERT ON ROL TO <usuario_backend>;
-- GRANT SELECT, INSERT ON USUARIO TO <usuario_backend>;
-- No se requieren permisos sobre una secuencia: Oracle genera los IDs mediante IDENTITY.
