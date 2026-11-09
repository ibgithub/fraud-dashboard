package com.ib.auth.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Customer Matrix pilot - reads from the NEW bag_demo database (ods.mv_h +
 * ods.trb_score) via the secondary {@code bagDemoJdbcTemplate}. Read-only.
 *
 * Mapping from bag_demo:
 *   - Churn  : ods.mv_h.kc        (churn probability, percentage 0..100)
 *   - TRB    : ods.trb_score.trb  (raw IDR; joined by cif = customer_id)
 *   - Activity: ods.mv_h.status_nasabah ('Active' / 'Inactive')
 *
 * Tier cutoffs (Hi/Med/Lo) are computed by percentile so the 3x3 distribution
 * is balanced regardless of the raw value ranges. Returns an empty map when the
 * table is missing/empty so the UI can show an "In Progress" state.
 */
@Repository
public class BagMatrixRepository {

    private final JdbcTemplate bag;

    public BagMatrixRepository(@Qualifier("bagDemoJdbcTemplate") JdbcTemplate bagDemoJdbcTemplate) {
        this.bag = bagDemoJdbcTemplate;
    }

    /**
     * Ready only when there is REAL TRB data to tier by: at least one mv_h
     * customer that also has a row in ods.trb_score. If no customer has TRB,
     * the matrix would be meaningless, so we report not-ready (UI shows "In
     * Progress") instead of showing zero-filled tiers.
     */
    public boolean isReady() {
        try {
            // Pre-computed matrix tables drive the UI now. Ready when the churn
            // matrix has at least one row.
            Integer n = bag.queryForObject(
                "SELECT COUNT(*) FROM ods.churn_data_matrix", Integer.class);
            return n != null && n > 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 3x3 Churn x TRB counts keyed "trbTier_churnTier" (e.g. "hi_hi", "lo_med")
     * to match the frontend's existing cell keys. churnPct cutoffs are the
     * top-X% percentiles of kc; TRB cutoffs the top-X% percentiles of trb.
     */
    public Map<String, Integer> churnTrbDistribution(int churnHiPct, int churnMedPct,
                                                      int trbHiPct, int trbMedPct) {
        Map<String, Integer> out = new HashMap<>();
        try {
            // Read the pre-computed Churn x TRB matrix (fast GROUP BY). The pct
            // params are kept only for API backward-compat (tiers are already
            // baked into churn_data_matrix). Key = "<trbTier>_<churnTier>".
            String sql =
                "SELECT trb_category, churn_category, COUNT(*) AS cnt " +
                "FROM ods.churn_data_matrix " +
                "WHERE trb_category IS NOT NULL AND churn_category IS NOT NULL " +
                "GROUP BY trb_category, churn_category";
            bag.query(sql, (RowCallbackHandler) rs -> {
                String key = rs.getString("trb_category") + "_" + rs.getString("churn_category");
                out.put(key, rs.getInt("cnt"));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Activity x TRB counts as a 3x3 matrix: rows = TRB tier (lo/med/hi),
     * columns = 3 activity-risk segments:
     *   - inactiveCust : status_nasabah = 'Inactive'
     *   - unregMb      : mb = 'N' (never registered Mobile Banking)
     *   - inactiveMb   : mb = 'Y' AND mb_status = 'Inactive' (registered but dormant)
     * A customer may fall into more than one column (segments overlap by design).
     * Keyed "<segment>_<trbTier>", e.g. "inactiveCust_hi", "unregMb_lo".
     *
     * TRB cutoffs are percentiles of the trb>0 population so the tiers line up
     * with the Churn matrix (SUM per cif, positive TRB only).
     */
    public Map<String, Integer> activitySegmentTrbDistribution(int trbHiPct, int trbMedPct) {
        Map<String, Integer> out = new HashMap<>();
        try {
            // Read the pre-computed Activity x TRB matrix (fast GROUP BY).
            // Stored activity_category (inactive_cust/non_mb/inactive_mb) is
            // mapped to the frontend segment keys (inactiveCust/unregMb/inactiveMb).
            // Key = "<segment>_<trbTier>".
            String sql =
                "SELECT activity_category, trb_category, COUNT(*) AS cnt " +
                "FROM ods.activity_data_matrix " +
                "WHERE trb_category IS NOT NULL AND activity_category IS NOT NULL " +
                "GROUP BY activity_category, trb_category";
            bag.query(sql, (RowCallbackHandler) rs -> {
                String seg = mapActivitySegment(rs.getString("activity_category"));
                if (seg == null) return;
                out.put(seg + "_" + rs.getString("trb_category"), rs.getInt("cnt"));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Persist the Churn x TRB cell selection into bag_demo ods.churn_data_matrix.
     * Clears is_selected on all rows, then sets is_selected = TRUE for every row
     * whose matrix_classification is in {@code keys} (e.g. "hi_hi", "lo_med").
     * Returns the number of rows marked selected.
     */
    /**
     * Rebuild ods.churn_data_matrix from the PREDICTED-CHURN population
     * (churn.churn_result where churn_proba > 0.85). churn_category is tiered by
     * churn_proba using the churn distribution (Hi = top churnHiPct%, Med = next
     * churnMedPct%, Lo = rest); trb_category by per-customer SUM(ods.trb_score.trb)
     * using the TRB distribution (Hi/Med/Lo), with no/<=0 TRB -> 'lo'.
     * matrix_classification = '<trb>_<churn>'. Clears is_selected (fresh load).
     * Percent args are 0-100 integers. Returns rows inserted.
     *
     * Uses DELETE (not TRUNCATE) so it works on the pooled bag datasource the
     * same way the is_selected UPDATEs already do.
     */
    public int rebuildChurnDataMatrix(double churnHiPct, double churnMedPct, double trbHiPct, double trbMedPct) {
        double chHi = churnHiPct / 100.0;
        double chMed = churnMedPct / 100.0;
        double trHi = trbHiPct / 100.0;
        double trMed = trbMedPct / 100.0;
        try {
            bag.update("DELETE FROM ods.churn_data_matrix");
            String sql =
                "WITH pred AS ( " +
                "  SELECT c.customer_id AS cif, c.churn_proba, COALESCE(t.trb,0) AS trb " +
                "  FROM churn.churn_result c " +
                "  LEFT JOIN (SELECT cif, SUM(trb) AS trb FROM ods.trb_score GROUP BY cif) t " +
                "         ON t.cif::text = c.customer_id " +
                "  WHERE c.churn_proba > 0.85 " +
                "), " +
                "churn_cut AS ( " +
                "  SELECT PERCENTILE_CONT(1.0 - ?) WITHIN GROUP (ORDER BY churn_proba) AS hi_cut, " +
                "         PERCENTILE_CONT(1.0 - (? + ?)) WITHIN GROUP (ORDER BY churn_proba) AS med_cut " +
                "  FROM pred " +
                "), " +
                "trb_cut AS ( " +
                "  SELECT PERCENTILE_CONT(1.0 - ?) WITHIN GROUP (ORDER BY trb) AS hi_cut, " +
                "         PERCENTILE_CONT(1.0 - (? + ?)) WITHIN GROUP (ORDER BY trb) AS med_cut " +
                "  FROM pred WHERE trb > 0 " +
                ") " +
                "INSERT INTO ods.churn_data_matrix (cif, churn_category, trb_category, matrix_classification, is_selected) " +
                "SELECT p.cif, cc.churn_cat, tc.trb_cat, tc.trb_cat || '_' || cc.churn_cat, false " +
                "FROM pred p CROSS JOIN churn_cut ch CROSS JOIN trb_cut tr " +
                "CROSS JOIN LATERAL ( " +
                "  SELECT CASE WHEN p.churn_proba >= ch.hi_cut THEN 'hi' " +
                "              WHEN p.churn_proba >= ch.med_cut THEN 'med' ELSE 'lo' END AS churn_cat " +
                ") cc " +
                "CROSS JOIN LATERAL ( " +
                "  SELECT CASE WHEN p.trb <= 0 THEN 'lo' " +
                "              WHEN p.trb >= tr.hi_cut THEN 'hi' " +
                "              WHEN p.trb >= tr.med_cut THEN 'med' ELSE 'lo' END AS trb_cat " +
                ") tc";
            return bag.update(sql, chHi, chHi, chMed, trHi, trHi, trMed);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    public int selectChurnCells(java.util.List<String> keys) {
        try {
            bag.update("UPDATE ods.churn_data_matrix SET is_selected = FALSE, updated_ts = NOW() WHERE is_selected = TRUE");
            if (keys == null || keys.isEmpty()) return 0;
            String placeholders = keys.stream().map(k -> "?").collect(java.util.stream.Collectors.joining(","));
            return bag.update(
                "UPDATE ods.churn_data_matrix SET is_selected = TRUE, updated_ts = NOW() " +
                "WHERE matrix_classification IN (" + placeholders + ")",
                keys.toArray());
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * Distinct customer (cif) count across the CURRENTLY-selected cells of BOTH
     * matrices. A cif selected in both the Churn and Activity matrices is counted
     * once (UNION de-duplicates), so this is the true unique-customer total.
     */
    public long selectedCustomerCount() {
        try {
            Long n = bag.queryForObject(
                "SELECT COUNT(*) FROM (" +
                "  SELECT cif FROM ods.churn_data_matrix WHERE is_selected = TRUE " +
                "  UNION " +
                "  SELECT cif FROM ods.activity_data_matrix WHERE is_selected = TRUE" +
                ") u",
                Long.class);
            return n != null ? n : 0L;
        } catch (Exception e) {
            e.printStackTrace();
            return 0L;
        }
    }

    /**
     * STATELESS distinct-customer count for a given selection. churnKeys are
     * churn matrix_classification values ("<trb>_<churn>"); activityKeys are
     * frontend segment keys ("<segment>_<trb>") translated to the stored
     * "<trb>_<activity_category>" form. A cif present in both matrices' selected
     * cells is counted once (UNION). Does NOT read is_selected, so it can't be
     * corrupted by stale persisted state.
     */
    public long countSelectedCustomers(java.util.List<String> churnKeys, java.util.List<String> activityKeys) {
        // Translate activity frontend keys -> stored matrix_classification.
        java.util.List<String> actClass = new java.util.ArrayList<>();
        if (activityKeys != null) {
            for (String k : activityKeys) {
                if (k == null) continue;
                int us = k.lastIndexOf('_');
                if (us <= 0 || us == k.length() - 1) continue;
                String cat = unmapActivitySegment(k.substring(0, us));
                if (cat == null) continue;
                actClass.add(k.substring(us + 1) + "_" + cat);
            }
        }
        boolean hasChurn = churnKeys != null && !churnKeys.isEmpty();
        boolean hasAct = !actClass.isEmpty();
        if (!hasChurn && !hasAct) return 0L;

        try {
            StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM (");
            java.util.List<Object> params = new java.util.ArrayList<>();
            if (hasChurn) {
                sql.append("SELECT cif FROM ods.churn_data_matrix WHERE matrix_classification IN (")
                   .append(placeholders(churnKeys.size())).append(")");
                params.addAll(churnKeys);
            }
            if (hasChurn && hasAct) sql.append(" UNION ");
            if (hasAct) {
                sql.append("SELECT cif FROM ods.activity_data_matrix WHERE matrix_classification IN (")
                   .append(placeholders(actClass.size())).append(")");
                params.addAll(actClass);
            }
            sql.append(") u");
            Long n = bag.queryForObject(sql.toString(), params.toArray(), Long.class);
            return n != null ? n : 0L;
        } catch (Exception e) {
            e.printStackTrace();
            return 0L;
        }
    }

    private static String placeholders(int n) {
        return java.util.stream.IntStream.range(0, n).mapToObj(i -> "?").collect(java.util.stream.Collectors.joining(","));
    }

    /**
     * Selected cells of a matrix with their per-cell row counts, read from the
     * DB (is_selected = TRUE). Returns a list of {classification, count} ordered
     * by count desc. {@code table} is 'churn' or 'activity'.
     */
    public java.util.List<Map<String, Object>> getSelectedCells(String table) {
        String tbl = "activity".equals(table) ? "ods.activity_data_matrix" : "ods.churn_data_matrix";
        java.util.List<Map<String, Object>> out = new java.util.ArrayList<>();
        try {
            bag.query(
                "SELECT matrix_classification AS cls, COUNT(*) AS cnt FROM " + tbl + " " +
                "WHERE is_selected = TRUE AND matrix_classification IS NOT NULL " +
                "GROUP BY matrix_classification ORDER BY cnt DESC",
                (RowCallbackHandler) rs -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("classification", rs.getString("cls"));
                    m.put("count", rs.getLong("cnt"));
                    out.add(m);
                });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /** Distinct matrix_classification values currently selected (for UI restore). */
    public java.util.List<String> getSelectedChurnKeys() {
        try {
            return bag.queryForList(
                "SELECT DISTINCT matrix_classification FROM ods.churn_data_matrix " +
                "WHERE is_selected = TRUE AND matrix_classification IS NOT NULL ORDER BY 1",
                String.class);
        } catch (Exception e) {
            return java.util.List.of();
        }
    }

    // Persona / archetype names (ID + EN) for cluster 0..4. These are loaded from
    // the authoritative persona tables (segmentation.persona_strategi_akuisisi /
    // persona_strategi_retensi) so the Hot Target doughnut, persona-cluster
    // dropdown and Action Plan persona column match the characteristics tabs and
    // the Segmentation Overview page. The hardcoded fallbacks below are only used
    // if the DB lookup fails. Accessed via personaNames() / archetypeNames().
    private static final String[][] PERSONA_NAMES_FALLBACK = {
        {"Rekening Dasar Pasif", "Passive Basic Account Holders"},
        {"Pengirim Uang Aktif", "Active Money Transfer Users"},
        {"Nasabah Digital Aktif", "Active Digital Customers"},
        {"Nasabah Kredit Multiproduk", "Multiproduct Credit Customers"},
        {"Deposan Bernilai Tinggi", "High-Value Depositors"},
    };
    private static final String[][] ARCHETYPE_NAMES_FALLBACK = {
        {"Loyalis Transaksi Ringan", "Loyal Light Transactors"},
        {"Pengguna Super Aktif", "Super Active Users"},
        {"Pengguna Hampir Lepas", "At-Risk Lapsing Users"},
        {"Peminjam Multiproduk Pasif MB", "Multiproduct Borrowers (Low MB Usage)"},
        {"Nasabah Prioritas / Kaya", "Priority / High-Net-Worth Customers"},
    };

    // Cached names loaded from the persona tables (lazy; null until first load).
    private volatile String[][] personaNamesCache;
    private volatile String[][] archetypeNamesCache;

    // Label for the catch-all "-1" bucket (customers without a cluster/archetype).
    private static final String LOW_PRIORITY_ID = "Prioritas Akhir";
    private static final String LOW_PRIORITY_EN = "Low Priority";

    /**
     * Load persona names (ID + EN) for clusters 0..4 from the authoritative
     * persona table. {@code retention} -> persona_strategi_retensi (mb_archetype);
     * else persona_strategi_akuisisi (cluster_id). Falls back to the hardcoded
     * arrays for any slot the table doesn't fill. Cached after first load.
     */
    private String[][] loadNames(boolean retention) {
        String[][] fb = retention ? ARCHETYPE_NAMES_FALLBACK : PERSONA_NAMES_FALLBACK;
        String[][] out = new String[fb.length][2];
        for (int i = 0; i < fb.length; i++) { out[i][0] = fb[i][0]; out[i][1] = fb[i][1]; }
        try {
            String idCol = retention ? "mb_archetype" : "cluster_id";
            String tbl = retention ? "segmentation.persona_strategi_retensi"
                                   : "segmentation.persona_strategi_akuisisi";
            bag.query(
                "SELECT " + idCol + "::int AS id, nama_persona, nama_persona_en FROM " + tbl,
                (RowCallbackHandler) rs -> {
                    int id = rs.getInt("id");
                    if (id >= 0 && id < out.length) {
                        String nm = rs.getString("nama_persona");
                        String nmEn = rs.getString("nama_persona_en");
                        if (nm != null && !nm.trim().isEmpty()) out[id][0] = nm.trim();
                        if (nmEn != null && !nmEn.trim().isEmpty()) out[id][1] = nmEn.trim();
                    }
                });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    private String[][] personaNames() {
        String[][] c = personaNamesCache;
        if (c == null) { c = loadNames(false); personaNamesCache = c; }
        return c;
    }

    private String[][] archetypeNames() {
        String[][] c = archetypeNamesCache;
        if (c == null) { c = loadNames(true); archetypeNamesCache = c; }
        return c;
    }

    private static boolean isRetention(String mode) {
        return "retention".equalsIgnoreCase(mode);
    }

    /**
     * Customer 360 profile for a single CIF, for the Action Plan Template page.
     * Joins segmentation.cluster_result (demographics + products + balance) with
     * ods.mv_h (city). Returns a flat map; null when the CIF is not found.
     */
    public Map<String, Object> getCustomerProfile(String cif) {
        try {
            String sql =
                "SELECT cr.customer_id AS cif, cr.usia, cr.gender, m.city, cr.status_mb, " +
                "       cr.saldo_total, cr.jumlah_produk_aktif, cr.avg_trx_bln, " +
                "       cr.needs_cluster::int AS needs_cluster, cr.mb_archetype::int AS mb_archetype, " +
                "       (cr.punya_tabungan > 0) AS has_tabungan, (cr.punya_giro > 0) AS has_giro, " +
                "       (cr.punya_deposito > 0) AS has_deposito, (cr.punya_kredit > 0) AS has_kredit, " +
                "       COALESCE(cr.punya_kartu, false) AS has_kartu, " +
                "       cr.program_special_terpilih, cr.program_special_terpilih_en, " +
                "       cr.program_human_terpilih, cr.program_human_terpilih_en, " +
                "       cr.alasan_special, cr.alasan_special_en, " +
                "       cr.alasan_human, cr.alasan_human_en, " +
                "       cr.channel_special, cr.channel_special_en, " +
                "       cr.channel_human, cr.channel_human_en, " +
                "       cr.program_special_deskripsi, cr.program_special_deskripsi_en, " +
                "       cr.program_human_deskripsi, cr.program_human_deskripsi_en " +
                "FROM segmentation.cluster_result cr " +
                "LEFT JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id " +
                "WHERE cr.customer_id = ? LIMIT 1";
            java.util.List<Map<String, Object>> rows = bag.query(sql, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("cif", rs.getString("cif"));
                m.put("usia", rs.getObject("usia") != null ? rs.getLong("usia") : null);
                m.put("gender", rs.getString("gender"));
                m.put("kota", rs.getString("city"));
                m.put("statusMb", rs.getString("status_mb"));
                m.put("saldoTotal", rs.getObject("saldo_total") != null ? rs.getDouble("saldo_total") : null);
                m.put("jumlahProduk", rs.getObject("jumlah_produk_aktif") != null ? rs.getLong("jumlah_produk_aktif") : null);
                m.put("rataTrxBln", rs.getObject("avg_trx_bln") != null ? rs.getDouble("avg_trx_bln") : null);
                m.put("needsCluster", rs.getObject("needs_cluster") != null ? rs.getInt("needs_cluster") : null);
                m.put("mbArchetype", rs.getObject("mb_archetype") != null ? rs.getInt("mb_archetype") : null);
                java.util.List<String> products = new java.util.ArrayList<>();
                if (rs.getBoolean("has_tabungan")) products.add("Tabungan");
                if (rs.getBoolean("has_giro")) products.add("Giro");
                if (rs.getBoolean("has_deposito")) products.add("Deposito");
                if (rs.getBoolean("has_kredit")) products.add("Kredit");
                if (rs.getBoolean("has_kartu")) products.add("Kartu");
                m.put("products", products);
                // Business Strategy per CIF, straight from cluster_result:
                //   Special Approach -> program_special_terpilih + alasan_special
                //   Human  Approach  -> program_human_terpilih  + alasan_human
                // EN uses the *_en columns (currently empty -> frontend falls back).
                java.util.List<Map<String, Object>> strat = new java.util.ArrayList<>();
                strat.add(strategyItem("Pendekatan Khusus", "Special Approach",
                    rs.getString("program_special_terpilih"), rs.getString("program_special_terpilih_en"),
                    rs.getString("alasan_special"), rs.getString("alasan_special_en"),
                    rs.getString("channel_special"), rs.getString("channel_special_en"),
                    rs.getString("program_special_deskripsi"), rs.getString("program_special_deskripsi_en")));
                strat.add(strategyItem("Pendekatan Humanis", "Human Approach",
                    rs.getString("program_human_terpilih"), rs.getString("program_human_terpilih_en"),
                    rs.getString("alasan_human"), rs.getString("alasan_human_en"),
                    rs.getString("channel_human"), rs.getString("channel_human_en"),
                    rs.getString("program_human_deskripsi"), rs.getString("program_human_deskripsi_en")));
                m.put("strategies", strat);
                return m;
            }, cif);
            if (rows.isEmpty()) return null;
            Map<String, Object> profile = rows.get(0);
            return profile;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * One Business-Strategy item for a CIF: a chosen program plus its reason,
     * each in ID and EN. {@code program}/{@code alasan} come from cluster_result
     * (program_*_terpilih / alasan_*); the *_en variants are used when the UI is
     * in English (currently empty -> the frontend falls back to the ID text).
     */
    private static Map<String, Object> strategyItem(String label, String labelEn,
                                                     String program, String programEn,
                                                     String alasan, String alasanEn,
                                                     String channel, String channelEn,
                                                     String programDesc, String programDescEn) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("labelEn", labelEn);
        m.put("program", program);
        m.put("programEn", programEn);
        m.put("alasan", alasan);
        m.put("alasanEn", alasanEn);
        m.put("channel", channel);
        m.put("channelEn", channelEn);
        m.put("programDesc", programDesc);
        m.put("programDescEn", programDescEn);
        return m;
    }

    /** Keep the first {@code n} sentences of a paragraph (split on '. '). */
    private static String trimSentences(String text, int n) {
        if (text == null || text.isBlank()) return text;
        String[] parts = text.split("(?<=\\.)\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(n, parts.length); i++) {
            if (i > 0) sb.append(' ');
            sb.append(parts[i].trim());
        }
        return sb.toString();
    }

    /**
     * Persona cluster options for the promo-engine dropdown (bag-driven).
     * mode = "retention" returns the mb_archetype personas; otherwise the
     * acquisition needs_cluster personas. Both append a "-1" Low Priority bucket.
     */
    public java.util.List<Map<String, Object>> getPersonaOptions(String mode) {
        String[][] names = isRetention(mode) ? archetypeNames() : personaNames();
        java.util.List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("value", String.valueOf(i));
            m.put("nameId", names[i][0]);
            m.put("nameEn", names[i][1]);
            out.add(m);
        }
        Map<String, Object> low = new LinkedHashMap<>();
        low.put("value", "-1");
        low.put("nameId", LOW_PRIORITY_ID);
        low.put("nameEn", LOW_PRIORITY_EN);
        out.add(low);
        return out;
    }

    /**
     * Paginated list of the SELECTED customers (is_selected in either bag matrix),
     * for the Action Plan Detail (promo-engine) page. One row per distinct cif.
     * Columns: cif, churnIndex, trbCategory, trb, personaCluster (needs_cluster
     * or -1), personaName (ID/EN by lang), action (from tingkat_risiko).
     *
     * personaFilter: null/"all" = all; "0".."4" = that needs_cluster; "-1" =
     * unsegmented. search = CIF substring.
     */
    public Map<String, Object> getSelectedCustomerList(int page, int size, String personaFilter,
                                                       String search, String lang, String mode, String branch) {
        Map<String, Object> result = new LinkedHashMap<>();
        java.util.List<Map<String, Object>> items = new java.util.ArrayList<>();
        boolean en = "en".equalsIgnoreCase(lang);
        boolean retention = isRetention(mode);
        // Everything is pre-joined per CIF in ods.mv_selected_customer_list (see
        // sql/011_selected_customer_list_mv.sql). Acquisition groups by
        // needs_cluster, retention by mb_archetype; the matching precomputed
        // action column (action_acq / action_ret) is picked per mode. Persona
        // names are still mapped in Java from the raw cluster id.
        String clusterCol = retention ? "mb_archetype" : "needs_cluster";
        String actionCol  = retention ? "action_ret"   : "action_acq";
        String[][] names = retention ? archetypeNames() : personaNames();
        try {
            StringBuilder where = new StringBuilder(" WHERE 1=1 ");
            java.util.List<Object> params = new java.util.ArrayList<>();
            if (personaFilter != null && !personaFilter.isBlank() && !"all".equalsIgnoreCase(personaFilter)) {
                where.append(" AND COALESCE(" + clusterCol + ",-1) = ? ");
                params.add(Integer.parseInt(personaFilter.trim()));
            }
            if (search != null && !search.isBlank()) {
                where.append(" AND cif LIKE ? ");
                params.add("%" + search.trim() + "%");
            }
            if (branch != null && !branch.isBlank() && !"all".equalsIgnoreCase(branch)) {
                where.append(" AND branch_code = ? ");
                params.add(branch.trim());
            }

            String base =
                "SELECT cif, churn_idx, trb_category, trb, " +
                "  COALESCE(" + clusterCol + ",-1) AS persona_cluster, " +
                "  " + actionCol + " AS action, " +
                "  branch_code AS branch_name " +
                "FROM ods.mv_selected_customer_list ";

            String countSql = "SELECT COUNT(*) FROM (" + base + where + ") q";
            Long total = bag.queryForObject(countSql, params.toArray(), Long.class);
            long totalElements = total != null ? total : 0L;

            int offset = page * size;
            String dataSql = base + where +
                " ORDER BY churn_index_raw DESC NULLS LAST, cif LIMIT ? OFFSET ? ";
            java.util.List<Object> dp = new java.util.ArrayList<>(params);
            dp.add(size); dp.add(offset);

            bag.query(dataSql, dp.toArray(), (RowCallbackHandler) rs -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("cif", rs.getString("cif"));
                Object ci = rs.getObject("churn_idx");
                m.put("churnIndex", ci != null ? rs.getDouble("churn_idx") : null);
                m.put("trbCategory", rs.getString("trb_category"));
                m.put("trb", rs.getDouble("trb"));
                int pc = rs.getInt("persona_cluster");
                m.put("personaCluster", pc);
                // Persona name mapped from the raw cluster id (ID/EN by lang).
                boolean mapped = pc >= 0 && pc < names.length;
                String personaName = mapped
                    ? (en ? names[pc][1] : names[pc][0])
                    : (en ? LOW_PRIORITY_EN : LOW_PRIORITY_ID);
                m.put("personaName", personaName);
                // Suggested Action straight from the acquisition/retention table.
                String action = rs.getString("action");
                m.put("action", action != null && !action.isBlank() ? action : "-");
                m.put("branchName", rs.getString("branch_name"));
                items.add(m);
            });

            int totalPages = (int) Math.ceil((double) totalElements / size);
            if (totalPages == 0) totalPages = 1;
            result.put("customers", items);
            result.put("totalElements", totalElements);
            result.put("totalPages", totalPages);
            result.put("currentPage", page);
            result.put("pageSize", size);
        } catch (Exception e) {
            e.printStackTrace();
            result.put("customers", items);
            result.put("totalElements", 0L);
            result.put("totalPages", 1);
            result.put("currentPage", page);
            result.put("pageSize", size);
        }
        return result;
    }

    /**
     * Distinct branch codes present among the selected customers (the same
     * `sel` CTE used by {@link #getSelectedCustomerList}). Uses the raw
     * ods.h.branch_code (e.g. "ID0010001") so the filter shows branch codes,
     * not names. Returns a sorted list suitable for a filter dropdown.
     */
    public java.util.List<String> getSelectedCustomerBranches() {
        // Read from the pre-joined MV (always in sync with the selection; see
        // sql/011_selected_customer_list_mv.sql). 'N/A' is the stored fallback
        // for CIFs with no branch, which we exclude from the dropdown.
        String sql =
            "SELECT DISTINCT branch_code AS bcode " +
            "FROM ods.mv_selected_customer_list " +
            "WHERE branch_code IS NOT NULL AND TRIM(branch_code) <> '' AND branch_code <> 'N/A' " +
            "ORDER BY bcode";
        try {
            return bag.queryForList(sql, String.class);
        } catch (Exception e) {
            e.printStackTrace();
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Synchronously rebuild ods.mv_selected_customer_list so the Action Plan
     * Detail list reflects the latest matrix selection. Called when the user
     * presses "Continue" on the Customer Matrix page; the request waits for the
     * refresh to finish so the next page is guaranteed fresh.
     *
     * Uses a PLAIN (non-CONCURRENTLY) refresh: it is noticeably faster than the
     * CONCURRENTLY variant (~12.5s -> a few seconds here) because it skips the
     * build-new-version-and-diff work. The trade-off is a brief ACCESS EXCLUSIVE
     * lock on the MV during the rebuild, acceptable because this is triggered
     * manually by a single operator. The periodic pg_cron job still uses
     * CONCURRENTLY for background refreshes. Returns true on success.
     */
    public boolean refreshSelectedCustomerListSync() {
        try {
            bag.execute("REFRESH MATERIALIZED VIEW ods.mv_selected_customer_list");
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Segmentation distribution of the SELECTED customers only (the doughnut on
     * the Hot Target page), computed from ods.mv_selected_customer_list so the
     * totals match "Selected total". Unlike getSegmentCounts()/getArchetypeCounts()
     * (whole non-dormant population, used by Segmentation Overview), this is
     * scoped to the current matrix selection.
     *
     * {@code mode}: "retention" groups by mb_archetype, otherwise by needs_cluster.
     * Clusters 0..4 map to persona names; customers with no cluster (-1) are
     * returned as a "Low Priority / Prioritas Akhir" slice (listed last).
     * Each row: {segment, name, nameEn, count}.
     */
    public java.util.List<Map<String, Object>> getSelectedSegmentDistribution(String mode) {
        boolean retention = isRetention(mode);
        String col = retention ? "mb_archetype" : "needs_cluster";
        String[][] names = retention ? archetypeNames() : personaNames();
        java.util.List<Map<String, Object>> out = new java.util.ArrayList<>();
        try {
            // Count per cluster over the selected set; -1 = no cluster.
            java.util.Map<Integer, Long> counts = new java.util.HashMap<>();
            bag.query(
                "SELECT COALESCE(" + col + ",-1) AS cl, COUNT(*) AS cnt " +
                "FROM ods.mv_selected_customer_list GROUP BY COALESCE(" + col + ",-1)",
                (RowCallbackHandler) rs -> counts.put(rs.getInt("cl"), rs.getLong("cnt")));

            // Emit clusters 0..4 (in order), then the -1 Low Priority bucket last.
            for (int i = 0; i < names.length; i++) {
                long cnt = counts.getOrDefault(i, 0L);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("segment", String.valueOf(i));
                m.put("name", names[i][0]);
                m.put("nameEn", names[i][1]);
                m.put("count", cnt);
                out.add(m);
            }
            long lowPriority = counts.getOrDefault(-1, 0L);
            if (lowPriority > 0) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("segment", "-1");
                m.put("name", LOW_PRIORITY_ID);
                m.put("nameEn", LOW_PRIORITY_EN);
                m.put("count", lowPriority);
                out.add(m);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /** Map stored activity_category to the frontend's segment key. */
    private static String mapActivitySegment(String cat) {
        if (cat == null) return null;
        switch (cat) {
            case "inactive_cust": return "inactiveCust";
            case "non_mb":        return "unregMb";
            case "inactive_mb":   return "inactiveMb";
            default:              return null;
        }
    }

    /** Reverse of mapActivitySegment: frontend segment key -> stored category. */
    private static String unmapActivitySegment(String seg) {
        if (seg == null) return null;
        switch (seg) {
            case "inactiveCust": return "inactive_cust";
            case "unregMb":      return "non_mb";
            case "inactiveMb":   return "inactive_mb";
            default:             return null;
        }
    }

    /**
     * Persist the Activity x TRB cell selection into ods.activity_data_matrix.
     * Frontend keys are "<segment>_<trb>" (e.g. "inactiveMb_hi"); the stored
     * matrix_classification is "<trb>_<activity_category>" (e.g. "hi_inactive_mb"),
     * so each key is translated before matching. Clears is_selected first.
     * Returns the number of rows marked selected.
     */
    public int selectActivityCells(java.util.List<String> keys) {
        try {
            bag.update("UPDATE ods.activity_data_matrix SET is_selected = FALSE, updated_ts = NOW() WHERE is_selected = TRUE");
            if (keys == null || keys.isEmpty()) return 0;

            java.util.List<String> classifications = new java.util.ArrayList<>();
            for (String k : keys) {
                if (k == null) continue;
                int us = k.lastIndexOf('_');
                if (us <= 0 || us == k.length() - 1) continue;
                String seg = k.substring(0, us);       // e.g. "inactiveMb"
                String trb = k.substring(us + 1);       // e.g. "hi"
                String cat = unmapActivitySegment(seg); // -> "inactive_mb"
                if (cat == null) continue;
                classifications.add(trb + "_" + cat);   // -> "hi_inactive_mb"
            }
            if (classifications.isEmpty()) return 0;

            String placeholders = classifications.stream().map(x -> "?").collect(java.util.stream.Collectors.joining(","));
            return bag.update(
                "UPDATE ods.activity_data_matrix SET is_selected = TRUE, updated_ts = NOW() " +
                "WHERE matrix_classification IN (" + placeholders + ")",
                classifications.toArray());
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * Distinct selected Activity cells, returned as frontend keys
     * ("<segment>_<trb>") for UI restore.
     */
    public java.util.List<String> getSelectedActivityKeys() {
        java.util.List<String> out = new java.util.ArrayList<>();
        try {
            bag.query(
                "SELECT DISTINCT activity_category, trb_category FROM ods.activity_data_matrix " +
                "WHERE is_selected = TRUE AND activity_category IS NOT NULL AND trb_category IS NOT NULL",
                (RowCallbackHandler) rs -> {
                    String seg = mapActivitySegment(rs.getString("activity_category"));
                    if (seg != null) out.add(seg + "_" + rs.getString("trb_category"));
                });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }
}
