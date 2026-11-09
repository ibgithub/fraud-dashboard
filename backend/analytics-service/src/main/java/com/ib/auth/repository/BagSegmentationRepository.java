package com.ib.auth.repository;

import com.ib.auth.dto.CustomerAnalyticsDto;
import com.ib.auth.dto.RecommenderDto;
import com.ib.auth.dto.SegmentationModelPerfDto;
import com.ib.auth.dto.SegmentationProductUsageDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Segmentation Overview PILOT - reads persona clusters from the NEW bag_demo
 * database (segmentation.cluster_persona) via the secondary
 * {@code bagDemoJdbcTemplate}. Read-only.
 *
 * cluster_persona has real persona names (nama_persona / nama_persona_en) and
 * total_customers per cluster, plus avg_usia (age). Education/income are NOT in
 * the table, and clustering quality metrics (size ratio, Calinski-Harabasz) are
 * absent too, so the controller marks those sections as not-ready -> UI shows
 * "In Progress".
 */
@Repository
public class BagSegmentationRepository {

    private final JdbcTemplate bag;

    public BagSegmentationRepository(@Qualifier("bagDemoJdbcTemplate") JdbcTemplate bagDemoJdbcTemplate) {
        this.bag = bagDemoJdbcTemplate;
    }

    /** One persona cluster: id, name (ID/EN), customer count and average age. */
    public static class SegmentCount {
        public int segment;
        public String name;
        public String nameEn;
        public long count;
        public Double avgAge;

        public SegmentCount(int segment, String name, String nameEn, long count, Double avgAge) {
            this.segment = segment;
            this.name = name;
            this.nameEn = nameEn;
            this.count = count;
            this.avgAge = avgAge;
        }

        public int getSegment() { return segment; }
        public String getName() { return name; }
        public String getNameEn() { return nameEn; }
        public long getCount() { return count; }
        public Double getAvgAge() { return avgAge; }
    }

    /**
     * Persona clusters from segmentation.cluster_persona, ordered by cluster_id.
     * Falls back to the Indonesian name when the English name is blank.
     * Returns an empty list on error/no data so the UI can show "In Progress".
     */
    public List<SegmentCount> getSegmentCounts() {
        List<SegmentCount> out = new ArrayList<>();
        try {
            // Customer Segmentation Distribution now reads the 5 needs-clusters
            // from segmentation.cluster_result_aggregate (non-dormant). Other
            // sections (characteristics, demographics) are unchanged.
            String sql =
                "SELECT cluster_id, nama_persona, nama_persona_en, total_customers, avg_usia " +
                "FROM segmentation.cluster_result_aggregate ORDER BY cluster_id::int";
            bag.query(sql, (RowCallbackHandler) rs -> {
                Double idNum = parseNum(rs.getString("cluster_id"));
                int id = idNum != null ? idNum.intValue() : 0;
                String name = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = name;
                if (name == null || name.trim().isEmpty()) name = "Cluster " + id;
                Double totNum = parseNum(rs.getString("total_customers"));
                long cnt = totNum != null ? totNum.longValue() : 0L;
                Double avgAge = parseNum(rs.getString("avg_usia"));
                out.add(new SegmentCount(id, name, nameEn, cnt, avgAge));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Retention archetypes (by mb_archetype) from segmentation.persona_strategi_retensi,
     * for the Retention tab of the Customer Segmentation Distribution box.
     * Returns one SegmentCount per archetype (segment = mb_archetype), ordered by id.
     */
    public List<SegmentCount> getArchetypeCounts() {
        List<SegmentCount> out = new ArrayList<>();
        try {
            String sql =
                "SELECT mb_archetype, nama_persona, nama_persona_en, total_customers " +
                "FROM segmentation.persona_strategi_retensi ORDER BY mb_archetype::int";
            bag.query(sql, (RowCallbackHandler) rs -> {
                Double idNum = parseNum(rs.getString("mb_archetype"));
                int id = idNum != null ? idNum.intValue() : 0;
                String name = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = name;
                if (name == null || name.trim().isEmpty()) name = "Archetype " + id;
                Double totNum = parseNum(rs.getString("total_customers"));
                long cnt = totNum != null ? totNum.longValue() : 0L;
                out.add(new SegmentCount(id, name, nameEn, cnt, null));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Full per-persona characteristics from segmentation.cluster_persona for the
     * Characteristics & Strategy page. Columns absent in cluster_persona
     * (tenure, monthly txn) are left null so the UI shows "-".
     *
     * Mapping:
     *   avgTotalBalance   = avg_saldo_tabungan + avg_saldo_deposito
     *   mobileBankingRate = pct_active_mb (already 0..1)
     *   avgProductsHeld   = avg_jumlah_produk
     *   keyCharacteristic = karakteristik / karakteristik_en
     *   marketingStrategy = strategi_marketing / strategi_marketing_en
     */
    /**
     * Business Strategy for one persona, sourced from segmentation.persona_strategi
     * (replaces the free-text strategi_* columns). Programs are grouped by jalur
     * ('human' / 'special') and returned as two StrategyItems whose text is the
     * ordered program-name list joined with ". " so the UI renders one bullet per
     * program. {@code tipe} selects the path: "non_mb" = acquisition, "mb" =
     * retention. {@code personaName} matches persona_strategi.persona (the ID
     * persona name) — we join by NAME, not persona_id, so the lookup keeps
     * working after the table is reloaded (persona_id is often left blank).
     * nama_program_en is used for the EN text (currently empty -> blank).
     */
    private List<CustomerAnalyticsDto.StrategyItem> getProgramStrategies(String tipe, String personaName) {
        // jalur -> ordered program names (ID) and (EN).
        java.util.List<String> humanId = new ArrayList<>();
        java.util.List<String> humanEn = new ArrayList<>();
        java.util.List<String> specialId = new ArrayList<>();
        java.util.List<String> specialEn = new ArrayList<>();
        if (personaName == null || personaName.isBlank()) {
            // No name to match on; return empty Special/Human items.
            List<CustomerAnalyticsDto.StrategyItem> empty = new ArrayList<>();
            empty.add(new CustomerAnalyticsDto.StrategyItem("Pendekatan Khusus", "Special Approach", "", ""));
            empty.add(new CustomerAnalyticsDto.StrategyItem("Pendekatan Humanis", "Human Approach", "", ""));
            return empty;
        }
        try {
            bag.query(
                "SELECT jalur, nama_program, nama_program_en " +
                "FROM segmentation.persona_strategi " +
                "WHERE tipe = ? AND btrim(persona) = btrim(?) " +
                "ORDER BY jalur, no",
                (RowCallbackHandler) rs -> {
                    String jalur = rs.getString("jalur");
                    String nm = rs.getString("nama_program");
                    String nmEn = rs.getString("nama_program_en");
                    if ("human".equalsIgnoreCase(jalur)) {
                        if (nm != null && !nm.isBlank()) humanId.add(nm.trim());
                        if (nmEn != null && !nmEn.isBlank()) humanEn.add(nmEn.trim());
                    } else if ("special".equalsIgnoreCase(jalur)) {
                        if (nm != null && !nm.isBlank()) specialId.add(nm.trim());
                        if (nmEn != null && !nmEn.isBlank()) specialEn.add(nmEn.trim());
                    }
                },
                tipe, personaName);
        } catch (Exception e) {
            e.printStackTrace();
        }
        // Join with ". " so the frontend splitSentences() makes one bullet each.
        List<CustomerAnalyticsDto.StrategyItem> items = new ArrayList<>();
        items.add(new CustomerAnalyticsDto.StrategyItem(
            "Pendekatan Khusus", "Special Approach",
            String.join(". ", specialId), String.join(". ", specialEn)));
        items.add(new CustomerAnalyticsDto.StrategyItem(
            "Pendekatan Humanis", "Human Approach",
            String.join(". ", humanId), String.join(". ", humanEn)));
        return items;
    }

    public List<CustomerAnalyticsDto> getClusterPersonaCharacteristics() {
        List<CustomerAnalyticsDto> out = new ArrayList<>();
        try {
            // Acquisition personas come entirely from persona_strategi_akuisisi
            // (one row per cluster_id). Numeric fields are stored as id-ID
            // strings (comma decimal) so they are parsed with parseNum().
            // All numeric columns in persona_strategi_akuisisi are stored as
            // text (id-ID strings), so select them raw and parse in Java with
            // parseNum() — no SQL arithmetic/COALESCE on text columns.
            String sql =
                "SELECT cluster_id, nama_persona, nama_persona_en, risk_level, " +
                "       total_customers, avg_usia, avg_jumlah_produk, pct_active_mb, " +
                "       avg_saldo_tabungan, avg_saldo_deposito, " +
                "       karakteristik, karakteristik_en, " +
                "       deskripsi_persona, deskripsi_persona_en, " +
                "       strategi_special, strategi_special_en, strategi_human, strategi_human_en " +
                "FROM segmentation.persona_strategi_akuisisi ORDER BY cluster_id::int";
            out = bag.query(sql, (rs, rowNum) -> {
                CustomerAnalyticsDto d = new CustomerAnalyticsDto();
                Double idNum = parseNum(rs.getString("cluster_id"));
                int id = idNum != null ? idNum.intValue() : 0;
                d.setCluster("cluster_" + id);
                String name = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (name == null || name.trim().isEmpty()) name = "Segmen " + id;
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = name;
                d.setPersonaName(name);
                d.setPersonaNameEn(nameEn);
                d.setRiskLevel(rs.getString("risk_level"));
                Double tot = parseNum(rs.getString("total_customers"));
                d.setTotalCustomers(tot != null ? tot.longValue() : null);
                d.setAvgAge(parseNum(rs.getString("avg_usia")));
                d.setAvgProductsHeld(parseNum(rs.getString("avg_jumlah_produk")));
                d.setMobileBankingRate(parseNum(rs.getString("pct_active_mb")));
                Double sTab = parseNum(rs.getString("avg_saldo_tabungan"));
                Double sDep = parseNum(rs.getString("avg_saldo_deposito"));
                Double saldoTotal = (sTab != null || sDep != null)
                    ? (sTab != null ? sTab : 0) + (sDep != null ? sDep : 0) : null;
                d.setAvgTotalBalance(saldoTotal);
                d.setKeyCharacteristic(rs.getString("karakteristik"));
                d.setKeyCharacteristicEn(rs.getString("karakteristik_en"));
                d.setDescription(rs.getString("deskripsi_persona"));
                d.setDescriptionEn(rs.getString("deskripsi_persona_en"));
                return d;
            });
            // Business Strategy from segmentation.persona_strategi (acquisition
            // path: tipe='non_mb'), matched by persona NAME. Resolved AFTER the
            // outer query closes so we never hold two bag-pool connections at
            // once (nested queries inside the row-mapper exhausted the pool).
            for (CustomerAnalyticsDto d : out) {
                d.setStrategies(getProgramStrategies("non_mb", d.getPersonaName()));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Retention characteristics, one row per mb_archetype from
     * segmentation.persona_strategi_retensi. Stats differ from acquisition
     * (tenure, txn/month, MB share, retention rate, total assets). Four labeled
     * strategies: Pertahankan/Reaktivasi x Special/Human.
     */
    public List<CustomerAnalyticsDto> getRetentionCharacteristics() {
        List<CustomerAnalyticsDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT mb_archetype, nama_persona, nama_persona_en, recommendation_type, prioritas, " +
                "       total_customers, avg_usia, avg_jumlah_produk, avg_porsi_mb, avg_tenure_bulan, " +
                "       avg_trx_per_bulan, avg_total_aset, tingkat_retensi, " +
                "       karakteristik, karakteristik_en, " +
                "       deskripsi_persona, deskripsi_persona_en, " +
                "       strategi_pertahankan_special, strategi_pertahankan_special_en, " +
                "       strategi_pertahankan_human, strategi_pertahankan_human_en, " +
                "       strategi_reaktivasi_special, strategi_reaktivasi_special_en, " +
                "       strategi_reaktivasi_human, strategi_reaktivasi_human_en " +
                "FROM segmentation.persona_strategi_retensi ORDER BY mb_archetype::int";
            out = bag.query(sql, (rs, rowNum) -> {
                CustomerAnalyticsDto d = new CustomerAnalyticsDto();
                Double idNum = parseNum(rs.getString("mb_archetype"));
                int id = idNum != null ? idNum.intValue() : 0;
                d.setCluster("archetype_" + id);
                String name = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (name == null || name.trim().isEmpty()) name = "Archetype " + id;
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = name;
                d.setPersonaName(name);
                d.setPersonaNameEn(nameEn);
                d.setRecommendationType(rs.getString("recommendation_type"));
                d.setRiskLevel(rs.getString("prioritas"));
                Double tot = parseNum(rs.getString("total_customers"));
                d.setTotalCustomers(tot != null ? tot.longValue() : null);
                d.setAvgAge(parseNum(rs.getString("avg_usia")));
                d.setAvgProductsHeld(parseNum(rs.getString("avg_jumlah_produk")));
                d.setAvgTenureMonths(parseNum(rs.getString("avg_tenure_bulan")));
                d.setAvgMonthlyTxn(parseNum(rs.getString("avg_trx_per_bulan")));
                d.setMbShare(parseNum(rs.getString("avg_porsi_mb")));
                d.setRetentionRate(parseNum(rs.getString("tingkat_retensi")));
                d.setAvgTotalAssets(parseNum(rs.getString("avg_total_aset")));
                d.setKeyCharacteristic(rs.getString("karakteristik"));
                d.setKeyCharacteristicEn(rs.getString("karakteristik_en"));
                d.setDescription(rs.getString("deskripsi_persona"));
                d.setDescriptionEn(rs.getString("deskripsi_persona_en"));
                return d;
            });
            // Business Strategy from segmentation.persona_strategi (retention
            // path: tipe='mb'), matched by persona NAME. Resolved AFTER the outer
            // query closes to avoid holding two bag-pool connections at once.
            for (CustomerAnalyticsDto d : out) {
                d.setStrategies(getProgramStrategies("mb", d.getPersonaName()));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Parse an id-ID numeric string (comma decimal, optional thousands dots)
     * into a Double. Returns null for null/blank/unparseable input.
     */
    private static Double parseNum(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        // Remove thousands separators (dots) then switch decimal comma to dot.
        // Values here never use dot as a thousands separator in practice, but be
        // safe: if both '.' and ',' present, treat '.' as thousands.
        if (t.indexOf('.') >= 0 && t.indexOf(',') >= 0) {
            t = t.replace(".", "");
        }
        t = t.replace(',', '.');
        try {
            return Double.parseDouble(t);
        } catch (NumberFormatException e) {
            return null;
        }
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
     * Product/channel usage per needs-cluster from bag_demo, non-dormant.
     * Products (Opsi 1 — only those available in cluster_result):
     *   Tabungan Reguler <- punya_tabungan
     *   Deposito         <- punya_deposito
     *   Kredit / KPR     <- punya_kredit
     *   Giro             <- punya_giro
     *   Kartu            <- punya_kartu
     *   Mobile Banking   <- status_mb <> 'non_mb'  (registered MB)
     * Persona names (ID + EN) come from segmentation.cluster_result_aggregate.
     */
    public SegmentationProductUsageDto.ResponseDto getProductUsageFromBagDemo() {
        List<String> products = List.of(
            "Tabungan Reguler", "Deposito", "Kredit / KPR", "Giro", "Kartu", "Mobile Banking");

        List<SegmentationProductUsageDto.ClusterItemDto> clusters = new ArrayList<>();
        Map<String, List<Double>> usageData = new LinkedHashMap<>();
        for (String p : products) usageData.put(p, new ArrayList<>());

        try {
            // Reads the pre-computed summary MV segmentation.mv_pu_acquisition
            // (5 rows, ~8 ms) instead of aggregating cluster_result joined to the
            // 1M-row ods.mv_h live (~1.1 s). Persona names are baked into the MV.
            // See backend/analytics-service/sql/010_product_usage_matviews.sql.
            String sql =
                "SELECT cluster_id, total_cnt, tabungan_pct, deposito_pct, kredit_pct, " +
                "       giro_pct, kartu_pct, mb_pct, " +
                "       name_id AS nama_persona, name_en AS nama_persona_en " +
                "FROM segmentation.mv_pu_acquisition ORDER BY cluster_id";

            bag.query(sql, (RowCallbackHandler) rs -> {
                int id = rs.getInt("cluster_id");
                String nameId = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (nameId == null || nameId.trim().isEmpty()) nameId = "Segmen " + id;
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = nameId;
                clusters.add(new SegmentationProductUsageDto.ClusterItemDto(
                    "cluster_" + id, nameId, nameEn, rs.getLong("total_cnt")));

                usageData.get("Tabungan Reguler").add(rs.getDouble("tabungan_pct"));
                usageData.get("Deposito").add(rs.getDouble("deposito_pct"));
                usageData.get("Kredit / KPR").add(rs.getDouble("kredit_pct"));
                usageData.get("Giro").add(rs.getDouble("giro_pct"));
                usageData.get("Kartu").add(rs.getDouble("kartu_pct"));
                usageData.get("Mobile Banking").add(rs.getDouble("mb_pct"));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new SegmentationProductUsageDto.ResponseDto(clusters, products, usageData);
    }

    /**
     * Retention-side Product/channel usage per mb_archetype from bag_demo,
     * non-dormant. Mirrors {@link #getProductUsageFromBagDemo()} but groups by
     * segmentation.cluster_result.mb_archetype (the retention archetypes), with
     * persona names (ID + EN) from segmentation.persona_strategi_retensi.
     * Products are the same six as acquisition.
     */
    public SegmentationProductUsageDto.ResponseDto getProductUsageRetention() {
        List<String> products = List.of(
            "Tabungan Reguler", "Deposito", "Kredit / KPR", "Giro", "Kartu", "Mobile Banking");

        List<SegmentationProductUsageDto.ClusterItemDto> clusters = new ArrayList<>();
        Map<String, List<Double>> usageData = new LinkedHashMap<>();
        for (String p : products) usageData.put(p, new ArrayList<>());

        try {
            // Reads the pre-computed summary MV segmentation.mv_pu_retention
            // (5 rows, ~8 ms) instead of aggregating cluster_result joined to the
            // 1M-row ods.mv_h live (~1.0 s). Persona names are baked into the MV.
            // See backend/analytics-service/sql/010_product_usage_matviews.sql.
            String sql =
                "SELECT archetype_id, total_cnt, tabungan_pct, deposito_pct, kredit_pct, " +
                "       giro_pct, kartu_pct, mb_pct, " +
                "       name_id AS nama_persona, name_en AS nama_persona_en " +
                "FROM segmentation.mv_pu_retention ORDER BY archetype_id";

            bag.query(sql, (RowCallbackHandler) rs -> {
                int id = rs.getInt("archetype_id");
                String nameId = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (nameId == null || nameId.trim().isEmpty()) nameId = "Archetype " + id;
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = nameId;
                clusters.add(new SegmentationProductUsageDto.ClusterItemDto(
                    "archetype_" + id, nameId, nameEn, rs.getLong("total_cnt")));

                usageData.get("Tabungan Reguler").add(rs.getDouble("tabungan_pct"));
                usageData.get("Deposito").add(rs.getDouble("deposito_pct"));
                usageData.get("Kredit / KPR").add(rs.getDouble("kredit_pct"));
                usageData.get("Giro").add(rs.getDouble("giro_pct"));
                usageData.get("Kartu").add(rs.getDouble("kartu_pct"));
                usageData.get("Mobile Banking").add(rs.getDouble("mb_pct"));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new SegmentationProductUsageDto.ResponseDto(clusters, products, usageData);
    }

    /**
     * Product Recommendations per needs-cluster (non-dormant). For each cluster,
     * returns the top-3 recommended banking products and top-3 recommended
     * transaction services (by frequency across the 3 ranked rec columns).
     * Persona names (ID + EN) come from segmentation.cluster_result_aggregate.
     */
    public List<RecommenderDto.ClusterRec> getRecommenderByCluster() {
        List<RecommenderDto.ClusterRec> out = new ArrayList<>();
        try {
            // Cluster meta (count + persona names).
            Map<Integer, Object[]> meta = new LinkedHashMap<>(); // id -> [nameId, nameEn, count]
            bag.query(
                "SELECT cluster_id, nama_persona, nama_persona_en, total_customers " +
                "FROM segmentation.cluster_result_aggregate ORDER BY cluster_id",
                (RowCallbackHandler) rs -> meta.put(rs.getInt("cluster_id"), new Object[] {
                    rs.getString("nama_persona"), rs.getString("nama_persona_en"), rs.getLong("total_customers")
                }));

            // Persona descriptions (tab tooltip) keyed by cluster_id.
            Map<Integer, String[]> descs = new LinkedHashMap<>(); // id -> [desc, descEn]
            bag.query(
                "SELECT cluster_id::int AS id, deskripsi_persona, deskripsi_persona_en " +
                "FROM segmentation.persona_strategi_akuisisi",
                (RowCallbackHandler) rs -> descs.put(rs.getInt("id"), new String[] {
                    rs.getString("deskripsi_persona"), rs.getString("deskripsi_persona_en")
                }));

            for (Map.Entry<Integer, Object[]> e : meta.entrySet()) {
                int id = e.getKey();
                String nameId = (String) e.getValue()[0];
                String nameEn = (String) e.getValue()[1];
                long count = (Long) e.getValue()[2];
                if (nameId == null || nameId.isBlank()) nameId = "Segmen " + id;
                if (nameEn == null || nameEn.isBlank()) nameEn = nameId;

                RecommenderDto.ClusterRec rec = new RecommenderDto.ClusterRec("cluster_" + id, nameId, nameEn, count,
                    topRecs(id, "banking"), topRecs(id, "service"));
                String[] d = descs.get(id);
                if (d != null) { rec.setDescription(d[0]); rec.setDescriptionEn(d[1]); }
                out.add(rec);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return out;
    }

    /**
     * Top-3 recommendations for a cluster/kind, read from the pre-aggregated
     * segmentation.mv_recommender_cluster (fast — no mv_h scan at request time).
     */
    private List<RecommenderDto.RecItem> topRecs(int clusterId, String kind) {
        List<RecommenderDto.RecItem> items = new ArrayList<>();
        try {
            bag.query(
                "SELECT rec_name, cnt, cluster_total FROM segmentation.mv_recommender_cluster " +
                "WHERE cluster_id = ? AND kind = ? ORDER BY cnt DESC LIMIT 3",
                (RowCallbackHandler) rs -> {
                    long cnt = rs.getLong("cnt");
                    long total = rs.getLong("cluster_total");
                    double pct = total > 0 ? Math.round((cnt * 10000.0) / total) / 100.0 : 0.0;
                    items.add(new RecommenderDto.RecItem(rs.getString("rec_name"), pct, cnt));
                },
                clusterId, kind);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return items;
    }

    /**
     * Retention counterpart of {@link #getRecommenderByCluster()}: Top product +
     * service recommendations per RETENTION ARCHETYPE (mb_archetype 0..4), read
     * from segmentation.mv_recommender_archetype. Persona names (ID + EN) come
     * from segmentation.persona_strategi_retensi; the per-archetype customer
     * count is the MV's cluster_total.
     */
    public List<RecommenderDto.ClusterRec> getRecommenderByArchetype() {
        List<RecommenderDto.ClusterRec> out = new ArrayList<>();
        try {
            // Archetype names + descriptions from the retention persona table.
            Map<Integer, String[]> names = new LinkedHashMap<>(); // id -> [nameId, nameEn]
            Map<Integer, String[]> descs = new LinkedHashMap<>(); // id -> [desc, descEn]
            bag.query(
                "SELECT NULLIF(btrim(mb_archetype),'')::int AS id, nama_persona, nama_persona_en, " +
                "deskripsi_persona, deskripsi_persona_en " +
                "FROM segmentation.persona_strategi_retensi " +
                "WHERE NULLIF(btrim(mb_archetype),'') IS NOT NULL ORDER BY id",
                (RowCallbackHandler) rs -> {
                    int id = rs.getInt("id");
                    names.put(id, new String[] { rs.getString("nama_persona"), rs.getString("nama_persona_en") });
                    descs.put(id, new String[] { rs.getString("deskripsi_persona"), rs.getString("deskripsi_persona_en") });
                });

            // Per-archetype customer count (cluster_total) from the MV.
            Map<Integer, Long> counts = new LinkedHashMap<>();
            bag.query(
                "SELECT archetype_id, MAX(cluster_total) AS total " +
                "FROM segmentation.mv_recommender_archetype GROUP BY archetype_id",
                (RowCallbackHandler) rs -> counts.put(rs.getInt("archetype_id"), rs.getLong("total")));

            for (Map.Entry<Integer, String[]> e : names.entrySet()) {
                int id = e.getKey();
                String nameId = e.getValue()[0];
                String nameEn = e.getValue()[1];
                if (nameId == null || nameId.isBlank()) nameId = "Archetype " + id;
                if (nameEn == null || nameEn.isBlank()) nameEn = nameId;
                long count = counts.getOrDefault(id, 0L);
                RecommenderDto.ClusterRec rec = new RecommenderDto.ClusterRec("archetype_" + id, nameId, nameEn, count,
                    topRecsArchetype(id, "banking"), topRecsArchetype(id, "service"));
                String[] d = descs.get(id);
                if (d != null) { rec.setDescription(d[0]); rec.setDescriptionEn(d[1]); }
                out.add(rec);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return out;
    }

    /** Top-3 recommendations for an archetype/kind from mv_recommender_archetype. */
    private List<RecommenderDto.RecItem> topRecsArchetype(int archetypeId, String kind) {
        List<RecommenderDto.RecItem> items = new ArrayList<>();
        try {
            bag.query(
                "SELECT rec_name, cnt, cluster_total FROM segmentation.mv_recommender_archetype " +
                "WHERE archetype_id = ? AND kind = ? ORDER BY cnt DESC LIMIT 3",
                (RowCallbackHandler) rs -> {
                    long cnt = rs.getLong("cnt");
                    long total = rs.getLong("cluster_total");
                    double pct = total > 0 ? Math.round((cnt * 10000.0) / total) / 100.0 : 0.0;
                    items.add(new RecommenderDto.RecItem(rs.getString("rec_name"), pct, cnt));
                },
                archetypeId, kind);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return items;
    }

    /**
     * Segmentation Model Performance from ml_eva.cluster_model_selection
     * (model = 'model1_needs'): per-k silhouette / DBI / Calinski-Harabasz /
     * inertia / smallest-cluster share. optimalK = k with the lowest DBI.
     * totalCustomers comes from segmentation.cluster_result_aggregate.
     */
    public SegmentationModelPerfDto getSegmentationModelPerformance() {
        SegmentationModelPerfDto dto = new SegmentationModelPerfDto();
        dto.setModel("model1_needs");
        List<SegmentationModelPerfDto.KRow> perK = new ArrayList<>();
        try {
            bag.query(
                "SELECT k, silhouette, davies_bouldin, calinski_harabasz, inertia, porsi_min " +
                "FROM ml_eva.cluster_model_selection WHERE model = 'model1_needs' ORDER BY k",
                (RowCallbackHandler) rs -> perK.add(new SegmentationModelPerfDto.KRow(
                    rs.getInt("k"),
                    rs.getObject("silhouette") != null ? rs.getDouble("silhouette") : null,
                    rs.getObject("davies_bouldin") != null ? rs.getDouble("davies_bouldin") : null,
                    rs.getObject("calinski_harabasz") != null ? rs.getDouble("calinski_harabasz") : null,
                    rs.getObject("inertia") != null ? rs.getDouble("inertia") : null,
                    rs.getObject("porsi_min") != null ? rs.getDouble("porsi_min") : null)));
        } catch (Exception e) {
            e.printStackTrace();
        }
        dto.setPerK(perK);

        // Selected k = 5: the model actually deployed (segmentation uses 5
        // needs-clusters, matching cluster_result_aggregate). Metrics are taken
        // from the k=5 row of the selection table.
        final int SELECTED_K = 5;
        SegmentationModelPerfDto.KRow sel = null;
        for (SegmentationModelPerfDto.KRow r : perK) {
            if (r.getK() == SELECTED_K) { sel = r; break; }
        }
        if (sel != null) {
            dto.setOptimalK(sel.getK());
            dto.setOptimalDbi(sel.getDaviesBouldin());
            dto.setOptimalSilhouette(sel.getSilhouette());
            dto.setOptimalCalinski(sel.getCalinskiHarabasz());
        }

        // Total segmented customers (non-dormant) from the aggregate MV.
        try {
            Long total = bag.queryForObject(
                "SELECT COALESCE(SUM(total_customers),0) FROM segmentation.cluster_result_aggregate",
                Long.class);
            dto.setTotalCustomers(total);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return dto;
    }

    /**
     * Demographics PER SEGMENT from ods.mv_segment_demographics (bag_demo).
     * Dormant customers are excluded in the MV itself. Segments come from
     * cluster_result.needs_cluster (0..4) with their persona names.
     *
     * Returns an ordered list, one entry per segment:
     *   { segment, name, nameEn, total, metrics: {
     *       age_bucket:[...], age_stats:[...], gender:[...], marital:[...],
     *       occupation:[...] } }
     * where each metric row is {key, label, labelEn, count, statValue} ordered
     * by sort_order. Only the READY metrics are returned (education/province are
     * stored in the MV but intentionally not exposed yet).
     *
     * 'total' is the segment's gender total (non-null gender), used as a stable
     * population proxy for the per-segment header.
     *
     * Returns an empty list on error/no data so the UI can show a fallback.
     */
    /** Acquisition demographics (per needs_cluster). */
    public List<Map<String, Object>> getDemographics() {
        return getDemographicsFrom("ods.mv_segment_demographics");
    }

    /** Retention demographics (per mb_archetype). */
    public List<Map<String, Object>> getDemographicsRetention() {
        return getDemographicsFrom("ods.mv_archetype_demographics");
    }

    private List<Map<String, Object>> getDemographicsFrom(String table) {
        // segment -> accumulator
        Map<Integer, Map<String, Object>> bySeg = new LinkedHashMap<>();
        try {
            // Occupation: the MV's 'OTHERS' tail bucket (the blank/long-tail
            // catch-all) is merged INTO the data's literal 'Lain-lain' value, so
            // the card shows a single "Lain-lain" bucket. Because that combined
            // bucket is by far the largest, it is given sort_order -1 so it
            // renders at the TOP of the occupation list (highest count first).
            // All other metrics pass through unchanged.
            String sql =
                "WITH src AS ( " +
                "  SELECT segment, segment_name, segment_name_en, metric, key, " +
                "         label_id, label_en, cnt, sort_order, stat_value " +
                "  FROM " + table + " " +
                "  WHERE metric IN ('age_bucket','age_stats','gender','marital','occupation') " +
                "), " +
                "merged AS ( " +
                // non-occupation rows, and occupation rows that are NOT Lain-lain/OTHERS
                "  SELECT segment, segment_name, segment_name_en, metric, key, " +
                "         label_id, label_en, cnt, sort_order, stat_value " +
                "  FROM src " +
                "  WHERE metric <> 'occupation' " +
                "     OR (btrim(label_id) <> 'Lain-lain' AND key <> 'OTHERS') " +
                "  UNION ALL " +
                // one merged 'Lain-lain' row per segment = sum of Lain-lain + OTHERS tail,
                // sort_order -1 so it sits at the top (it is the largest bucket).
                "  SELECT segment, MAX(segment_name), MAX(segment_name_en), 'occupation', 'LAIN_LAIN', " +
                "         'Lain-lain', 'Other', SUM(cnt), -1, NULL::numeric " +
                "  FROM src " +
                "  WHERE metric = 'occupation' AND (btrim(label_id) = 'Lain-lain' OR key = 'OTHERS') " +
                "  GROUP BY segment " +
                "  HAVING SUM(cnt) > 0 " +
                ") " +
                "SELECT segment, segment_name, segment_name_en, metric, key, " +
                "       label_id, label_en, cnt, sort_order, stat_value " +
                "FROM merged ORDER BY segment, metric, sort_order";
            bag.query(sql, (RowCallbackHandler) rs -> {
                int segment = rs.getInt("segment");
                Map<String, Object> seg = bySeg.computeIfAbsent(segment, k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("segment", segment);
                    m.put("name", rs0Name(rs, "segment_name", "Segmen " + segment));
                    m.put("nameEn", rs0Name(rs, "segment_name_en", "Segment " + segment));
                    m.put("total", 0L);
                    m.put("metrics", new LinkedHashMap<String, List<Map<String, Object>>>());
                    return m;
                });
                String metric = rs.getString("metric");
                long cnt = rs.getLong("cnt");
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("key", rs.getString("key"));
                row.put("label", rs.getString("label_id"));
                row.put("labelEn", rs.getString("label_en"));
                row.put("count", cnt);
                Object sv = rs.getObject("stat_value");
                row.put("statValue", sv != null ? rs.getDouble("stat_value") : null);
                @SuppressWarnings("unchecked")
                Map<String, List<Map<String, Object>>> metrics =
                    (Map<String, List<Map<String, Object>>>) seg.get("metrics");
                metrics.computeIfAbsent(metric, k -> new ArrayList<>()).add(row);
                // Population proxy = sum of gender counts.
                if ("gender".equals(metric)) {
                    seg.put("total", (Long) seg.get("total") + cnt);
                }
            });

            // Override the persona NAME + attach the description per segment from
            // the authoritative persona_strategi tables, so the demographics tabs
            // match the donut chart / characteristics tabs (which read the same
            // tables). The demographics MVs carry their own older hardcoded names,
            // which otherwise diverge (e.g. "Light Routine User" vs the persona
            // table's "Loyal Light Transactors"). Acquisition demographics map to
            // persona_strategi_akuisisi (by cluster_id); retention demographics to
            // persona_strategi_retensi (by mb_archetype). segment == that id.
            boolean retention = table.contains("archetype");
            String descSql = retention
                ? "SELECT mb_archetype::int AS sid, nama_persona, nama_persona_en, "
                  + "deskripsi_persona, deskripsi_persona_en FROM segmentation.persona_strategi_retensi"
                : "SELECT cluster_id::int AS sid, nama_persona, nama_persona_en, "
                  + "deskripsi_persona, deskripsi_persona_en FROM segmentation.persona_strategi_akuisisi";
            bag.query(descSql, (RowCallbackHandler) rs -> {
                int sid = rs.getInt("sid");
                Map<String, Object> seg = bySeg.get(sid);
                if (seg != null) {
                    String nm = rs.getString("nama_persona");
                    String nmEn = rs.getString("nama_persona_en");
                    if (nm != null && !nm.trim().isEmpty()) seg.put("name", nm);
                    if (nmEn != null && !nmEn.trim().isEmpty()) seg.put("nameEn", nmEn);
                    seg.put("description", rs.getString("deskripsi_persona"));
                    seg.put("descriptionEn", rs.getString("deskripsi_persona_en"));
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new ArrayList<>(bySeg.values());
    }

    private static String rs0Name(java.sql.ResultSet rs, String col, String fallback) {
        try {
            String v = rs.getString(col);
            return (v == null || v.trim().isEmpty()) ? fallback : v;
        } catch (Exception e) {
            return fallback;
        }
    }

}
