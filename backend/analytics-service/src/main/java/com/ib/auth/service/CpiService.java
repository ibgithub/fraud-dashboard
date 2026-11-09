package com.ib.auth.service;

import com.ib.auth.dto.CpiHotTargetDto;
import com.ib.auth.repository.CpiRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CpiService {

    private final CpiRepository cpiRepository;

    public CpiService(CpiRepository cpiRepository) {
        this.cpiRepository = cpiRepository;
    }

    public CpiHotTargetDto.ResponseDto getHotTargetData(int page, int size, String search, String branch) {
        return cpiRepository.getHotTargetData(page, size, search, branch);
    }

    public CpiHotTargetDto.ResponseDto getHotTargetData(int page, int size, String search, String branch,
                                                        String clusters, int churnHiPct, int churnMedPct,
                                                        int aumHiPct, int aumMedPct) {
        return cpiRepository.getHotTargetData(page, size, search, branch, clusters, churnHiPct, churnMedPct, aumHiPct, aumMedPct);
    }

    public CpiHotTargetDto.ResponseDto getHotTargetData(int page, int size, String search, String branch,
                                                        String clusters, int churnHiPct, int churnMedPct,
                                                        int aumHiPct, int aumMedPct, String personaCluster) {
        return cpiRepository.getHotTargetData(page, size, search, branch, clusters, churnHiPct, churnMedPct, aumHiPct, aumMedPct, personaCluster);
    }

    public List<String> getAvailableBranches() {
        return cpiRepository.getAvailableBranches();
    }
}
