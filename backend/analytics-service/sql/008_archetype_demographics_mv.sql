-- =============================================================================
-- ods.mv_archetype_demographics  (MATERIALIZED VIEW)
-- Retention-side demographics, mirror of ods.mv_segment_demographics but grouped
-- by cluster_result.mb_archetype (0..4) instead of needs_cluster. Powers the
-- Retention tab of the Demographics section on /segmentation/overview.
--
-- Same metrics (age_bucket, age_stats, gender, marital, occupation, education,
-- province), Dormant excluded. Segment names = the 5 retention archetypes.
--
-- Refresh after cluster_result / ods.mv_h refresh (added to pg_cron job).
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS ods.mv_archetype_demographics;

CREATE MATERIALIZED VIEW ods.mv_archetype_demographics AS
 WITH joined AS (
         SELECT cr.customer_id,
            cr.mb_archetype::integer AS segment,
            cr.usia,
            NULLIF(btrim(cr.gender), ''::text) AS gender,
            NULLIF(btrim(cr.province), ''::text) AS province,
            NULLIF(btrim(h.marital_status::text), ''::text) AS marital_status,
            NULLIF(btrim(h.occupation::text), ''::text) AS occupation,
            h.educational_level
           FROM segmentation.cluster_result cr
             JOIN ods.h h ON h.customer_id::text = cr.customer_id
             JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
          WHERE cr.mb_archetype IS NOT NULL AND lower(btrim(m.status_nasabah)) <> 'dormant'::text
        ), seg_name AS (
         SELECT t.segment,
            t.name_id,
            t.name_en
           FROM ( VALUES (0,'Pengguna Rutin Ringan'::text,'Light Routine User'::text), (1,'Pengguna Super Aktif'::text,'Super Active User'::text), (2,'Pengguna Mulai Memudar'::text,'Starting-to-Fade User'::text), (3,'Pengguna Rutin Sesekali'::text,'Occasional Routine User'::text), (4,'Pengguna Aktif Reguler Bernilai'::text,'Regular Active User (High-Value)'::text)) t(segment, name_id, name_en)
        ), occ_rank AS (
         SELECT joined.segment,
            joined.occupation,
            count(*) AS cnt,
            row_number() OVER (PARTITION BY joined.segment ORDER BY (count(*)) DESC) AS rnk
           FROM joined
          WHERE joined.occupation IS NOT NULL
          GROUP BY joined.segment, joined.occupation
        ), prov_rank AS (
         SELECT joined.segment,
            joined.province,
            count(*) AS cnt,
            row_number() OVER (PARTITION BY joined.segment ORDER BY (count(*)) DESC) AS rnk
           FROM joined
          WHERE joined.province IS NOT NULL
          GROUP BY joined.segment, joined.province
        ), rows AS (
         SELECT b.segment,
            'age_bucket'::text AS metric,
            b.bucket AS key,
            b.bucket AS label_id,
            b.bucket AS label_en,
            b.cnt,
            b.so AS sort_order,
            NULL::numeric AS stat_value
           FROM ( SELECT joined.segment,
                        CASE
                            WHEN joined.usia >= 17 AND joined.usia <= 24 THEN '17-24'::text
                            WHEN joined.usia >= 25 AND joined.usia <= 34 THEN '25-34'::text
                            WHEN joined.usia >= 35 AND joined.usia <= 44 THEN '35-44'::text
                            WHEN joined.usia >= 45 AND joined.usia <= 54 THEN '45-54'::text
                            WHEN joined.usia >= 55 AND joined.usia <= 64 THEN '55-64'::text
                            ELSE '65+'::text
                        END AS bucket,
                    count(*) AS cnt,
                    min(
                        CASE
                            WHEN joined.usia >= 17 AND joined.usia <= 24 THEN 0
                            WHEN joined.usia >= 25 AND joined.usia <= 34 THEN 1
                            WHEN joined.usia >= 35 AND joined.usia <= 44 THEN 2
                            WHEN joined.usia >= 45 AND joined.usia <= 54 THEN 3
                            WHEN joined.usia >= 55 AND joined.usia <= 64 THEN 4
                            ELSE 5
                        END) AS so
                   FROM joined
                  WHERE joined.usia >= 17 AND joined.usia <= 100
                  GROUP BY joined.segment, (
                        CASE
                            WHEN joined.usia >= 17 AND joined.usia <= 24 THEN '17-24'::text
                            WHEN joined.usia >= 25 AND joined.usia <= 34 THEN '25-34'::text
                            WHEN joined.usia >= 35 AND joined.usia <= 44 THEN '35-44'::text
                            WHEN joined.usia >= 45 AND joined.usia <= 54 THEN '45-54'::text
                            WHEN joined.usia >= 55 AND joined.usia <= 64 THEN '55-64'::text
                            ELSE '65+'::text
                        END)) b
        UNION ALL
         SELECT joined.segment,
            'age_stats'::text,
            'avg'::text,
            'Rata-rata Usia'::text,
            'Average Age'::text,
            count(*) AS count,
            0,
            round(avg(joined.usia), 1) AS round
           FROM joined
          WHERE joined.usia >= 17 AND joined.usia <= 100
          GROUP BY joined.segment
        UNION ALL
         SELECT joined.segment,
            'age_stats'::text,
            'min'::text,
            'Usia Termuda'::text,
            'Youngest Age'::text,
            count(*) AS count,
            1,
            min(joined.usia)::numeric AS min
           FROM joined
          WHERE joined.usia >= 17 AND joined.usia <= 100
          GROUP BY joined.segment
        UNION ALL
         SELECT joined.segment,
            'age_stats'::text,
            'max'::text,
            'Usia Tertua'::text,
            'Oldest Age'::text,
            count(*) AS count,
            2,
            max(joined.usia)::numeric AS max
           FROM joined
          WHERE joined.usia >= 17 AND joined.usia <= 100
          GROUP BY joined.segment
        UNION ALL
         SELECT joined.segment,
            'gender'::text,
            joined.gender,
                CASE joined.gender
                    WHEN 'MALE'::text THEN 'Laki-laki'::text
                    WHEN 'FEMALE'::text THEN 'Perempuan'::text
                    ELSE joined.gender
                END AS gender,
                CASE joined.gender
                    WHEN 'MALE'::text THEN 'Male'::text
                    WHEN 'FEMALE'::text THEN 'Female'::text
                    ELSE joined.gender
                END AS gender,
            count(*) AS count,
                CASE joined.gender
                    WHEN 'MALE'::text THEN 0
                    WHEN 'FEMALE'::text THEN 1
                    ELSE 2
                END AS "case",
            NULL::numeric AS "numeric"
           FROM joined
          WHERE joined.gender IS NOT NULL
          GROUP BY joined.segment, joined.gender
        UNION ALL
         SELECT joined.segment,
            'marital'::text,
            joined.marital_status,
                CASE joined.marital_status
                    WHEN 'SINGLE'::text THEN 'Lajang'::text
                    WHEN 'MARRIED'::text THEN 'Menikah'::text
                    WHEN 'DIVORCED'::text THEN 'Cerai'::text
                    WHEN 'WIDOWED'::text THEN 'Janda/Duda'::text
                    WHEN 'PARTNER'::text THEN 'Pasangan'::text
                    WHEN 'OTHER'::text THEN 'Lainnya'::text
                    ELSE initcap(lower(joined.marital_status))
                END AS initcap,
                CASE joined.marital_status
                    WHEN 'SINGLE'::text THEN 'Single'::text
                    WHEN 'MARRIED'::text THEN 'Married'::text
                    WHEN 'DIVORCED'::text THEN 'Divorced'::text
                    WHEN 'WIDOWED'::text THEN 'Widowed'::text
                    WHEN 'PARTNER'::text THEN 'Partner'::text
                    WHEN 'OTHER'::text THEN 'Other'::text
                    ELSE initcap(lower(joined.marital_status))
                END AS initcap,
            count(*) AS count,
                CASE joined.marital_status
                    WHEN 'SINGLE'::text THEN 0
                    WHEN 'MARRIED'::text THEN 1
                    WHEN 'DIVORCED'::text THEN 2
                    WHEN 'WIDOWED'::text THEN 3
                    WHEN 'PARTNER'::text THEN 4
                    ELSE 9
                END AS "case",
            NULL::numeric AS "numeric"
           FROM joined
          WHERE joined.marital_status IS NOT NULL
          GROUP BY joined.segment, joined.marital_status
        UNION ALL
         SELECT occ_rank.segment,
            'occupation'::text,
            occ_rank.occupation,
            occ_rank.occupation,
            occ_rank.occupation,
            occ_rank.cnt,
            (occ_rank.rnk - 1)::integer AS int4,
            NULL::numeric AS "numeric"
           FROM occ_rank
          WHERE occ_rank.rnk <= 10
        UNION ALL
         SELECT occ_rank.segment,
            'occupation'::text,
            'OTHERS'::text,
            'Lainnya'::text,
            'Others'::text,
            sum(occ_rank.cnt) AS sum,
            99,
            NULL::numeric AS "numeric"
           FROM occ_rank
          WHERE occ_rank.rnk > 10
          GROUP BY occ_rank.segment
        UNION ALL
         SELECT joined.segment,
            'education'::text,
            joined.educational_level::text AS educational_level,
            'Kode '::text || joined.educational_level::text,
            'Code '::text || joined.educational_level::text,
            count(*) AS count,
            joined.educational_level,
            NULL::numeric AS "numeric"
           FROM joined
          WHERE joined.educational_level IS NOT NULL
          GROUP BY joined.segment, joined.educational_level
        UNION ALL
         SELECT prov_rank.segment,
            'province'::text,
            prov_rank.province,
            prov_rank.province,
            prov_rank.province,
            prov_rank.cnt,
            (prov_rank.rnk - 1)::integer AS int4,
            NULL::numeric AS "numeric"
           FROM prov_rank
          WHERE prov_rank.rnk <= 10
        UNION ALL
         SELECT prov_rank.segment,
            'province'::text,
            'OTHERS'::text,
            'Lainnya'::text,
            'Others'::text,
            sum(prov_rank.cnt) AS sum,
            99,
            NULL::numeric AS "numeric"
           FROM prov_rank
          WHERE prov_rank.rnk > 10
          GROUP BY prov_rank.segment
        )
 SELECT r.segment,
    sn.name_id AS segment_name,
    sn.name_en AS segment_name_en,
    r.metric,
    r.key,
    r.label_id,
    r.label_en,
    r.cnt,
    r.sort_order,
    r.stat_value
   FROM rows r
     JOIN seg_name sn ON sn.segment = r.segment;

CREATE INDEX IF NOT EXISTS idx_mv_archetype_demographics_seg_metric
  ON ods.mv_archetype_demographics (segment, metric, sort_order);
