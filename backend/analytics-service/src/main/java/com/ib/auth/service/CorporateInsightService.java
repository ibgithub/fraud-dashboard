package com.ib.auth.service;

import com.ib.auth.dto.CorporateInsightDto;
import com.ib.auth.repository.CorporateInsightRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

@Service
public class CorporateInsightService {

    private static final Logger log = LoggerFactory.getLogger(CorporateInsightService.class);

    private final CorporateInsightRepository repository;

    public CorporateInsightService(CorporateInsightRepository repository) {
        this.repository = repository;
    }

    private <T> T timed(String name, Supplier<T> call) {
        long t0 = System.currentTimeMillis();
        T result = call.get();
        log.info("[CI-TIMING] {} = {} ms", name, System.currentTimeMillis() - t0);
        return result;
    }

    public CorporateInsightDto getCorporateInsight() {
        long tAll = System.currentTimeMillis();
        CorporateInsightDto dto = new CorporateInsightDto();

        dto.setTotalNasabah(timed("countTotalCustomers", repository::countTotalCustomers));
        dto.setNasabahAktif(timed("countActiveCustomers", repository::countActiveCustomers));
        dto.setCabangCakupan(timed("countBranches", repository::countBranches));

        var profit = timed("getProfitabilityTotals(MV)", repository::getProfitabilityTotals);
        dto.setTotalNetPosition(profit.netPositionT);
        dto.setTotalDanaSimpanan(profit.fundingT);
        dto.setTotalOutstandingLoan(profit.lendingT);
        dto.setTopProfitableBranches(profit.topBranches);
        dto.setNasabahChurnRisk(timed("countChurnRiskCustomers", repository::countChurnRiskCustomers));

        dto.setBranchCustomerTable(timed("getBranchCustomerTable", repository::getBranchCustomerTable));
        dto.setBranchDistribution(timed("getBranchDistribution", repository::getBranchDistribution));
        dto.setTopProducts(timed("getTopProducts", repository::getTopProducts));
        dto.setTopCustomers(timed("getTopCustomers", repository::getTopCustomers));
        dto.setTrbByBranch(timed("getTrbByBranch", repository::getTrbByBranch));
        dto.setSegmentByPersona(timed("getSegmentByPersona", repository::getSegmentByPersona));

        log.info("[CI-TIMING] TOTAL getCorporateInsight = {} ms", System.currentTimeMillis() - tAll);
        return dto;
    }
}
