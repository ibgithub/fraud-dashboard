package com.ib.auth.service;

import com.ib.auth.dto.ChurnModelPerformanceDto;
import com.ib.auth.dto.ChurnOverviewDto;
import com.ib.auth.dto.ChurnRankingDto;
import com.ib.auth.dto.ChurnThresholdDto;
import com.ib.auth.repository.ChurnRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChurnService {

    private final ChurnRepository churnRepository;

    public ChurnService(ChurnRepository churnRepository) {
        this.churnRepository = churnRepository;
    }

    public ChurnOverviewDto getChurnOverview() {
        return churnRepository.getChurnOverview();
    }

    public ChurnRankingDto getChurnRanking(String branch, String keyword, Integer page, Integer size,
                                           String sortBy, String sortDir) {
        return getChurnRanking(branch, keyword, page, size, sortBy, sortDir, null, null);
    }

    public ChurnRankingDto getChurnRanking(String branch, String keyword, Integer page, Integer size,
                                           String sortBy, String sortDir, Double probMin, Double probMax) {
        int p = page != null && page >= 0 ? page : 0;
        int s = size != null && size > 0 ? Math.min(size, 100) : 10;
        return churnRepository.getChurnRankingPaginated(branch, keyword, p, s, sortBy, sortDir, probMin, probMax);
    }

    public List<ChurnOverviewDto.ProbabilityBucketDto> getProbabilityDistribution(String branch) {
        return churnRepository.getProbabilityDistribution(branch);
    }

    public ChurnModelPerformanceDto getChurnModelPerformance() {
        return churnRepository.getChurnModelPerformance();
    }

    public ChurnThresholdDto getChurnThreshold(int hiPct, int medPct) {
        return churnRepository.getChurnThreshold(hiPct, medPct);
    }

    public ChurnThresholdDto getAumThreshold(int hiPct, int medPct) {
        return churnRepository.getAumThreshold(hiPct, medPct);
    }

    public java.util.Map<String, Integer> getMatrixDistribution(int churnHiPct, int churnMedPct, int aumHiPct, int aumMedPct) {
        return churnRepository.getMatrixDistribution(churnHiPct, churnMedPct, aumHiPct, aumMedPct);
    }

    public List<String> getAvailableBranches() {
        return churnRepository.getAvailableBranches();
    }
}
