-- =============================================================================
-- ods.mv_cluster  (MATERIALIZED VIEW) — source fix
--
-- The live definition of ods.mv_cluster still read from the DEPRECATED backup
-- tables segmentation.cluster_result_old and churn.churn_result_old. This
-- redefines it to read from the current tables (segmentation.cluster_result,
-- churn.churn_result) instead. All columns used exist identically in the
-- current tables (verified), so the shape is unchanged.
--
-- One flat row per customer: all cluster_result columns + churn_proba (latest
-- per customer from churn_result) + branch_code (from ods.h).
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS ods.mv_cluster;

CREATE MATERIALIZED VIEW ods.mv_cluster AS
SELECT c.customer_id,
    c.usia, c.gender, c.province, c.city, c.customer_type, c.status_mb,
    c.aktif_di_bank, c.channel_dominan, c.state, c.nama_state,
    c.status_transaksi, c.status_retensi, c.jalur_strategi, c.eks_nasabah,
    c.jumlah_akun_aktif, c.jumlah_akun_tutup, c.jumlah_produk_aktif,
    c.jumlah_produk_tutup, c.jumlah_jenis_produk, c.punya_tabungan,
    c.punya_giro, c.punya_deposito, c.punya_kredit, c.punya_kartu,
    c.saldo_total, c.saldo_tabungan, c.saldo_deposito, c.outstanding_kredit,
    c.tren_saldo, c.kolektibilitas_terburuk, c.avg_trx_bln, c.n_trx_mb,
    c.hari_sejak_trx_mb_terakhir, c.pintu_masuk, c.pintu_masuk_terbukti,
    c.needs_cluster, c.persona, c.mb_archetype, c.archetype_persona,
    c.archetype_peran, c.peran_nasabah, c.archetype_recommendation_type,
    c.archetype_retensi, c.tipe_inactive, c.prioritas_reaktivasi,
    c.aksi_reaktivasi_personal, c.aksi_utama, c.tier, c.cross_sell,
    c.strategi_marketing, c.aksi_mb_growth, c.aksi_personal, c.risk_level,
    c.recommendation_type, c.alasan, c.rec_produk_mode,
    c.recommended_banking_product_1, c.recommended_banking_product_2,
    c.recommended_banking_product_3, c.rec_layanan_mode,
    c.recommended_transaction_service_1, c.recommended_transaction_service_2,
    c.recommended_transaction_service_3, c.rec_basis_cluster, c.rec_reason,
    c.banking_products_used, c.transaction_services_used,
    c.akuisisi_strategi_human_cluster, c.akuisisi_strategi_special_cluster,
    c.akuisisi_strategi_human_nasabah, c.akuisisi_strategi_special_nasabah,
    c.akuisisi_jalur_disarankan, c.retensi_strategi_human_cluster,
    c.retensi_strategi_special_cluster, c.retensi_strategi_human_nasabah,
    c.retensi_strategi_special_nasabah, c.retensi_jalur_disarankan,
    ch.churn_proba,
    f.branch_code
FROM segmentation.cluster_result c
LEFT JOIN (
    SELECT DISTINCT ON (churn_result.customer_id)
           churn_result.customer_id, churn_result.churn_proba
    FROM churn.churn_result
    ORDER BY churn_result.customer_id
) ch ON ch.customer_id = c.customer_id
LEFT JOIN (
    SELECT DISTINCT ON (h.customer_id) h.customer_id, h.branch_code
    FROM ods.h
    ORDER BY h.customer_id
) f ON f.customer_id::text = c.customer_id;
