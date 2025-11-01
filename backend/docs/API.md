# AI Agent Wallet API Documentation

## Overview

The AI Agent Wallet API provides RESTful endpoints for managing autonomous AI agents, cross-chain intents, audit trails, and marketplace services. The API is built with Express.js and includes comprehensive security features including rate limiting, authentication, and input validation.

## Base URL
```
http://localhost:3000
```

## Authentication

The API supports multiple authentication methods:

### JWT Token Authentication (Primary)
```bash
Authorization: Bearer <jwt_token>
```

### API Key Authentication (Development)
```bash
X-API-Key: <api_key>
```

## Rate Limiting

- **Global Rate Limit**: 100 requests per 15 minutes per IP
- **Authenticated Routes**: 1000 requests per hour per user
- **Auth Routes**: 10 requests per hour per IP

## Response Format

All responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "token": "jwt_token_here"
  },
  "message": "User registered successfully. Please verify your email."
}
```

### POST /api/auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/verify-email
Verify user email with token.

**Request Body:**
```json
{
  "token": "email_verification_token"
}
```

### POST /api/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "password_reset_token",
  "newPassword": "newsecurepassword123"
}
```

### GET /api/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 🤖 Agent Management Endpoints

### POST /api/v1/agents/register
Register a new AI agent.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "agentId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "name": "Trading Bot Alpha",
  "description": "Automated trading agent for DeFi protocols",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "policy": {
    "maxSpendPerDay": "1000000000000000000",
    "maxTxPerDay": 10,
    "allowedChains": [1, 137, 11155111, 80002],
    "riskLevel": "medium"
  },
  "metadata": {
    "strategy": "arbitrage",
    "protocols": ["uniswap", "aave"],
    "version": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent_123",
      "agentId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "name": "Trading Bot Alpha",
      "status": "pending",
      "policy": { ... },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/v1/agents
List all agents for the authenticated user.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (active, inactive, suspended)

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent_123",
        "agentId": "0x742d...",
        "name": "Trading Bot Alpha",
        "status": "active",
        "policy": { ... },
        "lastActivity": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### GET /api/v1/agents/:agentId
Get detailed information about a specific agent.

**Response:**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent_123",
      "agentId": "0x742d...",
      "name": "Trading Bot Alpha",
      "description": "Automated trading agent",
      "walletAddress": "0x742d...",
      "status": "active",
      "policy": {
        "maxSpendPerDay": "1000000000000000000",
        "maxTxPerDay": 10,
        "allowedChains": [1, 137],
        "riskLevel": "medium"
      },
      "metadata": { ... },
      "stats": {
        "totalTransactions": 150,
        "successfulTransactions": 145,
        "totalVolume": "5000000000000000000",
        "lastActivity": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /api/v1/agents/:agentId
Update agent configuration.

**Request Body:**
```json
{
  "name": "Updated Trading Bot",
  "policy": {
    "maxSpendPerDay": "2000000000000000000",
    "maxTxPerDay": 20
  }
}
```

### DELETE /api/v1/agents/:agentId
Deactivate an agent.

---

## 🔄 Cross-Chain Intents Endpoints

### POST /api/v1/intents/create
Create a new cross-chain intent.

**Request Body:**
```json
{
  "agentId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "srcChainId": 11155111,
  "destChainId": 80002,
  "action": "transfer",
  "params": {
    "to": "0xRecipientAddress",
    "amount": "1000000000000000000",
    "token": "0xTokenAddress"
  },
  "deadline": 1704067200,
  "metadata": {
    "reason": "Arbitrage opportunity",
    "expectedProfit": "0.05"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": {
      "id": "intent_123",
      "intentId": "0xabc123...",
      "agentId": "0x742d...",
      "status": "created",
      "srcChainId": 11155111,
      "destChainId": 80002,
      "action": "transfer",
      "params": { ... },
      "deadline": 1704067200,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/v1/intents
List intents with filtering options.

**Query Parameters:**
- `agentId` (string): Filter by agent
- `status` (string): Filter by status (created, submitted, executed, failed)
- `chainId` (number): Filter by source or destination chain
- `page`, `limit`: Pagination

### GET /api/v1/intents/:intentId
Get detailed intent information.

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": {
      "id": "intent_123",
      "intentId": "0xabc123...",
      "agentId": "0x742d...",
      "status": "executed",
      "srcChainId": 11155111,
      "destChainId": 80002,
      "action": "transfer",
      "params": { ... },
      "executionData": {
        "txHash": "0xdef456...",
        "blockNumber": 1234567,
        "gasUsed": 21000,
        "executedAt": "2024-01-01T00:05:00.000Z"
      },
      "timeline": [
        {
          "event": "created",
          "timestamp": "2024-01-01T00:00:00.000Z",
          "data": {}
        },
        {
          "event": "submitted",
          "timestamp": "2024-01-01T00:01:00.000Z",
          "data": { "relayer": "0xrelayer..." }
        },
        {
          "event": "executed",
          "timestamp": "2024-01-01T00:05:00.000Z",
          "data": { "txHash": "0xdef456..." }
        }
      ]
    }
  }
}
```

---

## 📊 Audit Trail Endpoints

### GET /api/v1/audit/:agentId
Get audit trail for an agent.

**Query Parameters:**
- `startDate` (ISO string): Start date filter
- `endDate` (ISO string): End date filter
- `eventType` (string): Filter by event type
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "audit_123",
        "agentId": "0x742d...",
        "eventType": "intent_created",
        "commitment": "0xhash...",
        "ipfsCid": "Qm...",
        "metadata": {
          "intentId": "0xabc123...",
          "action": "transfer",
          "amount": "1000000000000000000"
        },
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### GET /api/v1/audit/:agentId/export
Export audit trail as signed JSON.

**Response:**
```json
{
  "success": true,
  "data": {
    "export": {
      "agentId": "0x742d...",
      "exportedAt": "2024-01-01T00:00:00.000Z",
      "entries": [ ... ],
      "signature": "0xsignature..."
    }
  }
}
```

---

## 🏪 Marketplace Endpoints

### GET /api/v1/marketplace/services
List available AI agent services.

**Query Parameters:**
- `category` (string): Filter by category
- `minPrice`, `maxPrice`: Price range filter
- `sortBy` (string): Sort field (price, rating, popularity)

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service_123",
        "name": "DeFi Arbitrage Bot",
        "description": "Automated arbitrage across DEXes",
        "provider": "0xprovider...",
        "category": "trading",
        "price": "500000000000000000",
        "rating": 4.8,
        "reviews": 156,
        "features": ["cross-chain", "auto-rebalance", "risk-management"]
      }
    ]
  }
}
```

### POST /api/v1/marketplace/purchase
Purchase an AI agent service.

**Request Body:**
```json
{
  "serviceId": "service_123",
  "agentId": "0x742d...",
  "configuration": {
    "riskLevel": "medium",
    "maxInvestment": "1000000000000000000"
  }
}
```

---

## 🤝 Collaboration Endpoints

### POST /api/v1/collaboration/teams
Create a new team.

**Request Body:**
```json
{
  "name": "DeFi Trading Team",
  "description": "Collaborative trading strategies",
  "members": ["user_456", "user_789"]
}
```

### POST /api/v1/collaboration/agents/share
Share agent access with team members.

**Request Body:**
```json
{
  "agentId": "0x742d...",
  "teamId": "team_123",
  "permissions": ["read", "execute", "configure"]
}
```

---

## 🏥 Health & Monitoring Endpoints

### GET /health
System health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": {
      "database": "connected",
      "redis": "connected",
      "blockchain": {
        "sepolia": {
          "connected": true,
          "blockNumber": 1234567,
          "latency": 45
        },
        "amoy": {
          "connected": true,
          "blockNumber": 9876543,
          "latency": 67
        }
      }
    },
    "uptime": "2 days, 4 hours",
    "version": "1.0.0"
  }
}
```

### GET /metrics
Prometheus-style metrics.

**Response:**
```
# HELP ai_agent_wallet_active_agents Total number of active agents
# TYPE ai_agent_wallet_active_agents gauge
ai_agent_wallet_active_agents 42

# HELP ai_agent_wallet_intents_created_total Total number of intents created
# TYPE ai_agent_wallet_intents_created_total counter
ai_agent_wallet_intents_created_total{chain="sepolia"} 1234
ai_agent_wallet_intents_created_total{chain="amoy"} 567
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `BLOCKCHAIN_ERROR` | Blockchain interaction failed | 502 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

---

## WebSocket Events

The API also supports WebSocket connections for real-time updates:

**Connection URL:** `ws://localhost:3000/ws`

### Events

#### Agent Status Updates
```json
{
  "type": "agent_status_update",
  "data": {
    "agentId": "0x742d...",
    "status": "active",
    "lastActivity": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Intent Status Updates
```json
{
  "type": "intent_status_update",
  "data": {
    "intentId": "0xabc123...",
    "status": "executed",
    "executionData": { ... }
  }
}
```

#### System Alerts
```json
{
  "type": "system_alert",
  "data": {
    "level": "warning",
    "message": "High gas prices detected",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## SDK Examples

### JavaScript/Node.js
```javascript
const { AIAgentWalletAPI } = require('ai-agent-wallet-sdk');

const client = new AIAgentWalletAPI({
  baseURL: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Register an agent
const agent = await client.agents.register({
  agentId: '0x742d...',
  name: 'My Trading Bot',
  policy: { maxSpendPerDay: '1000000000000000000' }
});

// Create an intent
const intent = await client.intents.create({
  agentId: agent.agentId,
  destChainId: 80002,
  action: 'transfer',
  params: { to: '0x...', amount: '1000000000000000000' }
});
```

### Python
```python
from ai_agent_wallet import Client

client = Client(
    base_url='http://localhost:3000',
    api_key='your-api-key'
)

# Get agent status
agent = client.agents.get('0x742d...')
print(f"Agent status: {agent.status}")
```

---

## Rate Limits

| Endpoint Pattern | Limit | Window |
|------------------|-------|--------|
| `/api/auth/*` | 10 requests | 1 hour |
| `/api/v1/*` | 1000 requests | 1 hour |
| `/health` | Unlimited | - |
| `/metrics` | 60 requests | 1 minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
```

---

## Versioning

The API uses URL-based versioning:
- Current version: `v1`
- All endpoints are prefixed with `/api/v1/`

Breaking changes will be introduced in new versions (v2, v3, etc.) with advance notice.

---

## Support

For API support or questions:
- **Documentation**: This document
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: api-support@aiagentwallet.com
