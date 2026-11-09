// Package logging configures the agent's logger: output goes to BOTH the
// console (so the operator sees activity in the command window) and a rotating
// file under logs/ next to the executable (so errors can be inspected later).
//
// Never log PII (customer names/addresses) or passwords.
package logging

import (
	"io"
	"log"
	"os"
	"path/filepath"

	lumberjack "gopkg.in/natefinch/lumberjack.v2"
)

// Setup points the standard logger at console + logs/local-agent.log (rotating)
// located next to the executable. It returns the io.Writer so the HTTP request
// logger can share the same destinations. Safe to call once at startup.
func Setup() io.Writer {
	dir := exeDir()
	logDir := filepath.Join(dir, "logs")
	// Best-effort: if the logs dir can't be created, fall back to console only.
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		log.SetFlags(log.LstdFlags)
		log.Printf("logging: tidak dapat membuat folder %s: %v (hanya log ke layar)", logDir, err)
		return os.Stdout
	}

	fileWriter := &lumberjack.Logger{
		Filename:   filepath.Join(logDir, "local-agent.log"),
		MaxSize:    5,  // megabytes per file before rotation
		MaxBackups: 5,  // keep up to 5 old files
		MaxAge:     30, // days
		Compress:   true,
	}

	w := io.MultiWriter(os.Stdout, fileWriter)
	log.SetOutput(w)
	log.SetFlags(log.LstdFlags) // date + time
	return w
}

func exeDir() string {
	if exe, err := os.Executable(); err == nil {
		return filepath.Dir(exe)
	}
	return "."
}
