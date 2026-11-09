package com.ib.auth.repository;

import com.ib.auth.dto.CorporateInsightDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

/**
 * Corporate Insight PILOT - reads from the NEW bag_demo database.
 *
 * TUNED (Option A): instead of scanning the 1M-row ods.mv_h / 816k ods.trb_score
 * on every page load (~5s total), the page now reads tiny pre-computed summary
 * materialized views (each SELECT ~2ms):
 *   ods.mv_ci_kpi    (1 row)   - KPI cards
 *   ods.mv_ci_branch (~61 rows)- per-branch table + TRB
 *   ods.mv_ci_dist   (~11 rows)- segment / status / mb / mb_status distributions
 * See backend/analytics-service/sql/003_corporate_insight_matviews.sql.
 * These MVs must be REFRESHed after ods.mv_h / ods.trb_score refresh.
 *
 * NOT available in bag_demo (placeholders only -> empty + In Progress on UI):
 *   topProducts : up1..up5 / rp1..rp5 are literal "p1".."p5", not real products.
 */
@Repository
public class BagCorporateInsightRepository {

    private final JdbcTemplate bag;

    public BagCorporateInsightRepository(@Qualifier("bagDemoJdbcTemplate") JdbcTemplate bagDemoJdbcTemplate) {
        this.bag = bagDemoJdbcTemplate;
    }

    /** One-row KPI snapshot. Cached in a field per request-less call is cheap (~2ms). */
    private static final class Kpi {
        Integer total;
        Integer dormant;
        Integer aktif;
        Integer cabang;
        Double fundingT;
        Double loanT;
    }

    private Kpi loadKpi() {
        try {
            return bag.queryForObject(
                "SELECT total_nasabah, nasabah_dormant, nasabah_aktif, cabang_cakupan, funding_t, loan_t FROM ods.mv_ci_kpi",
                (rs, n) -> {
                    Kpi k = new Kpi();
                    k.total = rs.getObject("total_nasabah") != null ? rs.getInt("total_nasabah") : null;
                    k.dormant = rs.getObject("nasabah_dormant") != null ? rs.getInt("nasabah_dormant") : null;
                    k.aktif = rs.getObject("nasabah_aktif") != null ? rs.getInt("nasabah_aktif") : null;
                    k.cabang = rs.getObject("cabang_cakupan") != null ? rs.getInt("cabang_cakupan") : null;
                    k.fundingT = rs.getObject("funding_t") != null ? rs.getDouble("funding_t") : null;
                    k.loanT = rs.getObject("loan_t") != null ? rs.getDouble("loan_t") : null;
                    return k;
                });
        } catch (Exception e) {
            return new Kpi();
        }
    }

    public Integer countTotalCustomers() { return loadKpi().total; }
    public Integer countDormantCustomers() { return loadKpi().dormant; }
    public Integer countActiveCustomers() { return loadKpi().aktif; }
    public Integer countBranches() { return loadKpi().cabang; }
    public Double totalFundingTrillion() { return loadKpi().fundingT; }
    public Double totalLoanTrillion() { return loadKpi().loanT; }

    /**
     * Per-branch customer table from ods.mv_ci_branch (pre-aggregated, ~61 rows).
     */
    public List<CorporateInsightDto.BranchCustomerTableDto> getBranchCustomerTable() {
        List<CorporateInsightDto.BranchCustomerTableDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT branch_code, branch_name, total, aktif FROM ods.mv_ci_branch ORDER BY total DESC";
            bag.query(sql, (RowCallbackHandler) rs -> {
                String code = rs.getString("branch_code");
                String branch = rs.getString("branch_name");
                int total = rs.getInt("total");
                int aktif = rs.getInt("aktif");
                double pct = total > 0 ? (aktif * 100.0 / total) : 0.0;
                out.add(new CorporateInsightDto.BranchCustomerTableDto(code, branch, total, aktif, pct));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Total TRB per branch (positive trb only) from ods.mv_ci_branch. The UI
     * slider controls how many branches are shown. Branches with 0 TRB are
     * excluded (match the previous behaviour).
     */
    public List<CorporateInsightDto.BranchTrbDto> getTrbByBranch() {
        List<CorporateInsightDto.BranchTrbDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT branch_code, branch_name, total_trb FROM ods.mv_ci_branch " +
                "WHERE total_trb > 0 ORDER BY total_trb DESC";
            bag.query(sql, (RowCallbackHandler) rs ->
                out.add(new CorporateInsightDto.BranchTrbDto(
                    rs.getString("branch_code"), rs.getString("branch_name"), rs.getDouble("total_trb"))));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Churn rate (%) per branch across ALL branches. Reads the pre-computed
     * summary MV churn.mv_ci_branch_churn (~60 rows, ~7 ms) instead of joining
     * churn.churn_result against the 1M-row ods.h live (~600 ms). Churn rate =
     * share of analyzed customers with churn_proba > 0.7 (the "Predicted Churn"
     * definition). Ordered by churn rate descending so the chart ranks the
     * riskiest branches; the UI slider controls how many branches are shown.
     * See backend/analytics-service/sql/009_corporate_insight_segment_churn_matviews.sql.
     */
    public List<CorporateInsightDto.BranchChurnDto> getChurnByBranch() {
        List<CorporateInsightDto.BranchChurnDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT branch_code, branch_name, total_cnt, churn_cnt, churn_rate " +
                "FROM churn.mv_ci_branch_churn " +
                "ORDER BY churn_rate DESC NULLS LAST, churn_cnt DESC";
            bag.query(sql, (RowCallbackHandler) rs ->
                out.add(new CorporateInsightDto.BranchChurnDto(
                    rs.getString("branch_code"),
                    rs.getString("branch_name"),
                    rs.getDouble("churn_rate"),
                    rs.getInt("churn_cnt"),
                    rs.getInt("total_cnt"))));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Top 3 best-selling products from ods.agg_product_count. Excludes empty
     * product_type and 'loan' (per the business rule), ordered by total holders.
     * Maps product_name -> name, product_type -> type, total_product -> users.
     */
    public List<CorporateInsightDto.TopProductDto> getTopProducts() {
        return getTopProducts(null);
    }

    /**
     * Top 3 best-selling products, optionally filtered by product_type.
     * {@code productType} null/blank/"all" -> all types (still excludes the
     * empty type and 'loan', per the business rule). Otherwise filters to the
     * exact product_type (e.g. 'TABUNGAN', 'DEPOSITO', 'KREDIT', 'GIRO', 'OTHER').
     */
    public List<CorporateInsightDto.TopProductDto> getTopProducts(String productType) {
        List<CorporateInsightDto.TopProductDto> out = new ArrayList<>();
        try {
            boolean filter = productType != null && !productType.isBlank()
                && !"all".equalsIgnoreCase(productType.trim());
            String sql;
            Object[] params;
            if (filter) {
                sql = "SELECT product_name, total_product, product_type " +
                      "FROM ods.agg_product_count apc " +
                      "WHERE apc.product_type = ? " +
                      "ORDER BY apc.total_product DESC LIMIT 3";
                params = new Object[]{ productType.trim() };
            } else {
                sql = "SELECT product_name, total_product, product_type " +
                      "FROM ods.agg_product_count apc " +
                      "WHERE apc.product_type <> '' AND apc.product_type <> 'loan' " +
                      "ORDER BY apc.total_product DESC LIMIT 3";
                params = new Object[]{};
            }
            int[] rank = {0};
            bag.query(sql, params, (RowCallbackHandler) rs -> {
                rank[0]++;
                out.add(new CorporateInsightDto.TopProductDto(
                    rank[0],
                    rs.getString("product_name"),
                    rs.getString("product_type"),
                    rs.getInt("total_product")));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Customer count per PERSONA CLUSTER (needs_cluster 0..4) with real persona
     * names, non-dormant. Reads the pre-computed summary MV
     * segmentation.mv_ci_segment_persona (5 rows, ~7 ms) instead of joining
     * cluster_result against the 1M-row ods.mv_h live (~1.1 s).
     * See backend/analytics-service/sql/009_corporate_insight_segment_churn_matviews.sql.
     */
    public List<CorporateInsightDto.SegmentDto> getSegmentByPersona() {
        List<CorporateInsightDto.SegmentDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT cnt, name_id AS nama_persona, name_en AS nama_persona_en, cid " +
                "FROM segmentation.mv_ci_segment_persona ORDER BY cid";
            bag.query(sql, (RowCallbackHandler) rs -> {
                int cid = rs.getInt("cid");
                String nameId = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (nameId == null || nameId.trim().isEmpty()) nameId = "Cluster " + cid;
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = nameId;
                out.add(new CorporateInsightDto.SegmentDto(nameId, nameEn, rs.getLong("cnt")));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /**
     * Customer count per RETENTION ARCHETYPE (mb_archetype 0..4), non-dormant.
     * Reads the pre-computed summary MV segmentation.mv_ci_segment_archetype
     * (5 rows, ~7 ms) instead of joining cluster_result against the 1M-row
     * ods.mv_h live (~1.0 s). The retention-side counterpart of
     * {@link #getSegmentByPersona()}.
     */
    public List<CorporateInsightDto.SegmentDto> getSegmentByArchetype() {
        List<CorporateInsightDto.SegmentDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT cnt, name_id AS nama_persona, name_en AS nama_persona_en, aid " +
                "FROM segmentation.mv_ci_segment_archetype ORDER BY aid";
            bag.query(sql, (RowCallbackHandler) rs -> {
                int aid = rs.getInt("aid");
                String nameId = rs.getString("nama_persona");
                String nameEn = rs.getString("nama_persona_en");
                if (nameId == null || nameId.trim().isEmpty()) nameId = "Archetype " + aid;
                if (nameEn == null || nameEn.trim().isEmpty()) nameEn = nameId;
                out.add(new CorporateInsightDto.SegmentDto(nameId, nameEn, rs.getLong("cnt")));
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }

    /** Customer status distribution (Active/Inactive) from ods.mv_ci_dist. */
    public List<CorporateInsightDto.SegmentDto> getStatusDistribution() {
        return loadDist("status");
    }

    /** Mobile Banking adoption (Y/N) from ods.mv_ci_dist. */
    public List<CorporateInsightDto.SegmentDto> getMobileBankingDistribution() {
        return loadDist("mb");
    }

    /** MB activity status (Active/Inactive, mb='Y' only) from ods.mv_ci_dist. */
    public List<CorporateInsightDto.SegmentDto> getMobileBankingStatusDistribution() {
        return loadDist("mb_status");
    }

    /** Load one distribution metric from the summary MV, ordered for display. */
    private List<CorporateInsightDto.SegmentDto> loadDist(String metric) {
        List<CorporateInsightDto.SegmentDto> out = new ArrayList<>();
        try {
            String sql =
                "SELECT label_id, label_en, cnt FROM ods.mv_ci_dist " +
                "WHERE metric = ? ORDER BY sort_order";
            bag.query(sql, (RowCallbackHandler) rs ->
                out.add(new CorporateInsightDto.SegmentDto(
                    rs.getString("label_id"), rs.getString("label_en"), rs.getLong("cnt"))),
                metric);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out;
    }
}
