---
inclusion: manual
---

# Deploy Standar — VPS anvaia-bag (teman-umkm)

Acuan tetap untuk men-deploy project ini ke VPS. Ikuti alur ini setiap deploy.

## Konteks penting
- **Repo git**: GitLab kantor `git.pactindo.com/.../anvaia-analytic-dashboard-bag`.
  `git push` **butuh VPN** dan hanya bisa dari laptop. **VPS tidak bisa akses GitLab**
  (tidak bisa install VPN), jadi sinkronisasi kode ke VPS **lewat git bundle**, bukan
  `git pull` dari remote.
- **VPS**: `ibaihaqi@103.196.152.124`, SSH key `C:\Imam\c0f\koperasi-c0f\vps\teman-umkm.ppk`
  (pakai `plink -i` / `pscp -i`; VPS hanya menerima auth publickey, bukan password).
- **Folder deploy**: `/home/ibaihaqi/apps/anvaia-analytics-bag`.
- **Subdomain**: `https://anvaia-bag.teman-umkm.com` (nginx host-level + certbot).
- **RAM VPS kecil (~3.6GB)** → JANGAN build Vite (frontend) di VPS, bisa OOM/overload
  sampai SSH mati. Build frontend di laptop, transfer `dist` saja.

## Port & DB
- Frontend host port **4000**, auth **4041**, executive **4042**.
- auth-service DB: `host.docker.internal:5432` / db `anvaia_bag` / `anvaia`/`anvaia`
  (Postgres native di VPS; pg_hba.conf sudah mengizinkan subnet docker `172.16.0.0/12`).
- analytics-service DB: AWS RDS `dashboard-db.cd4a0agkih3m.ap-southeast-3.rds.amazonaws.com`
  / db **`altair_demo`** / `postgres`/`Dwidasa123!` (berisi schema churn/ods/segmentation/
  profitability/recommender/eval; `ref.job_type` sudah dibuat manual di sana).

## Alur deploy

### 1. Lokal — build, commit, push
```
cd frontend && npm run build      # verifikasi lolos
git commit -am "..."
git push origin main              # butuh VPN (dari laptop)
```

### 2. Sinkron kode ke VPS via git bundle
```
git bundle create anvaia-bag.bundle main
pscp -i <key> anvaia-bag.bundle ibaihaqi@103.196.152.124:/home/ibaihaqi/apps/anvaia-bag.bundle
plink -i <key> ibaihaqi@... "cd ~/apps/anvaia-analytics-bag && git pull /home/ibaihaqi/apps/anvaia-bag.bundle main"
```

### 3a. Deploy FRONTEND — build di laptop, transfer dist (JANGAN build di VPS)
```
cd frontend && npm run build
tar -czf dist.tar.gz -C dist .
pscp -i <key> frontend/dist.tar.gz ibaihaqi@...:/home/ibaihaqi/apps/anvaia-analytics-bag/frontend/dist.tar.gz
```
Di VPS, bangun image nginx dari dist yang sudah jadi (context bersih di /tmp agar
`.dockerignore` yang meng-exclude `dist/` tidak menghalangi COPY):
```
CTX=/tmp/anvaia-bag-fe-prebuilt
rm -rf "$CTX"; mkdir -p "$CTX/dist"
tar -xzf ~/apps/anvaia-analytics-bag/frontend/dist.tar.gz -C "$CTX/dist"
cp ~/apps/anvaia-analytics-bag/frontend/nginx.conf "$CTX/nginx.conf"
cat > "$CTX/Dockerfile" <<'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
docker build -t anvaia-analytics-bag-frontend:latest "$CTX"
docker rm -f anvaia-bag-frontend 2>/dev/null || true
docker run -d --name anvaia-bag-frontend --restart unless-stopped \
  --network anvaia-analytics-bag_anvaia-bag-network -p 4000:80 \
  anvaia-analytics-bag-frontend:latest
```

### 3b. Deploy BACKEND (auth/executive) — build di VPS (ringan, boleh)
```
plink -i <key> ibaihaqi@... "cd ~/apps/anvaia-analytics-bag && docker compose up -d --build auth-service analytics-service"
```
Catatan: kalau ada migrasi Flyway baru untuk executive (RDS altair_demo), Flyway
auth-service hanya mengelola `anvaia_bag`. Untuk perubahan schema di `altair_demo`,
jalankan SQL langsung ke RDS (mis. via psql dari VPS).

### 4. Verifikasi
```
docker ps --filter name=anvaia-bag --format '{{.Names}} :: {{.Status}}'
curl -s -o /dev/null -w '%{http_code}' https://anvaia-bag.teman-umkm.com/
```

## Catatan operasional
- SSH ke VPS kadang lambat/timeout saat host sibuk; ulangi perintah bila perlu.
- Untuk perintah berjalan lama, jalankan detached (`setsid ... < /dev/null > log 2>&1 &`)
  lalu poll log — tapi dengan alur "build frontend di laptop", langkah berat ini
  tidak lagi diperlukan di VPS.
- Bersihkan file sementara (bundle, dist.tar.gz, script) setelah deploy.
