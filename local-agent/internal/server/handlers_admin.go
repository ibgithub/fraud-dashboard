package server

import (
	"html/template"
	"net/http"
	"strconv"
	"strings"

	"local-agent/internal/pii"
	"local-agent/internal/store"
)

const pageSize = 25

// customersView is the data for the Daftar Nasabah page.
type customersView struct {
	Active, Title, User string
	Error               string
	Search              string
	Total               int
	Rows                []store.CustomerRow
	Page, TotalPages    int
	PrevPage, NextPage  int
	QueryTail           template.URL
}

func (s *Server) handleCustomers(w http.ResponseWriter, r *http.Request) {
	user := s.sessions.CurrentUser(r)
	search := r.URL.Query().Get("q")
	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n >= 1 {
			page = n
		}
	}
	offset := (page - 1) * pageSize

	v := customersView{Active: "customers", Title: "Daftar Nasabah", User: user, Search: search, Page: page}

	rows, total, err := s.store.ListCustomers(search, pageSize, offset)
	if err != nil {
		v.Error = err.Error()
		s.renderAdmin(w, tmplCustomers, v)
		return
	}
	v.Rows = rows
	v.Total = total
	v.TotalPages = (total + pageSize - 1) / pageSize
	v.PrevPage = page - 1
	v.NextPage = page + 1
	if search != "" {
		v.QueryTail = template.URL("&q=" + queryEscape(search))
	}
	s.renderAdmin(w, tmplCustomers, v)
}

// uploadView is the data for the Upload CSV page.
type uploadView struct {
	Active, Title, User string
	Banner              string
	BannerClass         string
	Count               int
	LastFile            string
	LastRows            int
	LastAt              string
}

func (s *Server) uploadViewFor(user, banner, bannerClass string) uploadView {
	file, rows, at := s.store.LastImport()
	return uploadView{
		Active: "upload", Title: "Upload CSV", User: user,
		Banner: banner, BannerClass: bannerClass,
		Count: s.store.Count(), LastFile: file, LastRows: rows, LastAt: at,
	}
}

func (s *Server) handleUploadGet(w http.ResponseWriter, r *http.Request) {
	s.renderAdmin(w, tmplUpload, s.uploadViewFor(s.sessions.CurrentUser(r), "", ""))
}

func (s *Server) handleImport(w http.ResponseWriter, r *http.Request) {
	user := s.sessions.CurrentUser(r)
	result := func(ok bool, msg string) {
		cls := "err"
		if ok {
			cls = "ok"
		}
		s.renderAdmin(w, tmplUpload, s.uploadViewFor(user, msg, cls))
	}

	// Up to ~64 MB upload.
	if err := r.ParseMultipartForm(64 << 20); err != nil {
		result(false, "Gagal membaca form upload: "+err.Error())
		return
	}
	password := r.FormValue("password")
	f, hdr, err := r.FormFile("file")
	if err != nil {
		result(false, "File ZIP belum dipilih.")
		return
	}
	defer f.Close()

	zipBytes, err := readAllLimited(f, 64<<20)
	if err != nil {
		result(false, "Gagal membaca file: "+err.Error())
		return
	}
	csvBytes, csvName, err := pii.ExtractCSVFromZip(zipBytes, password)
	if err != nil {
		result(false, "Gagal membuka ZIP: "+err.Error()+" (periksa password).")
		return
	}
	records, err := pii.ParseCSV(csvBytes)
	if err != nil {
		result(false, "CSV tidak valid ("+csvName+"): "+err.Error())
		return
	}
	n, err := s.store.UpsertAll(hdr.Filename, records)
	if err != nil {
		result(false, "Gagal menyimpan ke database: "+err.Error())
		return
	}
	result(true, "Berhasil memproses "+strconv.Itoa(n)+" data dari "+hdr.Filename+
		" (CSV: "+csvName+") — data baru ditambahkan, yang sudah ada diperbarui.")
}

// historyView is the data for the History Upload page.
type historyView struct {
	Active, Title, User string
	Error               string
	Imports             []store.ImportRow
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	v := historyView{Active: "history", Title: "History Upload", User: s.sessions.CurrentUser(r)}
	imports, err := s.store.ListImports(100)
	if err != nil {
		v.Error = err.Error()
	} else {
		v.Imports = imports
	}
	s.renderAdmin(w, tmplHistory, v)
}

// renderAdmin executes an admin page template (the layout) with the given view.
func (s *Server) renderAdmin(w http.ResponseWriter, t *template.Template, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = t.ExecuteTemplate(w, "layout", data)
}

// queryEscape does minimal query-value escaping (spaces + a few specials).
func queryEscape(s string) string {
	r := strings.NewReplacer(" ", "%20", "&", "%26", "#", "%23", "+", "%2B", "\"", "%22")
	return r.Replace(s)
}
