-- =========================================================
-- 1) Extensions in default DB (postgres)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- 2) Create role if not exists
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'odoo18') THEN
    CREATE ROLE odoo18 WITH LOGIN PASSWORD 'odoo18' SUPERUSER;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'datauniverse_user') THEN
    CREATE ROLE datauniverse_user WITH LOGIN PASSWORD 'datauniverse_user' SUPERUSER;
  END IF;
END
$$;

-- =========================================================
-- 3) Create databases (NOT inside DO block)
-- =========================================================

-- Create odoo_db if not exists
SELECT 'CREATE DATABASE odoo_db OWNER odoo18'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'odoo_db')\gexec

-- Create ETL database (change name here if you want)
SELECT 'CREATE DATABASE datauniverse_db OWNER datauniverse_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'datauniverse_db')\gexec


-- =========================================================
-- 4) Enable extensions inside odoo_db
-- =========================================================
\connect odoo_db
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- 5) Enable extensions inside ETL DB
-- =========================================================
\connect datauniverse_db
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;
