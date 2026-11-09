package com.ib.auth.repository;

import com.ib.auth.dto.SettingParameterDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SettingParameterRepository {

    private final JdbcTemplate jdbcTemplate;

    public SettingParameterRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<SettingParameterDto> mapper = (rs, rowNum) -> {
        SettingParameterDto p = new SettingParameterDto();
        p.setId(rs.getLong("id"));
        p.setName(rs.getString("name"));
        p.setValue(rs.getString("value"));
        p.setDescription(rs.getString("description"));
        return p;
    };

    public List<SettingParameterDto> findAll() {
        return jdbcTemplate.query(
                "SELECT id, name, value, description FROM auth.setting_parameters ORDER BY name",
                mapper
        );
    }

    public SettingParameterDto findById(Long id) {
        List<SettingParameterDto> list = jdbcTemplate.query(
                "SELECT id, name, value, description FROM auth.setting_parameters WHERE id = ?",
                mapper, id
        );
        return list.isEmpty() ? null : list.get(0);
    }

    public SettingParameterDto findByName(String name) {
        List<SettingParameterDto> list = jdbcTemplate.query(
                "SELECT id, name, value, description FROM auth.setting_parameters WHERE upper(name) = upper(?)",
                mapper, name
        );
        return list.isEmpty() ? null : list.get(0);
    }

    public int insert(SettingParameterDto param, String createdBy) {
        return jdbcTemplate.update(
                "INSERT INTO auth.setting_parameters (name, value, description, created_by) VALUES (?, ?, ?, ?)",
                param.getName(), param.getValue(), param.getDescription(), createdBy
        );
    }

    public int update(SettingParameterDto param, String updatedBy) {
        return jdbcTemplate.update(
                "UPDATE auth.setting_parameters SET name = ?, value = ?, description = ?, updated_by = ?, updated_at = now() WHERE id = ?",
                param.getName(), param.getValue(), param.getDescription(), updatedBy, param.getId()
        );
    }

    public int deleteById(Long id) {
        return jdbcTemplate.update("DELETE FROM auth.setting_parameters WHERE id = ?", id);
    }
}
