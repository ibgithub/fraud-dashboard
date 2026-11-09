package com.ib.auth.service;

import com.ib.auth.dto.RecommendationHistoryDto;
import com.ib.auth.repository.RecommendationHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecommendationHistoryService {

    private final RecommendationHistoryRepository repository;

    public RecommendationHistoryService(RecommendationHistoryRepository repository) {
        this.repository = repository;
    }

    public RecommendationHistoryDto.ResponseDto getHistory(
            int page, int size, String searchCif, String searchName,
            String branch, String segmentation, String status, String type) {
        return repository.getHistory(page, size, searchCif, searchName, branch, segmentation, status, type);
    }

    public List<String> getBranches() {
        return repository.getBranches();
    }

    public List<String> getPersonas() {
        return repository.getPersonas();
    }
}
