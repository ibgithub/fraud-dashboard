// Local Agent
//
// A tiny local HTTP service that:
//   - resolves customer PII (name, address, title, …) from a LOCAL SQLite
//     database, so the web app never gets this data from the server, and
//   - gates its admin UI behind a login verified against the central web API.
//
// Binds to 127.0.0.1 only (loopback). Compiles to a single self-contained .exe
// (SQLite driver, password-ZIP reader and HTML templates are all embedded).
//
// Logs go to the console AND logs/local-agent.log (rotating). PII and passwords
// are never logged.
//
// Routes:
//   GET  /health          liveness + record count          (open)
//   POST /resolve          {"cifs":[...]} -> {"data":{...}} (open)
//   GET  /login            login page
//   POST /login            verify credentials via {server}/api/auth/login
//   GET  /logout           clear the session
//   GET  /admin[...]       admin UI (require login)
//
// See internal/ for the package layout: config, logging, store, pii, auth, server.
package main

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"

	"local-agent/internal/config"
	"local-agent/internal/logging"
	"local-agent/internal/server"
	"local-agent/internal/store"
)

func main() {
	// Console + rotating file logging (logs/local-agent.log next to the exe).
	logWriter := logging.Setup()

	// config.ini (next to the exe) is required and must set `server`.
	cfg, err := config.Load()
	if err != nil {
		fatal("konfigurasi: %v", err)
	}

	st, err := store.Open(cfg.DBPath)
	if err != nil {
		fatal("tidak dapat membuka database %q: %v", cfg.DBPath, err)
	}
	defer st.Close()
	log.Printf("SQLite ready at %s (%d records)", cfg.DBPath, st.Count())

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           server.New(cfg, st, logWriter).Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	loginURL := "http://" + cfg.Addr + "/login"
	log.Printf("Local Agent on http://%s", cfg.Addr)
	log.Printf("  Login + Admin UI: %s", loginURL)
	log.Printf("  Central API (login): %s", cfg.Server)

	// Open the UI in the default browser shortly after startup.
	go openWhenReady(cfg.Addr, loginURL)

	if err := srv.ListenAndServe(); err != nil {
		// Most common cause when double-clicked twice: port already in use.
		fatal("server tidak dapat berjalan di %s: %v\n"+
			"(Kemungkinan Local Agent sudah berjalan. Cukup gunakan jendela yang sudah ada.)",
			cfg.Addr, err)
	}
}

// fatal logs an error and keeps the console window open (waits for Enter) so the
// operator can read the message before it closes, then exits with code 1.
func fatal(format string, args ...any) {
	log.Printf("ERROR: "+format, args...)
	fmt.Fprint(os.Stderr, "\nTerjadi kesalahan. Tekan Enter untuk menutup jendela ini...")
	bufio.NewReader(os.Stdin).ReadString('\n')
	os.Exit(1)
}

// openWhenReady waits until the server accepts connections, then opens url.
func openWhenReady(addr, url string) {
	for i := 0; i < 50; i++ {
		c, err := net.DialTimeout("tcp", addr, 200*time.Millisecond)
		if err == nil {
			c.Close()
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	if err := openBrowser(url); err != nil {
		log.Printf("could not open browser automatically: %v (open %s manually)", err, url)
	}
}

// openBrowser opens url in the user's default browser (Windows/macOS/Linux).
func openBrowser(url string) error {
	switch runtime.GOOS {
	case "windows":
		// rundll32 avoids cmd quoting issues with URLs.
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}
