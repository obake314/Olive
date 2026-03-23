#!/bin/bash
# VPS 初期セットアップスクリプト (Ubuntu/Debian)
# 使い方: sudo bash setup-vps.sh

set -e

echo "🫒 Olive VPS セットアップ開始..."

# Docker インストール
if ! command -v docker &>/dev/null; then
  echo "📦 Docker をインストール中..."
  apt-get update -q
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -q
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  echo "✅ Docker インストール完了"
else
  echo "✅ Docker は既にインストール済み"
fi

# デプロイディレクトリ作成
mkdir -p /app/olive
echo "✅ /app/olive ディレクトリ作成完了"

# ファイアウォール設定 (ufw がある場合)
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS (将来用)
  ufw --force enable
  echo "✅ ufw ファイアウォール設定完了"
fi

echo ""
echo "✅ VPS セットアップ完了!"
echo ""
echo "次のステップ:"
echo "  1. DNS設定: olive.eclo.info の A レコードをこのVPSのIPアドレスに向ける"
echo ""
echo "  2. GitHub リポジトリの Settings > Secrets > Actions に以下を追加:"
echo "     VPS_HOST    = このVPSのIPアドレス (例: 85.131.248.107)"
echo "     VPS_USER    = SSHユーザー名 (例: root)"
echo "     VPS_SSH_KEY = SSH秘密鍵の内容"
echo ""
echo "  3. GitHub リポジトリの Settings > Variables > Actions に以下を追加:"
echo "     ALLOWED_ORIGINS = http://olive.eclo.info"
echo ""
echo "  4. mainブランチにpushすると自動デプロイが始まります"
echo "  5. デプロイ後: http://olive.eclo.info/ でアクセス可能"
