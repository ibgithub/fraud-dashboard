package com.ib.auth.service;

import com.ib.auth.dto.FollowUpSettingDto;
import com.ib.auth.repository.FollowUpSettingRepository;
import com.ib.auth.security.JwtUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FollowUpSettingService {

    private final FollowUpSettingRepository repository;

    public FollowUpSettingService(FollowUpSettingRepository repository) {
        this.repository = repository;
    }

    public List<FollowUpSettingDto.Item> getSettings(String cluster, String branch, String cif) {
        return repository.findByScope(cluster, branch, cif);
    }

    public List<FollowUpSettingDto.Item> saveSettings(FollowUpSettingDto.SaveRequest req) {
        return repository.replaceScope(req.getCluster(), req.getBranch(), req.getCif(),
                req.getExecutionDate(), req.getItems(), currentUsername());
    }

    private String currentUsername() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof JwtUser ju) {
                return ju.getUsername();
            }
        } catch (Exception ignored) { }
        return "system";
    }
}
