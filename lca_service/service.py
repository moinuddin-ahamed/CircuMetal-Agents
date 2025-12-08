"""
FastAPI Service for LCA Calculations.

Provides REST API for:
- POST /lca/calculate - Perform LCA calculation
- POST /lca/compare - Compare scenarios
- POST /lca/report - Generate PDF report
- GET /health - Health check
"""

import uuid
import time
import logging
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import (
    LCARequest,
    LCAResponse,
    ScenarioComparisonRequest,
    ScenarioComparison,
    ReportRequest,
    ReportResponse,
    ImpactCategory,
)
from .engine import LCAEngine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service start time
SERVICE_START_TIME = datetime.utcnow()


class LCAService:
    """LCA calculation service."""
    
    def __init__(self):
        """Initialize service."""
        self.engine = LCAEngine()
        self.calculation_count = 0
        logger.info("LCA Service initialized")
    
    def calculate(self, request: LCARequest) -> LCAResponse:
        """Perform LCA calculation."""
        self.calculation_count += 1
        return self.engine.calculate(request)
    
    def compare_scenarios(self, request: ScenarioComparisonRequest) -> ScenarioComparison:
        """Compare multiple scenarios."""
        return self.engine.compare_scenarios(request)
    
    async def generate_report(self, request: ReportRequest) -> bytes:
        """Generate PDF report."""
        # Simple HTML report that can be converted to PDF
        html = self._generate_html_report(request)
        
        # For now, return HTML - in production, use weasyprint or similar
        return html.encode('utf-8')
    
    def _generate_html_report(self, request: ReportRequest) -> str:
        """Generate HTML report."""
        lca = request.lca_response
        comparison = request.scenario_comparison
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{request.report_title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
        h1 {{ color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px; }}
        h2 {{ color: #166534; margin-top: 30px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background-color: #166534; color: white; }}
        tr:nth-child(even) {{ background-color: #f9f9f9; }}
        .metric {{ font-size: 24px; font-weight: bold; color: #166534; }}
        .unit {{ font-size: 14px; color: #666; }}
        .card {{ background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 15px 0; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🌱 {request.report_title}</h1>
        <p><strong>{request.organization_name}</strong></p>
        <p>Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
    </div>
"""
        
        if lca:
            html += f"""
    <h2>Life Cycle Assessment Results</h2>
    
    <div class="card">
        <p><strong>Study:</strong> {lca.name}</p>
        <p><strong>Functional Unit:</strong> {lca.functional_unit}</p>
        <p><strong>Metal Type:</strong> {lca.metal_type}</p>
    </div>
    
    <h3>Environmental Impacts</h3>
    <table>
        <tr>
            <th>Impact Category</th>
            <th>Value</th>
            <th>Unit</th>
            <th>Confidence</th>
        </tr>
"""
            for impact in lca.impacts:
                html += f"""
        <tr>
            <td>{impact.category.value.upper()}</td>
            <td class="metric">{impact.value:,.2f}</td>
            <td class="unit">{impact.unit}</td>
            <td>{impact.confidence*100:.0f}%</td>
        </tr>
"""
            html += """
    </table>
    
    <h3>Circularity Metrics</h3>
    <div class="card">
"""
            html += f"""
        <p><strong>Material Circularity Indicator:</strong> 
            <span class="metric">{lca.circularity.material_circularity_indicator:.2f}</span></p>
        <p><strong>Recycled Input Rate:</strong> {lca.circularity.recycled_input_rate*100:.0f}%</p>
        <p><strong>Recyclability:</strong> {lca.circularity.recyclability*100:.0f}%</p>
        <p><strong>Waste Recovery:</strong> {lca.circularity.waste_recovery_rate*100:.0f}%</p>
    </div>
"""
        
        if comparison:
            html += f"""
    <h2>Scenario Comparison</h2>
    
    <div class="card">
        <p><strong>Best Scenario:</strong> {comparison.best_scenario}</p>
        <p><strong>Maximum GWP Reduction:</strong> 
            <span class="metric">{comparison.max_gwp_reduction:.1f}%</span></p>
        <p><strong>Circularity Improvement:</strong> 
            <span class="metric">{comparison.max_circularity_improvement:.1f}%</span></p>
    </div>
    
    <h3>Recommendations</h3>
    <ul>
"""
            for rec in comparison.recommendations:
                html += f"        <li>{rec}</li>\n"
            
            html += """
    </ul>
"""
        
        if request.include_methodology:
            html += """
    <h2>Methodology</h2>
    <p>This Life Cycle Assessment follows ISO 14040 and ISO 14044 standards for environmental 
    management and life cycle assessment. The system boundaries include cradle-to-gate processes 
    for metal production.</p>
    
    <h3>Impact Categories</h3>
    <ul>
        <li><strong>GWP (Global Warming Potential):</strong> Measured in kg CO2 equivalent, 
            based on IPCC characterization factors (100-year horizon)</li>
        <li><strong>Energy:</strong> Primary energy consumption in GJ</li>
        <li><strong>Water:</strong> Blue water footprint in m³</li>
    </ul>
"""
        
        if request.include_assumptions and lca:
            html += """
    <h3>Key Assumptions</h3>
    <ul>
"""
            for assumption in lca.assumptions:
                html += f"        <li>{assumption}</li>\n"
            html += """
    </ul>
"""
        
        html += f"""
    <div class="footer">
        <p>Report generated by CircuMetal LCA Platform</p>
        <p>Data sources: {', '.join(lca.data_sources) if lca else 'N/A'}</p>
        <p>Calculation method: {lca.calculation_method if lca else 'N/A'}</p>
    </div>
</body>
</html>
"""
        
        return html


# Create service instance
lca_service = LCAService()


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("LCA Service starting up...")
    yield
    logger.info("LCA Service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="CircuMetal LCA Service",
    description="Life Cycle Assessment calculation service for metals",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Endpoints

@app.get("/health", tags=["Health"])
async def health_check():
    """Check service health."""
    uptime = (datetime.utcnow() - SERVICE_START_TIME).total_seconds()
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "calculations_performed": lca_service.calculation_count,
    }


@app.post("/lca/calculate", response_model=LCAResponse, tags=["LCA"])
async def calculate_lca(request: LCARequest):
    """
    Perform Life Cycle Assessment calculation.
    
    Calculates environmental impacts (GWP, energy, water) for metal production
    based on process parameters and energy mix.
    """
    try:
        return lca_service.calculate(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"LCA calculation error: {e}")
        raise HTTPException(status_code=500, detail="LCA calculation failed")


@app.post("/lca/compare", response_model=ScenarioComparison, tags=["LCA"])
async def compare_scenarios(request: ScenarioComparisonRequest):
    """
    Compare baseline and circular scenarios.
    
    Returns relative improvements and recommendations.
    """
    try:
        return lca_service.compare_scenarios(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Scenario comparison error: {e}")
        raise HTTPException(status_code=500, detail="Comparison failed")


@app.post("/lca/report", tags=["Reports"])
async def generate_report(request: ReportRequest):
    """
    Generate LCA report in HTML format.
    
    Returns downloadable HTML report. For PDF, use a client-side converter.
    """
    try:
        html_content = await lca_service.generate_report(request)
        
        return Response(
            content=html_content,
            media_type="text/html",
            headers={
                "Content-Disposition": f"attachment; filename=lca_report_{datetime.utcnow().strftime('%Y%m%d')}.html"
            }
        )
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Report generation failed")


@app.get("/lca/emission-factors", tags=["Reference"])
async def get_emission_factors():
    """Get available emission factors."""
    from .engine import EMISSION_FACTORS
    return EMISSION_FACTORS


@app.get("/lca/impact-categories", tags=["Reference"])
async def get_impact_categories():
    """Get supported impact categories."""
    return [
        {"id": cat.value, "name": cat.name, "description": f"{cat.name} impact category"}
        for cat in ImpactCategory
    ]


# Quick calculation endpoint for agents
@app.post("/lca/quick", tags=["LCA"])
async def quick_calculate(
    metal_type: str = "iron_steel",
    recycled_content: float = 0.0,
    production_volume: float = 1000000,
    energy_source: Optional[str] = None
):
    """
    Quick LCA calculation with minimal parameters.
    
    Useful for agent integrations and quick estimates.
    """
    energy = {"grid": 1.0}
    if energy_source:
        try:
            import json
            energy = json.loads(energy_source)
        except:
            pass
    
    request = LCARequest(
        name=f"Quick LCA - {metal_type}",
        metal_type=metal_type,
        recycled_content=recycled_content,
        production_volume=production_volume,
        energy_source=energy,
    )
    
    result = lca_service.calculate(request)
    
    # Return simplified response
    return {
        "total_gwp": result.total_gwp,
        "gwp_unit": "kg CO2e/tonne",
        "circularity_score": result.circularity.material_circularity_indicator,
        "recycled_content": recycled_content,
        "metal_type": metal_type,
    }


# Run with: uvicorn lca_service.service:app --reload --port 8002
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
