// Package pii parses the customer CSV and extracts it from a password-protected
// ZIP. It knows the canonical columns (cif, name, address, title) and common
// Indonesian header aliases.
package pii

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	pwzip "github.com/yeka/zip"
)

// normalizeColumn maps common (incl. Indonesian) header aliases to the canonical
// column names: cif, name, address, title. Unknown columns are kept as-is
// (stored in the `extra` JSON and still returned).
func normalizeColumn(h string) string {
	switch h {
	case "cif", "no_cif", "nocif", "customer_id", "cust_no", "cust_id":
		return "cif"
	case "name", "nama", "nama_nasabah", "customer_name", "nama_lengkap":
		return "name"
	case "address", "alamat", "alamat_nasabah":
		return "address"
	case "title", "gelar", "jabatan", "sapaan":
		return "title"
	}
	return h
}

// ParseCSV reads CSV bytes into []map[column]value. First row is the header; a
// "cif" column is required.
func ParseCSV(data []byte) ([]map[string]string, error) {
	r := csv.NewReader(bytes.NewReader(data))
	r.FieldsPerRecord = -1
	r.TrimLeadingSpace = true

	header, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("reading header: %w", err)
	}
	cols := make([]string, len(header))
	hasCif := false
	for i, h := range header {
		h = strings.TrimPrefix(strings.TrimSpace(strings.ToLower(h)), "\ufeff")
		h = normalizeColumn(h) // map ID aliases (nama -> name, alamat -> address, …)
		cols[i] = h
		if h == "cif" {
			hasCif = true
		}
	}
	if !hasCif {
		return nil, fmt.Errorf("CSV must have a 'cif' column; got header %v", header)
	}
	var out []map[string]string
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("reading row: %w", err)
		}
		m := map[string]string{}
		for i, v := range rec {
			if i < len(cols) {
				m[cols[i]] = strings.TrimSpace(v)
			}
		}
		out = append(out, m)
	}
	return out, nil
}

// ExtractCSVFromZip opens a password-protected ZIP (ZipCrypto or AES) and returns
// the bytes of the first .csv entry inside, plus its name.
func ExtractCSVFromZip(zipBytes []byte, password string) ([]byte, string, error) {
	zr, err := pwzip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return nil, "", fmt.Errorf("opening zip: %w", err)
	}
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(f.Name), ".csv") {
			continue
		}
		if f.IsEncrypted() {
			f.SetPassword(password)
		}
		rc, err := f.Open()
		if err != nil {
			// Wrong password or corrupt entry.
			return nil, "", fmt.Errorf("cannot open %q (wrong password?): %w", f.Name, err)
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, "", fmt.Errorf("reading %q (wrong password?): %w", f.Name, err)
		}
		return data, f.Name, nil
	}
	return nil, "", fmt.Errorf("no .csv file found inside the zip")
}
