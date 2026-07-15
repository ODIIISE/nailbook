-- Cleanup: Drop unused tables from initial schema
-- sessions table: app uses HMAC-signed cookies instead
-- audit_logs table: app uses activity_logs instead (migration 004)

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS audit_logs;
