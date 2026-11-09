// Package store is the agent's local SQLite persistence: the CIF -> PII table
// and an import log. A single connection serializes access to the embedded file.
package store

import (
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Store wraps the SQLite database.
type Store struct {
	db *sql.DB
}

// CustomerRow is one row shown in the Daftar Nasabah table.
type CustomerRow struct {
	Cif, Name, Address, Title string
}

// ImportRow is one entry in the upload history.
type ImportRow struct {
	ID         int
	FileName   string
	RowCount   int
	ImportedAt string
}

// Open opens (creating if needed) the SQLite database at path and runs migrations.
func Open(path string) (*Store, error) {
	// Pragmas via DSN:
	//  - busy_timeout: wait (ms) for a lock instead of failing with SQLITE_BUSY
	//  - journal_mode=WAL: allow reads concurrent with a writer
	//  - synchronous=NORMAL: safe + fast with WAL
	dsn := path + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// A single connection serializes all access to the local file, which fully
	// avoids writer/reader lock contention for this small embedded DB.
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	return s, nil
}

// Close closes the underlying database.
func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS customer_pii (
			cif        TEXT PRIMARY KEY,
			name       TEXT,
			address    TEXT,
			title      TEXT,
			extra      TEXT,          -- JSON for any additional CSV columns
			updated_at TEXT
		);
		CREATE TABLE IF NOT EXISTS import_log (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			file_name   TEXT,
			row_count   INTEGER,
			imported_at TEXT
		);
	`)
	return err
}

// Count returns the number of customers stored.
func (s *Store) Count() int {
	var n int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM customer_pii`).Scan(&n)
	return n
}

// LastImport returns the most recent import's file name, row count and timestamp.
func (s *Store) LastImport() (string, int, string) {
	var file string
	var rows int
	var at string
	_ = s.db.QueryRow(`SELECT file_name, row_count, imported_at FROM import_log ORDER BY id DESC LIMIT 1`).
		Scan(&file, &rows, &at)
	return file, rows, at
}

// ListCustomers returns a page of customers, optionally filtered by a search
// term matching CIF or name. Also returns the total matching count.
func (s *Store) ListCustomers(search string, limit, offset int) ([]CustomerRow, int, error) {
	where := ""
	var args []any
	if strings.TrimSpace(search) != "" {
		where = " WHERE LOWER(cif) LIKE ? OR LOWER(COALESCE(name,'')) LIKE ? "
		like := "%" + strings.ToLower(strings.TrimSpace(search)) + "%"
		args = append(args, like, like)
	}

	var total int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM customer_pii`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	q := `SELECT cif, COALESCE(name,''), COALESCE(address,''), COALESCE(title,'')
	      FROM customer_pii` + where + ` ORDER BY cif LIMIT ? OFFSET ?`
	args = append(args, limit, offset)
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []CustomerRow
	for rows.Next() {
		var c CustomerRow
		if err := rows.Scan(&c.Cif, &c.Name, &c.Address, &c.Title); err != nil {
			return nil, 0, err
		}
		out = append(out, c)
	}
	return out, total, rows.Err()
}

// ListImports returns the import history, newest first.
func (s *Store) ListImports(limit int) ([]ImportRow, error) {
	rows, err := s.db.Query(
		`SELECT id, file_name, row_count, imported_at FROM import_log ORDER BY id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ImportRow
	for rows.Next() {
		var r ImportRow
		if err := rows.Scan(&r.ID, &r.FileName, &r.RowCount, &r.ImportedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// Resolve returns PII for the given CIFs (missing CIFs are omitted).
func (s *Store) Resolve(cifs []string) (map[string]map[string]string, error) {
	out := make(map[string]map[string]string)
	if len(cifs) == 0 {
		return out, nil
	}
	// Build a parameterized IN clause.
	placeholders := make([]string, len(cifs))
	args := make([]any, len(cifs))
	for i, c := range cifs {
		placeholders[i] = "?"
		args[i] = c
	}
	q := `SELECT cif, name, address, title, extra FROM customer_pii WHERE cif IN (` +
		strings.Join(placeholders, ",") + `)`
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var cif string
		var name, address, title, extra sql.NullString
		if err := rows.Scan(&cif, &name, &address, &title, &extra); err != nil {
			return nil, err
		}
		p := map[string]string{}
		if name.Valid && name.String != "" {
			p["name"] = name.String
		}
		if address.Valid && address.String != "" {
			p["address"] = address.String
		}
		if title.Valid && title.String != "" {
			p["title"] = title.String
		}
		// Merge any extra columns stored as JSON.
		if extra.Valid && extra.String != "" {
			var ex map[string]string
			if json.Unmarshal([]byte(extra.String), &ex) == nil {
				for k, v := range ex {
					if v != "" {
						p[k] = v
					}
				}
			}
		}
		out[cif] = p
	}
	return out, rows.Err()
}

// UpsertAll inserts the given rows, updating existing CIFs and inserting new
// ones (existing data NOT belonging to this file is kept). Runs in one
// transaction. Each row is map[column]value; the "cif" column is the key.
// Known columns (name/address/title) go to their own fields; the rest is
// stored as JSON in extra. Returns the number of affected rows.
func (s *Store) UpsertAll(fileName string, records []map[string]string) (int, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Upsert on the cif primary key: update when it already exists, insert otherwise.
	stmt, err := tx.Prepare(`INSERT INTO customer_pii
		(cif, name, address, title, extra, updated_at) VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(cif) DO UPDATE SET
			name       = excluded.name,
			address    = excluded.address,
			title      = excluded.title,
			extra      = excluded.extra,
			updated_at = excluded.updated_at`)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	now := time.Now().Format(time.RFC3339)
	known := map[string]bool{"cif": true, "name": true, "address": true, "title": true}
	affected := 0
	for _, rec := range records {
		cif := strings.TrimSpace(rec["cif"])
		if cif == "" {
			continue
		}
		extra := map[string]string{}
		for k, v := range rec {
			if !known[k] && strings.TrimSpace(v) != "" {
				extra[k] = v
			}
		}
		var extraJSON string
		if len(extra) > 0 {
			b, _ := json.Marshal(extra)
			extraJSON = string(b)
		}
		if _, err := stmt.Exec(cif, rec["name"], rec["address"], rec["title"], extraJSON, now); err != nil {
			return 0, err
		}
		affected++ // counts inserted + updated rows
	}

	if _, err := tx.Exec(`INSERT INTO import_log (file_name, row_count, imported_at) VALUES (?, ?, ?)`,
		fileName, affected, now); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return affected, nil
}
