-- Copy of ref.job_type from altair_demo into bag_demo (structure + data).
-- Reference lookup: occupation code (kode) -> description (deskripsi) + category
-- (kategori). Used to map numeric/coded occupations to readable labels.
--
-- Run against database: bag_demo
-- Data is loaded separately (see _copy script); this file defines the structure.

CREATE SCHEMA IF NOT EXISTS ref;

CREATE TABLE IF NOT EXISTS ref.job_type (
    id        integer NOT NULL PRIMARY KEY,
    kode      integer NOT NULL,
    deskripsi text    NOT NULL,
    kategori  text
);

CREATE INDEX IF NOT EXISTS idx_ref_job_type_kode ON ref.job_type (kode);
