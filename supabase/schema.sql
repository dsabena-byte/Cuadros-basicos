-- ============================================================
-- Tablero CB — Schema Supabase
-- ============================================================
-- Datos sincronizados desde la carpeta de Drive "Tablero CB" vía
-- Apps Script (apps-script/sync-supabase.gs).
--
-- Convenciones:
--   - PRIMARY KEY define la clave natural para hacer upsert.
--   - updated_at se actualiza solo (trigger más abajo).
--   - Strings vienen tal cual del CSV (sin normalizar) — los joins
--     se hacen en SQL.

-- ------------------------------------------------------------
-- Contactos (de Tienda-promotor-supervisor.csv)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contactos (
  numero_tienda   TEXT NOT NULL,
  nombre_tienda   TEXT NOT NULL,
  cadena          TEXT NOT NULL DEFAULT '',
  promotor        TEXT NOT NULL DEFAULT '',
  supervisor      TEXT NOT NULL DEFAULT '',
  email_promotor  TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (numero_tienda, nombre_tienda)
);
CREATE INDEX IF NOT EXISTS idx_contactos_promotor ON contactos (promotor);
CREATE INDEX IF NOT EXISTS idx_contactos_supervisor ON contactos (supervisor);

-- ------------------------------------------------------------
-- Cuadro básico semanal (de XX.csv, donde XX = número de semana)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuadro_basico_semanal (
  semana          SMALLINT NOT NULL,
  tienda          TEXT NOT NULL,
  sku             TEXT NOT NULL,
  cliente         TEXT NOT NULL DEFAULT '',
  division        TEXT NOT NULL DEFAULT '',   -- LAVADO / REFRIGERACION / COCCION
  target_cb       INTEGER NOT NULL DEFAULT 0,
  real_cb         INTEGER NOT NULL DEFAULT 0,
  target_inf      INTEGER NOT NULL DEFAULT 0,
  real_inf        INTEGER NOT NULL DEFAULT 0,
  tipo_sku        TEXT NOT NULL DEFAULT 'Infaltable',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (semana, tienda, sku)
);
CREATE INDEX IF NOT EXISTS idx_cb_cliente ON cuadro_basico_semanal (cliente);
CREATE INDEX IF NOT EXISTS idx_cb_division ON cuadro_basico_semanal (division);

-- ------------------------------------------------------------
-- Floor share (de YYYY-MM_CATEGORIA.csv; futuro: XX_CATEGORIA.csv)
-- ------------------------------------------------------------
-- `periodo` guarda "YYYY-MM" (mensual) o "YYYY-Www" (semanal).
-- `semana` queda NULL si el archivo es mensual; se completa cuando se
-- migre al formato semanal.
CREATE TABLE IF NOT EXISTS floor_share (
  periodo         TEXT NOT NULL,
  semana          SMALLINT,
  categoria       TEXT NOT NULL,
  numero_tienda   TEXT NOT NULL,
  nombre_tienda   TEXT NOT NULL DEFAULT '',
  marca           TEXT NOT NULL,
  unidades        INTEGER NOT NULL DEFAULT 0,
  pct_raw         NUMERIC(8, 5),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (periodo, categoria, numero_tienda, nombre_tienda, marca)
);
CREATE INDEX IF NOT EXISTS idx_fs_categoria ON floor_share (categoria);
CREATE INDEX IF NOT EXISTS idx_fs_semana ON floor_share (semana);

-- ------------------------------------------------------------
-- Sync status (lo escribe el Apps Script para saber qué ya procesó)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_status (
  filename        TEXT PRIMARY KEY,
  drive_id        TEXT NOT NULL,
  drive_modified  TIMESTAMPTZ NOT NULL,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  rows_processed  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ok',
  error_msg       TEXT
);

-- ------------------------------------------------------------
-- Trigger: updated_at automático en cada UPDATE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contactos_updated') THEN
    CREATE TRIGGER trg_contactos_updated BEFORE UPDATE ON contactos
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cb_updated') THEN
    CREATE TRIGGER trg_cb_updated BEFORE UPDATE ON cuadro_basico_semanal
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fs_updated') THEN
    CREATE TRIGGER trg_fs_updated BEFORE UPDATE ON floor_share
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
