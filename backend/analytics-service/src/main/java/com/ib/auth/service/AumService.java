package com.ib.auth.service;

import com.ib.auth.dto.AumDto;
import com.ib.auth.repository.AumRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AumService {

    private final AumRepository repository;

    public AumService(AumRepository repository) {
        this.repository = repository;
    }

    public AumDto.OverviewDto getOverview(int hiPct, int medPct) {
        return repository.getOverview(hiPct, medPct);
    }

    public AumDto.RankingResponseDto getRanking(int page, int size, String search, String branch, int hiPct, int medPct) {
        return repository.getRanking(page, size, search, branch, hiPct, medPct);
    }

    public List<String> getBranches() {
        return repository.getBranches();
    }
}
