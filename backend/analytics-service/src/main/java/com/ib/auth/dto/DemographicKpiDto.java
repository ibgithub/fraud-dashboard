package com.ib.auth.dto;

public class DemographicKpiDto {
    private int totalNasabahAktif;
    private double totalNasabahAktifChange;
    private int pertumbuhanBulanIni;
    private double pertumbuhanBulanIniChange;
    private long rataRataSaldo;
    private double rataRataSaldoChange;
    private long totalDanaKelolaan;
    private double totalDanaKelolaanChange;

    public DemographicKpiDto() {}

    public int getTotalNasabahAktif() {
        return totalNasabahAktif;
    }

    public void setTotalNasabahAktif(int totalNasabahAktif) {
        this.totalNasabahAktif = totalNasabahAktif;
    }

    public double getTotalNasabahAktifChange() {
        return totalNasabahAktifChange;
    }

    public void setTotalNasabahAktifChange(double totalNasabahAktifChange) {
        this.totalNasabahAktifChange = totalNasabahAktifChange;
    }

    public int getPertumbuhanBulanIni() {
        return pertumbuhanBulanIni;
    }

    public void setPertumbuhanBulanIni(int pertumbuhanBulanIni) {
        this.pertumbuhanBulanIni = pertumbuhanBulanIni;
    }

    public double getPertumbuhanBulanIniChange() {
        return pertumbuhanBulanIniChange;
    }

    public void setPertumbuhanBulanIniChange(double pertumbuhanBulanIniChange) {
        this.pertumbuhanBulanIniChange = pertumbuhanBulanIniChange;
    }

    public long getRataRataSaldo() {
        return rataRataSaldo;
    }

    public void setRataRataSaldo(long rataRataSaldo) {
        this.rataRataSaldo = rataRataSaldo;
    }

    public double getRataRataSaldoChange() {
        return rataRataSaldoChange;
    }

    public void setRataRataSaldoChange(double rataRataSaldoChange) {
        this.rataRataSaldoChange = rataRataSaldoChange;
    }

    public long getTotalDanaKelolaan() {
        return totalDanaKelolaan;
    }

    public void setTotalDanaKelolaan(long totalDanaKelolaan) {
        this.totalDanaKelolaan = totalDanaKelolaan;
    }

    public double getTotalDanaKelolaanChange() {
        return totalDanaKelolaanChange;
    }

    public void setTotalDanaKelolaanChange(double totalDanaKelolaanChange) {
        this.totalDanaKelolaanChange = totalDanaKelolaanChange;
    }
}
