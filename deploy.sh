#!/bin/bash
set -euo pipefail

SERVER="ubuntu@35.179.187.63"
KEY="$HOME/.ssh/helpdesk.pem"
APP_DIR="/home/bizkit/app"

echo "=== Step 1: Syncing bizkit to server ==="
rsync -avz --exclude node_modules --exclude .next --exclude '.git' --exclude 'data/*.db' \
  -e "ssh -i $KEY" \
  "$(dirname "$0")/" "$SERVER:/tmp/bizkit/"

echo "=== Step 2: Setting up on server ==="
ssh -i "$KEY" "$SERVER" bash -s <<'REMOTE'
set -euo pipefail

APP_DIR="/home/bizkit/app"

# Move app into place
sudo rm -rf "$APP_DIR"
sudo mv /tmp/bizkit "$APP_DIR"
sudo chown -R bizkit:bizkit "$APP_DIR"

# Write .env from SSM secrets (reusing helpdesk keys)
RESEND_API_KEY=$(aws ssm get-parameter --region eu-west-2 --name "/helpdesk/resend-api-key" --with-decryption --query 'Parameter.Value' --output text)
SESSION_SECRET=$(aws ssm get-parameter --region eu-west-2 --name "/helpdesk/session-secret" --with-decryption --query 'Parameter.Value' --output text)

sudo -u bizkit tee "$APP_DIR/.env" > /dev/null <<EOF
NODE_ENV=production
SESSION_SECRET=$SESSION_SECRET
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM=Bizkit <bizkit@fliz.co.uk>
EOF
sudo chmod 600 "$APP_DIR/.env"

# Install, seed, build
cd "$APP_DIR"
sudo -u bizkit npm ci
sudo -u bizkit npm run db:seed
sudo -u bizkit npm run build

# pm2 ecosystem (single Next.js process)
sudo -u bizkit tee "$APP_DIR/ecosystem.config.cjs" > /dev/null <<'PMEOF'
module.exports = {
  apps: [{
    name: 'bizkit',
    cwd: '/home/bizkit/app',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: { NODE_ENV: 'production', PORT: 3000 },
  }],
};
PMEOF

# Stop any existing pm2 processes, start fresh
sudo -u bizkit pm2 delete all 2>/dev/null || true
sudo -u bizkit pm2 start "$APP_DIR/ecosystem.config.cjs"
sudo -u bizkit pm2 save

# nginx config
sudo tee /etc/nginx/sites-available/bizkit > /dev/null <<'NGEOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGEOF

sudo ln -sf /etc/nginx/sites-available/bizkit /etc/nginx/sites-enabled/bizkit
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "=== Bizkit deployment complete ==="
REMOTE

echo ""
echo "Done! Visit http://35.179.187.63"
echo "Login: admin@bizkit.app / password"
