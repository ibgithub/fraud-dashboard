---
inclusion: manual
---

# Deploy Standar — EC2 Jakarta (anvaia-bag)

Acuan tetap untuk men-deploy project ini ke EC2 Jakarta. Ikuti alur ini setiap deploy.
Server ini TERPISAH dari VPS teman-umkm (lihat `deploy-vps.md`).

## Konteks penting
- **Server**: `ec2-user@15.232.164.89`, SSH key `C:\works\ai\aws\key\anvaia-bag-jkt-key.pem`
  (pakai `ssh -i` / `scp -i`).
- **Folder deploy**: `/home/ec2-user/anvaia-analytics-bag`.
- **Akses web**: `https://15.232.164.89/` (nginx self-signed HTTPS di dalam container frontend).
- **Compose file**: `docker-compose.ec2.yml` (git-untracked, hanya ada di server).
  File server lain yang git-untracked: `nginx.https.conf`, `certs/`.
- **Container**: `anvaia-bag-frontend`, `anvaia-bag-auth-service`, `anvaia-bag-analytics-service`.
  Nama service sudah `analytics-service` (bukan executive-service).
- **Docker network**: `anvaia-analytics-bag_anvaia-bag-network`.
- **RAM ~3.5GB** → JANGAN build Vite (frontend) di server, berisiko OOM. Build frontend
  di laptop, transfer `dist` saja. Backend (Maven) aman di-build di server.

## Alur deploy

### 1. Lokal — commit dulu
```
git commit -am "..."
```

### 2. Sinkron kode ke server (untuk perubahan BACKEND)
Sinkronkan source ke `/home/ec2-user/anvaia-analytics-bag` (git pull/bundle, atau scp
file yang berubah). Lalu build backend LANGSUNG di server:
```
ssh -i <key> ec2-user@15.232.164.89 \
  "cd ~/anvaia-analytics-bag && docker compose -f docker-compose.ec2.yml up -d --build auth-service analytics-service"
```
Catatan: perubahan skema `altair_demo` (analytics) dijalankan via SQL langsung ke RDS;
Flyway analytics hanya mengelola schema `churn`.

### 3. Deploy FRONTEND — build di laptop, transfer dist (JANGAN build di server)
```
cd frontend && npm run build
tar -czf dist.tar.gz -C dist .
scp -i <key> frontend/dist.tar.gz ec2-user@15.232.164.89:/home/ec2-user/anvaia-analytics-bag/frontend/dist.tar.gz
```
Di server, bangun image nginx tipis dari dist pre-built (context bersih di /tmp agar
`.dockerignore` yang meng-exclude `dist/` tidak menghalangi COPY), lalu recreate container
dengan network + mount cert + nginx.https.conf + port 80/443 yang sama:
```
APP=/home/ec2-user/anvaia-analytics-bag
CTX=/tmp/anvaia-bag-fe-prebuilt
rm -rf "$CTX"; mkdir -p "$CTX/dist"
tar -xzf "$APP/frontend/dist.tar.gz" -C "$CTX/dist"
cat > "$CTX/Dockerfile" <<'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
EOF
docker build -t anvaia-analytics-bag-frontend:latest "$CTX"
docker rm -f anvaia-bag-frontend 2>/dev/null || true
docker run -d --name anvaia-bag-frontend --restart unless-stopped \
  --network anvaia-analytics-bag_anvaia-bag-network \
  -p 80:80 -p 443:443 \
  -v "$APP/certs/selfsigned.crt:/etc/nginx/certs/selfsigned.crt:ro" \
  -v "$APP/certs/selfsigned.key:/etc/nginx/certs/selfsigned.key:ro" \
  -v "$APP/nginx.https.conf:/etc/nginx/conf.d/default.conf:ro" \
  anvaia-analytics-bag-frontend:latest
```

### 4. Verifikasi
```
docker ps --filter name=anvaia-bag --format '{{.Names}} :: {{.Status}}'
curl -sk -o /dev/null -w '%{http_code}\n' https://localhost/
# bundle yang disajikan harus cocok dengan hasil build terbaru:
curl -sk https://localhost/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```

## Catatan operasional
- Bersihkan file sementara (`dist.tar.gz` lokal & server, `/tmp/anvaia-bag-fe-prebuilt`,
  script sementara) setelah deploy.
- PowerShell + ssh: hindari nested-quote rumit; untuk perintah bash kompleks, tulis ke
  file `.sh`, `scp` ke `/tmp`, lalu `bash /tmp/x.sh`.
- SSH kadang ter-interrupt saat render output panjang; verifikasi hasil lewat perintah
  cek terpisah (exit code tidak selalu reliable).
