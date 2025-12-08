# CircuMetal Deployment Guide

## Overview

This guide covers deploying the CircuMetal multi-agent LCA platform in development and production environments.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
│  Next.js App  │   │  FastAPI Main │   │  Microservices    │
│   (Port 3000) │   │  (Port 8000)  │   │  (8001-8003)      │
└───────────────┘   └───────────────┘   └───────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌───────────┐       ┌───────────┐
             │  MongoDB  │       │   Redis   │
             │           │       │  (cache)  │
             └───────────┘       └───────────┘
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Docker (optional, for containerized deployment)
- Google Cloud account (for Gemini API)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/moinuddin-ahamed/CircuMetal-Agents.git
cd CircuMetal-Agents
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=circumetal

# Service URLs (for production, use actual hostnames)
ESTIMATION_SERVICE_URL=http://localhost:8001
LCA_SERVICE_URL=http://localhost:8002
COMPLIANCE_SERVICE_URL=http://localhost:8003

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Frontend
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

### 3. Python Virtual Environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Frontend Dependencies

```bash
cd CM
npm install
```

---

## Development Deployment

### Start All Services

Use the convenience script:

```bash
# Windows
scripts/start_all.bat

# Linux/Mac
./scripts/start_all.sh
```

Or start individually:

```bash
# Terminal 1: MongoDB (if not using cloud)
mongod --dbpath ./data/db

# Terminal 2: Main API
python -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Estimation Service
python -m uvicorn estimation.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 4: LCA Service
python -m uvicorn lca_service.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 5: Compliance Service
python -m uvicorn compliance.main:app --host 0.0.0.0 --port 8003 --reload

# Terminal 6: Next.js Frontend
cd CM && npm run dev
```

### Verify Deployment

```bash
# Check API health
curl http://localhost:8000/health

# Check microservices
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health

# Open frontend
open http://localhost:3000
```

---

## Docker Deployment

### Build Images

```bash
# Build all services
docker-compose build
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: circumetal

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    depends_on:
      - mongodb
      - estimation
      - lca-service
      - compliance

  estimation:
    build:
      context: .
      dockerfile: Dockerfile.estimation
    ports:
      - "8001:8001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017

  lca-service:
    build:
      context: .
      dockerfile: Dockerfile.lca
    ports:
      - "8002:8002"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017

  compliance:
    build:
      context: .
      dockerfile: Dockerfile.compliance
    ports:
      - "8003:8003"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017

  frontend:
    build:
      context: ./CM
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_PYTHON_API_URL=http://api:8000
    depends_on:
      - api

volumes:
  mongodb_data:
```

### Start with Docker

```bash
docker-compose up -d
```

---

## Production Deployment

### Cloud Provider Options

1. **Google Cloud Run** (Recommended for Gemini integration)
2. **AWS ECS/Fargate**
3. **Azure Container Apps**
4. **DigitalOcean App Platform**

### Google Cloud Run Deployment

```bash
# Configure gcloud
gcloud config set project YOUR_PROJECT_ID

# Build and push images
gcloud builds submit --tag gcr.io/YOUR_PROJECT/circumetal-api
gcloud builds submit --tag gcr.io/YOUR_PROJECT/circumetal-estimation
gcloud builds submit --tag gcr.io/YOUR_PROJECT/circumetal-lca
gcloud builds submit --tag gcr.io/YOUR_PROJECT/circumetal-compliance

# Deploy services
gcloud run deploy circumetal-api \
  --image gcr.io/YOUR_PROJECT/circumetal-api \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=$GOOGLE_API_KEY"
```

### MongoDB Atlas

For production, use MongoDB Atlas:

1. Create cluster at https://cloud.mongodb.com
2. Configure network access
3. Create database user
4. Update `MONGODB_URI` in environment

### Security Checklist

- [ ] Enable HTTPS/TLS
- [ ] Implement JWT authentication
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Use secrets manager for API keys
- [ ] Enable audit logging
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure backup strategy

---

## Scaling Considerations

### Horizontal Scaling

```yaml
# Kubernetes example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: circumetal-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: circumetal-api
  template:
    spec:
      containers:
      - name: api
        image: gcr.io/YOUR_PROJECT/circumetal-api
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Agent Scaling

For high-throughput scenarios:

1. Use Redis for task queuing
2. Deploy agent workers separately
3. Implement request batching
4. Cache frequently used emission factors

---

## Monitoring

### Health Endpoints

All services expose `/health` endpoints:

```python
# Example health check response
{
    "status": "healthy",
    "version": "1.0.0",
    "services": {
        "mongodb": "connected",
        "estimation": "healthy",
        "lca": "healthy",
        "compliance": "healthy"
    },
    "uptime": 3600
}
```

### Recommended Monitoring Stack

- **Prometheus**: Metrics collection
- **Grafana**: Dashboards
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing

### Key Metrics

- Request latency (p50, p95, p99)
- Agent execution time
- Error rates
- Database query performance
- Gemini API usage

---

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Verify URI format
mongodb://username:password@host:27017/database
```

**Gemini API Errors**
```bash
# Test API key
curl -H "x-goog-api-key: YOUR_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"
```

**Microservice Unavailable**
```bash
# Check if port is in use
netstat -an | grep 8001

# Check service logs
docker logs circumetal-estimation-1
```

### Log Locations

- API logs: `./logs/api.log`
- Agent logs: `./logs/agents/`
- Service logs: `./logs/services/`

---

## Backup & Recovery

### Database Backup

```bash
# MongoDB backup
mongodump --uri="$MONGODB_URI" --out=./backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="$MONGODB_URI" ./backup/20251208
```

### Configuration Backup

Store these in version control or secrets manager:
- `.env` files
- Agent configurations
- Compliance rule definitions

---

## Support

- GitHub Issues: https://github.com/moinuddin-ahamed/CircuMetal-Agents/issues
- Documentation: https://circumetal.dev/docs
- Email: support@circumetal.dev
