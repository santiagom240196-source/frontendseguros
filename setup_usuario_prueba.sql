-- ==============================================================================
-- SCRIPT DE CREACIÓN: USUARIO DE PRUEBA (SOLO LECTURA) - POSTGRESQL / PGADMIN
-- Proyecto: Santiago Morales & Asoc. - Gestión de Seguros
-- ==============================================================================
-- Este script crea el usuario 'usuario_prueba' en PostgreSQL con permisos
-- estrictamente de lectura (SELECT) sobre el esquema público y sus tablas.
-- Cualquier intento de INSERT, UPDATE, DELETE o DROP será denegado.
-- ==============================================================================

-- 1. Crear el rol / usuario con contraseña segura (modificar si se desea)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'usuario_prueba') THEN

      CREATE ROLE usuario_prueba WITH LOGIN PASSWORD 'PruebaSeguros2026!';
   ELSE
      ALTER ROLE usuario_prueba WITH PASSWORD 'PruebaSeguros2026!';
   END IF;
END
$do$;

-- 2. Conceder conexión a la base de datos actual
-- (Asegurarse de estar conectado a la base de datos de seguros)
GRANT CONNECT ON DATABASE current_database() TO usuario_prueba;

-- 3. Conceder uso del esquema público
GRANT USAGE ON SCHEMA public TO usuario_prueba;

-- 4. Conceder permiso de SELECT en todas las tablas existentes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO usuario_prueba;

-- 5. Conceder permiso de SELECT en todas las secuencias existentes
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO usuario_prueba;

-- 6. Configurar permisos por defecto para tablas que se creen en el futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO usuario_prueba;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON SEQUENCES TO usuario_prueba;

-- 7. Asegurarse explícitamente de revocar permisos de modificación
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM usuario_prueba;

-- Mensaje de confirmación
DO
$do$
BEGIN
   RAISE NOTICE '✅ Usuario "usuario_prueba" configurado exitosamente con permisos de SOLO LECTURA.';
END
$do$;
