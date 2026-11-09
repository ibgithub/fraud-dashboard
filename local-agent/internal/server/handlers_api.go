package server

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

type resolveRequest struct {
	Cifs []string `json:"cifs"`
}

// readAllLimited reads up to max bytes from r.
func readAllLimited(r io.Reader, max int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, max))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	file, rows, at := s.store.LastImport()
	writeJSON(w, http.StatusOK, map[string]any{
		"status":      "ok",
		"records":     s.store.Count(),
		"last_import": map[string]any{"file": file, "rows": rows, "at": at},
	})
}

func (s *Server) handleResolve(w http.ResponseWriter, r *http.Request) {
	var req resolveRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid JSON body"})
		return
	}
	data, err := s.store.Resolve(req.Cifs)
	if err != nil {
		log.Printf("RESOLVE error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	// Log counts only — never the resolved names/addresses (PII).
	log.Printf("RESOLVE: diminta %d CIF, ditemukan %d", len(req.Cifs), len(data))
	writeJSON(w, http.StatusOK, map[string]any{"data": data})
}
