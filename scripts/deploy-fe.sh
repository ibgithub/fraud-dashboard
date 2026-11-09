#!/usr/bin/env bash
set -e

APP_DIR=/home/ec2-user/anvaia-analytics-bag
WEBROOT=$APP_DIR/frontend-dist
NET=anvaia-analytics-bag_default

echo "==> Preparing web root at $WEBROOT"
rm -rf "$WEBROOT"
mkdir -p "$WEBROOT"
tar -xzf /tmp/dist.tar.gz -C "$WEBROOT"

echo "==> Detecting docker network"
NET=$(docker inspect anvaia-bag-analytics-service --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
echo "    network = $NET"

echo "==> Recreating frontend container"
docker rm -f anvaia-bag-frontend 2>/dev/null || true

docker run -d \
  --name anvaia-bag-frontend \
  --restart unless-stopped \
  --network "$NET" \
  -p 80:80 -p 443:443 \
  -v "$WEBROOT":/usr/share/nginx/html:ro \
  -v "$APP_DIR/nginx.https.conf":/etc/nginx/conf.d/default.conf:ro \
  -v "$APP_DIR/certs/selfsigned.crt":/etc/nginx/certs/selfsigned.crt:ro \
  -v "$APP_DIR/certs/selfsigned.key":/etc/nginx/certs/selfsigned.key:ro \
  nginx:alpine

echo "==> Waiting for nginx"
sleep 4
echo "==> Verify bundle served"
curl -sk https://localhost/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -n1
echo "==> Verify API proxy (auth login returns 400 for bad creds = reachable)"
curl -sk -o /dev/null -w 'auth_login_http=%{http_code}\n' https://localhost/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}'
