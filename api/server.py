"""
FastAPI Server for CircuMetal Agents

This server exposes the CircuMetal multi-agent system as REST API endpoints
that can be consumed by the Next.js frontend.
"""

import os
import sys
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from contextlib import asynccontextmanager

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from circu_metal.orchestrator.orchestrator import Orchestrator
from circu_metal.utils.io import save_json, write_report_markdown

# Import database module
from api.database import (
    get_database, close_database, initialize_indexes,
    create_inventory, get_inventory, get_inventories_by_project, update_inventory, delete_inventory,
    create_run, get_run, update_run, update_run_status, add_run_log, set_run_result, get_runs_by_project, get_recent_runs,
    create_project, get_project, get_projects, update_project, delete_project, add_scenario,
    create_report, get_report, get_report_by_run_id, get_reports, get_reports_by_project, update_report, delete_report,
    save_visualization, get_visualizations, get_latest_visualization
)

# Import Pydantic models
from api.models import (
    InventoryInput, InventoryData, ScenarioConfig,
    StartRunRequest, RunStatus, RunResult,
    ImpactScores, CircularityMetrics,
    InventoryResponse, RunResponse, RunStatusResponse, RunResultResponse,
    CreateVisualizationRequest, Visualization,
    ProjectReportsResponse, ReportData
)

# Import dashboard router
from api.dashboard_routes import dashboard_router


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database connection and indexes
    await get_database()
    await initialize_indexes()
    print("MongoDB connected and indexes initialized")
    yield
    # Shutdown: Close database connection
    await close_database()
    print("MongoDB disconnected")


app = FastAPI(
    title="CircuMetal Agents API",
    description="AI-Powered Life Cycle Assessment & Circularity Analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include dashboard routes
app.include_router(dashboard_router)

# Mount static files for dashboard
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Store for tracking analysis jobs
analysis_jobs: Dict[str, Dict[str, Any]] = {}

# ============================================================================
# Request/Response Models
# ============================================================================

class AnalysisRequest(BaseModel):
    """Request model for starting a new LCA analysis"""
    process_description: str
    input_amount: str = "1 ton"
    material: str
    energy_source: str = "Grid Electricity"
    location: str = "Europe"
    project_id: Optional[int] = None
    scenario_id: Optional[int] = None

class AnalysisStatus(BaseModel):
    """Status of an analysis job"""
    job_id: str
    status: str  # 'pending', 'running', 'completed', 'failed'
    current_step: Optional[str] = None
    progress: int = 0
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None

class AnalysisResult(BaseModel):
    """Complete analysis result"""
    job_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    report_markdown: Optional[str] = None
    sankey_available: bool = False
    pathway_comparison_available: bool = False

class QuickEstimateRequest(BaseModel):
    """Request for quick parameter estimation"""
    material: str
    process_type: str  # 'primary', 'secondary', 'hybrid'
    region: str
    parameters_needed: list[str] = []

class CircularityRequest(BaseModel):
    """Request for circularity analysis only"""
    material: str
    recycled_content: float
    process_efficiency: float
    eol_recycling_rate: float

# ============================================================================
# Background Task Runner
# ============================================================================

def run_analysis_task(job_id: str, user_input: dict):
    """Background task to run the full agent analysis"""
    try:
        analysis_jobs[job_id]["status"] = "running"
        analysis_jobs[job_id]["current_step"] = "Initializing..."
        
        orchestrator = Orchestrator()
        
        # Update progress as we go
        def update_progress(step: str, progress: int):
            analysis_jobs[job_id]["current_step"] = step
            analysis_jobs[job_id]["progress"] = progress
        
        update_progress("Data Agent", 10)
        result = orchestrator.run(user_input)
        
        # Extract report
        report_md = ""
        if 'explain_agent' in result:
            explain_data = result['explain_agent'].get('data', {})
            report_md = explain_data.get('report_markdown', "")
        
        # Save outputs
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'output')
        os.makedirs(output_dir, exist_ok=True)
        
        save_json(result, f"output/analysis_{job_id}.json")
        if report_md:
            write_report_markdown(report_md, f"output/report_{job_id}.md")
        
        # Generate visualizations
        sankey_available = False
        pathway_available = False
        
        if 'visualization_agent' in result:
            vis_data = result['visualization_agent'].get('data', {})
            
            sankey_code = vis_data.get('sankey_python_code', "")
            if sankey_code:
                try:
                    # Modify the code to save with job_id
                    modified_code = sankey_code.replace(
                        "output/sankey_diagram.html",
                        f"output/sankey_{job_id}.html"
                    )
                    exec(modified_code, {'__name__': '__main__'})
                    sankey_available = True
                except Exception as e:
                    print(f"Sankey generation failed: {e}")
            
            pathway_code = vis_data.get('pathway_comparison_code', "")
            if pathway_code:
                try:
                    modified_code = pathway_code.replace(
                        "output/pathway_comparison.html",
                        f"output/pathway_{job_id}.html"
                    )
                    exec(modified_code, {'__name__': '__main__'})
                    pathway_available = True
                except Exception as e:
                    print(f"Pathway comparison generation failed: {e}")
        
        # Mark complete
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["progress"] = 100
        analysis_jobs[job_id]["current_step"] = "Complete"
        analysis_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        analysis_jobs[job_id]["result"] = result
        analysis_jobs[job_id]["report_markdown"] = report_md
        analysis_jobs[job_id]["sankey_available"] = sankey_available
        analysis_jobs[job_id]["pathway_available"] = pathway_available
        
    except Exception as e:
        analysis_jobs[job_id]["status"] = "failed"
        analysis_jobs[job_id]["error"] = str(e)
        analysis_jobs[job_id]["completed_at"] = datetime.now().isoformat()

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "CircuMetal Agents API", "version": "1.0.0"}

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "agents": [
            "DataAgent", "EstimationAgent", "LCAAgent", "CircularityAgent",
            "ScenarioAgent", "VisualizationAgent", "ExplainAgent",
            "ComplianceAgent", "CritiqueAgent"
        ],
        "active_jobs": len([j for j in analysis_jobs.values() if j["status"] == "running"])
    }


# ----------------------------------------------------------------------------
# Agent Chat & Interaction Endpoints
# ----------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class AgentTestRequest(BaseModel):
    agent_name: str
    test_input: Optional[Dict[str, Any]] = None

@app.post("/api/agents/chat")
async def agent_chat(request: ChatRequest):
    """
    Chat with the AI agent system using Gemini.
    Provides intelligent responses about LCA analysis and circularity.
    """
    try:
        import google.generativeai as genai
        
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {
                "success": False,
                "response": "API key not configured. Please set GOOGLE_API_KEY in your .env file.",
                "agent": "System",
                "response_type": "error"
            }
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # System context for the chat
        system_context = """You are the CircuMetal AI Assistant, an expert in Life Cycle Assessment (LCA) and circular economy for metals.

Your capabilities:
- Explain LCA methodology and environmental impact categories (GWP, energy, water, etc.)
- Describe circularity metrics including Material Circularity Indicator (MCI)
- Guide users through the multi-agent analysis system
- Answer questions about metal production, recycling, and sustainability
- Explain regulations like EU Battery Regulation, CBAM, and EPR schemes

The CircuMetal system has these AI agents:
1. DataAgent - Collects and validates inventory data
2. EstimationAgent - Uses AI to fill missing parameters
3. LCAAgent - Calculates environmental impacts
4. CircularityAgent - Computes MCI and recycling metrics
5. ScenarioAgent - Generates alternative scenarios
6. ComplianceAgent - Checks regulatory requirements
7. VisualizationAgent - Creates charts and Sankey diagrams
8. ExplainAgent - Generates narrative reports
9. CritiqueAgent - Reviews results for accuracy

Be helpful, concise, and technical when needed. Use markdown formatting for better readability."""

        # Create the prompt
        full_prompt = f"{system_context}\n\nUser question: {request.message}\n\nProvide a helpful response:"
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        return {
            "success": True,
            "response": response.text,
            "agent": "CircuMetal AI",
            "response_type": "ai_generated"
        }
        
    except Exception as e:
        # Fallback to basic responses if AI fails
        return {
            "success": False,
            "response": f"I encountered an error connecting to the AI service: {str(e)}. Please check your API key configuration.",
            "agent": "System",
            "error": str(e)
        }


@app.post("/api/agents/chat/stream")
async def agent_chat_stream(request: ChatRequest):
    """
    Stream chat responses from Gemini for a smoother UX.
    Returns Server-Sent Events (SSE) for real-time streaming.
    """
    import google.generativeai as genai
    
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        async def error_stream():
            yield f"data: {json.dumps({'error': 'API key not configured'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    system_context = """You are the CircuMetal AI Assistant, an expert in Life Cycle Assessment (LCA) and circular economy for metals.

Your capabilities:
- Explain LCA methodology and environmental impact categories (GWP, energy, water, etc.)
- Describe circularity metrics including Material Circularity Indicator (MCI)
- Guide users through the multi-agent analysis system
- Answer questions about metal production, recycling, and sustainability
- Explain regulations like EU Battery Regulation, CBAM, and EPR schemes

The CircuMetal system has these AI agents:
1. DataAgent - Collects and validates inventory data
2. EstimationAgent - Uses AI to fill missing parameters  
3. LCAAgent - Calculates environmental impacts
4. CircularityAgent - Computes MCI and recycling metrics
5. ScenarioAgent - Generates alternative scenarios
6. ComplianceAgent - Checks regulatory requirements
7. VisualizationAgent - Creates charts and Sankey diagrams
8. ExplainAgent - Generates narrative reports
9. CritiqueAgent - Reviews results for accuracy

Be helpful, concise, and technical when needed. Use markdown formatting with proper headings, bullet points, and code blocks for better readability."""

    full_prompt = f"{system_context}\n\nUser question: {request.message}\n\nProvide a helpful, well-structured response:"
    
    async def generate_stream():
        try:
            response = model.generate_content(full_prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    # Send each chunk as SSE data
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/agents/test")
async def test_agent(request: AgentTestRequest):
    """
    Test a specific agent with sample input.
    Useful for verifying agent functionality.
    """
    agent_name = request.agent_name.lower()
    
    try:
        if "data" in agent_name:
            from circu_metal.agents.data_agent import DataAgent
            agent = DataAgent()
            test_input = request.test_input or {
                "material": "aluminum",
                "process": "primary smelting",
                "mass_kg": 1000
            }
            # Just verify agent loads
            return {
                "success": True,
                "agent": "DataAgent",
                "status": "operational",
                "message": "DataAgent is ready to process inventory data"
            }
            
        elif "lca" in agent_name:
            from circu_metal.agents.lca_agent import LCAAgent
            agent = LCAAgent()
            return {
                "success": True,
                "agent": "LCAAgent", 
                "status": "operational",
                "message": "LCAAgent is ready to calculate environmental impacts"
            }
            
        elif "circular" in agent_name:
            from circu_metal.agents.circularity_agent import CircularityAgent
            agent = CircularityAgent()
            return {
                "success": True,
                "agent": "CircularityAgent",
                "status": "operational", 
                "message": "CircularityAgent is ready to calculate MCI metrics"
            }
            
        elif "compliance" in agent_name:
            from circu_metal.agents.compliance_agent import ComplianceAgent
            agent = ComplianceAgent()
            return {
                "success": True,
                "agent": "ComplianceAgent",
                "status": "operational",
                "message": "ComplianceAgent is ready to check regulatory compliance"
            }
            
        elif "visual" in agent_name:
            from circu_metal.agents.visualization_agent import VisualizationAgent
            agent = VisualizationAgent()
            return {
                "success": True,
                "agent": "VisualizationAgent",
                "status": "operational",
                "message": "VisualizationAgent is ready to generate charts and diagrams"
            }
            
        else:
            return {
                "success": False,
                "error": f"Unknown agent: {request.agent_name}",
                "available_agents": ["DataAgent", "LCAAgent", "CircularityAgent", "ComplianceAgent", "VisualizationAgent"]
            }
            
    except Exception as e:
        return {
            "success": False,
            "agent": request.agent_name,
            "status": "error",
            "error": str(e)
        }


@app.get("/api/agents/list")
async def list_agents():
    """Get detailed information about all available agents"""
    return {
        "agents": [
            {
                "name": "DataAgent",
                "description": "Collects and validates LCI data from databases and user inputs",
                "status": "operational",
                "capabilities": ["data_validation", "inventory_parsing", "unit_conversion"]
            },
            {
                "name": "EstimationAgent", 
                "description": "Uses AI to estimate missing parameters based on material and process type",
                "status": "operational",
                "capabilities": ["parameter_estimation", "data_gap_filling", "uncertainty_analysis"]
            },
            {
                "name": "LCAAgent",
                "description": "Performs life cycle impact assessment calculations",
                "status": "operational",
                "capabilities": ["gwp_calculation", "energy_analysis", "water_footprint"]
            },
            {
                "name": "CircularityAgent",
                "description": "Calculates Material Circularity Indicator and recycling metrics",
                "status": "operational",
                "capabilities": ["mci_calculation", "recyclability_assessment", "loop_closure"]
            },
            {
                "name": "ScenarioAgent",
                "description": "Generates and compares alternative production scenarios",
                "status": "operational",
                "capabilities": ["scenario_generation", "sensitivity_analysis", "optimization"]
            },
            {
                "name": "ComplianceAgent",
                "description": "Checks against environmental regulations and standards",
                "status": "operational",
                "capabilities": ["regulation_check", "standard_compliance", "reporting_requirements"]
            },
            {
                "name": "VisualizationAgent",
                "description": "Generates charts, Sankey diagrams, and visual reports",
                "status": "operational",
                "capabilities": ["sankey_diagram", "bar_charts", "comparison_plots"]
            },
            {
                "name": "ExplainAgent",
                "description": "Generates narrative explanations and recommendations",
                "status": "operational",
                "capabilities": ["report_generation", "recommendation_engine", "summary_creation"]
            },
            {
                "name": "CritiqueAgent",
                "description": "Reviews results for accuracy and suggests improvements",
                "status": "operational",
                "capabilities": ["result_validation", "quality_check", "improvement_suggestions"]
            }
        ],
        "total": 9,
        "all_operational": True
    }


# ----------------------------------------------------------------------------
# Run Full Orchestration with Live Logs
# ----------------------------------------------------------------------------

class RunOrchestrationRequest(BaseModel):
    """Request to run full multi-agent orchestration"""
    project_id: Optional[str] = None  # Optional project to link the report to
    process_description: str = "Recycling of aluminium scrap to produce secondary aluminium ingots."
    input_amount: str = "1 ton"
    material: str = "Aluminium Scrap"
    energy_source: str = "Grid Electricity"
    location: str = "Europe"

# Store for orchestration runs with logs
orchestration_runs: Dict[str, Dict[str, Any]] = {}

@app.post("/api/orchestration/start")
async def start_orchestration(request: RunOrchestrationRequest, background_tasks: BackgroundTasks):
    """
    Start a full multi-agent orchestration run.
    Returns a run_id that can be used to poll for status and logs.
    """
    import uuid
    run_id = str(uuid.uuid4())[:8]
    
    orchestration_runs[run_id] = {
        "status": "starting",
        "progress": 0,
        "current_agent": None,
        "logs": [],
        "result": None,
        "created_at": datetime.now().isoformat(),
        "completed_at": None,
        "error": None
    }
    
    user_input = {
        "process_description": request.process_description,
        "input_amount": request.input_amount,
        "material": request.material,
        "energy_source": request.energy_source,
        "location": request.location,
        "project_id": request.project_id  # Include project_id for linking report
    }
    
    # Run in background
    background_tasks.add_task(run_orchestration_task, run_id, user_input)
    
    return {
        "success": True,
        "run_id": run_id,
        "message": "Orchestration started. Poll /api/orchestration/{run_id}/status for updates."
    }


def add_orchestration_log(run_id: str, agent: str, level: str, message: str, data: dict = None):
    """Add a log entry to an orchestration run"""
    if run_id in orchestration_runs:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "agent": agent,
            "level": level,
            "message": message,
            "data": data
        }
        orchestration_runs[run_id]["logs"].append(log_entry)


def run_orchestration_task(run_id: str, user_input: dict):
    """Background task that runs the full orchestration with detailed logging"""
    try:
        orchestration_runs[run_id]["status"] = "running"
        
        # Initialize orchestrator
        add_orchestration_log(run_id, "Orchestrator", "info", "Initializing CircuMetal Multi-Agent System...")
        
        from circu_metal.agents.data_agent import DataAgent
        from circu_metal.agents.estimation_agent import EstimationAgent
        from circu_metal.agents.lca_agent import LCAAgent
        from circu_metal.agents.circularity_agent import CircularityAgent
        from circu_metal.agents.scenario_agent import ScenarioAgent
        from circu_metal.agents.visualization_agent import VisualizationAgent
        from circu_metal.agents.explain_agent import ExplainAgent
        from circu_metal.agents.compliance_agent import ComplianceAgent
        from circu_metal.agents.critique_agent import CritiqueAgent
        
        context = user_input
        history = {}
        
        # --- Step 1: Data Agent ---
        orchestration_runs[run_id]["current_agent"] = "DataAgent"
        orchestration_runs[run_id]["progress"] = 10
        add_orchestration_log(run_id, "DataAgent", "info", "Starting data collection and validation...")
        add_orchestration_log(run_id, "DataAgent", "info", f"Input: {json.dumps(user_input, indent=2)}")
        
        data_agent = DataAgent()
        res1 = data_agent.handle(context)
        history['data_agent'] = res1
        
        if res1.get('status') == 'success':
            add_orchestration_log(run_id, "DataAgent", "success", "Data validation complete", res1.get('data', {}))
            context = res1.get('data', {})
        else:
            add_orchestration_log(run_id, "DataAgent", "error", f"Failed: {res1.get('log', 'Unknown error')}")
            orchestration_runs[run_id]["status"] = "failed"
            orchestration_runs[run_id]["error"] = "Data Agent failed"
            return
        
        # --- Step 2: Estimation Agent ---
        orchestration_runs[run_id]["current_agent"] = "EstimationAgent"
        orchestration_runs[run_id]["progress"] = 20
        add_orchestration_log(run_id, "EstimationAgent", "info", "Estimating missing parameters using AI...")
        
        estimation_agent = EstimationAgent()
        res2 = estimation_agent.handle(context)
        history['estimation_agent'] = res2
        
        if res2.get('status') == 'success':
            add_orchestration_log(run_id, "EstimationAgent", "success", "Parameter estimation complete", res2.get('data', {}))
            context = res2.get('data', {})
        else:
            add_orchestration_log(run_id, "EstimationAgent", "warning", f"Estimation had issues: {res2.get('log', '')}")
        
        # --- Step 3: LCA Agent ---
        orchestration_runs[run_id]["current_agent"] = "LCAAgent"
        orchestration_runs[run_id]["progress"] = 35
        add_orchestration_log(run_id, "LCAAgent", "info", "Calculating environmental impacts (GWP, Energy, Water)...")
        
        lca_agent = LCAAgent()
        res3 = lca_agent.handle(context)
        history['lca_agent'] = res3
        
        if res3.get('status') == 'success':
            lca_data = res3.get('data', {})
            add_orchestration_log(run_id, "LCAAgent", "success", "LCA calculations complete", lca_data)
            context.update(lca_data)
        else:
            add_orchestration_log(run_id, "LCAAgent", "warning", f"LCA had issues: {res3.get('log', '')}")
        
        # --- Step 4: Circularity Agent ---
        orchestration_runs[run_id]["current_agent"] = "CircularityAgent"
        orchestration_runs[run_id]["progress"] = 50
        add_orchestration_log(run_id, "CircularityAgent", "info", "Computing Material Circularity Indicator (MCI)...")
        
        circularity_agent = CircularityAgent()
        res4 = circularity_agent.handle(context)
        history['circularity_agent'] = res4
        
        if res4.get('status') == 'success':
            circ_data = res4.get('data', {})
            add_orchestration_log(run_id, "CircularityAgent", "success", "Circularity metrics computed", circ_data)
            context.update(circ_data)
        else:
            add_orchestration_log(run_id, "CircularityAgent", "warning", f"Circularity had issues: {res4.get('log', '')}")
        
        # --- Step 5: Scenario Agent ---
        orchestration_runs[run_id]["current_agent"] = "ScenarioAgent"
        orchestration_runs[run_id]["progress"] = 60
        add_orchestration_log(run_id, "ScenarioAgent", "info", "Generating alternative scenarios...")
        
        scenario_agent = ScenarioAgent()
        res5 = scenario_agent.handle(context)
        history['scenario_agent'] = res5
        
        if res5.get('status') == 'success':
            add_orchestration_log(run_id, "ScenarioAgent", "success", "Scenarios generated", res5.get('data', {}))
        else:
            add_orchestration_log(run_id, "ScenarioAgent", "warning", f"Scenario generation had issues")
        
        # --- Step 6: Compliance Agent ---
        orchestration_runs[run_id]["current_agent"] = "ComplianceAgent"
        orchestration_runs[run_id]["progress"] = 70
        add_orchestration_log(run_id, "ComplianceAgent", "info", "Checking regulatory compliance (EU Battery Reg, CBAM)...")
        
        compliance_agent = ComplianceAgent()
        res6 = compliance_agent.handle(context)
        history['compliance_agent'] = res6
        
        if res6.get('status') == 'success':
            add_orchestration_log(run_id, "ComplianceAgent", "success", "Compliance check complete", res6.get('data', {}))
        else:
            add_orchestration_log(run_id, "ComplianceAgent", "warning", f"Compliance check had issues")
        
        # --- Step 7: Visualization Agent ---
        orchestration_runs[run_id]["current_agent"] = "VisualizationAgent"
        orchestration_runs[run_id]["progress"] = 80
        add_orchestration_log(run_id, "VisualizationAgent", "info", "Generating Sankey diagrams and charts...")
        
        visualization_agent = VisualizationAgent()
        # VisualizationAgent has async handle(), so run it in an event loop
        import inspect
        if inspect.iscoroutinefunction(visualization_agent.handle):
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                # Add project_id to context for visualization saving
                viz_context = context.copy()
                viz_context["project_id"] = user_input.get("project_id")
                viz_context["project_name"] = user_input.get("project_name", "Unknown")
                viz_context["action"] = "generate"
                res7 = loop.run_until_complete(visualization_agent.handle(viz_context))
            finally:
                loop.close()
        else:
            res7 = visualization_agent.handle(context)
        history['visualization_agent'] = res7
        
        if res7.get('status') == 'success':
            add_orchestration_log(run_id, "VisualizationAgent", "success", "Visualizations generated")
        else:
            add_orchestration_log(run_id, "VisualizationAgent", "warning", f"Visualization had issues")
        
        # --- Step 8: Explain Agent ---
        orchestration_runs[run_id]["current_agent"] = "ExplainAgent"
        orchestration_runs[run_id]["progress"] = 90
        add_orchestration_log(run_id, "ExplainAgent", "info", "Generating comprehensive narrative report...")
        
        explain_agent = ExplainAgent()
        explain_input = {"current_context": context, "history": history}
        res8 = explain_agent.handle(explain_input)
        history['explain_agent'] = res8
        
        report_saved = False
        if res8.get('status') == 'success':
            add_orchestration_log(run_id, "ExplainAgent", "success", "Report generation complete")
            
            # Save report to MongoDB
            try:
                import asyncio
                explain_data = res8.get('data', {})
                report_data = {
                    "run_id": run_id,
                    "project_id": user_input.get('project_id'),  # Link to project
                    "title": f"LCA Analysis Report - {user_input.get('material', 'Unknown')}",
                    "material": user_input.get('material', ''),
                    "process_description": user_input.get('process_description', ''),
                    "input_amount": user_input.get('input_amount', ''),
                    "location": user_input.get('location', ''),
                    # Full ExplainAgent output
                    "explain_agent_output": res8,  # Store the entire ExplainAgent response
                    "report_markdown": explain_data.get('report_markdown', ''),
                    "summary": explain_data.get('summary', ''),
                    "key_takeaways": explain_data.get('key_takeaways', []),
                    "recommendations": explain_data.get('recommendations', []),
                    "lca_results": {
                        "gwp_100": context.get('gwp_100', {}),
                        "energy_demand": context.get('energy_demand', {}),
                        "water_consumption": context.get('water_consumption', {})
                    },
                    "circularity_results": {
                        "mci": context.get('mci', 0),
                        "recycled_content": context.get('recycled_content', 0),
                        "eol_recycling_rate": context.get('eol_recycling_rate', 0),
                        "resource_efficiency": context.get('resource_efficiency', 0)
                    },
                    "scenarios": history.get('scenario_agent', {}).get('data', {}).get('scenarios', []),
                    "compliance": history.get('compliance_agent', {}).get('data', {}),
                    "full_history": history  # All agent outputs for complete traceability
                }
                
                # Run async save in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                saved_report = loop.run_until_complete(create_report(report_data))
                loop.close()
                
                report_saved = True
                orchestration_runs[run_id]["report_id"] = saved_report.get('id')
                add_orchestration_log(run_id, "ExplainAgent", "success", f"Report saved to MongoDB (ID: {saved_report.get('id')})")
            except Exception as e:
                add_orchestration_log(run_id, "ExplainAgent", "warning", f"Failed to save report to MongoDB: {str(e)}")
        else:
            add_orchestration_log(run_id, "ExplainAgent", "warning", f"Report generation had issues")
        
        # --- Step 9: Critique Agent ---
        orchestration_runs[run_id]["current_agent"] = "CritiqueAgent"
        orchestration_runs[run_id]["progress"] = 95
        add_orchestration_log(run_id, "CritiqueAgent", "info", "Reviewing results for accuracy and improvements...")
        
        critique_agent = CritiqueAgent()
        res9 = critique_agent.handle(history)
        history['critique_agent'] = res9
        
        if res9.get('status') == 'success':
            add_orchestration_log(run_id, "CritiqueAgent", "success", "Quality review complete", res9.get('data', {}))
        else:
            add_orchestration_log(run_id, "CritiqueAgent", "warning", f"Critique had issues")
        
        # --- Complete ---
        orchestration_runs[run_id]["status"] = "completed"
        orchestration_runs[run_id]["progress"] = 100
        orchestration_runs[run_id]["current_agent"] = None
        orchestration_runs[run_id]["completed_at"] = datetime.now().isoformat()
        orchestration_runs[run_id]["result"] = history
        
        add_orchestration_log(run_id, "Orchestrator", "success", "Multi-agent analysis complete!")
        
        # Save result to file
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'output')
        os.makedirs(output_dir, exist_ok=True)
        save_json(history, f"output/orchestration_{run_id}.json")
        
    except Exception as e:
        orchestration_runs[run_id]["status"] = "failed"
        orchestration_runs[run_id]["error"] = str(e)
        orchestration_runs[run_id]["completed_at"] = datetime.now().isoformat()
        add_orchestration_log(run_id, "Orchestrator", "error", f"Orchestration failed: {str(e)}")


@app.get("/api/orchestration/{run_id}/status")
async def get_orchestration_status(run_id: str):
    """Get current status and logs for an orchestration run"""
    if run_id not in orchestration_runs:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run = orchestration_runs[run_id]
    return {
        "run_id": run_id,
        "status": run["status"],
        "progress": run["progress"],
        "current_agent": run["current_agent"],
        "logs": run["logs"],
        "created_at": run["created_at"],
        "completed_at": run["completed_at"],
        "error": run["error"]
    }


@app.get("/api/orchestration/{run_id}/result")
async def get_orchestration_result(run_id: str):
    """Get the full result of a completed orchestration run"""
    if run_id not in orchestration_runs:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run = orchestration_runs[run_id]
    if run["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Run not completed. Status: {run['status']}")
    
    return {
        "run_id": run_id,
        "status": run["status"],
        "result": run["result"],
        "logs": run["logs"]
    }


@app.get("/api/orchestration/runs")
async def list_orchestration_runs():
    """List all orchestration runs"""
    return {
        "runs": [
            {
                "run_id": run_id,
                "status": run["status"],
                "progress": run["progress"],
                "current_agent": run["current_agent"],
                "created_at": run["created_at"],
                "completed_at": run["completed_at"],
                "report_id": run.get("report_id")
            }
            for run_id, run in orchestration_runs.items()
        ]
    }


# ----------------------------------------------------------------------------
# Reports Endpoints
# ----------------------------------------------------------------------------

@app.get("/api/reports")
async def list_reports(limit: int = 50, project_id: Optional[str] = None):
    """Get all saved reports from MongoDB"""
    reports = await get_reports(limit, project_id)
    return {
        "success": True,
        "reports": reports,
        "count": len(reports)
    }


@app.get("/api/reports/{report_id}")
async def get_report_by_id(report_id: str):
    """Get a specific report by ID"""
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "success": True,
        "report": report
    }


@app.get("/api/reports/{report_id}/content")
async def get_report_content(report_id: str):
    """
    Get just the markdown content of a report.
    
    This endpoint returns the raw markdown content for display/rendering.
    """
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "success": True,
        "report_id": report_id,
        "title": report.get("title", "LCA Report"),
        "content": report.get("content", report.get("report_markdown", "")),
        "format": report.get("format", "markdown"),
        "created_at": report.get("created_at")
    }


@app.get("/api/reports/run/{run_id}")
async def get_report_for_run(run_id: str):
    """Get the report associated with a specific orchestration run"""
    report = await get_report_by_run_id(run_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found for this run")
    return {
        "success": True,
        "report": report
    }


@app.delete("/api/reports/{report_id}")
async def delete_report_by_id(report_id: str):
    """Delete a report by ID"""
    deleted = await delete_report(report_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "success": True,
        "message": "Report deleted successfully"
    }



@app.get("/api/projects/{project_id}/reports", response_model=ProjectReportsResponse)
async def get_project_reports(project_id: str, limit: int = 50):
    """
    Get all reports for a specific project.
    
    Returns markdown reports generated by the agents for the given project,
    sorted by creation date (newest first).
    
    Each report contains:
    - id: Unique report identifier
    - run_id: The run that generated this report
    - title: Report title
    - content: Full markdown content of the report
    - created_at: When the report was generated
    """
    # Verify project exists
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    reports = await get_reports_by_project(project_id, limit)
    
    return ProjectReportsResponse(
        success=True,
        project_id=project_id,
        project_name=project.get("name", ""),
        reports=reports,
        count=len(reports)
    )


# ----------------------------------------------------------------------------
# Full Analysis Endpoints
# ----------------------------------------------------------------------------

@app.post("/api/analysis/start", response_model=AnalysisStatus)
async def start_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Start a new LCA analysis job.
    
    This runs the full multi-agent pipeline in the background and returns
    a job ID that can be used to check status and retrieve results.
    """
    import uuid
    job_id = str(uuid.uuid4())[:8]
    
    user_input = {
        "process_description": request.process_description,
        "input_amount": request.input_amount,
        "material": request.material,
        "energy_source": request.energy_source,
        "location": request.location
    }
    
    # Initialize job tracking
    analysis_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "current_step": "Queued",
        "progress": 0,
        "created_at": datetime.now().isoformat(),
        "completed_at": None,
        "error": None,
        "input": user_input,
        "project_id": request.project_id,
        "scenario_id": request.scenario_id
    }
    
    # Start background task
    background_tasks.add_task(run_analysis_task, job_id, user_input)
    
    return AnalysisStatus(
        job_id=job_id,
        status="pending",
        current_step="Queued",
        progress=0,
        created_at=analysis_jobs[job_id]["created_at"]
    )

@app.get("/api/analysis/{job_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(job_id: str):
    """Get the current status of an analysis job"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = analysis_jobs[job_id]
    return AnalysisStatus(
        job_id=job_id,
        status=job["status"],
        current_step=job.get("current_step"),
        progress=job.get("progress", 0),
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
        error=job.get("error")
    )

@app.get("/api/analysis/{job_id}/result")
async def get_analysis_result(job_id: str):
    """Get the complete result of a finished analysis job"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = analysis_jobs[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job status is {job['status']}, not completed")
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "result": job.get("result"),
        "report_markdown": job.get("report_markdown"),
        "sankey_available": job.get("sankey_available", False),
        "pathway_comparison_available": job.get("pathway_available", False)
    }

@app.get("/api/analysis/{job_id}/report")
async def get_analysis_report(job_id: str):
    """Get just the markdown report from a completed analysis"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = analysis_jobs[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not complete")
    
    return {"report_markdown": job.get("report_markdown", "")}

@app.get("/api/analysis/{job_id}/sankey")
async def get_sankey_diagram(job_id: str):
    """Get the Sankey diagram HTML file"""
    file_path = os.path.join(os.path.dirname(__file__), '..', 'output', f'sankey_{job_id}.html')
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sankey diagram not found")
    
    return FileResponse(file_path, media_type="text/html")

@app.get("/api/analysis/{job_id}/pathway")
async def get_pathway_comparison(job_id: str):
    """Get the pathway comparison chart HTML file"""
    file_path = os.path.join(os.path.dirname(__file__), '..', 'output', f'pathway_{job_id}.html')
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Pathway comparison not found")
    
    return FileResponse(file_path, media_type="text/html")

# ----------------------------------------------------------------------------
# Quick Estimation Endpoints
# ----------------------------------------------------------------------------

@app.post("/api/estimate/parameters")
async def estimate_parameters(request: QuickEstimateRequest):
    """
    Quick parameter estimation using the EstimationAgent.
    
    Returns emission factors, energy intensities, and circularity indicators
    for a given material and process type.
    """
    from circu_metal.agents.estimation_agent import EstimationAgent
    
    agent = EstimationAgent()
    
    input_data = {
        "process_name": f"{request.material} {request.process_type} processing",
        "functional_unit": "1 ton",
        "inputs": [{"name": request.material, "amount": 1000, "unit": "kg"}],
        "outputs": [],
        "energy": [{"type": "Electricity", "amount": 500, "unit": "kWh"}],
        "transport": [],
        "location": request.region
    }
    
    result = agent.handle(input_data)
    
    return result

@app.post("/api/estimate/circularity")
async def estimate_circularity(request: CircularityRequest):
    """
    Calculate circularity metrics using the CircularityAgent.
    """
    from circu_metal.agents.circularity_agent import CircularityAgent
    
    agent = CircularityAgent()
    
    input_data = {
        "process_name": f"{request.material} processing",
        "functional_unit": "1 ton",
        "inputs": [
            {"name": f"{request.material} Scrap", "amount": request.recycled_content * 10, "unit": "kg"},
            {"name": f"Primary {request.material}", "amount": (100 - request.recycled_content) * 10, "unit": "kg"}
        ],
        "outputs": [{"name": f"{request.material} Product", "amount": 1000 * (request.process_efficiency / 100), "unit": "kg"}],
        "eol_recycling_rate": request.eol_recycling_rate
    }
    
    result = agent.handle(input_data)
    
    return result

# ----------------------------------------------------------------------------
# Reference Data Endpoints
# ----------------------------------------------------------------------------

@app.get("/api/data/emission-factors")
async def get_emission_factors():
    """Get the emission factors reference database"""
    from circu_metal.utils.data_loader import get_emission_factors
    return get_emission_factors()

@app.get("/api/data/circularity-benchmarks")
async def get_circularity_benchmarks():
    """Get the circularity benchmarks reference database"""
    from circu_metal.utils.data_loader import get_circularity_benchmarks
    return get_circularity_benchmarks()

@app.get("/api/data/material-properties")
async def get_material_properties():
    """Get the material properties reference database"""
    from circu_metal.utils.data_loader import get_material_properties
    return get_material_properties()

@app.get("/api/data/process-templates")
async def get_process_templates():
    """Get the process templates reference database"""
    from circu_metal.utils.data_loader import get_process_templates
    return get_process_templates()

@app.get("/api/data/emission-factor/{material}")
async def get_emission_factor_for_material(material: str, source_type: str = "primary_production"):
    """Get emission factor for a specific material"""
    from circu_metal.utils.data_loader import get_emission_factor
    
    factor = get_emission_factor(material, source_type)
    if factor is None:
        raise HTTPException(status_code=404, detail=f"Emission factor not found for {material}")
    
    return {"material": material, "source_type": source_type, "emission_factor": factor, "unit": "kg CO2e/kg"}

# ----------------------------------------------------------------------------
# Scenario Comparison
# ----------------------------------------------------------------------------

@app.post("/api/scenarios/compare")
async def compare_scenarios(scenarios: list[dict]):
    """
    Compare multiple scenarios and generate comparison metrics.
    """
    from circu_metal.agents.scenario_agent import ScenarioAgent
    
    agent = ScenarioAgent()
    
    # Build comparison input
    comparison_input = {
        "scenarios": scenarios,
        "comparison_type": "multi_scenario"
    }
    
    result = agent.handle(comparison_input)
    
    return result


# ============================================================================
# Inventory Endpoints (MongoDB)
# ============================================================================

@app.post("/api/inventory", response_model=InventoryResponse)
async def create_inventory_endpoint(inventory: InventoryData):
    """
    Create a new inventory with material items.
    
    This is the primary entry point for uploading material data
    to be analyzed by the multi-agent LCA system.
    """
    inventory_doc = {
        "name": inventory.name,
        "project_id": inventory.project_id,
        "description": inventory.description,
        "items": [item.model_dump() for item in inventory.items],
        "metadata": inventory.metadata or {}
    }
    
    result = await create_inventory(inventory_doc)
    
    return InventoryResponse(
        success=True,
        message="Inventory created successfully",
        inventory_id=result["id"],
        inventory=result
    )


@app.get("/api/inventory/{inventory_id}")
async def get_inventory_endpoint(inventory_id: str):
    """Get an inventory by ID"""
    result = await get_inventory(inventory_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    return result


@app.get("/api/inventories")
async def get_all_inventories():
    """Get all inventories (across all projects)"""
    db = await get_database()
    collection = db.inventories
    cursor = collection.find().sort("created_at", -1)
    
    from api.database import serialize_doc
    results = [serialize_doc(doc) async for doc in cursor]
    return {"inventories": results}


@app.get("/api/inventory/project/{project_id}")
async def get_project_inventories(project_id: str):
    """Get all inventories for a project"""
    results = await get_inventories_by_project(project_id)
    return {"inventories": results}


@app.put("/api/inventory/{inventory_id}")
async def update_inventory_endpoint(inventory_id: str, inventory: InventoryData):
    """Update an existing inventory"""
    inventory_doc = {
        "name": inventory.name,
        "description": inventory.description,
        "items": [item.model_dump() for item in inventory.items],
        "metadata": inventory.metadata
    }
    
    result = await update_inventory(inventory_id, inventory_doc)
    
    if not result:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    return InventoryResponse(
        success=True,
        message="Inventory updated successfully",
        inventory_id=result["id"],
        inventory=result
    )


@app.delete("/api/inventory/{inventory_id}")
async def delete_inventory_endpoint(inventory_id: str):
    """Delete an inventory"""
    success = await delete_inventory(inventory_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    return {"success": True, "message": "Inventory deleted successfully"}


# ============================================================================
# Run Endpoints (MongoDB + ADK Orchestration)
# ============================================================================

async def execute_run_task(run_id: str, inventory_data: dict, scenario_config: dict):
    """
    Background task to execute the full multi-agent analysis.
    
    This runs the complete ADK workflow:
    1. DataAgent - Parse and validate inventory
    2. EstimationAgent - Fill in missing parameters
    3. LCAAgent - Calculate environmental impacts
    4. CircularityAgent - Calculate circularity metrics
    5. ScenarioAgent - Generate alternative scenarios
    6. VisualizationAgent - Generate charts and diagrams
    7. ExplainAgent - Generate narrative report
    8. ComplianceAgent - Check regulatory compliance
    """
    try:
        # Get project info
        project_id = inventory_data.get("project_id")
        project_name = "Unknown Project"
        if project_id:
            project = await get_project(project_id)
            if project:
                project_name = project.get("name", "Unknown Project")

        # Update status to running
        await update_run_status(run_id, "running", progress=0, current_agent="DataAgent")
        await add_run_log(run_id, "system", "info", "Starting analysis run")
        
        # Prepare user input for orchestrator
        user_input = {
            "project_id": project_id,
            "project_name": project_name,
            "process_description": inventory_data.get("description", "Material processing"),
            "input_amount": "1 ton",
            "material": inventory_data.get("items", [{}])[0].get("name", "Unknown Material"),
            "energy_source": "Grid Electricity",
            "location": inventory_data.get("metadata", {}).get("location", "Europe"),
            "inventory_items": inventory_data.get("items", []),
            "scenario_config": scenario_config
        }
        
        # Create orchestrator
        orchestrator = Orchestrator()
        
        # Progress tracking callback
        agent_progress = {
            "DataAgent": 10,
            "EstimationAgent": 20,
            "LCAAgent": 40,
            "CircularityAgent": 55,
            "ScenarioAgent": 65,
            "VisualizationAgent": 75,
            "ExplainAgent": 85,
            "ComplianceAgent": 92,
            "CritiqueAgent": 100
        }
        
        # Update progress as workflow runs
        await update_run_status(run_id, "running", progress=10, current_agent="DataAgent")
        await add_run_log(run_id, "DataAgent", "info", "Processing inventory data")
        
        # Run the full orchestration
        result = await orchestrator.run(user_input)
        
        # Extract key results
        lca_result = result.get("lca_agent", {}).get("data", {})
        circularity_result = result.get("circularity_agent", {}).get("data", {})
        explain_result = result.get("explain_agent", {}).get("data", {})
        visualization_result = result.get("visualization_agent", {}).get("data", {})
        compliance_result = result.get("compliance_agent", {}).get("data", {})
        
        # Structure the final result
        structured_result = {
            "impact_scores": {
                "gwp": lca_result.get("total_gwp", 0),
                "ap": lca_result.get("total_ap", 0),
                "ep": lca_result.get("total_ep", 0),
                "energy_use": lca_result.get("total_energy", 0),
                "water_use": lca_result.get("water_consumption", 0),
                "unit": lca_result.get("functional_unit", "per ton")
            },
            "circularity_metrics": {
                "mci": circularity_result.get("mci", 0),
                "recycled_content": circularity_result.get("recycled_content", 0),
                "recyclability_rate": circularity_result.get("recyclability_rate", 0),
                "waste_reduction": circularity_result.get("waste_reduction", 0),
                "resource_efficiency": circularity_result.get("resource_efficiency", 0)
            },
            "lifecycle_breakdown": lca_result.get("stage_breakdown", {}),
            "scenarios": result.get("scenario_agent", {}).get("data", {}).get("scenarios", []),
            "compliance": compliance_result,
            "recommendations": explain_result.get("recommendations", []),
            "report_markdown": explain_result.get("report_markdown", ""),
            "visualizations": {
                "sankey_data": visualization_result.get("sankey_data"),
                "impact_breakdown": visualization_result.get("impact_breakdown"),
                "scenario_comparison": visualization_result.get("scenario_comparison")
            },
            "raw_agent_outputs": result
        }
        
        # Save result to database
        await set_run_result(run_id, structured_result)
        await add_run_log(run_id, "system", "info", "Analysis completed successfully")
        
        # Save outputs to files
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'output')
        os.makedirs(output_dir, exist_ok=True)
        save_json(result, f"output/run_{run_id}.json")
        
        if explain_result.get("report_markdown"):
            write_report_markdown(
                explain_result["report_markdown"],
                f"output/report_{run_id}.md"
            )
            
            # Save report to database
            # Ensure we are in the right loop context or handle errors gracefully
            try:
                report_data = {
                    "run_id": run_id,
                    "project_id": inventory_data.get("project_id"),
                    "title": f"LCA Report - {inventory_data.get('name', 'Analysis')}",
                    "content": explain_result["report_markdown"],
                    "format": "markdown",
                    "sections": explain_result.get("sections", {}),
                    "created_at": datetime.utcnow()
                }
                await create_report(report_data)
            except Exception as e:
                await add_run_log(run_id, "system", "error", f"Failed to save report to DB: {str(e)}")
        
    except Exception as e:
        error_msg = str(e)
        await update_run_status(run_id, "failed", error=error_msg)
        await add_run_log(run_id, "system", "error", f"Analysis failed: {error_msg}")


@app.post("/api/run", response_model=RunResponse)
async def start_run(request: StartRunRequest, background_tasks: BackgroundTasks):
    """
    Start a new LCA analysis run using the ADK multi-agent system.
    
    This endpoint:
    1. Creates a run record in MongoDB
    2. Triggers the background ADK orchestration
    3. Returns immediately with run_id for status polling
    """
    # Get inventory data
    inventory_data = await get_inventory(request.inventory_id)
    
    if not inventory_data:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    # Create run record
    run_doc = {
        "inventory_id": request.inventory_id,
        "project_id": inventory_data.get("project_id") or request.project_id,
        "name": f"Run {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "scenario_config": {},
        "metadata": {}
    }
    
    run_record = await create_run(run_doc)
    run_id = run_record["id"]
    
    # Ensure project_id is in inventory_data for the background task
    if request.project_id:
        inventory_data["project_id"] = request.project_id
    
    # Start background task
    background_tasks.add_task(
        execute_run_task,
        run_id,
        inventory_data,
        run_doc.get("scenario_config", {})
    )
    
    return RunResponse(
        success=True,
        message="Run started successfully",
        run_id=run_id,
        status="pending",
        estimated_time=60  # Estimate 60 seconds
    )


@app.get("/api/run/{run_id}", response_model=RunStatusResponse)
async def get_run_status(run_id: str):
    """
    Get the current status of a run.
    
    Poll this endpoint to track progress of the multi-agent analysis.
    """
    run_record = await get_run(run_id)
    
    if not run_record:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return RunStatusResponse(
        run_id=run_id,
        status=run_record.get("status", "unknown"),
        progress=run_record.get("progress", 0),
        current_agent=run_record.get("current_agent"),
        created_at=run_record.get("created_at"),
        completed_at=run_record.get("completed_at"),
        error=run_record.get("error"),
        logs=run_record.get("logs", [])
    )


@app.get("/api/run/{run_id}/result", response_model=RunResultResponse)
async def get_run_result(run_id: str):
    """
    Get the complete results of a finished run.
    
    This returns all LCA impacts, circularity metrics, scenarios,
    and visualization data.
    """
    run_record = await get_run(run_id)
    
    if not run_record:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run_record.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Run status is '{run_record.get('status')}', not 'completed'"
        )
    
    result = run_record.get("result", {})
    
    return RunResultResponse(
        run_id=run_id,
        status="completed",
        impact_scores=result.get("impact_scores"),
        circularity_metrics=result.get("circularity_metrics"),
        lifecycle_breakdown=result.get("lifecycle_breakdown"),
        scenarios=result.get("scenarios", []),
        recommendations=result.get("recommendations", []),
        visualizations=result.get("visualizations"),
        compliance=result.get("compliance")
    )


@app.get("/api/run/{run_id}/report")
async def get_run_report(run_id: str):
    """
    Get the markdown report for a completed run.
    """
    run_record = await get_run(run_id)
    
    if not run_record:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run_record.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Run not completed")
    
    result = run_record.get("result", {})
    
    return {
        "run_id": run_id,
        "report_markdown": result.get("report_markdown", ""),
        "generated_at": run_record.get("completed_at")
    }


@app.get("/api/runs/recent")
async def get_recent_runs_endpoint(limit: int = 10):
    """Get recent runs across all projects"""
    runs = await get_recent_runs(limit)
    return {"runs": runs}


@app.get("/api/runs/project/{project_id}")
async def get_project_runs(project_id: str):
    """Get all runs for a specific project"""
    runs = await get_runs_by_project(project_id)
    return {"runs": runs}


# ============================================================================
# Project Endpoints (MongoDB)
# ============================================================================

@app.post("/api/projects")
async def create_project_endpoint(data: dict):
    """Create a new project"""
    result = await create_project(data)
    return {"success": True, "project": result}


@app.get("/api/projects")
async def get_projects_endpoint(user_id: str = None):
    """Get all projects, optionally filtered by user"""
    projects = await get_projects(user_id)
    return {"projects": projects}


@app.get("/api/projects/{project_id}")
async def get_project_endpoint(project_id: str):
    """Get a project by ID"""
    project = await get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@app.put("/api/projects/{project_id}")
async def update_project_endpoint(project_id: str, data: dict):
    """Update a project"""
    result = await update_project(project_id, data)
    
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True, "project": result}


class CreateScenarioRequest(BaseModel):
    project_id: str
    name: str
    route_type: str
    is_baseline: bool = False
    description: Optional[str] = None


@app.post("/api/scenarios")
async def create_scenario_endpoint(data: CreateScenarioRequest):
    """Create a new scenario for a project"""
    # Convert to dict
    scenario_data = data.dict(exclude={"project_id"})
    
    # Add default stages based on route_type (optional, but good for UX)
    # For now, just empty stages
    scenario_data["stages"] = []
    
    result = await add_scenario(data.project_id, scenario_data)
    
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return {"success": True, "project": result}


@app.delete("/api/projects/{project_id}")
async def delete_project_endpoint(project_id: str):
    """Delete a project and all associated data"""
    success = await delete_project(project_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True, "message": "Project deleted successfully"}


# ============================================================================
# Report Endpoints (MongoDB)
# ============================================================================

@app.post("/api/reports")
async def create_report_endpoint(data: dict):
    """Create a new report"""
    result = await create_report(data)
    return {"success": True, "report": result}


@app.get("/api/reports")
async def get_reports_endpoint(limit: int = 50):
    """Get all reports"""
    reports = await get_reports(limit)
    return {"reports": reports}


@app.get("/api/reports/{report_id}")
async def get_report_endpoint(report_id: str):
    """Get a report by ID"""
    report = await get_report(report_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report


@app.put("/api/reports/{report_id}")
async def update_report_endpoint(report_id: str, data: dict):
    """Update a report"""
    result = await update_report(report_id, data)
    
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"success": True, "report": result}


@app.delete("/api/reports/{report_id}")
async def delete_report_endpoint(report_id: str):
    """Delete a report"""
    success = await delete_report(report_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"success": True, "message": "Report deleted successfully"}


# ============================================================================
# Visualization Endpoints
# ============================================================================

@app.post("/api/visualizations")
async def create_visualization_endpoint(data: CreateVisualizationRequest):
    """Save a generated visualization"""
    result = await save_visualization(data.dict())
    return {"success": True, "visualization": result}


@app.get("/api/visualizations")
async def get_visualizations_endpoint(
    project_id: Optional[str] = None,
    diagram_type: Optional[str] = None,
    limit: int = 10
):
    """Get visualizations with filtering"""
    visualizations = await get_visualizations(project_id, diagram_type, limit)
    return {"visualizations": visualizations}


@app.get("/api/visualizations/latest")
async def get_latest_visualization_endpoint(
    project_id: str,
    diagram_type: str
):
    """Get the most recent visualization for a project and type"""
    visualization = await get_latest_visualization(project_id, diagram_type)
    
    if not visualization:
        raise HTTPException(status_code=404, detail="Visualization not found")
    
    return visualization


from circu_metal.agents.life_cycle_explorer_agent import LifeCycleExplorerAgent

class LifeCycleExplorerRequest(BaseModel):
    metal: str
    ore_name: str
    ore_grade: str

@app.post("/api/life-cycle/generate")
async def generate_life_cycle(request: LifeCycleExplorerRequest):
    """Generate a complete life cycle assessment structure based on metal and ore inputs"""
    try:
        agent = LifeCycleExplorerAgent()
        result = await agent.handle_async({
            "metal": request.metal,
            "ore_name": request.ore_name,
            "ore_grade": request.ore_grade
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
