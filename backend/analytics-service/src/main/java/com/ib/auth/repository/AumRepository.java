package com.ib.auth.repository;

import com.ib.auth.dto.AumDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

/**
 * TRB (Total Relationship Balance) analytics from the NEW bag_demo database.
 *
 * Per-customer TRB comes from churn.mv_customer_trb (SUM(trb) over ods.trb_score,
 * one row per cif). Branch is joined from ods.h (branch_code) + ods.m_branch.
 * Only customers with TRB > 0 are considered (TRB <= 0 excluded from counts,
 * tiers, ranking, branch distribution). Tier (High/Medium/Low) is derived from
 * the configured pct distribution (TRB_TIER_DISTRIBUTION): top hiPct% Hi, next
 * medPct% Med, remainder Lo, over the TRB > 0 population.
 *
 * Customer name is intentionally NOT returned (the bag model has no name).
 */
@Repository
public class AumRepository {

    private final JdbcTemplate bag;

    public AumRepository(@Qualifier("bagDemoJdbcTemplate") JdbcTemplate bagDemoJdbcTemplate) {
        this.bag = bagDemoJdbcTemplate;
    }

    // Clamp a quantile to the valid [0,1] range.
    private static double clampQ(double q) {
        return Math.max(0.0, Math.min(1.0, q));
    }

    public AumDto.OverviewDto getOverview(int hiPct, int medPct) {
        AumDto.OverviewDto dto = new AumDto.OverviewDto();
        try {
            // Aggregate stats — only customers with a positive TRB are counted.
            bag.query(
                "SELECT COUNT(*) AS cnt, COALESCE(SUM(trb),0) AS total, COALESCE(AVG(trb),0) AS avg, " +
                " COALESCE(MAX(trb),0) AS mx, COALESCE(MIN(trb),0) AS mn " +
                "FROM churn.mv_customer_trb WHERE trb > 0",
                rs -> {
                    dto.setTotalCustomers(rs.getLong("cnt"));
                    dto.setTotalAum(rs.getDouble("total"));
                    dto.setAvgAum(rs.getDouble("avg"));
                    dto.setMaxAum(rs.getDouble("mx"));
                    dto.setMinAum(rs.getDouble("mn"));
                });

            // Tier counts using the configured percentage distribution
            // (TRB_TIER_DISTRIBUTION "Hi|Med|Lo"): Hi = top hiPct% by TRB,
            // Med = next medPct%, Lo = the remainder. Cutoffs are percentiles.
            double hiQ = clampQ(1.0 - hiPct / 100.0);
            double medQ = clampQ(1.0 - (hiPct + medPct) / 100.0);
            bag.query(
                "WITH cut AS (" +
                "  SELECT PERCENTILE_CONT(" + hiQ + ") WITHIN GROUP (ORDER BY trb) AS hi_cut, " +
                "         PERCENTILE_CONT(" + medQ + ") WITHIN GROUP (ORDER BY trb) AS med_cut " +
                "  FROM churn.mv_customer_trb WHERE trb > 0) " +
                "SELECT " +
                "  SUM(CASE WHEN a.trb >= c.hi_cut THEN 1 ELSE 0 END) AS hi, " +
                "  SUM(CASE WHEN a.trb >= c.med_cut AND a.trb < c.hi_cut THEN 1 ELSE 0 END) AS med, " +
                "  SUM(CASE WHEN a.trb < c.med_cut THEN 1 ELSE 0 END) AS lo " +
                "FROM churn.mv_customer_trb a, cut c WHERE a.trb > 0",
                rs -> {
                    dto.setHighCount(rs.getInt("hi"));
                    dto.setMedCount(rs.getInt("med"));
                    dto.setLowCount(rs.getInt("lo"));
                });

            // Branch distribution (top 8 by total TRB). The page shows the branch
            // CODE (not the name), so group by and return h.branch_code directly.
            List<AumDto.BranchAumDto> branches = new ArrayList<>();
            bag.query(
                "SELECT COALESCE(h.branch_code, 'N/A') AS bname, " +
                " COUNT(*) AS cnt, COALESCE(SUM(t.trb),0) AS total " +
                "FROM churn.mv_customer_trb t " +
                "JOIN ods.h h ON h.customer_id = t.cif " +
                "WHERE t.trb > 0 " +
                "GROUP BY COALESCE(h.branch_code, 'N/A') ORDER BY total DESC LIMIT 8",
                (rs, rn) -> new AumDto.BranchAumDto(rs.getString("bname"), rs.getLong("cnt"), rs.getDouble("total"))
            ).forEach(branches::add);
            dto.setBranchDistribution(branches);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return dto;
    }

    public AumDto.RankingResponseDto getRanking(int page, int size, String search, String branch, int hiPct, int medPct) {
        AumDto.RankingResponseDto resp = new AumDto.RankingResponseDto();
        List<AumDto.RankingItemDto> items = new ArrayList<>();
        try {
            // Only rank customers with a positive TRB.
            StringBuilder where = new StringBuilder(" WHERE t.trb > 0 ");
            List<Object> params = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                where.append(" AND t.cif::text LIKE ? ");
                params.add("%" + search.trim() + "%");
            }
            if (branch != null && !branch.isBlank() && !"all".equalsIgnoreCase(branch)
                    && !"Semua Cabang".equalsIgnoreCase(branch.trim())
                    && !"All Branches".equalsIgnoreCase(branch.trim())) {
                where.append(" AND COALESCE(b.name, h.branch_code) = ? ");
                params.add(branch.trim());
            }

            String baseFrom =
                " FROM churn.mv_customer_trb t " +
                " LEFT JOIN ods.h h ON h.customer_id = t.cif " +
                " LEFT JOIN ods.m_branch b ON b.code = h.branch_code ";

            Long total = bag.queryForObject("SELECT COUNT(*) " + baseFrom + where, params.toArray(), Long.class);
            long totalElements = total != null ? total : 0L;

            int offset = page * size;
            String dataSql = "SELECT t.cif::text AS cif, " +
                " COALESCE(b.name, h.branch_code, 'N/A') AS branch, " +
                " t.trb AS aum " +
                baseFrom + where + " ORDER BY t.trb DESC, t.cif ASC LIMIT ? OFFSET ? ";
            List<Object> dataParams = new ArrayList<>(params);
            dataParams.add(size);
            dataParams.add(offset);

            // tier cutoffs from the configured pct distribution (computed once).
            double hiQ = clampQ(1.0 - hiPct / 100.0);
            double medQ = clampQ(1.0 - (hiPct + medPct) / 100.0);
            final double[] cuts = {0, 0};
            bag.query(
                "SELECT PERCENTILE_CONT(" + hiQ + ") WITHIN GROUP (ORDER BY trb) AS hi_cut, " +
                " PERCENTILE_CONT(" + medQ + ") WITHIN GROUP (ORDER BY trb) AS med_cut " +
                "FROM churn.mv_customer_trb WHERE trb > 0",
                rs -> { cuts[0] = rs.getDouble("hi_cut"); cuts[1] = rs.getDouble("med_cut"); });

            bag.query(dataSql, dataParams.toArray(), (rs, rn) -> {
                double aum = rs.getDouble("aum");
                String tier = aum >= cuts[0] ? "Hi" : (aum >= cuts[1] ? "Med" : "Lo");
                // name intentionally omitted (no name in the bag model).
                return new AumDto.RankingItemDto(rs.getString("cif"), null, rs.getString("branch"), aum, tier);
            }).forEach(items::add);

            int totalPages = (int) Math.ceil((double) totalElements / size);
            if (totalPages == 0) totalPages = 1;
            resp.setItems(items);
            resp.setTotalElements((int) totalElements);
            resp.setTotalPages(totalPages);
            resp.setCurrentPage(page);
            resp.setPageSize(size);
        } catch (Exception e) {
            e.printStackTrace();
            resp.setItems(items);
            resp.setTotalElements(0);
            resp.setTotalPages(1);
            resp.setCurrentPage(page);
            resp.setPageSize(size);
        }
        return resp;
    }

    public List<String> getBranches() {
        try {
            // Branches that have TRB>0 customers, named via ods.m_branch.
            return bag.queryForList(
                "SELECT DISTINCT COALESCE(b.name, h.branch_code) AS bname " +
                "FROM churn.mv_customer_trb t " +
                "JOIN ods.h h ON h.customer_id = t.cif " +
                "LEFT JOIN ods.m_branch b ON b.code = h.branch_code " +
                "WHERE t.trb > 0 AND h.branch_code IS NOT NULL AND TRIM(h.branch_code) <> '' " +
                "ORDER BY bname",
                String.class);
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}
