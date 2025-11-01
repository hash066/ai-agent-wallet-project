# 🚀 AI Agent Wallet Production Deployment Guide

This guide covers deploying the AI Agent Wallet to production with full monitoring, security, and scalability.

## 📋 Prerequisites

### System Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: 8GB minimum, 16GB recommended
- **CPU**: 4 cores minimum, 8 cores recommended
- **Storage**: 50GB SSD minimum
- **Network**: Stable internet connection

### Domain & SSL
- Domain name (e.g., `ai-agent-wallet.com`)
- SSL certificate (Let's Encrypt or commercial)
- DNS configuration

### External Services
- **Email Service**: SMTP credentials for notifications
- **Blockchain RPC**: Infura/Alchemy API keys
- **IPFS**: API key for decentralized storage
- **Monitoring**: Optional external monitoring service

## 🛠️ Quick Start Deployment

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ai-agent-wallet

# Copy environment template
cp .env.prod.example .env.prod

# Edit with your production values
nano .env.prod  # or your preferred editor
```

### 2. Configure Environment
Edit `.env.prod` with your production values:

```bash
# Required minimum configuration
DB_USER=aiwallet
DB_PASSWORD=your_secure_db_password_here
JWT_SECRET=your_very_secure_jwt_secret_here_minimum_32_characters
REDIS_PASSWORD=your_secure_redis_password_here
GRAFANA_PASSWORD=your_secure_grafana_password_here

# Domain configuration
CORS_ORIGIN=https://yourdomain.com

# External API keys
ALCHEMY_API_KEY=your_alchemy_api_key_here
IPFS_API_KEY=your_ipfs_api_key_here
EMAIL_SERVICE_API_KEY=your_email_service_api_key_here
```

### 3. Deploy
```bash
# Make deploy script executable (Linux/Mac)
chmod +x scripts/deploy.sh

# Run full deployment
./scripts/deploy.sh

# Or deploy step by step
./scripts/deploy.sh build    # Build images only
./scripts/deploy.sh start    # Start services only
./scripts/deploy.sh status   # Check deployment status
```

### 4. Verify Deployment
```bash
# Check service health
curl http://localhost/health

# Check all services
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs backend
./scripts/deploy.sh logs frontend
```

## 🌐 Access URLs

After successful deployment:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | `http://localhost` | Main application UI |
| **API** | `http://localhost/api` | REST API endpoints |
| **Health Check** | `http://localhost/health` | Service health status |
| **Prometheus** | `http://localhost/prometheus` | Metrics collection |
| **Grafana** | `http://localhost/grafana` | Monitoring dashboards |
| **AlertManager** | `http://localhost:9093` | Alert management |

## 🔧 Configuration

### Environment Variables

#### Required Variables
```bash
# Database
DB_USER=aiwallet
DB_PASSWORD=<secure-password>

# Security
JWT_SECRET=<32-char-minimum-secret>
REDIS_PASSWORD=<secure-password>

# Monitoring
GRAFANA_PASSWORD=<secure-password>
```

#### Optional Variables
```bash
# Domain & SSL
CORS_ORIGIN=https://yourdomain.com
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem

# External Services
ALCHEMY_API_KEY=<api-key>
IPFS_API_KEY=<api-key>
EMAIL_SERVICE_API_KEY=<api-key>

# Performance
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=3600
```

### SSL/HTTPS Setup

1. **Obtain SSL Certificate** (using Let's Encrypt):
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

2. **Update Nginx Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of SSL config
}
```

3. **Enable HTTPS in Docker Compose**:
```yaml
nginx:
  ports:
    - "443:443"
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl:ro
```

## 📊 Monitoring & Observability

### Accessing Grafana
1. Open `http://localhost/grafana`
2. Login with `admin` / `$GRAFANA_PASSWORD`
3. Import dashboards from `monitoring/grafana/dashboards/`

### Key Metrics to Monitor
- **API Response Times**: P95 should be <500ms
- **Error Rates**: Should be <1%
- **Database Connections**: Monitor pool usage
- **Memory/CPU Usage**: Per service
- **Intent Success Rate**: Cross-chain operations

### Alerting
Configure alerts in AlertManager (`monitoring/alertmanager.yml`):
- High error rates
- Service downtime
- Resource exhaustion
- Cross-chain failures

## 🔒 Security Configuration

### Network Security
```bash
# Firewall rules (example for Ubuntu)
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw --force enable
```

### SSL/TLS Configuration
- Use TLS 1.2 or higher
- Enable HSTS headers
- Regular certificate renewal
- Strong cipher suites

### Application Security
- JWT tokens with short expiration
- Rate limiting enabled
- Input validation and sanitization
- CORS properly configured
- Security headers enabled

## 🚀 Scaling & Performance

### Horizontal Scaling
```yaml
# Scale backend services
docker-compose up -d --scale backend=3

# Scale frontend (with load balancer)
docker-compose up -d --scale frontend=2
```

### Database Optimization
- Connection pooling configured
- Proper indexing on frequently queried columns
- Regular maintenance and vacuum operations
- Backup strategy implemented

### Caching Strategy
- Redis for session storage
- API response caching
- Static asset caching via CDN
- Database query result caching

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$DATE.sql

# Upload to S3
aws s3 cp backup_$DATE.sql s3://$BACKUP_BUCKET/
```

### Disaster Recovery
1. **Data Recovery**: Restore from latest backup
2. **Service Recovery**: Use deployment script rollback
3. **Failover**: Configure multi-region deployment

## 🧪 Testing Production Deployment

### Load Testing
```bash
# Install k6
npm install -g k6

# Run load tests
k6 run load-tests/k6-script.js

# Run specific scenarios
k6 run --tag test_type=stress load-tests/k6-script.js
```

### Health Checks
```bash
# API health
curl -f https://yourdomain.com/api/health

# Database connectivity
docker-compose exec backend npm run db:check

# External service connectivity
docker-compose exec backend npm run services:check
```

## 📋 Maintenance Tasks

### Regular Maintenance
```bash
# Update images
docker-compose pull

# Rotate logs
docker-compose exec backend logrotate /etc/logrotate.d/app

# Database maintenance
docker-compose exec postgres vacuumdb -U $DB_USER -f $DB_NAME

# Security updates
docker-compose build --no-cache
```

### Monitoring Maintenance
- Review Grafana dashboards weekly
- Check AlertManager for new alerts
- Monitor SSL certificate expiration
- Update dependencies regularly

## 🚨 Troubleshooting

### Common Issues

1. **Service Won't Start**
```bash
# Check logs
./scripts/deploy.sh logs <service-name>

# Check resource usage
docker stats

# Restart service
./scripts/deploy.sh restart <service-name>
```

2. **Database Connection Issues**
```bash
# Check database health
docker-compose exec postgres pg_isready -U $DB_USER

# Check connection from backend
docker-compose exec backend npm run db:test
```

3. **High Memory Usage**
```bash
# Check memory usage
docker stats

# Restart services
./scripts/deploy.sh restart

# Scale down if needed
docker-compose up -d --scale backend=1
```

4. **SSL Certificate Issues**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Reload nginx
docker-compose exec nginx nginx -s reload
```

## 📞 Support & Monitoring

### Health Check Endpoints
- `/health` - Overall service health
- `/api/health` - API-specific health
- `/metrics` - Prometheus metrics

### Log Aggregation
```bash
# View all logs
./scripts/deploy.sh logs

# Follow specific service logs
./scripts/deploy.sh logs backend -f

# Export logs for analysis
docker-compose logs > logs_$(date +%Y%m%d).txt
```

### Performance Monitoring
- **Response Times**: Track P50, P95, P99
- **Error Rates**: Monitor 4xx and 5xx responses
- **Resource Usage**: CPU, memory, disk, network
- **Business Metrics**: Intent success rates, user activity

## 🔄 Updates & Rollbacks

### Zero-Downtime Updates
```bash
# Build new images
./scripts/deploy.sh build

# Rolling update
docker-compose up -d --no-deps backend

# Verify health
curl -f https://yourdomain.com/health

# Complete update
docker-compose up -d
```

### Rollback Strategy
```bash
# Quick rollback
./scripts/deploy.sh rollback

# Or manual rollback
docker-compose pull <previous-tag>
docker-compose up -d
```

## 🎯 Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] External services connected
- [ ] Load testing completed

### Post-Deployment
- [ ] Services accessible via domain
- [ ] HTTPS working correctly
- [ ] Monitoring dashboards configured
- [ ] Alerting notifications tested
- [ ] Backup strategy verified

### Ongoing Maintenance
- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] Log rotation configured
- [ ] Backup verification
- [ ] SSL certificate renewal

---

## 📞 Need Help?

- **Documentation**: Check this guide and inline comments
- **Logs**: Use `./scripts/deploy.sh logs` for debugging
- **Monitoring**: Check Grafana dashboards for insights
- **Community**: Join our Discord for support

**Happy deploying! 🚀**
