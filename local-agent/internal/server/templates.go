package server

import (
	"embed"
	"html/template"
)

//go:embed templates/*.html
var templatesFS embed.FS

// Parsed templates. Each admin page is parsed together with the shared layout
// (the page provides the "content" block). Login is standalone.
var (
	tmplCustomers = template.Must(template.ParseFS(templatesFS, "templates/layout.html", "templates/customers.html"))
	tmplUpload    = template.Must(template.ParseFS(templatesFS, "templates/layout.html", "templates/upload.html"))
	tmplHistory   = template.Must(template.ParseFS(templatesFS, "templates/layout.html", "templates/history.html"))
	tmplLogin     = template.Must(template.ParseFS(templatesFS, "templates/login.html"))
)
