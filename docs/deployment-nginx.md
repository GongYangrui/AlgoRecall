# Nginx Reverse Proxy Deployment

Use this when the Nuxt app is already running with Docker on port `3000`, but you want the site to open directly from your domain without adding `:3000`.

## 1. Confirm DNS and firewall

Point your domain's DNS `A` record to the server public IP.

Open these ports in your cloud security group and server firewall:

- `80` for HTTP
- `443` for HTTPS

The app container remains available on the server at `127.0.0.1:3000`.

## 2. Start the app

From the project directory on the server:

```bash
./start.sh deploy
```

该命令会同时加载 `docker-compose.yml` 与 `docker-compose.prod.yml`，构建最新镜像、等待 PostgreSQL 和 Redis、执行数据库迁移、启动应用并完成健康检查。

This project binds the app port as `127.0.0.1:3000:3000`, so public traffic must go through Nginx.

## 3. Install Nginx

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

CentOS/RHEL:

```bash
sudo yum install -y nginx
sudo systemctl enable --now nginx
```

## 4. Configure the site

Copy the provided config:

```bash
sudo cp deploy/nginx/algorecall.conf /etc/nginx/sites-available/algorecall
```

Edit the domain names:

```bash
sudo nano /etc/nginx/sites-available/algorecall
```

Replace:

```nginx
server_name example.com www.example.com;
```

with your real domain, for example:

```nginx
server_name algorecall.com www.algorecall.com;
```

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/algorecall /etc/nginx/sites-enabled/algorecall
sudo nginx -t
sudo systemctl reload nginx
```

If your server uses `/etc/nginx/conf.d/` instead of `sites-available`, copy the file there instead:

```bash
sudo cp deploy/nginx/algorecall.conf /etc/nginx/conf.d/algorecall.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Update auth URL

Set `BETTER_AUTH_URL` in the server `.env` to your public URL.

Before HTTPS is enabled:

```env
BETTER_AUTH_URL=http://your-domain.com
```

After HTTPS is enabled:

```env
BETTER_AUTH_URL=https://your-domain.com
```

Restart the app after changing `.env`:

```bash
./start.sh deploy
```

## 6. Enable HTTPS

Ubuntu/Debian:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

CentOS/RHEL:

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Then update `.env` to use `https://` and restart the app again.

## 7. Verify

```bash
curl -I http://your-domain.com
curl -I https://your-domain.com
```

Also test login, logout, and registration in the browser to confirm Better Auth redirects and cookies use the final domain.
