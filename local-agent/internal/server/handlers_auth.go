package server

import (
	"log"
	"net/http"
	"time"

	"local-agent/internal/auth"
)

type loginView struct {
	Username string
	Error    string
}

func (s *Server) renderLogin(w http.ResponseWriter, v loginView) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = tmplLogin.ExecuteTemplate(w, "login", v)
}

func (s *Server) handleLoginGet(w http.ResponseWriter, r *http.Request) {
	if s.sessions.CurrentUser(r) != "" {
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
		return
	}
	s.renderLogin(w, loginView{})
}

func (s *Server) handleLoginPost(w http.ResponseWriter, r *http.Request) {
	if s.sessions.CurrentUser(r) != "" {
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
		return
	}
	if err := r.ParseForm(); err != nil {
		s.renderLogin(w, loginView{Error: "Form tidak valid."})
		return
	}
	username := r.FormValue("username")
	password := r.FormValue("password")
	if username == "" || password == "" {
		s.renderLogin(w, loginView{Username: username, Error: "Username dan password wajib diisi."})
		return
	}

	token, err := s.auth.Login(username, password)
	if err != nil {
		// Log the failure reason (never the password).
		log.Printf("LOGIN GAGAL untuk user %q: %v", username, err)
		s.renderLogin(w, loginView{Username: username, Error: err.Error()})
		return
	}

	id, err := s.sessions.Create(username, token)
	if err != nil {
		log.Printf("LOGIN: gagal membuat sesi untuk user %q: %v", username, err)
		s.renderLogin(w, loginView{Username: username, Error: "Gagal membuat sesi. Coba lagi."})
		return
	}
	log.Printf("LOGIN SUKSES untuk user %q", username)
	http.SetCookie(w, &http.Cookie{
		Name:     auth.SessionCookieName,
		Value:    id,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, "/admin", http.StatusSeeOther)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if user := s.sessions.CurrentUser(r); user != "" {
		log.Printf("LOGOUT user %q", user)
	}
	if c, err := r.Cookie(auth.SessionCookieName); err == nil && c.Value != "" {
		s.sessions.Delete(c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     auth.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
