# Local Agent (Go + SQLite)

A tiny local HTTP service that resolves customer PII (name, address, title, …)
from a **local SQLite database**, so the web app never receives this data from
the server. Relationship Managers refresh the data by uploading a
**password-protected ZIP** (containing a CSV) through a small built-in web UI.

- No runtime / no database server to install — compiles to a single `.exe`
  (SQLite is embedded via a pure-Go driver).
- Binds to `127.0.0.1` only (reachable solely from the user's own machine).
- Data lives in `data/pii.db` next to the exe; it survives restarts.

Full contract: `../docs/local-agent-spec.md`.

---

## For end users (Relationship Manager / operator)

1. Put `local-agent.exe` in a folder and run it (double-click). A **command
   window opens and stays open** while the agent runs — that's how you know it's
   running. Closing that window stops the agent. If something goes wrong at
   startup (e.g. the agent is already running, or `config.ini` is missing), the
   window shows the error and waits for **Enter** before closing. It creates the
   `config/`, `data/` and `logs/` folders automatically on first run.
2. A browser opens at **http://127.0.0.1:7777**. **Log in** with your AnvAIa
   Analytics account (same username/password as the web app). The agent verifies
   the credentials against the central server, so an internet connection is
   needed to log in. Wrong credentials show an error; the admin pages stay locked
   until you log in. Use **Keluar** (top-right) to log out.
3. After login you reach the admin UI, which has three
   pages (nav bar at the top):
   - **Daftar Nasabah** — the current customers (CIF, nama, alamat, title) with
     search + paging.
   - **Upload CSV** — choose the **ZIP file**, type the **password**, click
     **"Upload & Perbarui Data"**. The ZIP must contain a CSV with a `cif` column
     (plus `name`, `address`, `title`, …). A successful import is an **upsert**:
     new CIFs are inserted and existing CIFs are updated; previously-loaded data
     is kept. A wrong password fails safely (data untouched).
   - **History Upload** — log of past uploads (file name, row count, time).
4. That's it. The web app (`https://15.232.164.89/...`) will now show names,
   resolved locally from this agent.

Keep the agent running while using the web app. To auto-start it on login, put a
shortcut to `local-agent.exe` in the Startup folder (`Win+R` → `shell:startup`).

If the central server address ever changes, open **`config/config.ini`** (next
to `local-agent.exe`, created on first run), update the `server` line, save, and
restart the agent. No reinstall needed.

---

## Endpoints

| Method | Path             | Purpose                                             |
|--------|------------------|-----------------------------------------------------|
| GET    | `/health`        | Liveness + record count + last import info          |
| POST   | `/resolve`       | Batch resolve: body `{"cifs":[...]}`                |
| GET    | `/login`         | Login page                                          |
| POST   | `/login`         | Verify `username`/`password` via the central API    |
| GET    | `/logout`        | Clear the session                                   |
| GET    | `/admin`         | Admin UI — Daftar Nasabah (list + search + paging)  |
| GET    | `/admin/upload`  | Admin UI — Upload CSV (ZIP + password form)         |
| GET    | `/admin/history` | Admin UI — History Upload                           |
| POST   | `/admin/import`  | multipart form `file=<zip>`, `password=<str>`       |

`/health` and `/resolve` are open (the web app calls them). All `/admin*` pages
require login. `/resolve` response:
`{ "data": { "<cif>": { "name": "...", "address": "...", "title": "..." } } }`.
CIFs not found are omitted; the web shows the CIF instead.

### Login
Credentials are **not** stored in the agent. On `POST /login` the agent calls
`{server}/api/auth/login`; on success it keeps an in-memory session + a loopback
cookie (restarting the agent logs everyone out). The central server (`--server`)
uses a self-signed certificate during the pilot, so the agent skips TLS
verification for it — replace with a trusted cert once one is in place.

---

## CSV format (inside the ZIP)

```csv
cif,name,address,title
57858446,Julia Kumalasari,Jl. Pelajar No. 10 Jakarta,Mahasiswa
48610314,Endah Setiawati,Jl. Produktif No. 12 Surabaya,Mahasiswa
```
- `cif` is required (the key). `name`/`address`/`title` map to their fields.
- Any extra columns (e.g. `phone`) are stored too and returned automatically.

### Making the ZIP
Use 7-Zip with **AES-256** (recommended) or classic ZipCrypto — the agent reads
both. Example with 7-Zip CLI:
```
7z a -tzip -pYOURPASSWORD -mem=AES256 cif_pii.zip cif_pii.csv
```

---

## Build (one-time, on a dev machine with Go installed)

Install Go 1.22+ from https://go.dev/dl/ (only needed to BUILD, not to run).

```powershell
cd local-agent
go build -o local-agent.exe .
# cross-compile for 64-bit Windows:
# $env:GOOS="windows"; $env:GOARCH="amd64"; go build -o local-agent.exe .
```
Produces a self-contained `local-agent.exe` (~17 MB). The HTML templates are
embedded (`//go:embed`), so no extra files ship with the exe.

### Project structure
```
local-agent/
├─ main.go                 # entry point: wire config -> store -> server, open browser
└─ internal/
   ├─ config/              # reads config.ini
   ├─ store/               # SQLite (customer_pii, import_log)
   ├─ pii/                 # CSV parsing + password-ZIP extraction
   ├─ auth/                # central-API login client, in-memory sessions, RequireLogin
   └─ server/              # chi router + handlers
      └─ templates/        # HTML (html/template), embedded into the binary
```
Routing uses `github.com/go-chi/chi/v5` (a lightweight router, not a framework).

### Runtime layout (what ships to users)
When the agent runs it keeps the top folder to just the exe and puts everything
else in subfolders (auto-created on first run):
```
local-agent.exe          <- the only file users double-click
config/config.ini         <- settings (edit the server address here)
data/pii.db               <- local SQLite database (+ -shm, -wal)
logs/local-agent.log      <- rotating logs
```

### Configuration — `config/config.ini` (required)
The agent reads a single **`config/config.ini`**. It is **required** and must set
`server` (the central web API). There are no built-in defaults and no
command-line flags — `config/config.ini` is the only source.

```ini
# WAJIB diisi. Alamat API web pusat (untuk login).
server = https://new-host.example.com
```

Behavior:
- **First run with no `config.ini`:** the agent writes a template (with an empty
  `server`), prints a message, and exits — fill in `server`, then run again.
- **Empty `server`:** the agent prints an error and exits.
- The listen address is fixed at `127.0.0.1:7777`; the CORS allowed origin always
  equals `server`; the SQLite file is `data/pii.db`. None of these are configurable.

To move to a new central address, edit the `server` line and restart the agent —
no rebuild needed.

---

## Test (dev)

`testdata/makezip` builds a sample AES-256 password ZIP:
```powershell
cd testdata/makezip
go run . ..\test.zip rahasia123
```
Create `config/config.ini` next to the exe with `server = https://<central-host>`,
then run the agent. `/resolve` and `/health` are open; the admin import requires
a login session (log in via the browser at `/login`, or send the session cookie):
```powershell
.\local-agent.exe
# /resolve is open (no login needed):
curl.exe -s -X POST http://127.0.0.1:7777/resolve -H "Content-Type: application/json" -d '{\"cifs\":[\"57858446\"]}'
# For /admin/import, log in first in the browser, then upload the ZIP there,
# or reuse the session cookie (la_session) with curl -b.
```

---

## Logs

The agent writes to the console **and** to a rotating file at
`logs/local-agent.log` (next to the exe). To investigate a problem (failed
login, central-server unreachable, upload error), open that file or send it to
IT. Rotation: ~5 MB per file, up to 5 old files kept (compressed), 30 days.

Logged: startup/shutdown, every HTTP request (method, path, status, duration),
login success/failure (username + reason), logout, upload results, and
`/resolve` **counts only** (how many CIFs were requested/found).

**Never logged:** customer names/addresses or any PII, and passwords. The
`logs/` folder is git-ignored.

---

## Data lifecycle

- `data/pii.db` holds the current snapshot (table `customer_pii`) plus an `import_log`
  (file name, row count, timestamp) for a basic local audit trail.
- Each successful upload runs inside a transaction: upsert each row (insert new
  CIFs, update existing ones) → log. If anything fails, the previous data stays
  intact. Existing data not referenced by the new file is preserved.
- `pii.db` and any real CSV/ZIP are git-ignored and must never be committed.
