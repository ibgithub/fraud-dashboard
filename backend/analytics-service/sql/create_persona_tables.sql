-- ============================================================
-- New reference tables in altair_demo (schema: segmentation).
--   segmentation.cluster_persona   <- 03_model1_cluster_persona_strategi.csv
--   segmentation.archetype_persona <- 06_model2_archetype_persona_retensi.csv
--
-- These are NEW tables. Plain CREATE TABLE (NOT "IF NOT EXISTS") so the
-- script fails safely if a table with the same name already exists — it must
-- never drop/alter/overwrite existing tables.
--
-- Data is loaded separately with psql \copy (handles multiline quoted CSV).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS segmentation;

-- ---- Model 1: cluster persona + marketing strategy (4 rows) ----
CREATE TABLE segmentation.cluster_persona (
    cluster_id            INTEGER,
    nama_persona          TEXT,
    fokus_akuisisi        BOOLEAN,
    recommendation_type   TEXT,
    total_customers       INTEGER,
    avg_usia              NUMERIC,
    pct_non_mb            NUMERIC,
    pct_active_mb         NUMERIC,
    pct_inactive_mb       NUMERIC,
    kuadran               TEXT,
    tingkat_retensi       NUMERIC,
    karakteristik         TEXT,
    strategi_marketing    TEXT,
    cross_sell            TEXT,
    aksi_mb_growth        TEXT,
    risk_level            TEXT,
    nama_persona_en       TEXT,
    karakteristik_en      TEXT,
    strategi_marketing_en TEXT,
    cross_sell_en         TEXT,
    aksi_mb_growth_en     TEXT,
    sumber                TEXT,
    pengelompokan         TEXT,
    total_customers_prof  INTEGER,
    avg_saldo_tabungan    NUMERIC,
    avg_saldo_deposito    NUMERIC,
    avg_jumlah_produk     NUMERIC
);

-- ---- Model 2: MB archetype persona + retention (5 rows) ----
CREATE TABLE segmentation.archetype_persona (
    mb_archetype          INTEGER,
    nama_persona          TEXT,
    total_customers       INTEGER,
    tingkat_retensi       NUMERIC,
    peran                 TEXT,
    recommendation_type   TEXT,
    archetype_terbaik     BOOLEAN,
    prioritas             TEXT,
    karakteristik         TEXT,
    strategi_retensi      TEXT,
    cross_sell            TEXT,
    pintu_masuk_kebiasaan TEXT,
    nama_persona_en       TEXT,
    karakteristik_en      TEXT,
    strategi_retensi_en   TEXT,
    cross_sell_en         TEXT,
    pintu_masuk_kebiasaan_en TEXT,
    sumber                TEXT,
    pengelompokan         TEXT,
    ukuran                INTEGER,
    n_bertahan            INTEGER,
    n_berhenti            INTEGER,
    n_at_risk             INTEGER,
    tingkat_retensi_ret   NUMERIC,
    archetype_terbaik_ret BOOLEAN,
    avg_bulan_aktif       NUMERIC,
    avg_trx_per_bulan     NUMERIC,
    avg_porsi_mb          NUMERIC,
    avg_breadth           NUMERIC,
    avg_recency_hari      NUMERIC,
    avg_tren              NUMERIC,
    avg_failed_ratio      NUMERIC,
    freq_bayar_tagihan    NUMERIC,
    freq_kirim_uang       NUMERIC
);
