package com.ib.auth.repository;

import com.ib.auth.dto.BranchDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

/**
 * Reads the branch master table (ods.m_branch) from the analytics
 * database (altair_demo).
 */
@Repository
public class BranchRepository {

    private final JdbcTemplate jdbcTemplate;

    public BranchRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<BranchDto> findAll() {
        try {
            return jdbcTemplate.query(
                    "SELECT code, name FROM ods.m_branch ORDER BY name",
                    (rs, rowNum) -> new BranchDto(rs.getString("code"), rs.getString("name"))
            );
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}
