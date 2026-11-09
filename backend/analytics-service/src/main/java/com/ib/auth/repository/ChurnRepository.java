package com.ib.auth.repository;

import com.ib.auth.dto.ChurnModelPerformanceDto;
import com.ib.auth.dto.ChurnOverviewDto;
import com.ib.auth.dto.ChurnRankingDto;
import com.ib.auth.dto.ChurnThresholdDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class ChurnRepository {

    private final JdbcTemplate jdbcTemplate;
    // Secondary datasource -> bag_demo (new churn model: churn.churn_result and
    // its pre-aggregated MVs). Ranking / model-performance still read the legacy
    // churn.pred_result via the primary jdbcTemplate.
    private final JdbcTemplate bag;

    public ChurnRepository(JdbcTemplate jdbcTemplate,
                           @Qualifier("bagDemoJdbcTemplate") JdbcTemplate bagDemoJdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.bag = bagDemoJdbcTemplate;
    }

    /**
     * Churn Overview from the NEW bag_demo model (churn.churn_result), served via
     * two pre-aggregated MVs. Predicted Churn = tingkat_risiko = 'Tinggi'.
     *
     * The Low/Med/High tier split and the 12-month trend are derived in the
     * frontend from the CHURN_TIER_DISTRIBUTION setting applied to predictedChurn,
     * so here we only seed placeholder tier counts (frontend overrides them).
     */
    public ChurnOverviewDto getChurnOverview() {
        ChurnOverviewDto dto = new ChurnOverviewDto();

        try {
            // 1-4. Headline KPIs from churn.mv_churn_overview_kpi (single row).
            bag.query(
                "SELECT total_nasabah, predicted_churn, churn_rate, at_risk_balance_juta " +
                "FROM churn.mv_churn_overview_kpi",
                rs -> {
                    dto.setTotalNasabah(rs.getInt("total_nasabah"));
                    dto.setPredictedChurn(rs.getInt("predicted_churn"));
                    dto.setChurnRate(Math.round(rs.getDouble("churn_rate") * 100.0) / 100.0);
                    dto.setTotalAtRiskBalance(
                        Math.round(rs.getDouble("at_risk_balance_juta") * 100.0) / 100.0);
                });

            // 5. Risk tier placeholder (frontend recomputes from the setting).
            int churnPop = dto.getPredictedChurn() != null ? dto.getPredictedChurn() : 0;
            int[] tiers = splitCounts(churnPop, 33, 33); // [hi, med, lo] placeholder
            dto.setHighRiskCount(tiers[0]);
            dto.setMediumRiskCount(tiers[1]);
            dto.setLowRiskCount(tiers[2]);

            // 6. Branch distribution from churn.mv_churn_overview_branch (top 5).
            String sqlBranch =
                "SELECT branch_code, churn_rate, churn_cnt " +
                "FROM churn.mv_churn_overview_branch ORDER BY churn_cnt DESC LIMIT 5";
            List<ChurnOverviewDto.BranchChurnRateDto> branchList = bag.query(sqlBranch, (rs, rowNum) ->
                new ChurnOverviewDto.BranchChurnRateDto(
                    rs.getString("branch_code"),
                    rs.getDouble("churn_rate"),
                    rs.getInt("churn_cnt")
                )
            );
            dto.setBranchDistribution(branchList);

            // 7. Tier Trend (12-month synthetic series; frontend also overrides).
            List<ChurnOverviewDto.TierTrendDto> trend = new ArrayList<>();
            String[] months = {"Ags", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul"};
            int baseLow = dto.getLowRiskCount();
            int baseMed = dto.getMediumRiskCount();
            int baseHigh = dto.getHighRiskCount();

            for (int i = 0; i < months.length; i++) {
                int l = Math.max(0, baseLow + (int)(Math.sin(i / 2.0) * 20 + i * 3));
                int m = Math.max(0, baseMed + (int)(Math.sin(i / 2.0) * 20 + i * 3));
                int h = Math.max(0, baseHigh + (int)(Math.sin(i / 2.0) * 20 + i * 3));
                trend.add(new ChurnOverviewDto.TierTrendDto(months[i], l, m, h));
            }
            dto.setTierTrend(trend);

            // 8. Churn-probability distribution in 10% buckets (0-10% .. 90-100%)
            // straight from churn.churn_result. width_bucket(x,0,1,10) returns
            // 1..10; bucket 10 includes the top edge (proba up to 1.0).
            Map<Integer, Integer> bucketCounts = new HashMap<>();
            bag.query(
                "SELECT width_bucket(churn_proba, 0, 1, 10) AS b, COUNT(*) AS cnt " +
                "FROM churn.churn_result WHERE churn_proba IS NOT NULL GROUP BY b",
                (RowCallbackHandler) rs -> bucketCounts.put(rs.getInt("b"), rs.getInt("cnt")));
            List<ChurnOverviewDto.ProbabilityBucketDto> probDist = new ArrayList<>();
            for (int i = 1; i <= 10; i++) {
                String label = ((i - 1) * 10) + "-" + (i * 10) + "%";
                probDist.add(new ChurnOverviewDto.ProbabilityBucketDto(
                    label, bucketCounts.getOrDefault(i, 0)));
            }
            dto.setProbabilityDistribution(probDist);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return dto;
    }

    /**
     * Churn Ranking from the NEW bag_demo model (churn.churn_result), via the
     * bag datasource. Customer name is intentionally NOT returned.
     *
     * Columns map as:
     *   cif          = churn_result.customer_id
     *   branch       = ods.m_branch.name (via ods.h.branch_code), fallback code
     *   churn_index  = churn_result.churn_index (0..100)
     *   tier         = tingkat_risiko -> Hi (Tinggi) / Med (Sedang) / Lo (Rendah)
     *   total_bal    = per-customer TRB from churn.mv_customer_trb (SUM(trb)
     *                  over ods.trb_score, pre-aggregated); UI shows millions
     *   occupation   = ods.h.occupation
     *
     * Branch filter matches ods.m_branch.name; keyword search matches CIF only
     * (no customer name exists in this model).
     */
    public ChurnRankingDto getChurnRankingPaginated(String branchFilter, String keyword, int page, int size) {
        return getChurnRankingPaginated(branchFilter, keyword, page, size, null, null, null, null);
    }

    public ChurnRankingDto getChurnRankingPaginated(String branchFilter, String keyword, int page, int size,
                                                    String sortBy, String sortDir) {
        return getChurnRankingPaginated(branchFilter, keyword, page, size, sortBy, sortDir, null, null);
    }

    /**
     * Overload supporting a churn-probability range filter (probMin..probMax,
     * each 0..1). Used by the "Churn Probability Distribution" chart on the
     * ranking page: clicking a 10% bar restricts the CIF list to that range.
     * churn_proba is in [0,1]; the top bucket (90-100%) is inclusive of 1.0.
     */
    public ChurnRankingDto getChurnRankingPaginated(String branchFilter, String keyword, int page, int size,
                                                    String sortBy, String sortDir,
                                                    Double probMin, Double probMax) {
        try {
            boolean hasBranch = branchFilter != null && !branchFilter.isBlank()
                && !"Semua Cabang".equalsIgnoreCase(branchFilter.trim())
                && !"All Branches".equalsIgnoreCase(branchFilter.trim());
            boolean hasKeyword = keyword != null && !keyword.isBlank();
            boolean hasProbRange = probMin != null && probMax != null;

            StringBuilder whereClause = new StringBuilder(" WHERE 1=1 ");
            List<Object> params = new ArrayList<>();

            if (hasBranch) {
                whereClause.append(" AND h.branch_code = ? ");
                params.add(branchFilter.trim());
            }
            if (hasKeyword) {
                whereClause.append(" AND LOWER(c.customer_id) LIKE ? ");
                params.add("%" + keyword.trim().toLowerCase() + "%");
            }
            if (hasProbRange) {
                // Lower edge inclusive, upper edge exclusive, except the final
                // bucket (max >= 1.0) which includes churn_proba = 1.0 exactly.
                whereClause.append(" AND c.churn_proba >= ? ");
                params.add(probMin);
                if (probMax >= 1.0) {
                    whereClause.append(" AND c.churn_proba <= ? ");
                    params.add(1.0);
                } else {
                    whereClause.append(" AND c.churn_proba < ? ");
                    params.add(probMax);
                }
            }

            String fromJoin =
                " FROM churn.churn_result c " +
                " LEFT JOIN ods.h h ON h.customer_id::text = c.customer_id " +
                " LEFT JOIN ods.m_branch b ON b.code = h.branch_code " +
                " LEFT JOIN churn.mv_customer_trb t ON t.cif::text = c.customer_id ";

            // Count total
            String countSql = "SELECT COUNT(*) FROM churn.churn_result c " +
                " LEFT JOIN ods.h h ON h.customer_id::text = c.customer_id " +
                " LEFT JOIN ods.m_branch b ON b.code = h.branch_code " + whereClause;
            Long totalElements = bag.queryForObject(countSql, params.toArray(), Long.class);
            if (totalElements == null) totalElements = 0L;

            int totalPages = (int) Math.ceil((double) totalElements / size);
            if (totalPages == 0) totalPages = 1;

            // Whitelist sort columns (frontend keys -> safe SQL expressions) to
            // avoid injection. Default: churn_index DESC.
            String sortExpr;
            switch (sortBy == null ? "" : sortBy) {
                case "cif":        sortExpr = "c.customer_id"; break;
                case "branch":     sortExpr = "h.branch_code"; break;
                case "tier":       sortExpr = "c.churn_proba"; break; // tier order == proba order
                case "trb":        sortExpr = "COALESCE(t.trb, 0)"; break;
                case "occupation": sortExpr = "h.occupation"; break;
                case "churnIndex":
                default:           sortExpr = "c.churn_index"; break;
            }
            boolean asc = "asc".equalsIgnoreCase(sortDir);
            String dir = asc ? "ASC" : "DESC";

            int offset = page * size;
            String dataSql =
                "SELECT c.customer_id AS cif, " +
                "       COALESCE(h.branch_code, 'N/A') AS branch_name, " +
                "       ROUND(c.churn_index::numeric, 1) AS churn_index, " +
                "       CASE c.tingkat_risiko WHEN 'Tinggi' THEN 'Hi' WHEN 'Sedang' THEN 'Med' ELSE 'Lo' END AS tier, " +
                "       ROUND(COALESCE(t.trb, 0)::numeric, 0) AS total_bal, " +
                "       COALESCE(NULLIF(btrim(h.occupation), ''), 'N/A') AS occupation " +
                fromJoin + whereClause +
                " ORDER BY " + sortExpr + " " + dir + " NULLS LAST, c.customer_id ASC LIMIT ? OFFSET ? ";

            List<Object> queryParams = new ArrayList<>(params);
            queryParams.add(size);
            queryParams.add(offset);

            final int startRank = offset + 1;
            List<ChurnRankingDto.ChurnCustomerItem> items = bag.query(dataSql, queryParams.toArray(), (rs, rowNum) ->
                new ChurnRankingDto.ChurnCustomerItem(
                    startRank + rowNum,
                    rs.getString("cif"),
                    null, // customer name intentionally omitted
                    rs.getString("branch_name"),
                    rs.getDouble("churn_index"),
                    rs.getString("tier"),
                    rs.getDouble("total_bal"),
                    rs.getString("occupation")
                )
            );

            return new ChurnRankingDto(items, page, size, totalElements, totalPages);
        } catch (Exception e) {
            e.printStackTrace();
            return new ChurnRankingDto(new ArrayList<>(), page, size, 0L, 0);
        }
    }

    /**
     * Churn-probability distribution in 10% buckets (0-10% .. 90-100%) straight
     * from churn.churn_result, honouring the optional branch filter so the chart
     * on the ranking page matches the current branch selection. Reuses the same
     * ProbabilityBucketDto used by the overview page. width_bucket(x,0,1,10)
     * returns 1..10; bucket 10 includes the top edge (proba up to 1.0).
     */
    public List<ChurnOverviewDto.ProbabilityBucketDto> getProbabilityDistribution(String branchFilter) {
        List<ChurnOverviewDto.ProbabilityBucketDto> probDist = new ArrayList<>();
        try {
            boolean hasBranch = branchFilter != null && !branchFilter.isBlank()
                && !"Semua Cabang".equalsIgnoreCase(branchFilter.trim())
                && !"All Branches".equalsIgnoreCase(branchFilter.trim());

            StringBuilder sql = new StringBuilder(
                "SELECT width_bucket(c.churn_proba, 0, 1, 10) AS b, COUNT(*) AS cnt " +
                "FROM churn.churn_result c ");
            List<Object> params = new ArrayList<>();
            if (hasBranch) {
                sql.append(" LEFT JOIN ods.h h ON h.customer_id::text = c.customer_id ");
            }
            sql.append(" WHERE c.churn_proba IS NOT NULL ");
            if (hasBranch) {
                sql.append(" AND h.branch_code = ? ");
                params.add(branchFilter.trim());
            }
            sql.append(" GROUP BY b");

            Map<Integer, Integer> bucketCounts = new HashMap<>();
            bag.query(sql.toString(), params.toArray(),
                (RowCallbackHandler) rs -> bucketCounts.put(rs.getInt("b"), rs.getInt("cnt")));
            for (int i = 1; i <= 10; i++) {
                String label = ((i - 1) * 10) + "-" + (i * 10) + "%";
                probDist.add(new ChurnOverviewDto.ProbabilityBucketDto(
                    label, bucketCounts.getOrDefault(i, 0)));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return probDist;
    }

    /**
     * Churn Model Performance, now sourced entirely from bag_demo (ml_eva.*):
     *   - metrics        : ml_eva.churn_model_metrics (AUC, Akurasi, Precision, Recall, F1)
     *   - confusion matrix: ml_eva.churn_confusion_matrix (aktual x prediksi)
     *   - model metadata : ml_eva.churn_model_info (model, library, windows, split)
     *   - model comparison: ml_eva.model_experiment_comparison
     *   - score histogram: churn.churn_result (churn_proba), 5 ranges
     * All via the bag datasource.
     */
    public ChurnModelPerformanceDto getChurnModelPerformance() {
        ChurnModelPerformanceDto dto = new ChurnModelPerformanceDto();

        // 1) Metrics (key-value).
        try {
            java.util.Map<String, Double> m = new java.util.HashMap<>();
            bag.query("SELECT metrik, nilai FROM ml_eva.churn_model_metrics",
                (RowCallbackHandler) rs -> m.put(rs.getString("metrik"), rs.getObject("nilai") != null ? rs.getDouble("nilai") : null));
            if (m.get("Akurasi") != null)  dto.setAccuracy(String.format(java.util.Locale.US, "%.2f%%", m.get("Akurasi") * 100));
            if (m.get("Precision") != null) dto.setPrecision(String.format(java.util.Locale.US, "%.4f", m.get("Precision")));
            if (m.get("Recall") != null)   dto.setRecall(String.format(java.util.Locale.US, "%.4f", m.get("Recall")));
            if (m.get("AUC") != null)      dto.setAucRoc(String.format(java.util.Locale.US, "%.4f", m.get("AUC")));
            if (m.get("F1") != null)       dto.setF1(String.format(java.util.Locale.US, "%.4f", m.get("F1")));
        } catch (Exception e) { e.printStackTrace(); }

        // 2) Confusion matrix.
        try {
            bag.query("SELECT aktual, prediksi, jumlah FROM ml_eva.churn_confusion_matrix",
                (RowCallbackHandler) rs -> {
                    String a = rs.getString("aktual");
                    String p = rs.getString("prediksi");
                    long n = rs.getLong("jumlah");
                    boolean aChurn = a != null && a.equalsIgnoreCase("churn");
                    boolean pChurn = p != null && p.equalsIgnoreCase("churn");
                    if (aChurn && pChurn)        dto.setTp(n);
                    else if (!aChurn && pChurn)  dto.setFp(n);
                    else if (aChurn && !pChurn)  dto.setFn(n);
                    else                         dto.setTn(n);
                });
            // Missed rate = FN / (TP + FN) (actual-churn customers missed).
            if (dto.getTp() != null && dto.getFn() != null) {
                long denom = dto.getTp() + dto.getFn();
                if (denom > 0) dto.setMissedRate(String.format(java.util.Locale.US, "%.1f%%", (dto.getFn() * 100.0) / denom));
            }
        } catch (Exception e) { e.printStackTrace(); }

        // 3) Model metadata.
        try {
            java.util.Map<String, String> info = new java.util.HashMap<>();
            bag.query("SELECT info, nilai FROM ml_eva.churn_model_info",
                (RowCallbackHandler) rs -> info.put(rs.getString("info"), rs.getString("nilai")));
            dto.setModelName(info.get("model"));
            dto.setModelLibrary(info.get("library"));
            dto.setSplit(info.get("split"));
            try { if (info.get("feature_window_bulan") != null) dto.setFeatureWindowMonths(Integer.valueOf(info.get("feature_window_bulan").trim())); } catch (Exception ignore) {}
            try { if (info.get("outcome_window_bulan") != null) dto.setOutcomeWindowMonths(Integer.valueOf(info.get("outcome_window_bulan").trim())); } catch (Exception ignore) {}
        } catch (Exception e) { e.printStackTrace(); }

        // 4) Model comparison.
        try {
            List<ChurnModelPerformanceDto.ModelCompareDto> cmp = new ArrayList<>();
            bag.query("SELECT model, auc, f1, precision, recall, accuracy, terpilih " +
                      "FROM ml_eva.model_experiment_comparison ORDER BY terpilih DESC, auc DESC",
                (RowCallbackHandler) rs -> cmp.add(new ChurnModelPerformanceDto.ModelCompareDto(
                    rs.getString("model"),
                    rs.getObject("auc") != null ? rs.getDouble("auc") : null,
                    rs.getObject("f1") != null ? rs.getDouble("f1") : null,
                    rs.getObject("precision") != null ? rs.getDouble("precision") : null,
                    rs.getObject("recall") != null ? rs.getDouble("recall") : null,
                    rs.getObject("accuracy") != null ? rs.getDouble("accuracy") : null,
                    rs.getInt("terpilih") == 1)));
            dto.setModelComparison(cmp);
        } catch (Exception e) { e.printStackTrace(); }

        // 5) Score distribution (churn_proba) from bag_demo churn.churn_result.
        try {
            Integer total = bag.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_result WHERE churn_proba IS NOT NULL", Integer.class);
            dto.setTotalAnalyzed(total != null ? total : 0);

            List<ChurnModelPerformanceDto.ScoreRangeDto> dist = new ArrayList<>();
            String[] labels = {"0-20%", "20-40%", "40-60%", "60-80%", "80-100%"};
            double[][] ranges = {{0.0, 0.2}, {0.2, 0.4}, {0.4, 0.6}, {0.6, 0.8}, {0.8, 1.01}};
            for (int i = 0; i < labels.length; i++) {
                String op = (i == labels.length - 1) ? "<=" : "<";
                Integer cnt = bag.queryForObject(
                    "SELECT COUNT(*) FROM churn.churn_result WHERE churn_proba >= ? AND churn_proba " + op + " ?",
                    Integer.class, ranges[i][0], ranges[i][1]);
                dist.add(new ChurnModelPerformanceDto.ScoreRangeDto(labels[i], cnt != null ? cnt : 0));
            }
            dto.setScoreDistribution(dist);
        } catch (Exception e) { e.printStackTrace(); }

        return dto;
    }

    public List<String> getAvailableBranches() {
        try {
            // Branch CODES that actually have churn-model customers (bag_demo,
            // ods.h.branch_code). Shows the code, not the name; matches the
            // ranking branch filter which also uses branch_code.
            String sql =
                "SELECT DISTINCT h.branch_code AS bcode " +
                "FROM churn.churn_result c " +
                "JOIN ods.h h ON h.customer_id::text = c.customer_id " +
                "WHERE h.branch_code IS NOT NULL AND TRIM(h.branch_code) <> '' " +
                "ORDER BY bcode";
            return bag.queryForList(sql, String.class);
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    // Total churned customers (prediction=true) — the population for tiering.
    private int getTotalChurn() {
        try {
            // Predicted-churn population from the bag_demo model
            // (churn.churn_result, churn_proba >= 0.85) — same definition and
            // count as the Churn Overview "Predicted Churn" card (9,381).
            Integer t = bag.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_result WHERE churn_proba >= 0.85", Integer.class);
            return t != null ? t : 0;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    // Tier counts derived from a percentage distribution (Hi|Med|Lo) applied to
    // the total churned customers. Lo is the balancer so Hi+Med+Lo == total.
    // hiPct/medPct on 0-100 scale.
    private ChurnThresholdDto tiersFromPct(int hiPct, int medPct) {
        ChurnThresholdDto dto = new ChurnThresholdDto();
        int total = getTotalChurn();
        dto.setTotalNasabah(total);
        int hi = (int) Math.round(total * (hiPct / 100.0));
        int med = (int) Math.round(total * (medPct / 100.0));
        if (hi > total) hi = total;
        if (hi + med > total) med = total - hi;
        int lo = total - hi - med;
        dto.setHighCount(hi);
        dto.setMedCount(med);
        dto.setLowCount(lo);
        // keep the pct on the threshold fields for reference (Hi, Med)
        dto.setLowToMedThreshold(medPct);
        dto.setMedToHighThreshold(hiPct);
        return dto;
    }

    // Churn tier counts from percentage distribution.
    public ChurnThresholdDto getChurnThreshold(int hiPct, int medPct) {
        return tiersFromPct(hiPct, medPct);
    }

    // AUM tier counts from percentage distribution (same churn population = 2053).
    public ChurnThresholdDto getAumThreshold(int hiPct, int medPct) {
        return tiersFromPct(hiPct, medPct);
    }

    // 3x3 matrix distribution using REAL customer counts per cell (Option B).
    //   cell[aumTier][churnTier] = COUNT of churned customers whose AUM tier and
    //   churn tier fall into that bucket. Tier boundaries are percentile cutoffs
    //   derived from the pct distribution (top hiPct% = Hi, next medPct% = Med, rest Lo).
    // This makes the matrix cells consistent with the Hot Target cluster filter,
    // and the 9 cells sum exactly to the churned population.
    public java.util.Map<String, Integer> getMatrixDistribution(int churnHiPct, int churnMedPct, int aumHiPct, int aumMedPct) {
        java.util.Map<String, Integer> result = new java.util.HashMap<>();
        String[] tiers = {"Hi", "Med", "Lo"};
        // initialise all 9 cells to 0
        for (String a : tiers) for (String c : tiers) result.put(a + "_" + c, 0);

        try {
            double churnHiQ = clampQ(1.0 - churnHiPct / 100.0);
            double churnMedQ = clampQ(1.0 - (churnHiPct + churnMedPct) / 100.0);
            double aumHiQ = clampQ(1.0 - aumHiPct / 100.0);
            double aumMedQ = clampQ(1.0 - (aumHiPct + aumMedPct) / 100.0);

            String churnExpr = "\"confidence(true)\"";
            String aumExpr = "(current_saving_balance + current_deposit_balance)";

            // one pass: compute cutoffs, then bucket every churned customer and group.
            String sql = "WITH cut AS ("
                + "  SELECT "
                + "    PERCENTILE_CONT(" + churnHiQ + ") WITHIN GROUP (ORDER BY " + churnExpr + ") AS ch_hi,"
                + "    PERCENTILE_CONT(" + churnMedQ + ") WITHIN GROUP (ORDER BY " + churnExpr + ") AS ch_med,"
                + "    PERCENTILE_CONT(" + aumHiQ + ") WITHIN GROUP (ORDER BY " + aumExpr + ") AS au_hi,"
                + "    PERCENTILE_CONT(" + aumMedQ + ") WITHIN GROUP (ORDER BY " + aumExpr + ") AS au_med"
                + "  FROM churn.pred_result WHERE \"prediction(label_churn)\" = true"
                + ") "
                + "SELECT "
                + "  CASE WHEN " + aumExpr + " >= cut.au_hi THEN 'Hi' "
                + "       WHEN " + aumExpr + " >= cut.au_med THEN 'Med' ELSE 'Lo' END AS aum_tier,"
                + "  CASE WHEN " + churnExpr + " >= cut.ch_hi THEN 'Hi' "
                + "       WHEN " + churnExpr + " >= cut.ch_med THEN 'Med' ELSE 'Lo' END AS churn_tier,"
                + "  COUNT(*) AS cnt "
                + "FROM churn.pred_result c, cut "
                + "WHERE c.\"prediction(label_churn)\" = true "
                + "GROUP BY 1, 2";

            jdbcTemplate.query(sql, rs -> {
                String aumTier = rs.getString("aum_tier");
                String churnTier = rs.getString("churn_tier");
                int cnt = rs.getInt("cnt");
                result.put(aumTier + "_" + churnTier, cnt);
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    private double clampQ(double q) { return Math.max(0.0, Math.min(1.0, q)); }

    // Split total into [hi, med, lo] by percent, lo as balancer.
    private int[] splitCounts(int total, int hiPct, int medPct) {
        int hi = (int) Math.round(total * (hiPct / 100.0));
        int med = (int) Math.round(total * (medPct / 100.0));
        if (hi > total) hi = total;
        if (hi + med > total) med = total - hi;
        int lo = total - hi - med;
        return new int[]{hi, med, lo};
    }
}
