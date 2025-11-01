# Environment Variables Setup Guide

## Quick Start (Server will run without these, but features will be limited)

### Backend Environment Variables

Create a file: `backend/backend/.env`

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS (optional - defaults work for localhost)
CORS_ORIGIN=http://localhost:5173,http://localhost:8080

# Authentication (optional)
REQUIRE_AUTH=false

# Rate Limiting
RATE_LIMIT_MAX=100

# Database (PostgreSQL) - OPTIONAL
# Server runs without DB, but API endpoints return mock data
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_agent_wallet
DB_USER=postgres
DB_PASSWORD=password

# Blockchain RPC URLs - REQUIRED for blockchain features
# Get FREE API keys from: https://dashboard.alchemy.com/
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ALCHEMY_AMOY_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# Relayer Private Key - REQUIRED for signing transactions
# Generate test key: node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
RELAYER_PRIVATE_KEY=0x_your_private_key_here

# Contract Addresses (fill after deployment)
AGENT_REGISTRY_ADDRESS=
POLICY_ENGINE_ADDRESS=
AUDIT_LOG_ADDRESS=
CROSS_CHAIN_EXECUTOR_SEPOLIA=
CROSS_CHAIN_EXECUTOR_AMOY=

# IPFS (Pinata) - OPTIONAL
PINATA_API_KEY=
PINATA_SECRET_KEY=

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables

Create a file: `frontend/.env`

```bash
# Backend API URL
VITE_API_URL=http://localhost:3000

# App Config
VITE_APP_NAME=AI Agent Wallet
VITE_APP_ENV=development

# Blockchain
VITE_CHAIN_ID=11155111
VITE_NETWORK_NAME=sepolia
```

## How to Get Alchemy API Keys (FREE)

1. Go to https://dashboard.alchemy.com/
2. Sign up for free account
3. Create a new app:
   - **Sepolia**: Choose "Ethereum" → "Sepolia" network
   - **Amoy**: Choose "Polygon" → "Amoy Testnet" network
4. Copy the HTTP URL from each app
5. Paste into `.env` file:
   ```
   ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ALCHEMY_AMOY_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
   ```

## Generate Private Key for Testing

```bash
# Windows PowerShell
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"

# Or use Node REPL
node
> require('crypto').randomBytes(32).toString('hex')
```

**⚠️ WARNING**: Never commit private keys to git! Only use test keys for development.

## What Works Without Environment Variables?

✅ **Server starts and runs**
✅ **Health check endpoint works**
✅ **API endpoints respond** (with mock/fallback data)
✅ **Frontend connects to backend**
✅ **Basic API functionality**

❌ **Blockchain features** (requires Alchemy RPC URLs)
❌ **Transaction signing** (requires RELAYER_PRIVATE_KEY)
❌ **Database persistence** (requires PostgreSQL)
❌ **IPFS storage** (requires Pinata keys)

## Testing the Setup

1. Start backend:
   ```bash
   cd backend/backend
   npm run dev
   ```
   You should see: "AI Agent Wallet API server running on port 3000"

2. Test health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"healthy",...}`

3. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

4. Open browser: http://localhost:8080

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify `.env` file exists in `backend/backend/`
- Check for syntax errors in `.env` (no spaces around `=`)

### "Connection refused" errors
- Make sure backend is running: `cd backend/backend && npm run dev`
- Check port number matches: `PORT=3000` in `.env`

### Blockchain features not working
- Verify Alchemy URLs are correct
- Check API keys are active in Alchemy dashboard
- Ensure `RELAYER_PRIVATE_KEY` is set (with `0x` prefix)

