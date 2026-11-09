package com.ib.auth.dto;

import java.util.List;

public class CorporateInsightDto {
    private Integer totalNasabah; // Total customers across all branches
    private Integer nasabahAktif;
    private Integer nasabahDormant; // Dormant customers (shown as sub-line under Total Customers)
    private Integer cabangCakupan;
    private Double totalNetPosition; // Total Net Position (in Trillion IDR)
    private Double totalDanaSimpanan; // Total Funding Balance (in Trillion IDR)
    private Double totalOutstandingLoan; // Total Outstanding Loan (in Trillion IDR)
    private Integer nasabahChurnRisk; // High Risk Churn Count

    private List<BranchCustomerTableDto> branchCustomerTable;
    private List<BranchPieDto> branchDistribution;
    private List<BranchProfitDto> topProfitableBranches;
    private List<TopProductDto> topProducts;
    private List<TopCustomerDto> topCustomers;
    private List<BranchTrbDto> trbByBranch; // Total TRB per branch (raw IDR) from ods.trb
    private List<BranchChurnDto> churnByBranch; // Churn rate (%) per branch from churn.churn_result
    private List<SegmentDto> segmentByPersona; // Customer count per persona/segment (acquisition)
    private List<SegmentDto> segmentByArchetype; // Customer count per retention archetype

    public CorporateInsightDto() {}

    public Integer getTotalNasabah() {
        return totalNasabah;
    }

    public void setTotalNasabah(Integer totalNasabah) {
        this.totalNasabah = totalNasabah;
    }

    public Integer getNasabahDormant() {
        return nasabahDormant;
    }

    public void setNasabahDormant(Integer nasabahDormant) {
        this.nasabahDormant = nasabahDormant;
    }

    public List<BranchTrbDto> getTrbByBranch() {
        return trbByBranch;
    }

    public void setTrbByBranch(List<BranchTrbDto> trbByBranch) {
        this.trbByBranch = trbByBranch;
    }

    public List<BranchChurnDto> getChurnByBranch() {
        return churnByBranch;
    }

    public void setChurnByBranch(List<BranchChurnDto> churnByBranch) {
        this.churnByBranch = churnByBranch;
    }

    public List<SegmentDto> getSegmentByPersona() {
        return segmentByPersona;
    }

    public void setSegmentByPersona(List<SegmentDto> segmentByPersona) {
        this.segmentByPersona = segmentByPersona;
    }

    public List<SegmentDto> getSegmentByArchetype() {
        return segmentByArchetype;
    }

    public void setSegmentByArchetype(List<SegmentDto> segmentByArchetype) {
        this.segmentByArchetype = segmentByArchetype;
    }

    public List<BranchCustomerTableDto> getBranchCustomerTable() {
        return branchCustomerTable;
    }

    public void setBranchCustomerTable(List<BranchCustomerTableDto> branchCustomerTable) {
        this.branchCustomerTable = branchCustomerTable;
    }

    public static class BranchCustomerTableDto {
        private String branchCode;
        private String branchName;
        private Integer totalNasabah;
        private Integer nasabahAktif;
        private Double persentaseAktif;

        public BranchCustomerTableDto() {}

        public BranchCustomerTableDto(String branchName, Integer totalNasabah, Integer nasabahAktif, Double persentaseAktif) {
            this.branchName = branchName;
            this.totalNasabah = totalNasabah;
            this.nasabahAktif = nasabahAktif;
            this.persentaseAktif = persentaseAktif;
        }

        public BranchCustomerTableDto(String branchCode, String branchName, Integer totalNasabah, Integer nasabahAktif, Double persentaseAktif) {
            this.branchCode = branchCode;
            this.branchName = branchName;
            this.totalNasabah = totalNasabah;
            this.nasabahAktif = nasabahAktif;
            this.persentaseAktif = persentaseAktif;
        }

        public String getBranchCode() { return branchCode; }
        public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

        public String getBranchName() { return branchName; }
        public void setBranchName(String branchName) { this.branchName = branchName; }

        public Integer getTotalNasabah() { return totalNasabah; }
        public void setTotalNasabah(Integer totalNasabah) { this.totalNasabah = totalNasabah; }

        public Integer getNasabahAktif() { return nasabahAktif; }
        public void setNasabahAktif(Integer nasabahAktif) { this.nasabahAktif = nasabahAktif; }

        public Double getPersentaseAktif() { return persentaseAktif; }
        public void setPersentaseAktif(Double persentaseAktif) { this.persentaseAktif = persentaseAktif; }
    }

    public Integer getNasabahAktif() {
        return nasabahAktif;
    }

    public void setNasabahAktif(Integer nasabahAktif) {
        this.nasabahAktif = nasabahAktif;
    }

    public Integer getCabangCakupan() {
        return cabangCakupan;
    }

    public void setCabangCakupan(Integer cabangCakupan) {
        this.cabangCakupan = cabangCakupan;
    }

    public Double getTotalNetPosition() {
        return totalNetPosition;
    }

    public void setTotalNetPosition(Double totalNetPosition) {
        this.totalNetPosition = totalNetPosition;
    }

    public Double getTotalDanaSimpanan() {
        return totalDanaSimpanan;
    }

    public void setTotalDanaSimpanan(Double totalDanaSimpanan) {
        this.totalDanaSimpanan = totalDanaSimpanan;
    }

    public Double getTotalOutstandingLoan() {
        return totalOutstandingLoan;
    }

    public void setTotalOutstandingLoan(Double totalOutstandingLoan) {
        this.totalOutstandingLoan = totalOutstandingLoan;
    }

    public Integer getNasabahChurnRisk() {
        return nasabahChurnRisk;
    }

    public void setNasabahChurnRisk(Integer nasabahChurnRisk) {
        this.nasabahChurnRisk = nasabahChurnRisk;
    }

    public List<BranchPieDto> getBranchDistribution() {
        return branchDistribution;
    }

    public void setBranchDistribution(List<BranchPieDto> branchDistribution) {
        this.branchDistribution = branchDistribution;
    }

    public List<BranchProfitDto> getTopProfitableBranches() {
        return topProfitableBranches;
    }

    public void setTopProfitableBranches(List<BranchProfitDto> topProfitableBranches) {
        this.topProfitableBranches = topProfitableBranches;
    }

    public List<TopProductDto> getTopProducts() {
        return topProducts;
    }

    public void setTopProducts(List<TopProductDto> topProducts) {
        this.topProducts = topProducts;
    }

    public List<TopCustomerDto> getTopCustomers() {
        return topCustomers;
    }

    public void setTopCustomers(List<TopCustomerDto> topCustomers) {
        this.topCustomers = topCustomers;
    }

    public static class BranchTrbDto {
        private String code; // branch_code (shown on the X axis)
        private String name;
        private Double value; // total TRB for the branch, raw IDR

        public BranchTrbDto() {}
        public BranchTrbDto(String name, Double value) {
            this.name = name;
            this.value = value;
        }
        public BranchTrbDto(String code, String name, Double value) {
            this.code = code;
            this.name = name;
            this.value = value;
        }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Double getValue() { return value; }
        public void setValue(Double value) { this.value = value; }
    }

    /** Churn rate (%) per branch, plus the raw churn/total counts for tooltips. */
    public static class BranchChurnDto {
        private String code;        // branch_code (shown on the X axis)
        private String name;
        private Double value;       // churn rate (%) = churnCount / total * 100
        private Integer churnCount; // customers with churn_proba > 0.7
        private Integer total;      // total analyzed customers in the branch

        public BranchChurnDto() {}
        public BranchChurnDto(String name, Double value, Integer churnCount, Integer total) {
            this.name = name;
            this.value = value;
            this.churnCount = churnCount;
            this.total = total;
        }
        public BranchChurnDto(String code, String name, Double value, Integer churnCount, Integer total) {
            this.code = code;
            this.name = name;
            this.value = value;
            this.churnCount = churnCount;
            this.total = total;
        }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Double getValue() { return value; }
        public void setValue(Double value) { this.value = value; }
        public Integer getChurnCount() { return churnCount; }
        public void setChurnCount(Integer churnCount) { this.churnCount = churnCount; }
        public Integer getTotal() { return total; }
        public void setTotal(Integer total) { this.total = total; }
    }

    public static class SegmentDto {
        private String name;    // persona name (Indonesian) from segmentation.customer_analytics
        private String nameEn;  // persona name (English) from segmentation.customer_analytics
        private Long value;     // customer count in the segment

        public SegmentDto() {}
        public SegmentDto(String name, String nameEn, Long value) {
            this.name = name;
            this.nameEn = nameEn;
            this.value = value;
        }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getNameEn() { return nameEn; }
        public void setNameEn(String nameEn) { this.nameEn = nameEn; }
        public Long getValue() { return value; }
        public void setValue(Long value) { this.value = value; }
    }

    public static class BranchPieDto {
        private String name;
        private Integer value;

        public BranchPieDto() {}
        public BranchPieDto(String name, Integer value) {
            this.name = name;
            this.value = value;
        }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Integer getValue() { return value; }
        public void setValue(Integer value) { this.value = value; }
    }

    public static class BranchProfitDto {
        private String name;
        private Double value;

        public BranchProfitDto() {}
        public BranchProfitDto(String name, Double value) {
            this.name = name;
            this.value = value;
        }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Double getValue() { return value; }
        public void setValue(Double value) { this.value = value; }
    }

    public static class TopProductDto {
        private Integer rank;
        private String name;
        private String type;   // product_type: Saving / Loan / Deposit
        private Integer users;

        public TopProductDto() {}
        public TopProductDto(Integer rank, String name, String type, Integer users) {
            this.rank = rank;
            this.name = name;
            this.type = type;
            this.users = users;
        }
        public Integer getRank() { return rank; }
        public void setRank(Integer rank) { this.rank = rank; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Integer getUsers() { return users; }
        public void setUsers(Integer users) { this.users = users; }
    }

    public static class TopCustomerDto {
        private String id;
        private String name;
        private String type;
        private Double profit;

        public TopCustomerDto() {}
        public TopCustomerDto(String id, String name, String type, Double profit) {
            this.id = id;
            this.name = name;
            this.type = type;
            this.profit = profit;
        }
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Double getProfit() { return profit; }
        public void setProfit(Double profit) { this.profit = profit; }
    }
}
