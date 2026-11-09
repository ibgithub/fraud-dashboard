package com.ib.auth.service;

import com.ib.auth.dto.SettingParameterDto;
import com.ib.auth.repository.SettingParameterRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SettingParameterService {

    private final SettingParameterRepository repository;
    private final AuditService auditService;

    public SettingParameterService(SettingParameterRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    public List<SettingParameterDto> getAll() {
        return repository.findAll();
    }

    public SettingParameterDto getById(Long id) {
        SettingParameterDto param = repository.findById(id);
        if (param == null) {
            throw new RuntimeException("setting.not_found");
        }
        return param;
    }

    public SettingParameterDto getByName(String name) {
        SettingParameterDto param = repository.findByName(name);
        if (param == null) {
            throw new RuntimeException("setting.not_found");
        }
        return param;
    }

    public SettingParameterDto create(SettingParameterDto request, String createdBy) {
        if (repository.findByName(request.getName()) != null) {
            throw new RuntimeException("setting.already_exists");
        }
        repository.insert(request, createdBy);
        SettingParameterDto created = repository.findByName(request.getName());
        auditService.record(createdBy, "SETTING_CREATE", "SETTING",
                created != null ? String.valueOf(created.getId()) : null,
                "Created setting '" + request.getName() + "'");
        return created;
    }

    public SettingParameterDto update(Long id, SettingParameterDto request, String updatedBy) {
        SettingParameterDto existing = repository.findById(id);
        if (existing == null) {
            throw new RuntimeException("setting.not_found");
        }
        SettingParameterDto duplicate = repository.findByName(request.getName());
        if (duplicate != null && !duplicate.getId().equals(id)) {
            throw new RuntimeException("setting.already_exists");
        }
        request.setId(id);
        repository.update(request, updatedBy);
        auditService.record(updatedBy, "SETTING_UPDATE", "SETTING", String.valueOf(id),
                "Updated setting '" + request.getName() + "'");
        return repository.findById(id);
    }

    public void delete(Long id) {
        SettingParameterDto existing = repository.findById(id);
        if (existing == null) {
            throw new RuntimeException("setting.not_found");
        }
        repository.deleteById(id);
        auditService.record(currentActor(), "SETTING_DELETE", "SETTING", String.valueOf(id),
                "Deleted setting '" + existing.getName() + "'");
    }

    private String currentActor() {
        try {
            org.springframework.security.core.Authentication auth =
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }
}
