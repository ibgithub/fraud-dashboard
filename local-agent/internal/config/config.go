// Package config loads the agent's runtime configuration from config.ini,
// located next to the executable. config.ini is REQUIRED and must set `server`;
// there are no built-in defaults for it and no command-line overrides. If the
// file is missing a template is written and the agent stops so the operator can
// fill it in.
package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Config is the agent's runtime configuration.
type Config struct {
	Addr        string // listen address (loopback only) — fixed, not configurable
	DBPath      string // path to the SQLite file — in the data/ folder
	AllowOrigin string // CORS allowed origin — always equals Server
	Server      string // central web API base URL (login); REQUIRED from config.ini
}

// Fixed, non-configurable values.
const listenAddr = "127.0.0.1:7777"

// Runtime folders next to the executable (keeps the top folder to just the exe).
const (
	configDir = "config" // holds config.ini
	dataDir   = "data"   // holds pii.db
)

// exeDir returns the directory containing the running executable (or ".").
func exeDir() string {
	if exe, err := os.Executable(); err == nil {
		return filepath.Dir(exe)
	}
	return "."
}

// iniPath is the config file path: <exe>/config/config.ini.
func iniPath() string {
	return filepath.Join(exeDir(), configDir, "config.ini")
}

// Load reads config.ini and returns the configuration. It fails (returns an
// error) when config.ini is missing or does not define a non-empty `server`.
// When the file is missing, a template is written first so the operator can
// edit it, then an error is returned.
func Load() (Config, error) {
	dir := exeDir()
	cfg := Config{
		Addr:   listenAddr,
		DBPath: filepath.Join(dir, dataDir, "pii.db"),
	}

	// Make sure the data folder exists for the SQLite file.
	if err := os.MkdirAll(filepath.Join(dir, dataDir), 0o755); err != nil {
		return Config{}, fmt.Errorf("tidak dapat membuat folder %s: %w", dataDir, err)
	}

	path := iniPath()
	server, err := readServer(path)
	if err != nil {
		return Config{}, err
	}
	if server == "" {
		return Config{}, fmt.Errorf(
			"config.ini tidak memuat 'server'. Edit %s dan isi baris 'server = https://...'", path)
	}

	cfg.Server = server
	cfg.AllowOrigin = server // origin always mirrors the central server
	return cfg, nil
}

// readServer reads the `server` value from an INI file. A missing file causes a
// template to be written and an explanatory error to be returned.
func readServer(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			if werr := writeTemplateINI(path); werr != nil {
				return "", fmt.Errorf("config.ini tidak ditemukan dan gagal dibuat (%s): %w", path, werr)
			}
			return "", fmt.Errorf(
				"config.ini belum ada — sudah dibuatkan template di %s. "+
					"Isi baris 'server = https://...' lalu jalankan agent lagi", path)
		}
		return "", fmt.Errorf("tidak dapat membaca %s: %w", path, err)
	}
	defer f.Close()

	server := ""
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			continue // ignore section headers
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		if strings.ToLower(strings.TrimSpace(key)) == "server" {
			server = strings.Trim(strings.TrimSpace(val), `"`)
		}
	}
	if err := sc.Err(); err != nil {
		return "", fmt.Errorf("gagal membaca %s: %w", path, err)
	}
	return server, nil
}

// writeTemplateINI writes a commented config.ini template with an empty server,
// creating the containing folder (config/) if needed.
func writeTemplateINI(path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	content := `# Konfigurasi Local Agent
# Isi alamat API web pusat (untuk login), lalu jalankan ulang agent.
# Baris diawali '#' adalah komentar. Format: kunci = nilai

# WAJIB diisi. Contoh: server = https://analytics.contoh.co.id
server =
`
	return os.WriteFile(path, []byte(content), 0o644)
}
