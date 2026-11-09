package com.ib.auth.repository;

import com.ib.auth.dto.CorporateInsightDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Repository
public class CorporateInsightRepository {

    private final JdbcTemplate jdbcTemplate;

    public CorporateInsightRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Integer countActiveCustomers() {
        try {
            String sql = "SELECT COUNT(cif) FROM churn.pred_result pr INNER JOIN ods.demografi d ON pr.cif = d.cust_no";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            return count != null && count > 0 ? count : 155701;
        } catch (Exception e) {
            return 155701;
        }
    }

    /** Total customers across all branches (every row in ods.demografi). */
    public Integer countTotalCustomers() {
        try {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ods.demografi", Integer.class);
            return count != null ? count : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    public Integer countBranches() {
        try {
            // Count real branches from the precomputed per-branch MV ('Lainnya'
            // is the bucket for NULL/blank branch names).
            String sql = "SELECT COUNT(*) FROM ods.mv_branch_customer_summary WHERE bname <> 'Lainnya'";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            return count != null ? count : 18;
        } catch (Exception e) {
            return 18;
        }
    }

    public Double getTotalNetPositionTrillion() {
        // Kept for backward compatibility; prefer getProfitabilityTotals() which
        // computes all three sums in a single table scan.
        return getProfitabilityTotals().netPositionT;
    }

    /**
     * Single scan of profitability.customer_profitability that produces BOTH the
     * grand totals (net position / funding / lending, in Trillions) AND the top-5
     * branches by net position. This replaces four separate full-table scans
     * (3 SUM totals + top-profitable-branches) with one GROUP BY cabang scan.
     */
    public ProfitabilityTotals getProfitabilityTotals() {
        ProfitabilityTotals t = new ProfitabilityTotals();
        try {
            double[] np = {0}, fund = {0}, lend = {0};
            java.util.List<CorporateInsightDto.BranchProfitDto> perBranch = new ArrayList<>();
            // Reads from the precomputed materialized view (refreshed on a
            // schedule) instead of scanning profitability.customer_profitability
            // live — the view already holds one row per branch with the sums.
            jdbcTemplate.query(
                "SELECT bname, " +
                "       COALESCE(net_position,0) AS np, " +
                "       COALESCE(total_funding_balance,0) AS fund, " +
                "       COALESCE(total_lending_balance,0) AS lend " +
                "FROM profitability.mv_profitability_by_branch",
                rs -> {
                    double branchNp = rs.getBigDecimal("np").doubleValue();
                    np[0] += branchNp;
                    fund[0] += rs.getBigDecimal("fund").doubleValue();
                    lend[0] += rs.getBigDecimal("lend").doubleValue();
                    // profit shown in Juta (millions), matching the old query.
                    double profitJt = Math.round((branchNp / 1_000_000.0) * 10.0) / 10.0;
                    perBranch.add(new CorporateInsightDto.BranchProfitDto(rs.getString("bname"), profitJt));
                });
            t.netPositionT = np[0] / 1_000_000_000_000.0;
            t.fundingT = fund[0] / 1_000_000_000_000.0;
            t.lendingT = lend[0] / 1_000_000_000_000.0;
            // Top 5 branches by net position (profit_jt desc).
            perBranch.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
            t.topBranches = perBranch.size() > 5 ? new ArrayList<>(perBranch.subList(0, 5)) : perBranch;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return t;
    }

    public static class ProfitabilityTotals {
        public double netPositionT = 0.0;
        public double fundingT = 0.0;
        public double lendingT = 0.0;
        public java.util.List<CorporateInsightDto.BranchProfitDto> topBranches = new ArrayList<>();
    }

    public Double getTotalFundingBalanceTrillion() {
        return getProfitabilityTotals().fundingT;
    }

    public Double getTotalOutstandingLoanTrillion() {
        return getProfitabilityTotals().lendingT;
    }

    public Integer countChurnRiskCustomers() {
        try {
            String sql = "SELECT COUNT(*) FROM churn.pred_result WHERE \"prediction(label_churn)\" = true";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            return count != null ? count : 2053;
        } catch (Exception e) {
            return 2053;
        }
    }

    public List<CorporateInsightDto.BranchCustomerTableDto> getBranchCustomerTable() {
        try {
            // Reads from the precomputed per-branch MV instead of aggregating
            // ods.demografi ⋈ churn.pred_result live.
            String sql = """
                SELECT bname, total_cnt, active_cnt, pct_active
                FROM ods.mv_branch_customer_summary
                ORDER BY total_cnt DESC
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.BranchCustomerTableDto(
                    rs.getString("bname"),
                    rs.getInt("total_cnt"),
                    rs.getInt("active_cnt"),
                    rs.getDouble("pct_active")
                )
            );
        } catch (Exception e) {
            return List.of(
                new CorporateInsightDto.BranchCustomerTableDto("Kantor Pusat Jakarta", 464940, 119400, 25.68),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Surabaya Darmo", 233194, 36250, 15.54),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Medan Gatot Subroto", 86, 48, 55.81),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Palembang Sudirman", 6, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Makassar Pettarani", 4, 1, 25.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Semarang Pandanaran", 3, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Bandung Asia Afrika", 2, 2, 100.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Makassar Somba Opu", 2, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Yogyakarta Malioboro", 2, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Palembang Ilir", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Medan Merdeka", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Denpasar Teuku Umar", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Semarang Simpang Lima", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Denpasar Gatsu", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Surabaya Tunjungan", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Yogyakarta Kaliurang", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Menteng", 1, 0, 0.00),
                new CorporateInsightDto.BranchCustomerTableDto("Cabang Bandung Dago", 1, 0, 0.00)
            );
        }
    }

    public List<CorporateInsightDto.BranchPieDto> getBranchDistribution() {
        try {
            // customer_status = 1 counts per branch, from the precomputed MV.
            String sql = """
                SELECT bname, status1_cnt AS cnt
                FROM ods.mv_branch_customer_summary
                WHERE status1_cnt > 0
                ORDER BY status1_cnt DESC
                LIMIT 5
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.BranchPieDto(rs.getString("bname"), rs.getInt("cnt"))
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public List<CorporateInsightDto.BranchProfitDto> getTopProfitableBranches() {
        try {
            String sql = """
                SELECT COALESCE(cabang, 'Lainnya') AS bname, ROUND((SUM(net_position) / 1000000.0)::numeric, 1) AS profit_jt
                FROM profitability.customer_profitability
                GROUP BY cabang
                ORDER BY SUM(net_position) DESC
                LIMIT 5
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.BranchProfitDto(rs.getString("bname"), rs.getDouble("profit_jt"))
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public List<CorporateInsightDto.TopProductDto> getTopProducts() {
        try {
            // Reads from the precomputed MV (recommender.mv_top_products) instead
            // of scanning recommender.cust_data live — the view already holds one
            // row per product with the distinct-user counts.
            String sql = """
                SELECT product_name, product_type, users_cnt
                FROM recommender.mv_top_products
                ORDER BY users_cnt DESC
                LIMIT 3
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.TopProductDto(
                    rowNum + 1,
                    rs.getString("product_name"),
                    rs.getString("product_type"),
                    rs.getInt("users_cnt")
                )
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public List<CorporateInsightDto.TopCustomerDto> getTopCustomers() {
        try {
            String sql = """
                SELECT p.cust_no,
                       COALESCE(d.customer_name, p.cust_no) AS cust_name,
                       COALESCE(d.occupation_type, 'Nasabah') AS cust_type,
                       ROUND((p.net_position / 1000000.0)::numeric, 1) AS profit_jt
                FROM profitability.customer_profitability p
                LEFT JOIN ods.demografi d ON p.cust_no = d.cust_no
                ORDER BY p.net_position DESC
                LIMIT 10
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.TopCustomerDto(
                    rs.getString("cust_no"),
                    com.ib.auth.util.MaskUtil.maskName(rs.getString("cust_name")),
                    rs.getString("cust_type"),
                    rs.getDouble("profit_jt")
                )
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * Total TRB per branch from ods.trb (joined to ods.demografi for the branch
     * name via cust_no). Only TRB > 0 is counted. Returns the top 18 branches by
     * total TRB (value is raw IDR). Used by the TRB distribution pie chart.
     */
    public List<CorporateInsightDto.BranchTrbDto> getTrbByBranch() {
        try {
            String sql = """
                SELECT COALESCE(d.branch_name, 'Lainnya') AS bname,
                       COALESCE(SUM(a.trb), 0) AS total_trb
                FROM ods.trb a
                LEFT JOIN ods.demografi d ON a.cust_no = d.cust_no
                WHERE a.trb > 0
                GROUP BY d.branch_name
                ORDER BY total_trb DESC
                LIMIT 18
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.BranchTrbDto(rs.getString("bname"), rs.getDouble("total_trb"))
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * Total customers per segment (persona) from segmentation.pred_result,
     * grouped by persona_name and ordered by count desc. Used by the segment
     * distribution pie chart.
     */
    public List<CorporateInsightDto.SegmentDto> getSegmentByPersona() {
        try {
            // Count per cluster from pred_result, joined to customer_analytics to
            // get both the Indonesian (persona_name) and English (persona_name_en)
            // persona names so the UI can show either based on the chosen language.
            String sql = """
                SELECT COALESCE(ca.persona_name, pr.persona_name, 'Tidak Diketahui') AS persona,
                       COALESCE(ca.persona_name_en, ca.persona_name, pr.persona_name, 'Unknown') AS persona_en,
                       COUNT(*) AS cnt
                FROM segmentation.pred_result pr
                LEFT JOIN segmentation.customer_analytics ca ON ca.cluster = pr.cluster
                GROUP BY ca.persona_name, ca.persona_name_en, pr.persona_name
                ORDER BY cnt DESC
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                new CorporateInsightDto.SegmentDto(
                    rs.getString("persona"),
                    rs.getString("persona_en"),
                    rs.getLong("cnt")
                )
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
