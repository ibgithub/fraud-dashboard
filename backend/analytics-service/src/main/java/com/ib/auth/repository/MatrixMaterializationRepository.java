package com.ib.auth.repository;

import com.ib.auth.dto.MatrixMaterializeDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Materialises per-customer Churn × AUM tier classifications into
 * churn.churn_data_matrix. Population = churned customers (prediction=true).
 *
 * Tier boundaries are percentile-based:
 *   Hi  = top hiPct%  (quantile at 1 - hiPct/100)
 *   Med = next medPct% (quantile at 1 - (hiPct+medPct)/100)
 *   Lo  = the rest
 *
 * Churn tier: based on confidence(true) in churn.pred_result.
 * AUM tier  : based on aum in churn.aum (joined on cif).
 */
@Repository
public class MatrixMaterializationRepository {

    private final JdbcTemplate jdbcTemplate;

    public MatrixMaterializationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------ helpers

    private double clampQ(double q) { return Math.max(0.0, Math.min(1.0, q)); }

    /** Check whether every row has churn_category set. */
    public boolean isChurnClassified() {
        try {
            Integer nullCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix WHERE churn_category IS NULL", Integer.class);
            Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix", Integer.class);
            return total != null && total > 0 && (nullCount == null || nullCount == 0);
        } catch (Exception e) { return false; }
    }

    /** Check whether every row has aum_category set. */
    public boolean isAumClassified() {
        try {
            Integer nullCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix WHERE aum_category IS NULL", Integer.class);
            Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix", Integer.class);
            return total != null && total > 0 && (nullCount == null || nullCount == 0);
        } catch (Exception e) { return false; }
    }

    /** Check whether matrix has at least some classified data (ready to display). */
    public boolean isMatrixReady() {
        try {
            System.out.println("═══ Checking matrix readiness ═══");
            Integer classifiedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix WHERE matrix_classification IS NOT NULL", Integer.class);
            System.out.println("Classified count: " + classifiedCount);
            
            Integer totalCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix", Integer.class);
            System.out.println("Total count: " + totalCount);
            
            boolean ready = classifiedCount != null && classifiedCount > 0;
            System.out.println("Matrix ready: " + ready);
            System.out.println("═══════════════════════════════");
            
            // Matrix is ready if we have at least 1 classified row
            return ready;
        } catch (Exception e) { 
            System.err.println("ERROR checking matrix readiness: " + e.getMessage());
            e.printStackTrace();
            return false; 
        }
    }

    // ------------------------------------------------------------------ task #2: materialise churn category

    /**
     * Materialise churn_category (and recompute matrix_classification where AUM
     * is already set).
     *
     * Steps:
     *  1. Ensure every churned customer is present in churn_data_matrix (upsert on cif).
     *  2. Compute churn tier cutoffs via PERCENTILE_CONT.
     *  3. UPDATE churn_category for all rows.
     *  4. UPDATE matrix_classification = aum_category || '_' || churn_category
     *     where aum_category is not null.
     */
    public MatrixMaterializeDto materialiseChurn(int hiPct, int medPct) {
        try {
            // 1. Insert missing churned customers (cif from pred_result where churn=true).
            //    Use INSERT … ON CONFLICT DO NOTHING so existing rows are untouched.
            int inserted = jdbcTemplate.update("""
                INSERT INTO churn.churn_data_matrix (cif)
                SELECT cif FROM churn.pred_result
                WHERE "prediction(label_churn)" = true
                ON CONFLICT (cif) DO NOTHING
                """);

            // 2. Compute percentile cutoffs for churn tier over churned population.
            double hiQ  = clampQ(1.0 - hiPct  / 100.0);
            double medQ = clampQ(1.0 - (hiPct + medPct) / 100.0);

            double[] cut = jdbcTemplate.queryForObject("""
                SELECT
                  PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY "confidence(true)") AS ch_hi,
                  PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY "confidence(true)") AS ch_med
                FROM churn.pred_result
                WHERE "prediction(label_churn)" = true
                """,
                new Object[]{hiQ, medQ},
                (rs, n) -> new double[]{rs.getDouble("ch_hi"), rs.getDouble("ch_med")});

            if (cut == null) throw new RuntimeException("Cutoff query returned null");
            double chHi = cut[0], chMed = cut[1];

            // 3. Update churn_category for every row (join to pred_result on cif).
            int updated = jdbcTemplate.update("""
                UPDATE churn.churn_data_matrix dm
                SET churn_category = CASE
                      WHEN pr."confidence(true)" >= ? THEN 'hi'
                      WHEN pr."confidence(true)" >= ? THEN 'med'
                      ELSE 'lo'
                    END,
                    updated_ts = NOW()
                FROM churn.pred_result pr
                WHERE dm.cif = pr.cif
                  AND pr."prediction(label_churn)" = true
                """,
                chHi, chMed);

            // 4. Recompute matrix_classification where aum_category is available.
            jdbcTemplate.update("""
                UPDATE churn.churn_data_matrix
                SET matrix_classification = aum_category || '_' || churn_category,
                    updated_ts = NOW()
                WHERE aum_category IS NOT NULL AND churn_category IS NOT NULL
                """);

            Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix", Integer.class);

            return new MatrixMaterializeDto(
                total != null ? total : 0, inserted, updated,
                "Churn category materialised successfully");
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to materialise churn category: " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------ task #3: materialise AUM category

    /**
     * Materialise aum_category (and recompute matrix_classification where churn
     * is already set).
     *
     * Steps:
     *  1. Ensure every churned customer is present (same upsert as above).
     *  2. Compute AUM tier cutoffs via PERCENTILE_CONT over churn.aum joined on
     *     churned customers.
     *  3. UPDATE aum_category for all rows.
     *  4. UPDATE matrix_classification where churn_category is not null.
     */
    public MatrixMaterializeDto materialiseAum(int hiPct, int medPct) {
        try {
            // 1. Insert missing churned customers.
            int inserted = jdbcTemplate.update("""
                INSERT INTO churn.churn_data_matrix (cif)
                SELECT cif FROM churn.pred_result
                WHERE "prediction(label_churn)" = true
                ON CONFLICT (cif) DO NOTHING
                """);

            // 2. Compute AUM percentile cutoffs over the churned population.
            //    Only customers present in churn.aum are considered (others get 'lo').
            double hiQ  = clampQ(1.0 - hiPct  / 100.0);
            double medQ = clampQ(1.0 - (hiPct + medPct) / 100.0);

            double[] cut = jdbcTemplate.queryForObject("""
                SELECT
                  PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY a.aum) AS au_hi,
                  PERCENTILE_CONT(?) WITHIN GROUP (ORDER BY a.aum) AS au_med
                FROM churn.aum a
                INNER JOIN churn.pred_result pr ON pr.cif = a.cif
                  AND pr."prediction(label_churn)" = true
                """,
                new Object[]{hiQ, medQ},
                (rs, n) -> new double[]{rs.getDouble("au_hi"), rs.getDouble("au_med")});

            if (cut == null) throw new RuntimeException("AUM cutoff query returned null");
            double auHi = cut[0], auMed = cut[1];

            // 3. Update aum_category (left join so customers not in churn.aum get 'lo').
            int updated = jdbcTemplate.update("""
                UPDATE churn.churn_data_matrix dm
                SET aum_category = CASE
                      WHEN a.aum >= ? THEN 'hi'
                      WHEN a.aum >= ? THEN 'med'
                      ELSE 'lo'
                    END,
                    updated_ts = NOW()
                FROM churn.pred_result pr
                LEFT JOIN churn.aum a ON a.cif = pr.cif
                WHERE dm.cif = pr.cif
                  AND pr."prediction(label_churn)" = true
                """,
                auHi, auMed);

            // 4. Recompute matrix_classification where churn_category is available.
            jdbcTemplate.update("""
                UPDATE churn.churn_data_matrix
                SET matrix_classification = aum_category || '_' || churn_category,
                    updated_ts = NOW()
                WHERE aum_category IS NOT NULL AND churn_category IS NOT NULL
                """);

            Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM churn.churn_data_matrix", Integer.class);

            return new MatrixMaterializeDto(
                total != null ? total : 0, inserted, updated,
                "AUM category materialised successfully");
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to materialise AUM category: " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------ matrix read (task #4)

    /**
     * Returns 9-cell matrix distribution from churn.churn_data_matrix.
     * Only rows with both categories set are counted.
     */
    public java.util.Map<String, Integer> getMatrixFromTable() {
        java.util.Map<String, Integer> result = new java.util.HashMap<>();
        // initialise all 9 cells
        for (String a : new String[]{"hi","med","lo"})
            for (String c : new String[]{"hi","med","lo"})
                result.put(a + "_" + c, 0);
        try {
            jdbcTemplate.query("""
                SELECT matrix_classification, COUNT(*) AS cnt
                FROM churn.churn_data_matrix
                WHERE matrix_classification IS NOT NULL
                GROUP BY matrix_classification
                """,
                rs -> {
                    result.put(rs.getString("matrix_classification"), rs.getInt("cnt"));
                });
        } catch (Exception e) { e.printStackTrace(); }
        return result;
    }

    /**
     * Returns the list of matrix_classification values that are fully populated
     * so the frontend can tell which keys exist.
     */
    public List<String> getAvailableClassifications() {
        try {
            return jdbcTemplate.queryForList(
                "SELECT DISTINCT matrix_classification FROM churn.churn_data_matrix WHERE matrix_classification IS NOT NULL ORDER BY 1",
                String.class);
        } catch (Exception e) { return List.of(); }
    }

    /**
     * Returns the list of matrix_classification values that are currently selected
     * (is_selected = TRUE).
     */
    public List<String> getSelectedClassifications() {
        try {
            return jdbcTemplate.queryForList(
                "SELECT DISTINCT matrix_classification FROM churn.churn_data_matrix WHERE is_selected = TRUE AND matrix_classification IS NOT NULL ORDER BY 1",
                String.class);
        } catch (Exception e) { return List.of(); }
    }

    /**
     * Mark customers whose matrix_classification is in the given keys as
     * is_selected = true, and everyone else as false.
     *
     * @param keys list of matrix_classification values (lowercase aum_churn),
     *             e.g. ["hi_hi","med_med"]. Empty list clears all selections.
     * @return number of rows now selected.
     */
    public int selectClusters(List<String> keys) {
        try {
            // 1. clear everything
            jdbcTemplate.update("UPDATE churn.churn_data_matrix SET is_selected = FALSE, updated_ts = NOW() WHERE is_selected = TRUE");

            if (keys == null || keys.isEmpty()) return 0;

            // 2. set selected for matching classifications
            String placeholders = keys.stream().map(k -> "?").collect(java.util.stream.Collectors.joining(","));
            int selected = jdbcTemplate.update(
                "UPDATE churn.churn_data_matrix SET is_selected = TRUE, updated_ts = NOW() "
                + "WHERE matrix_classification IN (" + placeholders + ")",
                keys.toArray());
            return selected;
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to update selection: " + e.getMessage(), e);
        }
    }
}
