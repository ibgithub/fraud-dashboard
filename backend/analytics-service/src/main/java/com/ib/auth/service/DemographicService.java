package com.ib.auth.service;

import com.ib.auth.dto.AgeDistributionDto;
import com.ib.auth.dto.BranchDistributionDto;
import com.ib.auth.dto.DemographicKpiDto;
import com.ib.auth.dto.GenderDistributionDto;
import com.ib.auth.repository.DemographicRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DemographicService {

    private final DemographicRepository demographicRepository;

    // 5 fixed age range categories
    private static final List<String> AGE_RANGES = Arrays.asList(
            "18-25", "26-35", "36-45", "46-55", "55+"
    );

    public DemographicService(DemographicRepository demographicRepository) {
        this.demographicRepository = demographicRepository;
    }

    /**
     * Get KPI cards data.
     * Karena ods.all_feature adalah snapshot saat ini (bukan time-series),
     * percentage change di-set 0.0 dan pertumbuhan bulan ini = 0.
     */
    public DemographicKpiDto getKpi() {
        int totalAktif = demographicRepository.countActiveNasabah();
        long rataRataSaldo = demographicRepository.avgAum();
        long totalDanaKelolaan = demographicRepository.totalAum();

        DemographicKpiDto kpi = new DemographicKpiDto();
        kpi.setTotalNasabahAktif(totalAktif);
        kpi.setTotalNasabahAktifChange(0.0);
        kpi.setPertumbuhanBulanIni(0);
        kpi.setPertumbuhanBulanIniChange(0.0);
        kpi.setRataRataSaldo(rataRataSaldo);
        kpi.setRataRataSaldoChange(0.0);
        kpi.setTotalDanaKelolaan(totalDanaKelolaan);
        kpi.setTotalDanaKelolaanChange(0.0);

        return kpi;
    }

    /**
     * Get distribusi nasabah per kota/cabang.
     * Jika limit diberikan, top N ditampilkan dan sisanya diagregasi ke "Lainnya".
     */
    public List<BranchDistributionDto> getBranchDistribution(Integer limit) {
        List<BranchDistributionDto> all = demographicRepository.countByCity();

        if (limit == null || limit <= 0 || limit >= all.size()) {
            return all;
        }

        List<BranchDistributionDto> result = new ArrayList<>(all.subList(0, limit));

        // Aggregate sisanya ke "Lainnya"
        int otherCount = 0;
        for (int i = limit; i < all.size(); i++) {
            otherCount += all.get(i).getNasabahCount();
        }
        if (otherCount > 0) {
            result.add(new BranchDistributionDto("Lainnya", otherCount));
        }

        return result;
    }

    /**
     * Get distribusi usia nasabah.
     * Selalu return 5 kategori meski beberapa bernilai 0.
     */
    public List<AgeDistributionDto> getAgeDistribution() {
        List<AgeDistributionDto> dbResults = demographicRepository.countByAgeRange();

        // Map results by age_range for lookup
        Map<String, Integer> countMap = dbResults.stream()
                .collect(Collectors.toMap(AgeDistributionDto::getAgeRange, AgeDistributionDto::getNasabahCount));

        // Ensure all 5 categories exist in correct order
        List<AgeDistributionDto> result = new ArrayList<>();
        for (String range : AGE_RANGES) {
            result.add(new AgeDistributionDto(range, countMap.getOrDefault(range, 0)));
        }
        return result;
    }

    /**
     * Get distribusi gender nasabah.
     * Selalu return 2 kategori: Pria dan Wanita.
     */
    public List<GenderDistributionDto> getGenderDistribution() {
        List<GenderDistributionDto> dbResults = demographicRepository.countByGender();

        // Map results by gender for lookup
        Map<String, Integer> countMap = dbResults.stream()
                .filter(g -> "Pria".equals(g.getGender()) || "Wanita".equals(g.getGender()))
                .collect(Collectors.toMap(GenderDistributionDto::getGender, GenderDistributionDto::getNasabahCount));

        List<GenderDistributionDto> result = new ArrayList<>();
        result.add(new GenderDistributionDto("Pria", countMap.getOrDefault("Pria", 0)));
        result.add(new GenderDistributionDto("Wanita", countMap.getOrDefault("Wanita", 0)));
        return result;
    }
}
