# Frontend-Backend Integration Guide

This document describes how the Next.js frontend (CM) integrates with the Python multi-agent backend (circu_metal).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Browser                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (Port 3000)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Components     │  │  API Routes     │  │  Services       │          │
│  │  - Dashboard    │  │  /api/agent/*   │  │  - agent-api.ts │          │
│  │  - Results View │  │                 │  │  - lca-engine   │          │
│  │  - Wizard       │  │                 │  │                 │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Port 8000)                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      api/server.py                              │    │
│  │  Endpoints:                                                     │    │
│  │  - POST /api/analysis/start      → Start new analysis           │    │
│  │  - GET  /api/analysis/{id}/status → Check job status            │    │
│  │  - GET  /api/analysis/{id}/result → Get full results            │    │
│  │  - POST /api/estimate/parameters  → Quick estimation            │    │
│  │  - GET  /api/data/*              → Reference data               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Orchestrator                                │    │
│  │  Manages 9 agents in sequence:                                  │    │
│  │  1. DataAgent         5. ScenarioAgent                          │    │
│  │  2. EstimationAgent   6. VisualizationAgent                     │    │
│  │  3. LCAAgent          7. ExplainAgent                           │    │
│  │  4. CircularityAgent  8. ComplianceAgent                        │    │
│  │                       9. CritiqueAgent                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Google Gemini 2.5 Flash                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start the Python Backend

```powershell
cd c:\Users\moinu\OneDrive\Documents\LCA - test\multi-agent-coding-system

# Activate virtual environment
.\venv\Scripts\activate

# Set your Gemini API key
$env:GOOGLE_API_KEY = "your-gemini-api-key"

# Start the FastAPI server
python -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Next.js Frontend

```powershell
cd CM

# Install dependencies (first time only)
npm install

# Create .env.local file
Copy-Item .env.example .env.local
# Edit .env.local with your database URL

# Start development server
npm run dev
```

### 3. Access the Application

Open http://localhost:3000 in your browser.

## API Routes

### Next.js API Routes (Frontend Proxies)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/agent/analysis` | POST | Start new analysis |
| `/api/agent/analysis/[jobId]/status` | GET | Check job status |
| `/api/agent/[agentName]` | POST | Run single agent |
| `/api/agent/[agentName]` | GET | Get agent info |

### FastAPI Endpoints (Backend)

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health info |
| `/api/analysis/start` | POST | Start LCA analysis |
| `/api/analysis/{job_id}/status` | GET | Get job status |
| `/api/analysis/{job_id}/result` | GET | Get full result |
| `/api/analysis/{job_id}/report` | GET | Get markdown report |
| `/api/analysis/{job_id}/sankey` | GET | Get Sankey diagram |
| `/api/analysis/{job_id}/pathway` | GET | Get pathway comparison |
| `/api/estimate/parameters` | POST | Quick estimation |
| `/api/estimate/circularity` | POST | Circularity metrics |
| `/api/data/emission-factors` | GET | Emission factors DB |
| `/api/data/circularity-benchmarks` | GET | Benchmarks DB |
| `/api/data/material-properties` | GET | Properties DB |
| `/api/data/process-templates` | GET | Templates DB |

## Data Flow

### 1. Starting an Analysis

```typescript
// Frontend: hooks/use-agent-analysis.ts
const { startAnalysis, result, isRunning } = useAgentAnalysis()

// User triggers analysis
await startAnalysis({
  process_description: "Steel slab production via EAF",
  input_amount: "1 tonne",
  material: "Steel",
  energy_source: "Grid Electricity",
  location: "Europe"
})
```

### 2. Backend Processing

```python
# api/server.py
@app.post("/api/analysis/start")
async def start_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    
    # Start orchestrator in background
    background_tasks.add_task(run_analysis_task, job_id, user_input)
    
    return AnalysisStatus(job_id=job_id, status="pending")
```

### 3. Polling for Results

```typescript
// The hook automatically polls until complete
async waitForCompletion(jobId, {
  pollInterval: 2000,  // Check every 2 seconds
  maxWaitTime: 300000, // 5 minute timeout
  onProgress: (status) => {
    // Update UI with progress
  }
})
```

### 4. Displaying Results

```tsx
// components/pages/agent-results-view.tsx
const lcaResults = agentResult?.lca_results
const circularityResults = agentResult?.circularity_assessment

// Render charts, metrics, recommendations
```

## Environment Variables

### Frontend (.env.local)

```env
DATABASE_URL=postgresql://...
CIRCUMETAL_AGENT_API_URL=http://localhost:8000
```

### Backend (.env)

```env
GOOGLE_API_KEY=your-gemini-api-key
```

## Key Files

### Frontend

| File | Purpose |
|------|---------|
| `lib/services/agent-api.ts` | API client service |
| `hooks/use-agent-analysis.ts` | React hook for analysis |
| `components/pages/agent-results-view.tsx` | Results display |
| `app/api/agent/analysis/route.ts` | API proxy route |

### Backend

| File | Purpose |
|------|---------|
| `api/server.py` | FastAPI server |
| `circu_metal/orchestrator/orchestrator.py` | Agent orchestrator |
| `circu_metal/agents/*.py` | Individual agents |
| `circu_metal/prompts/*.md` | Agent prompts |
| `circu_metal/data/*.json` | Reference datasets |

## Response Structure

### Analysis Result

```json
{
  "job_id": "abc12345",
  "status": "completed",
  "result": {
    "data_extraction": { ... },
    "estimated_parameters": {
      "emission_factors": { ... },
      "circularity_indicators": {
        "recycled_content": 25,
        "resource_efficiency": 0.68,
        "mci_score": 0.45
      }
    },
    "lca_results": {
      "total_gwp": 8.6,
      "gwp_by_stage": {
        "Mining": 4.2,
        "Smelting": 2.1,
        ...
      },
      "functional_unit": "1 tonne"
    },
    "circularity_assessment": {
      "mci_score": 0.45,
      "recycled_content": 25,
      "recyclability_rate": 82,
      "circular_flow_opportunities": [ ... ]
    },
    "scenarios": [
      {
        "name": "High Recycled Content",
        "gwp_change": -35,
        "mci_change": +20
      }
    ],
    "visualizations": {
      "sankey_diagram": "...",
      "pathway_comparison": "..."
    },
    "report": "# LCA Report\n\n...",
    "compliance": {
      "iso_14040_compliant": true,
      "iso_14044_compliant": true
    }
  }
}
```

## Error Handling

### Frontend

```typescript
try {
  const result = await agentAPI.analyze(request)
} catch (error) {
  // Display error in UI
  setError(error.message)
}
```

### Backend

```python
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )
```

## Development Tips

1. **Check backend is running**: Before testing frontend, ensure the FastAPI server is responding at http://localhost:8000

2. **View logs**: The Python server prints progress logs. Watch the terminal for debugging.

3. **Test API directly**: Use tools like curl or Postman to test the FastAPI endpoints:
   ```powershell
   curl -X POST http://localhost:8000/api/analysis/start `
     -H "Content-Type: application/json" `
     -d '{"process_description":"Steel production","material":"Steel"}'
   ```

4. **Mock data fallback**: The frontend includes fallback mock data if the agent API is unavailable.

## Production Deployment

1. Deploy FastAPI server to a cloud provider (Railway, Render, AWS, etc.)
2. Update `CIRCUMETAL_AGENT_API_URL` in frontend environment
3. Add CORS origin for production domain in `api/server.py`
4. Consider adding authentication for production use
