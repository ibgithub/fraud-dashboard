# CPI Analytics Web App

Portal analitik perbankan berbasis Machine Learning & AI untuk segmentasi nasabah, prediksi churn, estimasi profitabilitas, dan kampanye retensi personal.

## 📌 Gambaran Proyek

Pipeline analitik CPI terdiri atas 8 proses utama:
- **P1: Churn Prediction** — Prediksi risiko keluar nasabah (skor Churn Index 0–100: Lo / Med / Hi).
- **P2: Customer Profitability** — Estimasi kontribusi finansial 6 bulan ke depan (Lo / Med / Hi).
- **P3: Customer Segmentation** — Pengelompokan demografi & perilaku (K-Means / DBSCAN).
- **P4: CPI Matrix (3×3)** — Penggabungan Churn × Profitability menjadi 9 cluster prioritas.
- **P5: Cluster Prioritization** — Penentuan fokus utama pada **C3 HOT TARGET** (Profit Hi × Churn Hi).
- **P6: Segment Deep-Dive** — Analisis komposisi persona di kuadran prioritas.
- **P7: Segment-Specific Business Strategy** — Strategi Type A (*Non-Product / RM-driven*) & Type B (*Product Offering*).
- **P8: Personalized Recommendation** — Rekomendasi produk berbasis Association Rule Mining (Apriori/FP-Growth/Eclat) & GenAI / LLM.

## 📂 Struktur Repositori

```
CPI/
├── backend/                                          # Service backend (Spring Boot)
│   ├── auth-service/                             # Service autentikasi, RBAC & manajemen user
│   │   ├── Dockerfile                            # Dockerfile auth-service
│   │   └── src/main/resources/db/migration/      # Flyway SQL migrations (V1, V2, dst.)
│   └── analytics-service/                        # Service analitik (churn, segmentation, TRB, matrix, dsb.)
│       └── Dockerfile                            # Dockerfile analytics-service
├── frontend/                                         # Web client (React + Vite + TypeScript + Tailwind)
│   ├── Dockerfile                                # Multi-stage build + Nginx
│   └── nginx.conf                                # Nginx reverse proxy & static routing
├── docs/                                             # Dokumentasi & spesifikasi proyek
│   ├── 2. CPI_DSI_Board_Presentation 11 bahasa - UI.pdf  # Paparan slide arsitektur solusi 8 proses (P1-P8)
│   ├── CPI_WebApp_Tahap-01_Spec.md                       # Dokumen spesifikasi fungsional Tahap-01
│   ├── CPI_WebApp_Sitemap.html                           # Sitemap & diagram alur navigasi aplikasi
│   └── CPI_WebApp_Mockup.html                            # Mockup UI interaktif aplikasi CPI
├── docker-compose.yml                                # Multi-container orchestration (Auth, Exec, Frontend/Nginx)
├── .env.example                                      # Template konfigurasi environment & database
└── README.md
```

---

## 🐳 Deploy Cepat via Docker (di VPS)

### 1. Inisialisasi Environment
Di server VPS Anda, clone atau pull repositori, lalu salin `.env.example`:
```bash
cp .env.example .env
```
Sesuaikan nilai di `.env`:
* Jika PostgreSQL berjalan di **host VPS yang sama (di luar docker)**: biarkan `DB_HOST=host.docker.internal`.
* Jika PostgreSQL berada di **laptop / server lain**: ganti `DB_HOST=IP_LAPTOP_ATAU_SERVER`.
* Untuk opsi Nginx Host + SSL: set `APP_PORT=3000`.

### 2. Jalankan Docker Compose
```bash
docker compose up -d --build
```
> 💡 **Otomatisasi Database (Flyway)**: Anda **TIDAK PERLU** menjalankan skrip SQL secara manual! Saat `auth-service` menyala pertama kali, Flyway akan otomatis membuat schema (`auth`, `ods`), seluruh tabel, foreign key, serta mengisikan data awal (*seed data* roles, users, menus, settings) ke database PostgreSQL.

### 3. Update Aplikasi di Masa Depan
Kapan saja ada pembaruan kode, Anda cukup menjalankan:
```bash
git pull && docker compose up -d --build
```

---

## 💻 Menjalankan Manual (Local Development Tanpa Docker)

### 1. Menjalankan Backend Services
* **Auth Service**:
  ```bash
  cd backend/auth-service
  ./mvnw spring-boot:run
  ```
  *(Port: `8081` — Flyway otomatis berjalan)*

* **Analytics Service**:
  ```bash
  cd backend/analytics-service
  ./mvnw spring-boot:run
  ```
  *(Port: `8082`)*

### 2. Menjalankan Frontend
```bash
cd frontend
npm install
npm run dev
```
*(Akses web browser di `http://localhost:5173`)*
