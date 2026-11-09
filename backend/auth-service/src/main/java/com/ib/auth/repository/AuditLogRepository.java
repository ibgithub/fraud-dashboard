package com.ib.auth.repository;

import com.ib.auth.dto.AuditLogDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Repository
public class AuditLogRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuditLogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<AuditLogDto> mapper = (rs, rowNum) -> {
        AuditLogDto a = new AuditLogDto();
        a.setId(rs.getLong("id"));
        a.setActor(rs.getString("actor"));
        a.setAction(rs.getString("action"));
        a.setEntityType(rs.getString("entity_type"));
        a.setEntityId(rs.getString("entity_id"));
        a.setDetail(rs.getString("detail"));
        a.setIpAddress(rs.getString("ip_address"));
        Timestamp ts = rs.getTimestamp("created_at");
        a.setCreatedAt(ts != null ? ts.toString() : null);
        return a;
    };

    public int insert(AuditLogDto log) {
        return jdbcTemplate.update(
                "INSERT INTO auth.audit_log (actor, action, entity_type, entity_id, detail, ip_address) " +
                        "VALUES (?, ?, ?, ?, ?, ?)",
                log.getActor(), log.getAction(), log.getEntityType(),
                log.getEntityId(), log.getDetail(), log.getIpAddress()
        );
    }

    // Build WHERE clause from optional filters: keyword (actor/detail), action.
    private String buildWhere(List<Object> params, String keyword, String action) {
        StringBuilder sb = new StringBuilder(" WHERE 1=1");
        if (keyword != null && !keyword.isBlank()) {
            sb.append(" AND (LOWER(actor) LIKE ? OR LOWER(detail) LIKE ? OR LOWER(entity_type) LIKE ?)");
            String kw = "%" + keyword.toLowerCase() + "%";
            params.add(kw);
            params.add(kw);
            params.add(kw);
        }
        if (action != null && !action.isBlank()) {
            sb.append(" AND UPPER(action) = UPPER(?)");
            params.add(action);
        }
        return sb.toString();
    }

    public List<AuditLogDto> findPaged(int size, int offset, String keyword, String action) {
        List<Object> params = new ArrayList<>();
        String where = buildWhere(params, keyword, action);
        String sql = "SELECT id, actor, action, entity_type, entity_id, detail, ip_address, created_at " +
                "FROM auth.audit_log" + where +
                " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?";
        params.add(size);
        params.add(offset);
        return jdbcTemplate.query(sql, mapper, params.toArray());
    }

    public int countAll(String keyword, String action) {
        List<Object> params = new ArrayList<>();
        String where = buildWhere(params, keyword, action);
        String sql = "SELECT COUNT(*) FROM auth.audit_log" + where;
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, params.toArray());
        return count != null ? count : 0;
    }
}
