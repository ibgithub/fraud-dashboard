-- =============================================================================
-- segmentation.cluster_result_aggregate  (MATERIALIZED VIEW)
-- Same 27-column shape as segmentation.cluster_persona, but the 5 personas are
-- derived by aggregating segmentation.cluster_result per needs_cluster over the
-- NON-DORMANT population (joined to ods.mv_h). cluster_persona is considered
-- invalid for this bank; this MV replaces it with the needs_cluster view.
--
-- Mapping from cluster_result (per needs_cluster, non-dormant):
--   cluster_id          <- needs_cluster
--   nama_persona        <- mode(persona)                        (non-empty)
--   recommendation_type <- mode(archetype_recommendation_type)  (real source;
--                           plain recommendation_type col is '-'/empty)
--   strategi_marketing  <- mode(jalur_strategi)                 (real source;
--                           plain strategi_marketing col is '-'/empty)
--   total_customers     <- COUNT(*)
--   avg_usia / avg_saldo_tabungan / avg_saldo_deposito / avg_jumlah_produk <- averages
--   pct_non_mb / pct_active_mb / pct_inactive_mb <- share of status_mb tokens
--     (status_mb values: non_mb | active_mb | inactive_mb)
--   cross_sell / aksi_mb_growth / risk_level <- mode()
--   karakteristik       <- mode(alasan)
--   sumber='cluster_result', pengelompokan='needs'
--
-- Unmapped columns (no reliable source) are explicit typed NULLs:
--   fokus_akuisisi(bool), kuadran(text), tingkat_retensi(numeric),
--   nama_persona_en, karakteristik_en, strategi_marketing_en, cross_sell_en,
--   aksi_mb_growth_en (text), total_customers_prof(int).
--
-- Two extra columns beyond the cluster_persona shape, for strategy routing on
-- the Characteristics page:
--   jalur_strategi        <- mode(cluster_result.jalur_strategi)
--                            ('Model 1 (akuisisi)' | 'Model 2 (retensi/pertahankan)')
--   mb_archetype_dominan  <- mode(cluster_result.mb_archetype)  (for retensi join)
--
-- Refresh after cluster_result / ods.mv_h refresh:
--   REFRESH MATERIALIZED VIEW segmentation.cluster_result_aggregate;
-- =============================================================================

-- Drop whichever object exists (was a TABLE in the first version, now a MV).
DROP TABLE IF EXISTS segmentation.cluster_result_aggregate;
DROP MATERIALIZED VIEW IF EXISTS segmentation.cluster_result_aggregate;

-- English persona names are mapped explicitly from the Indonesian nama_persona
-- (see the CASE on nama_persona_en below). The previous source
-- ods.mv_segment_demographics.segment_name_en was mismatched.
CREATE MATERIALIZED VIEW segmentation.cluster_result_aggregate AS
SELECT
  cr.needs_cluster::int                                                        AS cluster_id,
  mode() WITHIN GROUP (ORDER BY cr.persona)
    FILTER (WHERE cr.persona IS NOT NULL AND btrim(cr.persona) <> '')           AS nama_persona,
  NULL::boolean                                                                AS fokus_akuisisi,
  mode() WITHIN GROUP (ORDER BY cr.archetype_recommendation_type)
    FILTER (WHERE cr.archetype_recommendation_type IS NOT NULL
                  AND btrim(cr.archetype_recommendation_type) <> ''
                  AND cr.archetype_recommendation_type <> '-')                  AS recommendation_type,
  COUNT(*)::int                                                                AS total_customers,
  round(avg(cr.usia)::numeric, 1)                                              AS avg_usia,
  round(avg( (cr.status_mb = 'non_mb')::int )::numeric, 3)                      AS pct_non_mb,
  round(avg( (cr.status_mb = 'active_mb')::int )::numeric, 3)                   AS pct_active_mb,
  round(avg( (cr.status_mb = 'inactive_mb')::int )::numeric, 3)                 AS pct_inactive_mb,
  NULL::text                                                                   AS kuadran,
  NULL::numeric                                                                AS tingkat_retensi,
  mode() WITHIN GROUP (ORDER BY cr.alasan)
    FILTER (WHERE cr.alasan IS NOT NULL AND btrim(cr.alasan) <> '')             AS karakteristik,
  mode() WITHIN GROUP (ORDER BY cr.jalur_strategi)
    FILTER (WHERE cr.jalur_strategi IS NOT NULL
                  AND btrim(cr.jalur_strategi) <> ''
                  AND cr.jalur_strategi <> '-')                                 AS strategi_marketing,
  mode() WITHIN GROUP (ORDER BY cr.cross_sell)
    FILTER (WHERE cr.cross_sell IS NOT NULL AND cr.cross_sell <> '-')           AS cross_sell,
  mode() WITHIN GROUP (ORDER BY cr.aksi_mb_growth)
    FILTER (WHERE cr.aksi_mb_growth IS NOT NULL AND cr.aksi_mb_growth <> '-')   AS aksi_mb_growth,
  mode() WITHIN GROUP (ORDER BY cr.risk_level)
    FILTER (WHERE cr.risk_level IS NOT NULL)                                    AS risk_level,
  -- English persona name mapped from the Indonesian nama_persona (mode of
  -- cr.persona). The old ods.mv_segment_demographics.segment_name_en source was
  -- mismatched, so the mapping is maintained explicitly here. Edit the labels
  -- below then rebuild the MV.
  (CASE mode() WITHIN GROUP (ORDER BY cr.persona)
                 FILTER (WHERE cr.persona IS NOT NULL AND btrim(cr.persona) <> '')
     WHEN 'Rekening Dasar Pasif'       THEN 'Passive Basic Account Holders'
     WHEN 'Pengirim Uang Aktif'        THEN 'Active Money Transfer Users'
     WHEN 'Nasabah Digital Aktif'      THEN 'Active Digital Customers'
     WHEN 'Nasabah Kredit Multiproduk' THEN 'Multiproduct Credit Customers'
     WHEN 'Deposan Bernilai Tinggi'    THEN 'High-Value Depositors'
     ELSE NULL
   END)::text                                                                  AS nama_persona_en,
  -- English Key Characteristic, hardcoded per cluster (no EN source in
  -- cluster_result). Edit the text here then rebuild the MV. Keep ';' as the
  -- bullet separator (the UI splits Key Characteristic on ';').
  (CASE cr.needs_cluster::int
     WHEN 0 THEN 'Not yet using Mobile Banking but still transacts regularly at the bank; money-transfer needs can be the easiest entry point to MB; profile resembles customers who stay on MB -> invite activation'
     WHEN 1 THEN 'Active MB user - retain & deepen usage; encourage more money transfers via MB'
     WHEN 2 THEN 'Active MB user - retain & deepen usage; encourage more money transfers via MB'
     WHEN 3 THEN 'Not yet using Mobile Banking but still transacts regularly at the bank; money-transfer needs can be the easiest entry point to MB; profile resembles customers who stay on MB -> invite activation'
     WHEN 4 THEN 'Not yet using Mobile Banking but still transacts regularly at the bank; profile resembles customers who stay on MB -> invite activation'
     ELSE NULL
   END)::text                                                                  AS karakteristik_en,
  NULL::text                                                                   AS strategi_marketing_en,
  NULL::text                                                                   AS cross_sell_en,
  NULL::text                                                                   AS aksi_mb_growth_en,
  'cluster_result'::text                                                       AS sumber,
  'needs'::text                                                                AS pengelompokan,
  NULL::int                                                                    AS total_customers_prof,
  round(avg(cr.saldo_tabungan)::numeric, 0)                                    AS avg_saldo_tabungan,
  round(avg(cr.saldo_deposito)::numeric, 0)                                    AS avg_saldo_deposito,
  round(avg(cr.jumlah_jenis_produk)::numeric, 2)                               AS avg_jumlah_produk,
  -- Strategy routing: which path (Model 1 akuisisi / Model 2 retensi) and, for
  -- retensi clusters, the dominant mb_archetype used to pick the retensi row.
  mode() WITHIN GROUP (ORDER BY cr.jalur_strategi)
    FILTER (WHERE btrim(coalesce(cr.jalur_strategi,'')) <> '')                  AS jalur_strategi,
  mode() WITHIN GROUP (ORDER BY cr.mb_archetype)
    FILTER (WHERE cr.mb_archetype IS NOT NULL)                                  AS mb_archetype_dominan
FROM segmentation.cluster_result cr
JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
WHERE cr.needs_cluster IS NOT NULL
  AND lower(btrim(m.status_nasabah)) <> 'dormant'
GROUP BY cr.needs_cluster
ORDER BY cr.needs_cluster;
