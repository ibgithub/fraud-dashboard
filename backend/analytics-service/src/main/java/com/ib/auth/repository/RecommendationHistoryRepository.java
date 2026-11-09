package com.ib.auth.repository;

import com.ib.auth.dto.RecommendationHistoryDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

/**
 * Hybrid data source for the Recommendation History page.
 * Real data:  CIF list from ods.efu_record (distinct), joined to
 *   ods.demografi (name, branch), churn.aum (aum),
 *   segmentation.pred_result (persona_name).
 * Generated (deterministic per CIF, since there is no recommendation
 *   transaction table yet): recommendation name/type, status, and dates.
 */
@Repository
public class RecommendationHistoryRepository {

    private final JdbcTemplate jdbcTemplate;
    // bag_demo datasource — the KPI boxes read the real EFU campaign tables
    // (ods.efu_target / ods.efu_record) from bag_demo, not altair_demo.
    private final JdbcTemplate bag;

    public RecommendationHistoryRepository(JdbcTemplate jdbcTemplate,
                                           @Qualifier("bagDemoJdbcTemplate") JdbcTemplate bagDemoJdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.bag = bagDemoJdbcTemplate;
    }

    // Product & non-product recommendation catalogues (deterministic pick by CIF).
    private static final String[] PRODUCTS = {
        "Deposito Korporasi Valas & IDR Special Rate",
        "Deposito Re-engagement Promo",
        "Cash Management System (CMS) Fee Waiver",
        "Trade Finance LC / SKBDN Discount",
        "Wealth Management Bespoke Portfolio",
    };
    private static final String[] NON_PRODUCTS = {
        "Senior RM Quarterly Relationship Review",
        "Branch Manager Retention Call",
        "Priority Banking Loyalty Program",
        "Customer Experience Satisfaction Survey",
        "Proactive Financial Advisory Session",
    };
    // Concrete product the customer would receive (with its offered rate) for a
    // PRODUCT-type recommendation, picked deterministically by CIF hash — same
    // synthetic approach as recommendationName (there is no rate column in the DB).
    private static final String[][] OFFERED_PRODUCTS = {
        { "DEPOSITO BERJANGKA", "6%" },
        { "DEPOSITO KORPORASI VALAS", "5.5%" },
        { "GIRO BISNIS", "3.25%" },
        { "TABUNGAN BERJANGKA", "4.75%" },
        { "KREDIT MODAL KERJA", "9.5%" },
    };
    // Matrix clusters (C1..C9) with names, indexed 0..8.
    private static final String[] CLUSTERS = {
        "C1 - Sleeping Giant", "C2 - Casual Visitor", "C3 - Ghost",
        "C4 - Steady Earner", "C5 - Swing Voter", "C6 - Fading Signal",
        "C7 - Crown Jewel", "C8 - Restless Star", "C9 - Burning Bridge",
    };

    public RecommendationHistoryDto.ResponseDto getHistory(
            int page, int size, String searchCif, String searchName,
            String branch, String segmentation, String status, String type) {

        RecommendationHistoryDto.ResponseDto resp = new RecommendationHistoryDto.ResponseDto();
        List<RecommendationHistoryDto.RecordDto> records = new ArrayList<>();

        try {
            // ---- Build WHERE clause (real columns only) ----
            // Base is one row per distinct customer that has a relation across
            // segmentation.pred_result + ods.demografi + churn.aum (INNER JOIN),
            // so only customers with full relation are shown.
            StringBuilder where = new StringBuilder(" WHERE 1=1 ");
            List<Object> params = new ArrayList<>();

            if (searchCif != null && !searchCif.isBlank()) {
                where.append(" AND base.cif LIKE ? ");
                params.add("%" + searchCif.trim() + "%");
            }
            if (searchName != null && !searchName.isBlank()) {
                where.append(" AND LOWER(COALESCE(base.customer_name, '')) LIKE LOWER(?) ");
                params.add("%" + searchName.trim() + "%");
            }
            if (branch != null && !branch.isBlank() && !"all".equalsIgnoreCase(branch)
                    && !"Semua Cabang".equalsIgnoreCase(branch.trim())) {
                where.append(" AND base.branch_name = ? ");
                params.add(branch.trim());
            }
            if (segmentation != null && !segmentation.isBlank() && !"all".equalsIgnoreCase(segmentation)) {
                where.append(" AND base.persona_name = ? ");
                params.add(segmentation.trim());
            }
            // type filter (generated): product vs non-product decided by hashtext(cif) even/odd
            if (type != null && !type.isBlank() && !"all".equalsIgnoreCase(type)) {
                if ("product".equalsIgnoreCase(type)) {
                    where.append(" AND (abs(hashtext(base.cif)) % 2) = 0 ");
                } else if ("non-product".equalsIgnoreCase(type)) {
                    where.append(" AND (abs(hashtext(base.cif)) % 2) = 1 ");
                }
            }
            // status filter (generated): bucket by hashtext(cif) % 100
            //   0-49 sent, 50-74 accepted, 75-89 approved, 90-99 rejected
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                String bucketExpr = "(abs(hashtext(base.cif || 'st')) % 100)";
                switch (status.toLowerCase()) {
                    case "sent":     where.append(" AND ").append(bucketExpr).append(" < 50 "); break;
                    case "accepted": where.append(" AND ").append(bucketExpr).append(" >= 50 AND ").append(bucketExpr).append(" < 75 "); break;
                    case "approved": where.append(" AND ").append(bucketExpr).append(" >= 75 AND ").append(bucketExpr).append(" < 90 "); break;
                    case "rejected": where.append(" AND ").append(bucketExpr).append(" >= 90 "); break;
                    default: break;
                }
            }

            // Base sub-select: DISTINCT ON collapses segmentation duplicates to
            // one row per customer. INNER JOINs guarantee full relation only.
            String baseFrom =
                " FROM ( " +
                "   SELECT DISTINCT ON (s.cust_no) " +
                "     s.cust_no AS cif, " +
                "     d.customer_name AS customer_name, " +
                "     d.branch_name AS branch_name, " +
                "     a.aum AS aum, " +
                "     s.persona_name AS persona_name " +
                "   FROM segmentation.pred_result s " +
                "   JOIN ods.demografi d ON s.cust_no = d.cust_no " +
                "   JOIN churn.aum a ON s.cust_no = a.cif::text " +
                "   ORDER BY s.cust_no " +
                " ) base ";

            // ---- Count total ----
            String countSql = "SELECT COUNT(*) FROM ( SELECT base.cif " + baseFrom + where + " ) cnt";
            Long total = jdbcTemplate.queryForObject(countSql, params.toArray(), Long.class);
            long totalElements = total != null ? total : 0L;

            // ---- Summary KPIs from the real EFU campaign tables (bag_demo) ----
            //   Total Sent     = COUNT(ods.efu_target)  (product recommendations sent
            //                     across the 3 send periods in ods.efu_range)
            //   Total Approved = COUNT(ods.efu_record)   (customers who used the
            //                     recommended product)
            //   Rejected       = Sent - Approved
            //   Approval Rate  = Approved / Sent
            // These are campaign-wide totals (not affected by the table's row filters).
            try {
                bag.query(
                    "SELECT (SELECT COUNT(*) FROM ods.efu_target) AS total_sent, " +
                    "       (SELECT COUNT(*) FROM ods.efu_record) AS approved",
                    rs -> {
                        int totalSent = rs.getInt("total_sent");
                        int approved = rs.getInt("approved");
                        int rejected = Math.max(0, totalSent - approved);
                        resp.setTotalSent(totalSent);
                        resp.setTotalApproved(approved);
                        resp.setTotalRejected(rejected);
                        resp.setApprovalRate(totalSent > 0
                            ? Math.round(((double) approved / totalSent) * 1000.0) / 10.0 : 0.0);
                    });
            } catch (Exception e) {
                e.printStackTrace();
            }

            // ---- Paginated data ----
            int offset = page * size;
            String dataSql = "SELECT base.cif AS cif, " +
                " base.customer_name AS customer_name, " +
                " base.branch_name AS branch_name, " +
                " COALESCE(base.aum, 0) AS aum, " +
                " COALESCE(base.persona_name, 'N/A') AS persona_name, " +
                " abs(hashtext(base.cif)) AS h, " +
                " (abs(hashtext(base.cif || 'st')) % 100) AS st_bucket " +
                baseFrom + where +
                " ORDER BY base.cif LIMIT ? OFFSET ? ";
            List<Object> dataParams = new ArrayList<>(params);
            dataParams.add(size);
            dataParams.add(offset);

            jdbcTemplate.query(dataSql, dataParams.toArray(), (rs, rowNum) -> {
                RecommendationHistoryDto.RecordDto r = new RecommendationHistoryDto.RecordDto();
                String cif = rs.getString("cif");
                long h = rs.getLong("h");
                int stBucket = rs.getInt("st_bucket");

                r.setCif(cif);
                r.setCustomerName(com.ib.auth.util.MaskUtil.maskName(rs.getString("customer_name")));
                r.setBranch(rs.getString("branch_name"));
                r.setAum(rs.getDouble("aum"));
                r.setSegmentation(rs.getString("persona_name"));

                boolean isProduct = (h % 2) == 0;
                r.setRecommendationType(isProduct ? "product" : "non-product");
                String[] catalogue = isProduct ? PRODUCTS : NON_PRODUCTS;
                r.setRecommendationName(catalogue[(int) (h % catalogue.length)]);
                r.setMatrixCluster(CLUSTERS[(int) (h % CLUSTERS.length)]);

                // Offered concrete product + rate (product recommendations only).
                if (isProduct) {
                    String[] offered = OFFERED_PRODUCTS[(int) (h % OFFERED_PRODUCTS.length)];
                    r.setOfferedProduct(offered[0]);
                    r.setOfferedRate(offered[1]);
                }

                // Deterministic status + timeline from bucket
                // 0-49 sent, 50-74 accepted, 75-89 approved, 90-99 rejected
                int dayOffset = (int) (h % 5); // 0..4 -> Sep 01..05
                String sentDate = String.format("2026-09-%02d 10:%02d:00", dayOffset + 1, (int) (h % 60));
                r.setSentDate(sentDate);

                String status0;
                if (stBucket < 50) {
                    status0 = "sent";
                } else if (stBucket < 75) {
                    status0 = "accepted";
                    r.setAcceptedDate(String.format("2026-09-%02d 14:%02d:00", dayOffset + 1, (int) (h % 55)));
                } else if (stBucket < 90) {
                    status0 = "approved";
                    r.setAcceptedDate(String.format("2026-09-%02d 14:%02d:00", dayOffset + 1, (int) (h % 55)));
                    r.setApprovedDate(String.format("2026-09-%02d 09:%02d:00", dayOffset + 2, (int) (h % 50)));
                } else {
                    status0 = "rejected";
                    r.setAcceptedDate(String.format("2026-09-%02d 14:%02d:00", dayOffset + 1, (int) (h % 55)));
                    r.setRejectedDate(String.format("2026-09-%02d 11:%02d:00", dayOffset + 2, (int) (h % 45)));
                }
                r.setStatus(status0);
                return r;
            }).forEach(records::add);

            int totalPages = (int) Math.ceil((double) totalElements / size);
            if (totalPages == 0) totalPages = 1;

            resp.setRecords(records);
            resp.setTotalElements((int) totalElements);
            resp.setTotalPages(totalPages);
            resp.setCurrentPage(page);
            resp.setPageSize(size);
        } catch (Exception e) {
            e.printStackTrace();
            resp.setRecords(records);
            resp.setTotalElements(0);
            resp.setTotalPages(1);
            resp.setCurrentPage(page);
            resp.setPageSize(size);
        }

        return resp;
    }

    // Distinct branch names for the filter dropdown.
    public List<String> getBranches() {
        try {
            return jdbcTemplate.queryForList(
                "SELECT DISTINCT branch_name FROM ods.demografi WHERE branch_name IS NOT NULL ORDER BY branch_name",
                String.class);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // Distinct persona names for the filter dropdown.
    public List<String> getPersonas() {
        try {
            return jdbcTemplate.queryForList(
                "SELECT DISTINCT persona_name FROM segmentation.pred_result WHERE persona_name IS NOT NULL ORDER BY persona_name",
                String.class);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
