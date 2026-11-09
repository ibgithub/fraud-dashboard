package com.ib.auth.repository;

import com.ib.auth.dto.AgeDistributionDto;
import com.ib.auth.dto.BranchDistributionDto;
import com.ib.auth.dto.GenderDistributionDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class DemographicRepository {

    private final JdbcTemplate jdbcTemplate;

    public DemographicRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Count total nasabah aktif (customer_status = 1)
     */
    public int countActiveNasabah() {
        String sql = "SELECT COUNT(*) FROM ods.all_feature WHERE customer_status = 1";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Rata-rata AUM nasabah aktif yang memiliki AUM > 0
     */
    public long avgAum() {
        String sql = "SELECT COALESCE(AVG(aum), 0) FROM ods.all_feature " +
                "WHERE customer_status = 1 AND aum IS NOT NULL AND aum > 0";
        BigDecimal avg = jdbcTemplate.queryForObject(sql, BigDecimal.class);
        return avg != null ? avg.longValue() : 0;
    }

    /**
     * Total AUM (total dana kelolaan) nasabah aktif
     */
    public long totalAum() {
        String sql = "SELECT COALESCE(SUM(aum), 0) FROM ods.all_feature " +
                "WHERE customer_status = 1 AND aum IS NOT NULL";
        BigDecimal total = jdbcTemplate.queryForObject(sql, BigDecimal.class);
        return total != null ? total.longValue() : 0;
    }

    /**
     * Distribusi nasabah per kota, sorted descending by count
     */
    public List<BranchDistributionDto> countByCity() {
        String sql = "SELECT COALESCE(city, 'Tidak Diketahui') AS city_name, COUNT(*) AS cnt " +
                "FROM ods.all_feature " +
                "WHERE customer_status = 1 AND city IS NOT NULL AND TRIM(city) != '' " +
                "GROUP BY city " +
                "ORDER BY cnt DESC";
        return jdbcTemplate.query(sql, (rs, rowNum) ->
                new BranchDistributionDto(rs.getString("city_name"), rs.getInt("cnt"))
        );
    }

    /**
     * Distribusi usia berdasarkan kolom age yang sudah ada
     * Boundary ages (25, 35, 45, 55) masuk ke range bawah
     */
    public List<AgeDistributionDto> countByAgeRange() {
        String sql = """
                SELECT
                    CASE
                        WHEN age >= 18 AND age <= 25 THEN '18-25'
                        WHEN age >= 26 AND age <= 35 THEN '26-35'
                        WHEN age >= 36 AND age <= 45 THEN '36-45'
                        WHEN age >= 46 AND age <= 55 THEN '46-55'
                        WHEN age > 55 THEN '55+'
                    END AS age_range,
                    COUNT(*) AS cnt
                FROM ods.all_feature
                WHERE customer_status = 1 AND age IS NOT NULL AND age >= 18
                GROUP BY age_range
                ORDER BY age_range
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) ->
                new AgeDistributionDto(rs.getString("age_range"), rs.getInt("cnt"))
        );
    }

    /**
     * Distribusi gender: MALE -> Pria, FEMALE -> Wanita
     */
    public List<GenderDistributionDto> countByGender() {
        String sql = """
                SELECT
                    CASE
                        WHEN UPPER(gender) = 'MALE' THEN 'Pria'
                        WHEN UPPER(gender) = 'FEMALE' THEN 'Wanita'
                        ELSE 'Tidak Diketahui'
                    END AS gender_label,
                    COUNT(*) AS cnt
                FROM ods.all_feature
                WHERE customer_status = 1 AND gender IS NOT NULL AND TRIM(gender) != ''
                GROUP BY gender_label
                ORDER BY gender_label
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) ->
                new GenderDistributionDto(rs.getString("gender_label"), rs.getInt("cnt"))
        );
    }
}
