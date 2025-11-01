# AI Agent Wallet Deployment Guide

## Overview

This guide covers the complete deployment process for the AI Agent Wallet system, including smart contracts, backend services, and infrastructure setup. The deployment is designed for both development and production environments with comprehensive security and monitoring.

## Prerequisites

### System Requirements

**Minimum Hardware:**
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 50GB SSD
- **Network**: 100Mbps connection

**Software Dependencies:**
- **Node.js**: v20.0.0 or higher
- **Docker**: v24.0.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **Git**: v2.30.0 or higher
- **Make**: v4.0 or higher

### Network Requirements

**Inbound Ports:**
- `80/443`: HTTP/HTTPS traffic
- `22`: SSH access (production only)
- `3000`: API server (development only)

**Outbound Access:**
- Blockchain RPC endpoints (Alchemy, Infura)
- Email SMTP servers
- IPFS/Pinata services
- Database connections

### External Services

**Required Accounts:**
1. **Alchemy** (https://alchemy.com)
   - Sepolia testnet API key
   - Polygon Amoy API key

2. **Supabase** (https://supabase.com) or PostgreSQL
   - Database instance
   - Connection credentials

3. **Pinata** (https://pinata.cloud)
   - IPFS API key and secret

4. **Email Service** (Gmail, SendGrid, etc.)
   - SMTP credentials

---

## Quick Start Deployment

### 1. Environment Setup

```bash
# Clone repository
git clone https://github.com/yourusername/ai-agent-wallet-mvp.git
cd ai-agent-wallet-mvp

# Install dependencies
npm install

# Copy environment templates
cp .env.example .env
cp contracts/.env.example contracts/.env
cp backend/.env.example backend/.env
```

### 2. Configure Environment Variables

**Edit `.env`:**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_agent_wallet

# Blockchain
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_SEPOLIA_KEY
ALCHEMY_AMOY_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_AMOY_KEY
RELAYER_PRIVATE_KEY=your_relayer_private_key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Security
JWT_SECRET=your-256-bit-secret-key
```

### 3. Deploy Smart Contracts

```bash
# Install contract dependencies
cd contracts
npm install

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy-sepolia.ts --network sepolia

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy-amoy.ts --network amoy

# Verify contracts on block explorers
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
npx hardhat verify --network amoy DEPLOYED_CONTRACT_ADDRESS
```

### 4. Database Setup

```bash
# Create database
createdb ai_agent_wallet

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 5. Start Services

```bash
# Start all services with Docker
docker-compose up -d

# Or start manually for development
npm run dev:api     # Terminal 1
npm run dev:relayer # Terminal 2
npm run dev:watchdog # Terminal 3
```

### 6. Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Test API
curl http://localhost:3000/api/v1/agents

# Check logs
docker-compose logs -f
```

---

## Production Deployment

### Infrastructure Setup

#### Option 1: AWS Deployment

**EC2 Instance Configuration:**
```bash
# Ubuntu 22.04 LTS, t3.medium or larger
# Security group with ports 80, 443, 22 open

# Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose git nginx certbot

# Clone repository
git clone https://github.com/yourusername/ai-agent-wallet-mvp.git
cd ai-agent-wallet-mvp
```

**RDS PostgreSQL Setup:**
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier ai-agent-wallet-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password your-password \
  --allocated-storage 20
```

#### Option 2: DigitalOcean Deployment

**Droplet Configuration:**
```bash
# Ubuntu 22.04, 2GB RAM, 50GB SSD
# Add Docker and Monitoring tags

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone and setup
git clone https://github.com/yourusername/ai-agent-wallet-mvp.git
cd ai-agent-wallet-mvp
```

#### Option 3: Kubernetes Deployment

**Cluster Setup:**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-agent-wallet-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-agent-wallet-api
  template:
    metadata:
      labels:
        app: ai-agent-wallet-api
    spec:
      containers:
      - name: api
        image: ai-agent-wallet/api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: ai-agent-wallet-config
        - secretRef:
            name: ai-agent-wallet-secrets
```

### SSL/TLS Configuration

**Let's Encrypt Setup:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (add to crontab)
0 12 * * * /usr/bin/certbot renew --quiet
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/ai-agent-wallet
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### Database Configuration

**Production PostgreSQL Setup:**
```sql
-- Create database and user
CREATE DATABASE ai_agent_wallet;
CREATE USER ai_agent_wallet_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_agent_wallet TO ai_agent_wallet_user;

-- Enable extensions
\c ai_agent_wallet
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set permissions
GRANT USAGE ON SCHEMA public TO ai_agent_wallet_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_agent_wallet_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_agent_wallet_user;
```

**Connection Pooling:**
```javascript
// Database configuration for production
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false // For managed databases
  }
};
```

### Monitoring Setup

**Prometheus + Grafana:**
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
```

**Application Metrics:**
```javascript
// Metrics middleware
app.use('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await register.metrics());
});

// Custom metrics
const activeAgents = new Gauge({
  name: 'ai_agent_wallet_active_agents',
  help: 'Number of active AI agents'
});

const intentDuration = new Histogram({
  name: 'ai_agent_wallet_intent_duration_seconds',
  help: 'Time taken to process intents',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});
```

### Backup Strategy

**Automated Backups:**
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h localhost -U ai_agent_wallet_user ai_agent_wallet > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

**Backup Schedule:**
```bash
# Add to crontab
0 2 * * * /opt/ai-agent-wallet/backup.sh  # Daily at 2 AM
0 3 * * 0 /opt/ai-agent-wallet/backup.sh --full  # Weekly full backup
```

---

## Development Deployment

### Local Development Setup

**Using Docker Compose:**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_agent_wallet
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_agent_wallet
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

**Start Development Environment:**
```bash
# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start API server
npm run dev
```

### Testing Deployment

**Contract Testing:**
```bash
cd contracts

# Run unit tests
npx hardhat test

# Run integration tests
npx hardhat test --grep "integration"

# Run security tests
npm run test:security
```

**API Testing:**
```bash
cd backend

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Load testing
npm run test:load
```

---

## Configuration Management

### Environment Variables

**Development vs Production:**
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://localhost:5432/ai_agent_wallet

# Production
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://prod-host:5432/ai_agent_wallet
```

### Secrets Management

**Using Docker Secrets:**
```yaml
version: '3.8'
services:
  api:
    image: ai-agent-wallet/api:latest
    secrets:
      - jwt_secret
      - db_password
      - relayer_key

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
  relayer_key:
    file: ./secrets/relayer_key.txt
```

**AWS Secrets Manager:**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U postgres -d ai_agent_wallet

# Reset database
npm run db:reset
```

**Contract Deployment Failed:**
```bash
# Check network configuration
npx hardhat run scripts/check-network.ts --network sepolia

# Verify API keys
curl -H "Authorization: Bearer $ALCHEMY_API_KEY" \
  https://eth-sepolia.g.alchemy.com/v2/ping
```

**Service Startup Failed:**
```bash
# Check logs
docker-compose logs api

# Check environment variables
docker-compose exec api env

# Restart services
docker-compose restart
```

### Performance Tuning

**Database Optimization:**
```sql
-- Create indexes
CREATE INDEX idx_intents_agent_id ON intents(agent_id);
CREATE INDEX idx_intents_status ON intents(status);
CREATE INDEX idx_audit_agent_id ON audit_log(agent_id);

-- Analyze tables
ANALYZE intents;
ANALYZE audit_log;
```

**API Performance:**
```javascript
// Enable compression
app.use(compression());

// Cache static assets
app.use(express.static('public', { maxAge: '1d' }));

// Database connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

### Monitoring Commands

**System Health:**
```bash
# Check all services
docker-compose ps

# View resource usage
docker stats

# Check logs
docker-compose logs -f --tail=100 api
```

**Application Metrics:**
```bash
# API health
curl http://localhost:3000/health

# Metrics endpoint
curl http://localhost:3000/metrics

# Database status
psql -c "SELECT count(*) FROM agents;" ai_agent_wallet
```

---

## Security Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Database backups scheduled
- [ ] Monitoring alerts set up

### Post-Deployment
- [ ] Health checks passing
- [ ] Logs monitoring active
- [ ] Backup verification complete
- [ ] Security scanning performed
- [ ] Performance benchmarks met

---

## Support

For deployment issues:
- **Documentation**: This guide
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: deployment-support@aiagentwallet.com

---

## Version History

- **v1.0.0**: Initial production deployment
- **v1.1.0**: Added Kubernetes support
- **v1.2.0**: Enhanced monitoring and logging
- **v1.3.0**: Multi-region deployment support
