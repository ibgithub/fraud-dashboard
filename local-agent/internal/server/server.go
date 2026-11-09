// Package server wires the agent's HTTP routes (chi) and handlers together.
package server

import (
	"io"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"local-agent/internal/auth"
	"local-agent/internal/config"
	"local-agent/internal/store"
)

// Server holds the dependencies shared by all handlers.
type Server struct {
	cfg       config.Config
	store     *store.Store
	sessions  *auth.SessionStore
	auth      *auth.Client
	logWriter io.Writer
}

// New builds a Server. logWriter is where HTTP request logs are written
// (typically console + rotating file).
func New(cfg config.Config, st *store.Store, logWriter io.Writer) *Server {
	return &Server{
		cfg:       cfg,
		store:     st,
		sessions:  auth.NewSessionStore(),
		auth:      auth.NewClient(cfg.Server),
		logWriter: logWriter,
	}
}

// Handler returns the fully-wired HTTP handler.
func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()

	// Log every request (method, path, status, duration) to the shared logger.
	reqLogger := middleware.RequestLogger(&middleware.DefaultLogFormatter{
		Logger:  log.New(s.logWriter, "", log.LstdFlags),
		NoColor: true,
	})
	r.Use(middleware.Recoverer)
	r.Use(reqLogger)

	// Open API endpoints (called by the web app), with CORS.
	r.With(s.cors).Get("/health", s.handleHealth)
	r.With(s.cors).Options("/health", s.handleCORSPreflight)
	r.With(s.cors).Post("/resolve", s.handleResolve)
	r.With(s.cors).Options("/resolve", s.handleCORSPreflight)

	// Auth pages (open).
	r.Get("/login", s.handleLoginGet)
	r.Post("/login", s.handleLoginPost)
	r.Get("/logout", s.handleLogout)

	// Root -> admin (which redirects to /login if needed).
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		http.Redirect(w, req, "/admin", http.StatusSeeOther)
	})

	// Admin pages (require login).
	r.Get("/admin", s.sessions.RequireLogin(s.handleCustomers))
	r.Get("/admin/upload", s.sessions.RequireLogin(s.handleUploadGet))
	r.Get("/admin/history", s.sessions.RequireLogin(s.handleHistory))
	r.Post("/admin/import", s.sessions.RequireLogin(s.handleImport))

	return r
}

// cors adds the agent's CORS headers for the open API endpoints.
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.cfg.AllowOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleCORSPreflight(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}
