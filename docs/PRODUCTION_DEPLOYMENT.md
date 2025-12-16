# Govt Procurement Library - Production Deployment Guide

## Overview

This guide covers deploying the Govt Procurement Library web application to a production server using Docker.

**Production URL:** https://www.gphusa.com
**API Backend:** https://api.gphusa.com

---

## Prerequisites

### On Production Server
- Docker and Docker Compose installed
- SSL certificates for `*.gralavi.com`
- DNS record pointing `www.gphusa.com` to the server IP

### SSL Certificates Required
Place these files in `nginx/certs/` on the production server:
- `star_gralavi_com_fullchain.crt`
- `star_gralavi_com.key`

---

## Deployment Steps

### 1. Copy Project to Production Server

From your local machine, sync the project (excluding unnecessary files):

```bash
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.env.development' \
    ./ user@your-server:/opt/govt-procurement-library/
```

### 2. SSH to Production Server

```bash
ssh user@your-server
cd /opt/govt-procurement-library
```

### 3. Add SSL Certificates

```bash
# Copy your wildcard certificates to the nginx/certs directory
cp /path/to/star_gralavi_com_fullchain.crt nginx/certs/
cp /path/to/star_gralavi_com.key nginx/certs/

# Verify certificates are in place
ls -la nginx/certs/
```

### 4. Build and Start Services

```bash
# Build Docker images (clears caches automatically)
./scripts/prod.sh build

# Start all services
./scripts/prod.sh start
```

### 5. Verify Deployment

```bash
# Check service status
./scripts/prod.sh status

# Test the site
curl -I https://www.gphusa.com
```

---

## Production Script Commands

All commands are run from the project root directory.

### Service Management

| Command | Description |
|---------|-------------|
| `./scripts/prod.sh build` | Build Docker images (clears Next.js cache first) |
| `./scripts/prod.sh start` | Start all production services |
| `./scripts/prod.sh stop` | Stop all services |
| `./scripts/prod.sh restart` | Restart all services |
| `./scripts/prod.sh status` | Show service status and health |

### Logs & Debugging

| Command | Description |
|---------|-------------|
| `./scripts/prod.sh logs` | Show logs for all services (follow mode) |
| `./scripts/prod.sh logs web` | Show Next.js web container logs |
| `./scripts/prod.sh logs nginx` | Show nginx logs |

### Maintenance

| Command | Description |
|---------|-------------|
| `./scripts/prod.sh cleanup` | Remove unused Docker resources |
| `./scripts/prod.sh exec web sh` | Open shell in web container |

---

## Updating the Application

When deploying updates:

```bash
# 1. Sync updated files to server
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    ./ user@your-server:/opt/govt-procurement-library/

# 2. SSH to server and rebuild
ssh user@your-server
cd /opt/govt-procurement-library
./scripts/prod.sh build
./scripts/prod.sh restart
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.production` | Environment variables (API URL, flags) |
| `docker-compose.production.yml` | Docker service definitions |
| `nginx/nginx.production.conf` | Nginx reverse proxy config |
| `Dockerfile` | Next.js container build instructions |

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
sudo systemctl status docker

# View detailed logs
./scripts/prod.sh logs

# Check for port conflicts
sudo lsof -i :80
sudo lsof -i :443
```

### SSL Certificate Issues

```bash
# Verify certificates exist
ls -la nginx/certs/

# Check certificate validity
openssl x509 -in nginx/certs/star_gralavi_com_fullchain.crt -text -noout | head -20
```

### Container Health

```bash
# Check running containers
docker ps

# Inspect specific container
docker inspect govtlib-web-prod
docker inspect govtlib-nginx-prod
```

### Rebuild From Scratch

```bash
./scripts/prod.sh stop
./scripts/prod.sh cleanup
./scripts/prod.sh build
./scripts/prod.sh start
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Internet                         │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              www.gphusa.com                    │
│                   (DNS)                             │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│          nginx (govtlib-nginx-prod)                 │
│              Port 80/443                            │
│         SSL termination + reverse proxy            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│          Next.js (govtlib-web-prod)                 │
│              Port 3000 (internal)                   │
│         Static + Server-side rendering             │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼ (API calls)
┌─────────────────────────────────────────────────────┐
│          https://api.gphusa.com                │
│              (External API server)                  │
└─────────────────────────────────────────────────────┘
```

---

## Related Documentation

- Development setup: `./scripts/dev.sh --help`
- API documentation: https://api.gphusa.com/docs
