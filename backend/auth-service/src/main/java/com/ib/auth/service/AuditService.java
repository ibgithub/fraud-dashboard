package com.ib.auth.service;

import com.ib.auth.common.PageResult;
import com.ib.auth.dto.AuditLogDto;
import com.ib.auth.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    /**
     * Record an audit event. Never throws — auditing must not break the
     * business operation it is tracking. The caller IP is resolved
     * automatically from the current HTTP request when available.
     */
    public void record(String actor, String action, String entityType, String entityId, String detail) {
        try {
            AuditLogDto entry = new AuditLogDto();
            entry.setActor(actor);
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId != null ? entityId : null);
            entry.setDetail(truncate(detail, 500));
            entry.setIpAddress(resolveClientIp());
            repository.insert(entry);
        } catch (Exception e) {
            // Swallow — do not let audit failure impact the main flow.
            log.warn("Failed to write audit log (action={}, actor={}): {}", action, actor, e.getMessage());
        }
    }

    public PageResult<AuditLogDto> findPaged(int page, int size, String keyword, String action) {
        int offset = page * size;
        List<AuditLogDto> content = repository.findPaged(size, offset, keyword, action);
        int total = repository.countAll(keyword, action);
        return new PageResult<>(content, page, size, total);
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest req = attrs.getRequest();
            // Behind nginx: prefer X-Forwarded-For (first hop = original client).
            String xff = req.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                int comma = xff.indexOf(',');
                return (comma > 0 ? xff.substring(0, comma) : xff).trim();
            }
            String realIp = req.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) return realIp.trim();
            return req.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }
}
