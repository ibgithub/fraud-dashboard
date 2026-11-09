package com.ib.auth.dto;

public class MatrixMaterializeDto {
    private int totalRows;
    private int inserted;
    private int updated;
    private String message;

    public MatrixMaterializeDto() {}

    public MatrixMaterializeDto(int totalRows, int inserted, int updated, String message) {
        this.totalRows = totalRows;
        this.inserted = inserted;
        this.updated = updated;
        this.message = message;
    }

    public int getTotalRows()  { return totalRows; }
    public void setTotalRows(int totalRows) { this.totalRows = totalRows; }

    public int getInserted()   { return inserted; }
    public void setInserted(int inserted) { this.inserted = inserted; }

    public int getUpdated()    { return updated; }
    public void setUpdated(int updated) { this.updated = updated; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
