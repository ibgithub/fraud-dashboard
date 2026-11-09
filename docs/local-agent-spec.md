# Local Agent — Contract Specification

## Purpose

For regulatory reasons, customer PII (name, address, title, …) is **not** stored
in or served from the application server / RDS. Instead, each user's machine runs
a small local HTTP service ("the agent") that holds the CIF → PII mapping in a
**local SQLite database**. The web app sends a batch of CIFs to the agent and
renders the returned fields in memory only. Nothing PII is persisted to the
server, logs, or browser storage.

If the agent is not running (or a CIF is not found), the web shows the **CIF**
instead of a name.

Reference implementation: `local-agent/` (Go + SQLite, single self-contained `.exe`).

## Where it runs

- On the **user's own laptop** (the machine that opens the web app).
- Binds to **`127.0.0.1` only** (loopback) — never `0.0.0.0`.
- Default port **`7777`**. The web expects `http://127.0.0.1:7777`, configurable
  at build time via `VITE_LOCAL_AGENT_URL` (legacy `VITE_PII_AGENT_URL` still accepted).
- Data stored in a local SQLite file (`pii.db`), surviving restarts.

## Data update flow

```
password-protected ZIP (contains cif_pii.csv)
  ↓
RM opens the agent admin UI (http://127.0.0.1:7777/admin) in a browser
  ↓
Upload ZIP + type password → agent unzips, parses the CSV, and UPSERTs the rows
into SQLite (insert new CIFs, update existing ones; other data is kept). Wrong
password fails safely (data unchanged).
```

The ZIP may use classic ZipCrypto or AES-256 (7-Zip "AES-256" recommended). The
agent reads both. The CSV must have a `cif` column plus any PII columns
(`name`, `address`, `title`, …; extra columns are stored and returned too).

## Endpoints

### 1. Health check (used by the web)
```
GET /health
200 OK
{ "status":"ok", "records": 1234,
  "last_import": { "file":"cif_pii.zip", "rows":1234, "at":"2026-10-08T08:07:02+07:00" } }
```

### 2. Resolve PII — batch (used by the web)
```
POST /resolve
Content-Type: application/json
Body:     { "cifs": ["10760883", "48170657"] }
Response: { "data": {
             "10760883": { "name":"Budi Santoso", "address":"...", "title":"..." },
             "48170657": { "name":"Siti Aminah",  "address":"...", "title":"..." }
          }}
```
- `data` is keyed by CIF (string); value is an object of PII fields (extensible).
- CIFs not found are **omitted** (the web falls back to the CIF).
- The web applies a ~2s timeout; on any failure it shows CIFs.

### 3. Admin UI (used by the RM, in a browser)
Three pages sharing a top nav bar:
```
GET  /admin           -> Daftar Nasabah: list of customers (CIF, nama, alamat,
                          title) with search + pagination.
GET  /admin/upload     -> Upload CSV: form to choose ZIP + password.
GET  /admin/history    -> History Upload: table of past imports (file, rows, time).
POST /admin/import     -> multipart form: file=<zip>, password=<str>.
                          Upserts rows on success (insert new / update existing);
                          shows a result banner.
```

## CORS (critical)

The web is served over HTTPS (e.g. `https://15.232.164.89`) and calls the agent
over HTTP on localhost. The agent sends:
- `Access-Control-Allow-Origin: https://15.232.164.89` (configurable)
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- handles the `OPTIONS` preflight.

Chrome/Edge treat `http://127.0.0.1` as "potentially trustworthy", so an HTTPS
page is normally allowed to call it (verified working on the target browser).

## Security notes

- Loopback-only bind: the agent is unreachable from the network.
- The ZIP password is entered by the RM at upload time and is **not stored**.
- `pii.db`, and any real CSV/ZIP, are git-ignored and must never be committed.
- Upsert import runs in a transaction (insert new CIFs, update existing ones);
  a failure leaves the previous data intact. Data not in the new file is kept.

## How the web uses it

- `frontend/src/app/lib/piiResolver.ts` — `resolveCustomers(cifs[])` batches a
  POST to `/resolve` (2s timeout, returns `{}` on failure). Results held in React
  state only (never persisted).
- Pilot page: `/cpi-matrix/promo-engine` (Detail Rencana Aksi). The table shows
  the CIF first, then the name once the agent replies. CSV export and the Action
  Plan hand-off use the resolved name too.

Point the web at a different agent URL at build time:
```
VITE_LOCAL_AGENT_URL=http://127.0.0.1:7777
```

## Build & run (reference agent)

See `local-agent/README.md`. In short: `go build -o local-agent.exe .` on a dev
machine (Go 1.22+), ship the single `.exe` to users — no runtime or database
server to install.
