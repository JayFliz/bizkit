#!/bin/bash
set -euo pipefail

exec > /var/log/user-data.log 2>&1

# --- System packages ---
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx unzip build-essential python3

# --- Node.js 22 via NodeSource ---
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
chmod 755 /usr/bin/node

# --- pm2 for process management ---
npm install -g pm2

# --- App user ---
useradd -m -s /bin/bash bizkit

# --- AWS CLI v2 (for SSM) ---
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip

# --- Fetch secrets from SSM Parameter Store ---
SESSION_SECRET=$(aws ssm get-parameter \
  --region ${aws_region} \
  --name "${ssm_prefix}/session-secret" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

RESEND_API_KEY=$(aws ssm get-parameter \
  --region ${aws_region} \
  --name "${ssm_prefix}/resend-api-key" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

# --- Clone app ---
cd /home/bizkit
sudo -u bizkit git clone ${app_repo} app
cd app

# --- Environment file ---
tee .env > /dev/null <<ENVEOF
NODE_ENV=production
SESSION_SECRET=$SESSION_SECRET
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM=${resend_from}
COOKIE_SECURE=${ domain_name != "" ? "true" : "false" }
ENVEOF
chown bizkit:bizkit .env
chmod 600 .env

# --- Install, seed, and build ---
sudo -u bizkit npm ci
sudo -u bizkit npm run db:seed
sudo -u bizkit npm run build

# --- pm2 ecosystem file (single Next.js process) ---
sudo -u bizkit tee ecosystem.config.cjs > /dev/null <<'PMEOF'
module.exports = {
  apps: [
    {
      name: 'bizkit',
      cwd: '/home/bizkit/app',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
PMEOF

# --- Start app via pm2 ---
sudo -u bizkit pm2 start ecosystem.config.cjs
sudo -u bizkit pm2 save

# --- pm2 startup (runs as root, restores bizkit user's processes) ---
env PATH=$PATH:/usr/bin pm2 startup systemd -u bizkit --hp /home/bizkit

# --- nginx config ---
DOMAIN="${domain_name}"
SERVER_NAME="$${DOMAIN:-_}"

tee /etc/nginx/sites-available/bizkit > /dev/null <<NGINXEOF
server {
    listen 80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/bizkit /etc/nginx/sites-enabled/bizkit
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

# --- TLS via certbot (only if domain is set) ---
if [ -n "$DOMAIN" ]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
fi

echo "=== Bizkit deployment complete ==="
