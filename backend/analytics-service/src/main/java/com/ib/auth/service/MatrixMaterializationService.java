package com.ib.auth.service;

import com.ib.auth.dto.MatrixMaterializeDto;
import com.ib.auth.repository.MatrixMaterializationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MatrixMaterializationService {

    private final MatrixMaterializationRepository repo;

    public MatrixMaterializationService(MatrixMaterializationRepository repo) {
        this.repo = repo;
    }

    public MatrixMaterializeDto materialiseChurn(int hiPct, int medPct) {
        return repo.materialiseChurn(hiPct, medPct);
    }

    public MatrixMaterializeDto materialiseAum(int hiPct, int medPct) {
        return repo.materialiseAum(hiPct, medPct);
    }

    public Map<String, Integer> getMatrixFromTable() {
        return repo.getMatrixFromTable();
    }

    public boolean isMatrixReady()   { return repo.isMatrixReady();   }
    public boolean isChurnClassified() { return repo.isChurnClassified(); }
    public boolean isAumClassified()   { return repo.isAumClassified();   }
    public List<String> getAvailableClassifications() { return repo.getAvailableClassifications(); }
    public List<String> getSelectedClassifications() { return repo.getSelectedClassifications(); }

    public int selectClusters(List<String> keys) { return repo.selectClusters(keys); }
}
