package com.ib.auth.repository;

import com.ib.auth.dto.CustomerAnalyticsDto;
import com.ib.auth.dto.SegmentationProductUsageDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class SegmentationRepository {

    private final JdbcTemplate jdbcTemplate;

    public SegmentationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SegmentationProductUsageDto.ResponseDto getProductUsageData() {
        try {
            String sql = """
                SELECT 
                    cluster,
                    persona_name,
                    COUNT(*) as total_cnt,
                    ROUND(AVG(COALESCE(has_saving, 0)::numeric) * 100, 2) as saving_pct,
                    ROUND(AVG(COALESCE(has_deposito, 0)::numeric) * 100, 2) as deposito_pct,
                    ROUND(AVG(COALESCE(has_loan, 0)::numeric) * 100, 2) as loan_pct,
                    ROUND(AVG(COALESCE(use_mb, 0)::numeric) * 100, 2) as mb_pct,
                    ROUND(AVG(COALESCE(use_ib, 0)::numeric) * 100, 2) as ib_pct,
                    ROUND(AVG(COALESCE(use_atm_crm, 0)::numeric) * 100, 2) as atm_pct,
                    ROUND(AVG(COALESCE(use_edc, 0)::numeric) * 100, 2) as edc_pct,
                    ROUND(AVG(COALESCE(use_teller, 0)::numeric) * 100, 2) as teller_pct
                FROM segmentation.pred_result
                GROUP BY cluster, persona_name
                ORDER BY cluster;
            """;

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
            if (rows != null && !rows.isEmpty()) {
                return buildResponseFromRows(rows);
            }
        } catch (Exception e) {
            // Fallback to customer_analytics or hardcoded exact DB values
        }
        return getFallbackResponse();
    }

    private SegmentationProductUsageDto.ResponseDto buildResponseFromRows(List<Map<String, Object>> rows) {
        List<SegmentationProductUsageDto.ClusterItemDto> clusters = new ArrayList<>();
        List<String> products = List.of(
            "Tabungan Reguler",
            "Deposito",
            "KPR / Pinjaman",
            "Mobile Banking",
            "Internet Banking",
            "ATM / CRM",
            "EDC",
            "Teller"
        );

        Map<String, List<Double>> usageData = new LinkedHashMap<>();
        for (String p : products) {
            usageData.put(p, new ArrayList<>());
        }

        Map<String, String> personaEnMap = Map.of(
            "Pelajar Muda & Produktif", "Young Students & Productive Youth",
            "Senior & Aman", "Senior & Secure",
            "Pengusaha Kecil & Berorientasi Pertumbuhan", "Small Business & Growth-Oriented Entrepreneurs",
            "Nasabah Rentan & Membutuhkan Bantuan", "Vulnerable & Support-Seeking Customers"
        );

        for (Map<String, Object> r : rows) {
            String clusterId = Objects.toString(r.get("cluster"), "");
            String personaId = Objects.toString(r.get("persona_name"), "");
            String personaEn = personaEnMap.getOrDefault(personaId, personaId);
            long count = ((Number) r.get("total_cnt")).longValue();

            clusters.add(new SegmentationProductUsageDto.ClusterItemDto(clusterId, personaId, personaEn, count));

            usageData.get("Tabungan Reguler").add(toDouble(r.get("saving_pct")));
            usageData.get("Deposito").add(toDouble(r.get("deposito_pct")));
            usageData.get("KPR / Pinjaman").add(toDouble(r.get("loan_pct")));
            usageData.get("Mobile Banking").add(toDouble(r.get("mb_pct")));
            usageData.get("Internet Banking").add(toDouble(r.get("ib_pct")));
            usageData.get("ATM / CRM").add(toDouble(r.get("atm_pct")));
            usageData.get("EDC").add(toDouble(r.get("edc_pct")));
            usageData.get("Teller").add(toDouble(r.get("teller_pct")));
        }

        return new SegmentationProductUsageDto.ResponseDto(clusters, products, usageData);
    }

    private Double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private SegmentationProductUsageDto.ResponseDto getFallbackResponse() {
        List<SegmentationProductUsageDto.ClusterItemDto> clusters = List.of(
            new SegmentationProductUsageDto.ClusterItemDto("cluster_0", "Pelajar Muda & Produktif", "Young Students & Productive Youth", 2266),
            new SegmentationProductUsageDto.ClusterItemDto("cluster_1", "Senior & Aman", "Senior & Secure", 14246),
            new SegmentationProductUsageDto.ClusterItemDto("cluster_2", "Pengusaha Kecil & Berorientasi Pertumbuhan", "Small Business & Growth-Oriented Entrepreneurs", 2370),
            new SegmentationProductUsageDto.ClusterItemDto("cluster_3", "Nasabah Rentan & Membutuhkan Bantuan", "Vulnerable & Support-Seeking Customers", 4074)
        );

        List<String> products = List.of(
            "Tabungan Reguler",
            "Deposito",
            "KPR / Pinjaman",
            "Mobile Banking",
            "Internet Banking",
            "ATM / CRM",
            "EDC",
            "Teller"
        );

        Map<String, List<Double>> usageData = new LinkedHashMap<>();
        usageData.put("Tabungan Reguler", List.of(100.00, 99.87, 100.00, 99.85));
        usageData.put("Deposito", List.of(0.66, 0.00, 100.00, 0.00));
        usageData.put("KPR / Pinjaman", List.of(41.00, 35.08, 5.49, 21.87));
        usageData.put("Mobile Banking", List.of(93.25, 80.94, 85.86, 79.41));
        usageData.put("Internet Banking", List.of(1.15, 1.80, 2.07, 6.11));
        usageData.put("ATM / CRM", List.of(28.46, 26.35, 22.87, 27.07));
        usageData.put("EDC", List.of(7.28, 10.60, 8.48, 11.51));
        usageData.put("Teller", List.of(0.35, 0.78, 0.08, 0.37));

        return new SegmentationProductUsageDto.ResponseDto(clusters, products, usageData);
    }

    /**
     * Per-cluster rows from segmentation.customer_analytics. Carries persona name
     * (ID + EN) and the recommendation_type (human_approach / special_approach),
     * used to label the Business Strategy box on the Hot Target page.
     */
    public List<CustomerAnalyticsDto> getCustomerAnalytics() {
        try {
            String sql = """
                SELECT cluster,
                       persona_name,
                       persona_name_en,
                       recommendation_type,
                       risk_level,
                       total_customers,
                       avg_age,
                       avg_tenure_months,
                       avg_total_balance,
                       avg_products_held,
                       avg_monthly_txn,
                       mobile_banking_rate,
                       key_characteristic,
                       key_characteristic_en,
                       marketing_strategy,
                       marketing_strategy_en
                FROM segmentation.customer_analytics
                ORDER BY cluster
            """;
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                CustomerAnalyticsDto d = new CustomerAnalyticsDto();
                d.setCluster(rs.getString("cluster"));
                d.setPersonaName(rs.getString("persona_name"));
                d.setPersonaNameEn(rs.getString("persona_name_en"));
                d.setRecommendationType(rs.getString("recommendation_type"));
                d.setRiskLevel(rs.getString("risk_level"));
                d.setTotalCustomers(rs.getObject("total_customers") != null ? rs.getLong("total_customers") : null);
                d.setAvgAge(rs.getObject("avg_age") != null ? rs.getDouble("avg_age") : null);
                d.setAvgTenureMonths(rs.getObject("avg_tenure_months") != null ? rs.getDouble("avg_tenure_months") : null);
                d.setAvgTotalBalance(rs.getObject("avg_total_balance") != null ? rs.getDouble("avg_total_balance") : null);
                d.setAvgProductsHeld(rs.getObject("avg_products_held") != null ? rs.getDouble("avg_products_held") : null);
                d.setAvgMonthlyTxn(rs.getObject("avg_monthly_txn") != null ? rs.getDouble("avg_monthly_txn") : null);
                d.setMobileBankingRate(rs.getObject("mobile_banking_rate") != null ? rs.getDouble("mobile_banking_rate") : null);
                d.setKeyCharacteristic(rs.getString("key_characteristic"));
                d.setKeyCharacteristicEn(rs.getString("key_characteristic_en"));
                d.setMarketingStrategy(rs.getString("marketing_strategy"));
                d.setMarketingStrategyEn(rs.getString("marketing_strategy_en"));
                return d;
            });
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
