# CPI Analytics Web App — Spesifikasi Tahap-01
### Struktur Menu, Daftar Form UI, dan Model Data Kampanye

**Konteks proyek:** Aplikasi web untuk **user bisnis** (bukan tim IT/MLOps) yang menyajikan hasil pipeline ML perbankan DSI. Pipeline terdiri atas 8 proses: tiga model paralel — **P1 Churn Prediction**, **P2 Customer Profitability**, **P3 Customer Segmentation** — yang di-*cross-join* menjadi **CPI Matrix 3×3** (P4), lalu **prioritisasi cluster** (P5), **deep-dive segmen** (P6), **strategi bisnis per segmen** (P7), dan **rekomendasi produk personal** (P8; dua *pathway*: cold-start LLM & ML+LLM).

**Prinsip aplikasi:** alat kerja untuk pengambilan keputusan bisnis dan retensi, bukan laporan pasif dan bukan konsol monitoring ML.

**Status dokumen:** Ringkasan final hasil diskusi Tahap-01. Seluruh keputusan lingkup sudah final; siap ditindaklanjuti ke desain/build.

---

## 1. Ruang Lingkup Tahap-01 (disepakati)

| # | Cakupan | Status |
|---|---------|--------|
| 1 | Enam menu analitik inti (Corporate Insight, Churn, Profitability, Segmentation, CPI Matrix, Recommender) | Masuk |
| 2 | **Customer 360** — halaman utuh per nasabah | Masuk |
| 3 | **Alert / Notification Center** | Masuk |
| 4 | **Campaign & Strategy Tracking** (Registry → Assignment → Effectiveness) | Masuk |
| 5 | **Role-based access**: Role Pusat (semua cabang) vs Role Cabang (cabang sendiri saja) | Masuk |
| 6 | Integrasi **Type B "Special for You"** ke mobile banking + atribusi transaksi | Masuk |
| 7 | **Biaya per strategi & perhitungan ROI** (profit terselamatkan vs biaya) | Masuk |
| 8 | Setup, System (profile, help/glossary), autentikasi | Masuk |

**Metode ROI Tahap-01:** **Observasional** — semua nasabah Retained setelah jendela observasi dianggap sebagai profit terselamatkan. Tidak ada control/holdout group di versi awal.

**Kandidat fase berikutnya (belum masuk Tahap-01):** **Control / Holdout Group** untuk menaikkan ROI ke mode **incremental** (defensible secara kausal). Lihat bagian 8.

---

## 2. Keputusan Kerangka (berlaku ke seluruh aplikasi)

### 2.1 Model Role & Cakupan Data

| Aspek | Role Pusat (HQ / Direksi / Admin) | Role Cabang (Kepala Cabang / RM) |
|-------|-----------------------------------|----------------------------------|
| Cakupan data | Semua cabang; dropdown cabang aktif | **Hanya cabang sendiri**; dropdown cabang terkunci |
| List / ranking / CPI / recommender / kampanye | Lintas-cabang | Ter-filter otomatis ke cabangnya |
| Business Strategy Registry | **Create / edit** | Read-only |
| Penugasan strategi ke nasabah | Ya | Ya (hanya nasabah cabangnya) |
| Membuat strategi baru | Ya | **Tidak** |
| User & Role Management | Ya | Tidak |

> **Catatan keamanan:** penegakan cakupan data dilakukan di **sisi server**, bukan sekadar disembunyikan di UI. Relevan untuk data perbankan/OJK.

### 2.2 Filter Global vs Lokal
- **Cabang** dan **periode** ("12 bulan terakhir" dsb.) diangkat menjadi **filter global di header**, dengan override per-layar bila perlu — supaya konteks konsisten dan tidak diulang di tiap halaman.

### 2.3 Framing "Model Performance"
- Ditujukan untuk **kepercayaan bisnis**, bukan MLOps. Isi: akurasi/presisi validasi, indikator "prediksi benar vs meleset" secara sederhana, tanggal training terakhir, jendela data. **Bukan** log teknis/monitoring pipeline.

---

## 3. Struktur Menu & Sub-Menu

Kode layar (mis. `CH-02`) dipakai untuk rujukan di tahap desain/UAT berikutnya.

### A. Autentikasi *(di luar menu utama)*
- `AUTH-01` Login
- `AUTH-02` Lupa / Reset Password
- `AUTH-03` Ganti Password (wajib saat login pertama)

### B. Kerangka Global (Shell) *(komponen di semua layar, bukan halaman)*
- Header: logo · selektor cabang (mengikuti role) · selektor periode · badge "Data per: [tanggal]" · lonceng notifikasi · menu user
- Sidebar navigasi · Pencarian nasabah global

### 1. Corporate Insight
- `CI-01` Executive Overview *(termasuk KPI efektivitas & ROI kampanye ringkas)*

### 2. Churn Analysis
- `CH-01` Churn Overview
- `CH-02` Churn Ranking — Top 50 per cabang
- `CH-03` Model Performance — Churn

### 3. Customer Profitability Analysis
- `CP-01` Profitability Overview
- `CP-02` Customer Profitability List (per cabang, tersortir)
- `CP-03` Model Performance — Profitability

### 4. Customer Segmentation Analysis
- `CS-01` Segmentation Overview
- `CS-02` Cluster Characteristics & Strategy
- `CS-03` Product Usage Analysis
- `CS-04` Model Performance — Segmentation

### 5. CPI Matrix (Churn × Profitability)
- `CPI-01` CPI Matrix Overview (3×3, HOT TARGET disorot)
- `CPI-02` HOT TARGET Deep-Dive *(+ tombol "Tugaskan Strategi" → Campaign)*

### 6. Recommender System
- `RS-01` Product Recommendations
- `RS-02` Model Performance — Recommender

### 7. Campaign & Strategy Tracking
- `CAM-01` Business Strategy Registry
- `CAM-02` Strategy Assignment & Progress (Plan / In Progress / Done)
- `CAM-03` Campaign Effectiveness, Outcome & ROI

### 8. Customer 360
- `C360-01` Customer Search & Profile *(+ riwayat strategi & hasil per nasabah)*

### 9. Alert / Notification Center
- `NOT-01` Alert Center

### 10. Setup
- `SET-01` Threshold Tiering Churn (Lo/Med/Hi)
- `SET-02` Threshold Tiering Profitability (Lo/Med/Hi)
- `SET-03` Recommendation Settings (jumlah produk banking & digital)
- `SET-04` User & Role Management
- `SET-05` Observation, Success & Cost Settings
- `SET-06` Notification Rules
- `SET-07` Kelola Nama Persona/Segmen *(opsional)*

### 11. System
- `SYS-01` User Profile
- `SYS-02` Help & Glossary

---

## 4. Daftar Form / Layar UI & Deskripsi

Format tiap layar: **tujuan** · komponen utama (filter, chart, tabel, aksi).

### A. Autentikasi
- **`AUTH-01` Login** — Autentikasi user. Form: username/email, password, tombol masuk, link "lupa password". Validasi + pesan error, batas percobaan gagal.
- **`AUTH-02` Lupa / Reset Password** — Kirim tautan/OTP reset. Form: email/username → konfirmasi.
- **`AUTH-03` Ganti Password** — Dipaksa saat login pertama atau setelah reset admin. Form: password lama (jika ada), baru, konfirmasi + aturan kekuatan password.

### 1. Corporate Insight
- **`CI-01` Executive Overview** — Ringkasan portofolio untuk direksi.
  - Kartu **total nasabah aktif** + **pie chart breakdown per cabang** (dengan tabel jumlah per cabang)
  - **Top 3 cabang paling profitable** (12 bln, dengan nilai profit)
  - **Top 3 produk terlaris** (12 bln, dengan jumlah pengguna)
  - **Top 10 nasabah paling profitable** (korporat & individu, dengan nilai)
  - **KPI kampanye:** Total Saved Profit · Total Campaign Cost · Overall ROI (periode terpilih), dengan link ke `CAM-03`
  - Baris nasabah dapat di-klik → `C360-01`. Filter global: periode. Untuk Role Cabang, seluruh angka ter-scope cabangnya.

### 2. Churn Analysis
- **`CH-01` Churn Overview** — Bandingkan churn antar-cabang & lihat komposisinya.
  - **Churn Distribution per cabang** = (jumlah nasabah churn index ≥ 80%) ÷ (total nasabah cabang) — bar chart antar cabang
  - **Jumlah nasabah Lo/Med/Hi** + **tren** dalam satu chart. Filter: periode.
- **`CH-02` Churn Ranking** — Daftar nasabah paling berisiko di satu cabang.
  - **Dropdown pilih cabang**, tabel **Top 50 churn index** (urut terbesar→terkecil), **ikon download PDF**. Baris nasabah → `C360-01`.
- **`CH-03` Model Performance — Churn** — Kepercayaan atas skor churn: akurasi/presisi validasi, "prediksi benar vs meleset" sederhana, distribusi skor, tanggal training & jendela data.

### 3. Customer Profitability Analysis
- **`CP-01` Profitability Overview** — Gambaran profit portofolio.
  - **Line chart tren total profitability nasional** (12 bln); **pie chart profitability per cabang** (12 bln). Filter: periode.
- **`CP-02` Customer Profitability List** — Nasabah tersortir profit per cabang.
  - **Dropdown cabang**, tabel nasabah diurut nilai profitability, **ikon download PDF** (Top-N profitable per cabang; N mengikuti input). Baris → `C360-01`.
- **`CP-03` Model Performance — Profitability** — Indikator kualitas Profitability Index (error prediksi, tanggal training, jendela 6 bulan ke depan sesuai desain).

### 4. Customer Segmentation Analysis
- **`CS-01` Segmentation Overview** — Hasil pemilihan model & peta segmen.
  - **Davies-Bouldin chart** + **nilai k optimal**; kartu tiap cluster: **Persona Name** + **jumlah nasabah**; catatan model terpilih (K-Means vs DBSCAN). Klik persona → `CS-02`.
- **`CS-02` Cluster Characteristics & Strategy** — Profil & aksi per cluster.
  - **Karakteristik cluster** + **actionable business strategy**; **line chart Age / Education / Profitability** per cluster (satu chart). Selektor cluster.
- **`CS-03` Product Usage Analysis** — Dua tampilan (toggle/tab):
  - (a) pilih **produk** → distribusi usage produk itu di semua cluster
  - (b) pilih **cluster** → usage semua produk di cluster itu
- **`CS-04` Model Performance — Segmentation** — DBI per kandidat k, ukuran & keseimbangan cluster, jumlah outlier, tanggal training.

### 5. CPI Matrix
- **`CPI-01` CPI Matrix Overview** — Peta 9 cluster (3×3).
  - **Grid Profitability (Hi/Med/Lo) × Churn (Lo/Med/Hi)** dengan jumlah/% nasabah tiap kuadran; **kuadran HOT TARGET** (Profit Hi × Churn Hi) disorot. Klik HOT TARGET → `CPI-02`.
- **`CPI-02` HOT TARGET Deep-Dive** — Bedah kuadran prioritas.
  - **Komposisi cluster** HOT TARGET + **persentase distribusi** + **Persona Name**
  - **Klik persona → panel karakteristik + strategi**, dipisah **Non-Product Strategy** & **Product Offering**
  - **Ikon download PDF** daftar nasabah HOT TARGET + persona untuk **cabang tertentu (dropdown)**
  - **Tombol "Tugaskan Strategi"** → `CAM-02`

### 6. Recommender System
- **`RS-01` Product Recommendations** — Rekomendasi untuk cluster ber-strategi *Product Offering* di HOT TARGET.
  - Pilih **cluster + cabang**; per nasabah tampil **Top 3 produk banking + Top 3 produk digital** dengan **skor Confidence & Lift**
  - **Ikon download PDF** daftar seluruh nasabah di cluster+cabang + 6 produk rekomendasi
  - Jumlah produk mengikuti `SET-03`; pathway cold-start vs ML+LLM ditangani di balik layar. Baris → `C360-01`.
- **`RS-02` Model Performance — Recommender** — Sebaran Support/Confidence/Lift, jumlah rule aktif, cakupan nasabah, tanggal generate.

### 7. Campaign & Strategy Tracking
- **`CAM-01` Business Strategy Registry** — Master strategi retensi. **Akses: Pusat/Admin (create/edit); Cabang read-only.**
  - **Kode** (mis. `NPS-01`, `POF-01`), **nama**, **tipe** (A Non-Product / B Product Offering), **deskripsi singkat cara pelaksanaan**, **channel** (RM / Mobile "Special for You" / Digital), **cluster/persona sasaran**, **jendela observasi** (default dari `SET-05`, bisa override)
  - Untuk **Type B**: produk yang ditawarkan + teks offer
  - **Blok Biaya Standar**: model biaya (**per nasabah** / **flat per kampanye**), nilai + komponen (reward, diskon bunga, biaya RM, dll.), mata uang → jadi default saat penugasan
  - Status Aktif/Nonaktif, audit perubahan
- **`CAM-02` Strategy Assignment & Progress** — Tandai nasabah HOT TARGET dengan strategi + kelola siklusnya.
  - Filter **cluster + cabang** (Cabang terkunci); tabel nasabah HOT TARGET (persona, tier churn/profit, produk dimiliki)
  - Aksi **tugaskan strategi** (per baris atau **bulk per cluster**) + **set owner/RM**
  - Kolom **status: Plan → In Progress → Done** (setiap perubahan tercatat: tanggal + user)
  - **Periode pengamatan per nasabah** (dicatat & dibekukan di tingkat penugasan):
    - **Tanggal jendela mulai** (observation start) — ditetapkan otomatis oleh aturan titik mulai (lihat §5.5): Type A dari tanggal *Done*; Type B dari tanggal *offer dikirim* / *converted*. Bisa di-override manual bila perlu.
    - **Lama jendela** (hari) — disalin dari strategi/`SET-05` saat penugasan dibuat, lalu **dibekukan** (freeze) agar perubahan setting global tidak mengubahnya retroaktif.
    - **Tanggal jendela berakhir** — turunan (mulai + lama).
    - **Fase evaluasi**: Belum mulai → Sedang diamati (Monitoring) → Matang (siap dinilai).
  - **Type B**: tombol **kirim offer "Special for You"** (membawa kode kampanye ke mobile)
  - **Biaya Aktual (opsional)** per nasabah; jika diisi, menimpa biaya standar untuk ROI
  - Ringkasan biaya berjalan saat menugaskan (mis. "50 nasabah × biaya standar = estimasi biaya kampanye")
- **`CAM-03` Campaign Effectiveness, Outcome & ROI** — Layar efektivitas business strategy.
  - **Hanya nasabah yang jendelanya sudah matang** yang masuk perhitungan Retained/Churned & ROI; nasabah yang **masih dalam pengamatan** ditampilkan terpisah ("belum matang, belum dinilai") agar angka tidak setengah matang.
  - Ringkasan **Retained vs Churned** (jumlah & %), dipecah **per strategi / cluster / cabang**
  - **Type B**: **funnel Terkirim → Dilihat → Diterima → Bertransaksi** + tingkat konversi & **nilai transaksi ter-atribusi**
  - **Panel ROI**: **Total Saved Profit** (Σ Profitability Index nasabah Retained + profit transaksi ter-atribusi Type B) · **Total Cost** · **Net Saved** · **ROI %**, dipecah per strategi/cluster/cabang
  - **Ranking strategi by ROI** (paling efisien, bukan sekadar paling banyak retained) → umpan balik ke P7
  - **Export PDF** (menyertakan ringkasan ROI)
  - Tahap-01 memakai **ROI observasional**. *Slot incremental ROI disiapkan (kolom pembanding treated vs holdout) namun belum diaktifkan — untuk fase berikutnya.*

### 8. Customer 360
- **`C360-01` Customer Search & Profile** — Satu halaman utuh per nasabah, penyatu semua use case.
  - Pencarian (ID/nama); profil demografi & produk dimiliki
  - **Churn Index (tier)**, **Profitability (tier)**, **Segmen (persona)**, **CPI cluster**
  - **6 produk rekomendasi** + Confidence/Lift; **strategi yang berlaku** (Non-Product/Product Offering)
  - **Blok Riwayat Strategi**: strategi yang pernah/sedang ditugaskan, owner, status, **fase pengamatan + sisa hari hingga jendela berakhir** (countdown), hasil (Retained/Churned/Converted), dan **funnel offer** bila Type B
  - Tombol export profil PDF

### 9. Alert / Notification Center
- **`NOT-01` Alert Center** — Daftar peringatan ter-scope role.
  - Jenis alert: nasabah **profit tinggi naik ke churn Hi**; **lonjakan jumlah HOT TARGET** di cabang; **strategi ditugaskan ke Anda** (RM); **offer diterima/converted**; **hasil kampanye siap ditinjau**
  - Filter per jenis, tandai dibaca, klik → loncat ke layar terkait. Aturan pemicu diatur di `SET-06`.

### 10. Setup
- **`SET-01` Threshold Tiering Churn** — Batas **Lo/Med/Hi** churn index (mis. Hi ≥ 80). Validasi rentang tidak tumpang-tindih, simpan + audit.
- **`SET-02` Threshold Tiering Profitability** — Batas **Lo/Med/Hi** profitability. Pola sama dengan SET-01.
- **`SET-03` Recommendation Settings** — Jumlah **produk banking** & **produk digital** yang direkomendasikan (default 3 & 3). Memengaruhi `RS-01`/PDF.
- **`SET-04` User & Role Management** — Create/delete/reset password; penetapan **Role (Pusat/Cabang)** + **cabang** yang diikat ke user cabang.
- **`SET-05` Observation, Success & Cost Settings** — **Jendela observasi default global** (mis. 90 hari) + **aturan titik mulai jendela** per tipe (Type A dari *Done*, Type B dari *offer dikirim/converted*) + **definisi sukses/retained** (ambang tier churn, aktivitas transaksi); **parameter biaya default**, **mata uang**, **basis saved profit** (Profitability Index saja / + transaksi ter-atribusi); **mode ROI** (Tahap-01 dikunci ke **Observasional**; toggle ke Incremental disiapkan untuk fase berikutnya saat holdout aktif). *Catatan: nilai default di sini disalin & dibekukan ke tiap penugasan `CAM-02` saat dibuat — perubahan setting global tidak mengubah penilaian kampanye yang sudah berjalan/selesai (stabil & auditable).* Dipakai `CAM-03`.
- **`SET-06` Notification Rules** — Aktifkan/atur ambang tiap jenis alert `NOT-01`.
- **`SET-07` Kelola Nama Persona/Segmen (opsional)** — Ubah label persona agar sesuai bahasa bisnis bank tanpa retrain.

### 11. System
- **`SYS-01` User Profile** — Data akun, ganti password sendiri, preferensi tampilan.
- **`SYS-02` Help & Glossary** — Definisi istilah (Churn Index, DBI, Confidence, Lift, HOT TARGET, dll.) + panduan singkat tiap layar.

---

## 5. Model Campaign & Strategy Tracking (detail)

### 5.1 Alur end-to-end
```
Registry (daftar strategi + kode + biaya)
   → Assignment (tandai nasabah HOT TARGET + owner + kirim offer Type B)
      → Progress: Plan → In Progress → Done
         → Jendela pengamatan mulai (Type A: dari Done · Type B: dari offer/converted)
            → Fase: Sedang diamati → Matang (jendela berakhir)
               → Outcome: Retained / Churned  (+ Converted untuk Type B)
                  → Effectiveness & ROI (hanya menghitung yang sudah matang)
```

### 5.2 Status & Hasil
- **Status eksekusi:** Plan → In Progress → Done
- **Fase pengamatan setelah Done:** Belum mulai → **Sedang diamati (Monitoring)** → **Matang (siap dinilai)**
- **Hasil akhir** (baru boleh ditetapkan setelah jendela **matang**): **Retained (berhasil)** / **Churned (gagal)**; **Type B** menambah **Converted** (sudah transaksi offer). Satu nasabah bisa *Converted & Retained*.

### 5.3 Funnel Type B ("Special for You" — integrasi mobile banking)
`Offer Terkirim → Dilihat → Diterima (tap) → Bertransaksi (ter-atribusi)` + nilai transaksi.
Transaksi yang berasal dari offer diberi **tanda kode business strategy** sehingga konversi & nilainya terukur.

### 5.4 Akuntabilitas
- Setiap penugasan memiliki **owner/RM** (penting untuk *In Progress* dan notifikasi; Type A sangat RM-driven).

### 5.5 Periode Pengamatan Hasil Treatment (dicatat per penugasan)
Periode pengamatan **wajib dicatat di tingkat penugasan** (bukan hanya sebagai default global), karena hasil Retained/Churned dan ROI hanya bermakna bila aplikasi tahu *kapan* tiap nasabah boleh dinilai.

- **Yang dicatat per nasabah:** tanggal jendela mulai, lama jendela (hari, dibekukan), tanggal jendela berakhir, fase evaluasi.
- **Aturan titik mulai jendela (kapan "jam" mulai berdetak):**
  - **Type A (Non-Product / RM-driven):** dari tanggal status **Done**.
  - **Type B (Product Offering / "Special for You"):** dari tanggal **offer dikirim** atau **converted** (bukan dari tanggal penugasan dibuat).
  - Titik mulai bisa **di-override manual** bila situasi menuntut.
- **Pembekuan (freeze):** lama jendela disalin dari `SET-05`/strategi saat penugasan dibuat, lalu dibekukan. Perubahan setting global **tidak** mengubah penilaian kampanye yang sudah berjalan/selesai → angka historis stabil & auditable (relevan OJK).
- **Konsumen data ini:**
  - `CAM-03` — memisahkan "matang, sudah dinilai" vs "masih diamati".
  - `NOT-01` — memicu alert "hasil kampanye siap ditinjau" saat jendela berakhir.
  - `C360-01` — menampilkan fase pengamatan + countdown sisa hari per nasabah.

---

## 6. Konsep Biaya & ROI

### 6.1 Biaya (dua lapis)
1. **Biaya standar per strategi** (didaftarkan di `CAM-01`) — asumsi biaya per nasabah: biaya RM per kontak, nilai reward/cashback, diskon suku bunga, dll.
2. **Biaya aktual per penugasan** (opsional, di `CAM-02`) — bila realisasi berbeda dari standar. Jika kosong → pakai biaya standar.

### 6.2 Profit Terselamatkan (Saved Profit)
- = **Profitability Index** (dari P2) untuk nasabah yang **Retained** setelah jendela observasi.
- Logika: tanpa intervensi, nasabah diasumsikan churn → profit hilang; karena retained, profit "terselamatkan".
- **Type B**: dapat ditambah **profit dari transaksi ter-atribusi** (dari funnel offer).

### 6.3 Rumus ROI
```
ROI = (Total Saved Profit − Total Cost) ÷ Total Cost
```
Dihitung per **strategi / cluster / cabang**, dan agregat.

### 6.4 Catatan metodologis (penting)
- **Keputusan Tahap-01: ROI dihitung secara observasional.** Semua nasabah yang Retained setelah jendela observasi dianggap sebagai profit terselamatkan (atribusi asumtif — semua retained dianggap berkat strategi). Angka ini berguna secara operasional, sederhana untuk dijelaskan, dan konsisten dipakai antar-strategi.
- **Keterbatasan yang perlu disadari:** sebagian nasabah kemungkinan tetap bertahan walau tanpa intervensi, sehingga ROI observasional cenderung **melebih-lebihkan** dampak murni strategi. Angka ini bersifat indikatif, bukan klaim kausal.
- **Jalur peningkatan (fase berikutnya):** dengan menambahkan **control/holdout group**, ROI dapat dinaikkan ke **incremental ROI** (selisih retensi treated vs holdout) yang jauh lebih *defensible*. Struktur data & `SET-05` sudah disiapkan agar bisa naik ke mode ini **tanpa bongkar ulang**.

---

## 7. Ringkasan Gap yang Dilengkapi terhadap Draft Awal

1. **Autentikasi & shell aplikasi** (login, reset password, header global, sidebar, pencarian nasabah global)
2. **Customer 360** — halaman utuh per nasabah (gap bisnis terpenting; mengubah dashboard jadi alat kerja)
3. **Campaign & Strategy Tracking** + ROI (loop retensi tertutup & terukur)
4. **Alert / Notification Center**
5. **Help & Glossary** (adopsi user bisnis)
6. **Role Pusat vs Cabang** dengan penegakan di sisi server
7. Konsolidasi Setup (threshold Churn yang sebelumnya tertulis dua kali → dipisah rapi Churn vs Profitability) + penambahan Observation/Success/Cost & Notification Rules

---

## 8. Keputusan Metode ROI & Jalur ke Depan

| Keputusan | Pilihan | Status |
|-----------|---------|--------|
| **Metode ROI Tahap-01** | **Observasional** — semua retained = profit terselamatkan; tanpa control/holdout group | **Final** |
| **Control / Holdout Group (incremental ROI)** | Ditunda ke fase berikutnya; slot data & setting sudah disiapkan | Kandidat fase lanjut |

**Ringkasan alasan:** versi awal memprioritaskan kesederhanaan dan tidak mengorbankan nasabah HOT TARGET (tidak ada yang sengaja tidak ditolong demi pengukuran). ROI observasional cukup untuk kebutuhan operasional & pelaporan direksi. Peningkatan ke incremental ROI dapat dilakukan belakangan tanpa merombak struktur, dengan menambahkan holdout dan mengaktifkan mode incremental di `SET-05`.

---

## 9. Langkah Berikutnya (Tahap-02 — menunggu aba-aba)

- Opsi: render **sitemap visual** (11 menu + alur Campaign Registry → Assignment → Effectiveness/ROI) untuk review bareng tim.
- Tahap-02 tidak dimulai sebelum diminta.

---

*Dokumen ini merangkum kesepakatan Tahap-01. Item bertanda "opsional" atau "menunggu keputusan" belum final.*
