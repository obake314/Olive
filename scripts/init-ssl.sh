#!/bin/bash
# 初回SSL証明書取得スクリプト
# 使い方: bash init-ssl.sh your@email.com
# ※ DNS設定 (olive.eclo.info → このVPSのIP) が完了してから実行すること

set -e

DOMAIN="olive.eclo.info"
EMAIL="${1}"

if [ -z "$EMAIL" ]; then
  echo "使い方: bash init-ssl.sh your@email.com"
  exit 1
fi

cd /app/olive

echo "🔐 初回SSL証明書取得を開始..."

# 証明書取得前: HTTPのみで web を起動するための一時設定
# (nginx.conf に443設定があると証明書なしでは起動しないため、
#  certbot の webroot チャレンジ用に一時的にHTTP onlyで nginx を起動)

# 一時的な nginx 設定を作成
cat > /tmp/nginx-init.conf << 'EOF'
server {
    listen 80;
    server_name olive.eclo.info;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Initializing SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

# 一時コンテナで HTTP のみ起動して証明書取得
docker run --rm -d \
  --name olive-nginx-init \
  -p 80:80 \
  -v certbot-www:/var/www/certbot \
  -v /tmp/nginx-init.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine

echo "⏳ nginx 起動待機..."
sleep 3

# certbot で証明書取得
docker run --rm \
  -v certbot-www:/var/www/certbot \
  -v certbot-conf:/etc/letsencrypt \
  certbot/certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

# 一時コンテナ停止
docker stop olive-nginx-init 2>/dev/null || true

echo " SSL証明書取得完了!"
echo ""
echo "次のステップ: mainブランチにpushしてデプロイしてください"
echo "  または手動でデプロイ済みの場合:"
echo "  cd /app/olive && docker compose restart web"
