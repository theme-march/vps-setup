# Vortex Deploy: VPS Setup Guide

This guide will help you set up your VPS to run the Vortex Deploy platform.

## 1. Initial Server Setup
Connect to your VPS via SSH:
```bash
ssh root@your-vps-ip
```

Update packages:
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Dependencies
Install Node.js (LTS), Nginx, MongoDB, and Git:

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx
sudo apt install -y nginx

# MongoDB
sudo apt-get install -y mongodb-org

# Git
sudo apt install -y git
```

## 3. Install PM2
PM2 will manage your applications:
```bash
sudo npm install -g pm2
```

## 4. Directory Structure
Create the apps directory and set permissions:
```bash
sudo mkdir -p /var/www/apps
sudo chown -R $USER:$USER /var/www/apps
```

## 5. Deploy Vortex Deploy
Clone this platform to your server:
```bash
git clone https://github.com/your-repo/vortex-deploy.git
cd vortex-deploy
npm install
npm run build
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
nano .env # Edit with your MONGODB_URI and JWT_SECRET
```

Start the platform with PM2:
```bash
pm2 start server.ts --name vortex-deploy --interpreter tsx
```

## 6. Configure Nginx for the Dashboard
Create a configuration for the main dashboard:
```bash
sudo nano /etc/nginx/sites-available/vortex-deploy
```

Add the following:
```nginx
server {
    listen 80;
    server_name vortex.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/vortex-deploy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL with Let's Encrypt
Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vortex.your-domain.com
```

## 8. GitHub Webhook Setup
1. Go to your GitHub repository settings.
2. Click on **Webhooks** -> **Add webhook**.
3. Payload URL: `http://vortex.your-domain.com/api/webhooks/github`
4. Content type: `application/json`
5. Secret: Use the `webhookSecret` generated for your project in the Vortex dashboard.
6. Select **Just the push event**.
7. Click **Add webhook**.

---
**Note:** Ensure your VPS firewall (UFW) allows traffic on ports 80, 443, and 3000 (if needed).
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
```
