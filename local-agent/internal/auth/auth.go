// Package auth handles agent authentication. Login is delegated to the central
// web API ({server}/api/auth/login); on success we keep a small in-memory
// session and a loopback session cookie. Admin pages are gated by RequireLogin.
//
// The session lives only in memory: restarting the agent logs everyone out.
// Because the agent binds to 127.0.0.1 only, the cookie never leaves the machine.
package auth

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// SessionCookieName is the browser cookie that identifies a session.
const SessionCookieName = "la_session"

// session is one logged-in user.
type session struct {
	username  string
	token     string // JWT from the central server (kept for future API calls)
	createdAt time.Time
}

// SessionStore is a tiny in-memory, concurrency-safe session table.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]session
}

// NewSessionStore creates an empty session store.
func NewSessionStore() *SessionStore {
	return &SessionStore{sessions: make(map[string]session)}
}

// Create records a new session and returns its id.
func (ss *SessionStore) Create(username, token string) (string, error) {
	id, err := randomID()
	if err != nil {
		return "", err
	}
	ss.mu.Lock()
	ss.sessions[id] = session{username: username, token: token, createdAt: time.Now()}
	ss.mu.Unlock()
	return id, nil
}

// Delete removes a session by id.
func (ss *SessionStore) Delete(id string) {
	ss.mu.Lock()
	delete(ss.sessions, id)
	ss.mu.Unlock()
}

// username returns the username for a session id, or "" if unknown.
func (ss *SessionStore) username(id string) string {
	ss.mu.RLock()
	s, ok := ss.sessions[id]
	ss.mu.RUnlock()
	if !ok {
		return ""
	}
	return s.username
}

func randomID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// CurrentUser returns the logged-in username for a request, or "" if not logged in.
func (ss *SessionStore) CurrentUser(r *http.Request) string {
	c, err := r.Cookie(SessionCookieName)
	if err != nil || c.Value == "" {
		return ""
	}
	return ss.username(c.Value)
}

// RequireLogin wraps a handler so unauthenticated requests are redirected to /login.
func (ss *SessionStore) RequireLogin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if ss.CurrentUser(r) == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next(w, r)
	}
}

// Client calls the central web API to verify credentials.
type Client struct {
	serverURL string
	http      *http.Client
}

// NewClient builds an auth client for the given central server base URL.
func NewClient(serverURL string) *Client {
	return &Client{
		serverURL: strings.TrimRight(serverURL, "/"),
		http: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				// Pilot: the central server uses a self-signed certificate, so we
				// skip TLS verification for it. Replace with a trusted cert once a
				// real (e.g. Let's Encrypt) certificate is in place.
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
			},
		},
	}
}

// loginResponse mirrors the central API's ApiResponse<JwtResponse>.
type loginResponse struct {
	Success bool   `json:"success"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Token string `json:"token"`
	} `json:"data"`
}

// Login verifies credentials against {server}/api/auth/login. On success it
// returns the JWT; on failure it returns a user-friendly (Indonesian) error.
func (c *Client) Login(username, password string) (string, error) {
	body, _ := json.Marshal(map[string]string{"username": username, "password": password})
	req, err := http.NewRequest(http.MethodPost, c.serverURL+"/api/auth/login", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("tidak dapat membuat permintaan: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	// Identify the login source so the central audit trail can tell apart
	// logins made through the Local Agent from logins made in the web app.
	req.Header.Set("X-Client", "local-agent")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("tidak dapat menghubungi server pusat (%s). Periksa koneksi internet", c.serverURL)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	var lr loginResponse
	if err := json.Unmarshal(raw, &lr); err != nil {
		return "", fmt.Errorf("respons server tidak dikenali (HTTP %d)", resp.StatusCode)
	}

	if resp.StatusCode == http.StatusOK && lr.Success && lr.Data.Token != "" {
		return lr.Data.Token, nil
	}
	return "", fmt.Errorf("%s", friendlyLoginError(lr.Message))
}

// friendlyLoginError maps the central API's message keys to Indonesian text.
// Unknown keys fall back to a generic message (the raw key is not shown).
func friendlyLoginError(key string) string {
	switch key {
	case "auth.login.invalid_credentials":
		return "Username atau password salah."
	case "auth.account.blocked":
		return "Akun Anda diblokir. Hubungi administrator."
	case "auth.account.blocked_max_attempts":
		return "Akun Anda diblokir karena terlalu banyak percobaan login yang gagal."
	case "":
		return "Login gagal. Silakan coba lagi."
	default:
		return "Login gagal: " + key
	}
}
