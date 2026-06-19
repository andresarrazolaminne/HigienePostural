#!/bin/sh
# Lightsail: el resolver dinamico de nginx suele fallar con el hostname "api".
# Arrancamos nginx de inmediato (health :80) y recargamos cuando resolvemos la API por IP.
set -e

API_HOST="${API_UPSTREAM_HOST:-api}"
API_PORT="${API_UPSTREAM_PORT:-8080}"
CONF_DIR="/etc/nginx/conf.d"
SNIPPET_DIR="/etc/nginx/snippets"
API_SNIPPET="${SNIPPET_DIR}/api-proxy.conf"
MAIN_CONF="${CONF_DIR}/default.conf"

write_api_placeholder() {
  cat >"$API_SNIPPET" <<'EOF'
location ~ ^/(auth|users|companies|sites|sessions|assessments|reports|branding|health)(/|$) {
    default_type application/json;
    add_header Retry-After 2 always;
    return 503 '{"detail":"API iniciando, reintenta en unos segundos"}';
}
EOF
}

write_api_proxy() {
  target="$1"
  cat >"$API_SNIPPET" <<EOF
location ~ ^/(auth|users|companies|sites|sessions|assessments|reports|branding|health)(/|$) {
    proxy_pass ${target};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 120s;
    proxy_connect_timeout 15s;
}
EOF
}

write_main_conf() {
  cat >"$MAIN_CONF" <<'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    client_max_body_size 12m;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    include /etc/nginx/snippets/api-proxy.conf;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
}

resolve_api_ip() {
  getent hosts "$API_HOST" 2>/dev/null | awk '{print $1}' | head -1
}

api_reachable() {
  wget -q -O /dev/null "http://${API_HOST}:${API_PORT}/health" 2>/dev/null
}

mkdir -p "$SNIPPET_DIR"
write_api_placeholder
write_main_conf

(
  elapsed=0
  while [ "$elapsed" -lt 180 ]; do
    ip=$(resolve_api_ip)
    if [ -n "$ip" ]; then
      echo "nginx: API ${API_HOST} -> ${ip}:${API_PORT} (proxy por IP)"
      write_api_proxy "http://${ip}:${API_PORT}"
      nginx -s reload 2>/dev/null || true
      exit 0
    fi
    if api_reachable; then
      echo "nginx: API ${API_HOST}:${API_PORT} responde /health (proxy por hostname)"
      write_api_proxy "http://${API_HOST}:${API_PORT}"
      nginx -s reload 2>/dev/null || true
      exit 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "nginx: WARN API ${API_HOST} no resolvio en 180s; rutas API siguen en 503"
) &

echo "nginx: escuchando :80; esperando API (${API_HOST}:${API_PORT}) en segundo plano..."
exec nginx -g 'daemon off;'
