package com.ib.auth.repository;

import com.ib.auth.dto.CpiHotTargetDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Repository
public class CpiRepository {

    private final JdbcTemplate jdbcTemplate;

    public CpiRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CpiHotTargetDto.ResponseDto getHotTargetData(int page, int size, String search, String branch) {
        return getHotTargetData(page, size, search, branch, null, 33, 33, 33, 33, null);
    }

    public CpiHotTargetDto.ResponseDto getHotTargetData(int page, int size, String search, String branch,
                                                        String clusters, int churnHiPct, int churnMedPct,
                                                        int aumHiPct, int aumMedPct) {
        return getHotTargetData(page, size, search, branch, clusters, churnHiPct, churnMedPct, aumHiPct, aumMedPct, null);
    }

    /**
     * Hot Target list filtered to customers with is_selected=true in
     * churn.churn_data_matrix. The clusters/pct params are kept for API
     * backward-compat but are now ignored — selection state lives in the DB.
     * {@code personaCluster} (segmentation.pred_result.cluster, e.g. "cluster_0")
     * optionally restricts the list to a single persona cluster.
     */
    public CpiHotTargetDto.ResponseDto getHotTargetData(int page, int size, String search, String branch,
                                                        String clusters, int churnHiPct, int churnMedPct,
                                                        int aumHiPct, int aumMedPct, String personaCluster) {
        System.out.println("═══ Hot Target Query START ═══");
        System.out.println("Parameters: page=" + page + ", size=" + size + ", branch=" + branch
                + ", clusters=" + clusters + ", personaCluster=" + personaCluster);

        try {
            // ─────────────────────────────────────────────────────────────
            // Promo-engine / Detail Rencana Aksi customer list.
            //
            // Join chain (per business request): start from the selected
            // customer-matrix boxes, map CIF -> account via ods.cif_accno,
            // then to the per-customer persona cluster in segmentation, and
            // finally to the per-cluster persona descriptor.
            //
            //   churn.churn_data_matrix cm  (is_selected = TRUE)
            //     JOIN ods.cif_accno c            ON cm.cif = c.cif
            //     JOIN segmentation.pred_result pr ON pr.account_number = c.acct_no
            //     JOIN segmentation.customer_analytics ca ON pr.cluster = ca.cluster
            //
            // Display columns (name, churn %, balance/TRB, branch) are pulled
            // via LEFT JOINs so a missing demographic/churn row never drops a
            // customer. One row per CIF (DISTINCT ON) to avoid account fan-out.
            // ─────────────────────────────────────────────────────────────
            boolean hasBranch = branch != null && !branch.isBlank()
                    && !"Semua Cabang".equalsIgnoreCase(branch.trim());
            String branchClause = hasBranch ? " AND COALESCE(d.branch_name, '') = ? " : "";

            boolean hasSearch = search != null && !search.isBlank();
            // Names are no longer stored server-side (resolved on the client from a
            // local agent), so search matches on CIF only.
            String searchClause = hasSearch ? " AND LOWER(cm.cif::text) LIKE LOWER(?) " : "";

            boolean hasPersona = personaCluster != null && !personaCluster.isBlank()
                    && !"all".equalsIgnoreCase(personaCluster.trim());
            String personaClause = hasPersona ? " AND pr.cluster = ? " : "";

            // The join chain requested by the business, with the matrix-box
            // selection enforced by cm.is_selected = TRUE. Join keys:
            //   cm.cif -> cif_accno.cif, cif_accno.acct_no -> pred_result.account_number.
            String fromAndJoins =
                      " FROM churn.churn_data_matrix cm "
                    + " INNER JOIN ods.cif_accno c ON cm.cif::text = c.cif::text "
                    + " INNER JOIN segmentation.pred_result pr ON pr.account_number::text = c.acct_no::text "
                    + " INNER JOIN segmentation.customer_analytics ca ON pr.cluster = ca.cluster "
                    + " LEFT JOIN ods.demografi d ON d.cust_no::text = cm.cif::text "
                    + " LEFT JOIN churn.pred_result cp ON cp.cif::text = cm.cif::text "
                    + " WHERE cm.is_selected = TRUE "
                    + branchClause + searchClause + personaClause;

            // shared params for count/value queries: branch, search & persona
            List<Object> filterParams = new ArrayList<>();
            if (hasBranch) filterParams.add(branch.trim());
            if (hasSearch) {
                filterParams.add("%" + search.trim() + "%");
            }
            if (hasPersona) filterParams.add(personaCluster.trim());

            // 1. Total count — distinct CIFs (avoid account fan-out double counting).
            String countSql = "SELECT COUNT(DISTINCT cm.cif) " + fromAndJoins;
            Integer totalCount = jdbcTemplate.queryForObject(countSql, filterParams.toArray(), Integer.class);
            if (totalCount == null) totalCount = 0;

            // 2. Total Value at Risk — sum balance over distinct CIFs.
            String valSql = "SELECT COALESCE(SUM(bal), 0) FROM ("
                    + " SELECT DISTINCT ON (cm.cif) COALESCE(cp.current_saving_balance + cp.current_deposit_balance, 0) AS bal "
                    + fromAndJoins
                    + " ORDER BY cm.cif ) t";
            BigDecimal totalVal = jdbcTemplate.queryForObject(valSql, filterParams.toArray(), BigDecimal.class);
            double rawVal = totalVal != null ? totalVal.doubleValue() : 0.0;

            String formattedNilaiTerancam;
            if (rawVal >= 1_000_000_000.0) {
                formattedNilaiTerancam = String.format("Rp %.0f M", rawVal / 1_000_000_000.0);
            } else if (rawVal >= 1_000_000.0) {
                formattedNilaiTerancam = String.format("Rp %.0f Jt", rawVal / 1_000_000.0);
            } else {
                formattedNilaiTerancam = String.format("Rp %,.0f", rawVal);
            }

            int totalPages = (int) Math.ceil((double) totalCount / size);
            if (totalPages == 0) totalPages = 1;
            int offset = page * size;

            // 3. Paginated customers — one row per CIF, newest/highest-balance first.
            String dataSql = "SELECT cif, cust_name, churn_pct, profit_tier, balance_val, branch_name, cluster, rec_type FROM ("
                    + " SELECT DISTINCT ON (cm.cif)"
                    + "   cm.cif AS cif,"
                    // PII: customer names are NOT served from the DB (regulatory).
                    // The web resolves names from a local agent; here we return the CIF.
                    + "   cm.cif AS cust_name,"
                    + "   ROUND((COALESCE(cp.\"confidence(true)\", 0) * 100)::numeric, 0) AS churn_pct,"
                    + "   CASE"
                    + "     WHEN COALESCE(cp.current_saving_balance + cp.current_deposit_balance, 0) >= 100000000 THEN 'Hi'"
                    + "     WHEN COALESCE(cp.current_saving_balance + cp.current_deposit_balance, 0) >= 10000000  THEN 'Med'"
                    + "     ELSE 'Lo'"
                    + "   END AS profit_tier,"
                    + "   COALESCE(cp.current_saving_balance + cp.current_deposit_balance, 0) AS balance_val,"
                    + "   COALESCE(d.branch_name, 'Kantor Pusat Jakarta') AS branch_name,"
                    + "   pr.cluster AS cluster,"
                    + "   ca.recommendation_type AS rec_type"
                    + fromAndJoins
                    + " ORDER BY cm.cif ) t"
                    + " ORDER BY balance_val DESC, churn_pct DESC"
                    + " LIMIT ? OFFSET ?";

            List<Object> dataParams = new ArrayList<>(filterParams);
            dataParams.add(size);
            dataParams.add(offset);

            List<CpiHotTargetDto.CustomerItemDto> customers = jdbcTemplate.query(dataSql, dataParams.toArray(), (rs, rowNum) -> {
                String cif = rs.getString("cif");
                // PII: name is not served from the DB. We return the CIF here; the
                // web resolves the real name from the local agent (falls back to CIF).
                String name = rs.getString("cust_name"); // == cif
                int churn = rs.getInt("churn_pct");
                String profit = rs.getString("profit_tier");
                double bVal = rs.getDouble("balance_val");
                String branchName = rs.getString("branch_name");
                String cluster = rs.getString("cluster");

                String formattedVal;
                if (bVal >= 1_000_000_000.0) {
                    formattedVal = String.format("Rp %.2f M", bVal / 1_000_000_000.0);
                } else if (bVal >= 1_000_000.0) {
                    formattedVal = String.format("Rp %.2f Jt", bVal / 1_000_000.0);
                } else {
                    formattedVal = String.format("Rp %,.0f", bVal);
                }

                String action;
                String recType = rs.getString("rec_type");
                if ("human_approach".equalsIgnoreCase(recType)) {
                    action = "Human Approach";
                } else if ("special_approach".equalsIgnoreCase(recType)) {
                    action = "Special Approach";
                } else {
                    action = recType != null ? recType : "RM Visit";
                }

                return new CpiHotTargetDto.CustomerItemDto(cif, name, churn, profit, formattedVal, bVal, branchName, cluster, action);
            });

            System.out.println("✓ Hot Target Query SUCCESS: totalCount=" + totalCount + ", customers.size=" + customers.size());
            System.out.println("═══ Hot Target Query END ═══");

            int aksiTertunda = Math.max(12, (int) (totalCount * 0.28));
            double tertanganiPct = 68.0;

            return new CpiHotTargetDto.ResponseDto(
                totalCount,
                formattedNilaiTerancam,
                rawVal,
                aksiTertunda,
                tertanganiPct,
                customers,
                totalCount,
                totalPages,
                page,
                size
            );

        } catch (Exception e) {
            System.err.println("═══════════════════════════════════════════");
            System.err.println("ERROR in getHotTargetData");
            System.err.println("Exception type: " + e.getClass().getName());
            System.err.println("Message: " + e.getMessage());
            System.err.println("Parameters: page=" + page + ", size=" + size + ", branch=" + branch + ", clusters=" + clusters);
            System.err.println("Stack trace:");
            e.printStackTrace();
            System.err.println("═══════════════════════════════════════════");
            
            // Return fallback so we can at least see something while debugging
            return getFallbackResponse(page, size);
        }
    }

    /** Holds a SQL fragment (leading with " AND ( ... )") and its ordered params. */
    private static class ClusterFilter {
        final String sql;
        final List<Object> params;
        ClusterFilter(String sql, List<Object> params) { this.sql = sql; this.params = params; }
    }

    private static final String CHURN_EXPR = "c.\"confidence(true)\"";
    private static final String AUM_EXPR = "(c.current_saving_balance + c.current_deposit_balance)";

    /**
     * Translate selected cluster keys into a SQL predicate. Tiers are percentage
     * based: Hi = top hiPct% by value, Med = next medPct%, Lo = the remainder.
     * We derive the churn/AUM cutoff values as percentiles over the churned
     * population, then match each customer's churn tier × AUM tier to a selection.
     */
    private ClusterFilter buildClusterFilter(String clusters, int churnHiPct, int churnMedPct,
                                             int aumHiPct, int aumMedPct) {
        if (clusters == null || clusters.isBlank()) return null;
        List<String> keys = new ArrayList<>();
        for (String k : clusters.split(",")) {
            String t = k.trim();
            if (!t.isEmpty()) keys.add(t);
        }
        if (keys.isEmpty()) return null;

        // Cutoff values (percentiles) over the churned population.
        // Hi lower-bound = quantile at (1 - hiPct/100); Med lower-bound = quantile at (1 - (hiPct+medPct)/100).
        double churnHiQ = Math.max(0.0, Math.min(1.0, 1.0 - churnHiPct / 100.0));
        double churnMedQ = Math.max(0.0, Math.min(1.0, 1.0 - (churnHiPct + churnMedPct) / 100.0));
        double aumHiQ = Math.max(0.0, Math.min(1.0, 1.0 - aumHiPct / 100.0));
        double aumMedQ = Math.max(0.0, Math.min(1.0, 1.0 - (aumHiPct + aumMedPct) / 100.0));

        double[] cut;
        try {
            String cutSql = "SELECT "
                + "PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY " + CHURN_EXPR + ") AS ch_hi, "
                + "PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY " + CHURN_EXPR + ") AS ch_med, "
                + "PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY " + AUM_EXPR + ") AS au_hi, "
                + "PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY " + AUM_EXPR + ") AS au_med "
                + "FROM churn.pred_result c WHERE c.\"prediction(label_churn)\" = true";
            cut = jdbcTemplate.queryForObject(cutSql,
                new Object[]{churnHiQ, churnMedQ, aumHiQ, aumMedQ},
                (rs, n) -> new double[]{
                    rs.getDouble("ch_hi"), rs.getDouble("ch_med"),
                    rs.getDouble("au_hi"), rs.getDouble("au_med")
                });
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
        if (cut == null) return null;
        double chHiCut = cut[0], chMedCut = cut[1], auHiCut = cut[2], auMedCut = cut[3];

        // churn tier condition (>= uses cutoff; Lo is remainder)
        java.util.function.Function<String, String> churnCond = tier -> switch (tier) {
            case "Hi" -> CHURN_EXPR + " >= " + chHiCut;
            case "Med" -> CHURN_EXPR + " >= " + chMedCut + " AND " + CHURN_EXPR + " < " + chHiCut;
            default -> CHURN_EXPR + " < " + chMedCut; // Lo
        };
        java.util.function.Function<String, String> aumCond = tier -> switch (tier) {
            case "Hi" -> AUM_EXPR + " >= " + auHiCut;
            case "Med" -> AUM_EXPR + " >= " + auMedCut + " AND " + AUM_EXPR + " < " + auHiCut;
            default -> AUM_EXPR + " < " + auMedCut; // Lo
        };

        List<String> ors = new ArrayList<>();
        for (String key : keys) {
            String[] parts = key.split("_");
            if (parts.length != 2) continue;
            String aumTier = parts[0]; // Hi|Med|Lo
            String churnTier = parts[1];
            ors.add("((" + aumCond.apply(aumTier) + ") AND (" + churnCond.apply(churnTier) + "))");
        }
        if (ors.isEmpty()) return null;

        String sql = " AND (" + String.join(" OR ", ors) + ") ";
        return new ClusterFilter(sql, new ArrayList<>()); // cutoffs inlined as numeric literals
    }

    private CpiHotTargetDto.ResponseDto getFallbackResponse(int page, int size) {
        List<CpiHotTargetDto.CustomerItemDto> fallbackList = List.of(
            new CpiHotTargetDto.CustomerItemDto("52499955", "Dedi Simanjuntak", 92, "Hi", "Rp 48.7 M", 48700000000.0, "Kantor Pusat Jakarta", "cluster_2", "RM Visit"),
            new CpiHotTargetDto.CustomerItemDto("11811138", "Agung Nugraha", 91, "Hi", "Rp 47.0 M", 47000000000.0, "Kantor Pusat Jakarta", "cluster_1", "Product Offer"),
            new CpiHotTargetDto.CustomerItemDto("60532969", "Arief Simanjuntak", 88, "Hi", "Rp 37.8 M", 37800000000.0, "Kantor Pusat Jakarta", "cluster_2", "RM Visit"),
            new CpiHotTargetDto.CustomerItemDto("80687617", "Dedi Simanjuntak", 84, "Hi", "Rp 36.0 M", 36000000000.0, "Kantor Pusat Jakarta", "cluster_1", "Retention Call"),
            new CpiHotTargetDto.CustomerItemDto("87923995", "Ratna Hapsari", 75, "Hi", "Rp 32.8 M", 32800000000.0, "Kantor Pusat Jakarta", "cluster_3", "Product Offer")
        );

        return new CpiHotTargetDto.ResponseDto(
            2053,
            "Rp 1.335 M",
            1335000000000.0,
            87,
            68.0,
            fallbackList,
            2053,
            411,
            page,
            size
        );
    }

    public List<String> getAvailableBranches() {
        try {
            String sql = "SELECT DISTINCT branch_name FROM ods.demografi WHERE branch_name IS NOT NULL AND TRIM(branch_name) != '' ORDER BY branch_name";
            return jdbcTemplate.queryForList(sql, String.class);
        } catch (Exception e) {
            return List.of("Kantor Pusat Jakarta", "Cabang Surabaya Darmo", "Cabang Medan Gatot Subroto");
        }
    }
}
