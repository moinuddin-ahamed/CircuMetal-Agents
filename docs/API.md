# CircuMetal Agents - API Documentation

## Overview

CircuMetal provides a comprehensive REST API for AI-powered Life Cycle Assessment (LCA) and circularity analysis of metals. The system uses a multi-agent architecture powered by Google's Gemini 2.0 Flash model.

**Base URL:** `http://localhost:8000`

## Authentication

Currently, the API does not require authentication for development. Production deployments should implement JWT-based authentication.

---

## Core Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

## Orchestration Endpoints

### Start Analysis Run

Start a new multi-agent LCA analysis.

```http
POST /api/orchestration/start
```

**Request Body:**
```json
{
  "process_description": "Secondary aluminium production from scrap",
  "input_amount": "1 ton",
  "material": "Aluminium Scrap",
  "energy_source": "Grid Electricity",
  "location": "India",
  "project_id": "optional-project-id"
}
```

**Response:**
```json
{
  "success": true,
  "run_id": "run_abc123",
  "message": "Analysis started",
  "estimated_time": 45
}
```

### Get Run Status

Poll for analysis progress.

```http
GET /api/orchestration/{run_id}/status
```

**Response:**
```json
{
  "run_id": "run_abc123",
  "status": "running",
  "progress": 65,
  "current_agent": "lca_agent",
  "agents_completed": ["data_agent", "estimation_agent"],
  "started_at": "2025-12-08T10:30:00Z"
}
```

### Get Run Results

Retrieve completed analysis results.

```http
GET /api/orchestration/{run_id}/result
```

**Response:**
```json
{
  "success": true,
  "run_id": "run_abc123",
  "status": "completed",
  "results": {
    "impacts": {
      "gwp": {"value": 4.2, "unit": "kg CO2e/kg"},
      "ap": {"value": 0.025, "unit": "kg SO2e/kg"},
      "ep": {"value": 0.003, "unit": "kg PO4e/kg"}
    },
    "circularity": {
      "mci": 0.72,
      "recycled_input": 85,
      "recovery_rate": 88
    },
    "compliance": {
      "eu_cbam": "COMPLIANT",
      "india_bis": "COMPLIANT"
    }
  }
}
```

---

## Agent Endpoints

### List Available Agents

```http
GET /api/agents/list
```

**Response:**
```json
{
  "agents": [
    {"name": "Data Agent", "description": "Collects and validates LCI data", "status": "active"},
    {"name": "Estimation Agent", "description": "AI-powered parameter estimation", "status": "active"},
    {"name": "LCA Agent", "description": "Life cycle impact assessment", "status": "active"},
    {"name": "Circularity Agent", "description": "Material Circularity Indicator", "status": "active"},
    {"name": "Compliance Agent", "description": "Regulatory compliance checking", "status": "active"},
    {"name": "Scenario Agent", "description": "What-if analyses", "status": "active"},
    {"name": "Visualization Agent", "description": "Charts and diagrams", "status": "active"},
    {"name": "Explain Agent", "description": "Natural language reports", "status": "active"}
  ]
}
```

### Chat with Agents

Stream a conversation with the agent system.

```http
POST /api/agents/chat/stream
```

**Request Body:**
```json
{
  "message": "What is the carbon footprint of aluminium production in India?"
}
```

**Response:** Server-Sent Events (SSE) stream

---

## Project Management

### Create Project

```http
POST /api/projects
```

**Request Body:**
```json
{
  "name": "Aluminium Recycling Study",
  "description": "LCA of secondary aluminium production",
  "metal": "Aluminium",
  "status": "active"
}
```

### List Projects

```http
GET /api/projects
```

### Get Project

```http
GET /api/projects/{project_id}
```

### Update Project

```http
PUT /api/projects/{project_id}
```

### Delete Project

```http
DELETE /api/projects/{project_id}
```

---

## Inventory Management

### Create Inventory

```http
POST /api/inventory
```

**Request Body:**
```json
{
  "name": "Secondary Aluminium Inventory",
  "project_id": "project_123",
  "functional_unit": "1 tonne aluminium ingot",
  "system_boundary": "cradle-to-gate",
  "data": {
    "material_inputs": [
      {"name": "Aluminium Scrap", "amount": 1100, "unit": "kg", "recycled_content": 100}
    ],
    "energy_inputs": [
      {"name": "Electricity", "amount": 850, "unit": "kWh", "source": "Grid"}
    ],
    "process_stages": [
      {"name": "Melting", "efficiency": 0.92}
    ]
  }
}
```

### Get Inventory

```http
GET /api/inventory/{inventory_id}
```

### List Inventories

```http
GET /api/inventories?project_id={project_id}
```

---

## Data Reference Endpoints

### Emission Factors

```http
GET /api/data/emission-factors
GET /api/data/emission-factor/{material}
```

### Circularity Benchmarks

```http
GET /api/data/circularity-benchmarks
```

### Material Properties

```http
GET /api/data/material-properties
```

### Process Templates

```http
GET /api/data/process-templates
```

---

## Dashboard Endpoints

### Dashboard Summary

```http
GET /api/dashboard/summary
```

**Response:**
```json
{
  "total_projects": 15,
  "total_runs": 47,
  "avg_mci": 0.65,
  "compliance_rate": 0.92,
  "recent_runs": [...],
  "top_materials": [...]
}
```

### Scenario Comparison

```http
POST /api/dashboard/scenarios/compare
```

**Request Body:**
```json
{
  "baseline_scenario_id": "scenario_001",
  "comparison_scenario_id": "scenario_002",
  "metrics": ["gwp", "energy", "mci"]
}
```

### WebSocket: Live Updates

```websocket
WS /api/dashboard/ws/{run_id}
```

Receive real-time updates during analysis runs.

**Message Types:**
- `agent_update`: Agent status changes
- `progress`: Overall progress updates
- `complete`: Analysis complete
- `error`: Error notification

---

## Reports

### List Reports

```http
GET /api/reports
```

### Get Report

```http
GET /api/reports/{report_id}
```

### Get Report by Run

```http
GET /api/reports/run/{run_id}
```

---

## Microservice Endpoints

### Estimation Service (Port 8001)

```http
POST http://localhost:8001/estimate
POST http://localhost:8001/estimate/batch
GET  http://localhost:8001/health
```

### LCA Service (Port 8002)

```http
POST http://localhost:8002/calculate
POST http://localhost:8002/circularity
GET  http://localhost:8002/methods
GET  http://localhost:8002/health
```

### Compliance Service (Port 8003)

```http
POST http://localhost:8003/check
POST http://localhost:8003/cbam
GET  http://localhost:8003/regulations
GET  http://localhost:8003/health
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `SERVICE_UNAVAILABLE` | 503 | Microservice unavailable |
| `AGENT_ERROR` | 500 | Agent execution failed |

---

## Rate Limits

- Standard: 100 requests/minute
- Analysis runs: 10 concurrent runs
- WebSocket: 5 connections per client

---

## SDK Examples

### Python

```python
import httpx

async def run_analysis():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Start analysis
        response = await client.post("/api/orchestration/start", json={
            "material": "Aluminium Scrap",
            "process_description": "Secondary aluminium production",
            "location": "India"
        })
        run_id = response.json()["run_id"]
        
        # Poll for results
        while True:
            status = await client.get(f"/api/orchestration/{run_id}/status")
            if status.json()["status"] == "completed":
                break
            await asyncio.sleep(2)
        
        # Get results
        result = await client.get(f"/api/orchestration/{run_id}/result")
        return result.json()
```

### JavaScript

```javascript
async function runAnalysis() {
  const response = await fetch('http://localhost:8000/api/orchestration/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material: 'Aluminium Scrap',
      process_description: 'Secondary aluminium production',
      location: 'India'
    })
  });
  
  const { run_id } = await response.json();
  
  // Connect WebSocket for live updates
  const ws = new WebSocket(`ws://localhost:8000/api/dashboard/ws/${run_id}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Update:', data);
  };
}
```
