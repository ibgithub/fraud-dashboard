package com.ib.auth.repository;

import com.ib.auth.dto.FollowUpSettingDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

/**
 * Persistence for ods.follow_up_setting ("Setting Tindak Lanjut").
 *
 * A setting set is scoped by (cluster, branch, cif):
 *   - cif == null  => cluster template (configured on the Bisnis Strategi page)
 *   - cif != null  => per-customer override (configured on the Action Plan page)
 * branch == null means the global (admin / HQ) scope.
 */
@Repository
public class FollowUpSettingRepository {

    private final JdbcTemplate jdbcTemplate;

    public FollowUpSettingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static String norm(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static Date toSqlDate(String iso) {
        String v = norm(iso);
        if (v == null) return null;
        try { return Date.valueOf(v); } catch (Exception e) { return null; }
    }

    /** List parameter rows for a (cluster, branch, cif) scope, ordered by sort_order. */
    public List<FollowUpSettingDto.Item> findByScope(String cluster, String branch, String cif) {
        String b = norm(branch);
        String c = norm(cif);
        String sql = "SELECT id, parameter_name, value, unit, sort_order, is_active, "
                + "to_char(created_date, 'YYYY-MM-DD') AS created_date, "
                + "to_char(execution_date, 'YYYY-MM-DD') AS execution_date "
                + "FROM ods.follow_up_setting "
                + "WHERE cluster = ? "
                + "  AND branch IS NOT DISTINCT FROM ? "
                + "  AND cif IS NOT DISTINCT FROM ? "
                + "ORDER BY sort_order, id";
        return jdbcTemplate.query(sql, new Object[]{cluster, b, c}, (rs, n) ->
                new FollowUpSettingDto.Item(
                        rs.getLong("id"),
                        rs.getString("parameter_name"),
                        rs.getString("value"),
                        rs.getString("unit"),
                        rs.getInt("sort_order"),
                        rs.getBoolean("is_active"),
                        rs.getString("created_date"),
                        rs.getString("execution_date")
                ));
    }

    /**
     * Replace the full set for a (cluster, branch, cif) scope: delete existing
     * rows, then insert the provided items. Single transaction.
     */
    @Transactional
    public List<FollowUpSettingDto.Item> replaceScope(String cluster, String branch, String cif,
                                                       String batchExecutionDate,
                                                       List<FollowUpSettingDto.Item> items, String username) {
        String b = norm(branch);
        String c = norm(cif);

        jdbcTemplate.update(
                "DELETE FROM ods.follow_up_setting "
                        + "WHERE cluster = ? AND branch IS NOT DISTINCT FROM ? AND cif IS NOT DISTINCT FROM ?",
                cluster, b, c);

        if (items != null && !items.isEmpty()) {
            String insert = "INSERT INTO ods.follow_up_setting "
                    + "(cluster, branch, cif, parameter_name, value, unit, sort_order, is_active, execution_date, created_by, updated_by) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            int order = 0;
            List<Object[]> batch = new ArrayList<>();
            for (FollowUpSettingDto.Item it : items) {
                if (it.getParameterName() == null || it.getParameterName().trim().isEmpty()) continue;
                int so = it.getSortOrder() > 0 ? it.getSortOrder() : order;
                boolean active = it.getIsActive() == null || it.getIsActive();
                // Per-item execution date takes precedence; otherwise fall back to batch value.
                Date exec = toSqlDate(it.getExecutionDate() != null ? it.getExecutionDate() : batchExecutionDate);
                batch.add(new Object[]{
                        cluster, b, c,
                        it.getParameterName().trim(),
                        it.getValue(),
                        it.getUnit(),
                        so,
                        active,
                        exec,
                        username, username
                });
                order++;
            }
            if (!batch.isEmpty()) {
                jdbcTemplate.batchUpdate(insert, batch);
            }
        }

        return findByScope(cluster, b, c);
    }
}
