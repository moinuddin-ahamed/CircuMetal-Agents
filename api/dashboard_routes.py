"""
Enhanced API Routes for CircuMetal Dashboard.

Provides endpoints for:
- Dashboard data aggregation
- Scenario comparison
- Real-time updates via WebSocket
- Report generation
- India-specific features
"""

import os
import json
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, Field

# Dashboard Router
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ============================================================================
# Request/Response Models
# ============================================================================

class DashboardRequest(BaseModel):
    """Request for dashboard data."""
    project_id: Optional[str] = None
    scenario_id: Optional[str] = None
    time_range_days: int = 30


class SummaryCard(BaseModel):
    """Summary card data."""
    id: str
    title: str
    value: str
    unit: Optional[str] = None
    change: Optional[float] = None
    change_label: Optional[str] = None
    icon: str = "info"
    color: str = "#1976D2"


class ChartData(BaseModel):
    """Chart specification."""
    id: str
    type: str
    title: str
    config: Dict[str, Any]


class Alert(BaseModel):
    """Dashboard alert."""
    id: str
    type: str  # info, warning, error, success
    title: str
    message: str
    action: Optional[str] = None
    timestamp: str


class DashboardResponse(BaseModel):
    """Complete dashboard data."""
    summary_cards: List[SummaryCard]
    charts: List[ChartData]
    alerts: List[Alert]
    recent_runs: List[Dict[str, Any]]
    compliance_status: Dict[str, Any]
    circularity_overview: Dict[str, Any]


class ScenarioComparisonRequest(BaseModel):
    """Request for scenario comparison."""
    scenario_ids: List[str]
    metrics: List[str] = ["gwp", "energy", "water", "circularity"]


class IndiaMapRequest(BaseModel):
    """Request for India map data."""
    metric: str = "emission_intensity"  # emission_intensity, production, circularity
    year: int = 2024


class ReportRequest(BaseModel):
    """Request for report generation."""
    project_id: str
    scenario_id: Optional[str] = None
    format: str = "html"  # html, pdf, json
    sections: List[str] = ["executive_summary", "methodology", "results", "recommendations"]


# ============================================================================
# Dashboard Endpoints
# ============================================================================

@dashboard_router.get("/summary", response_model=DashboardResponse)
async def get_dashboard_summary(
    project_id: Optional[str] = Query(None),
    scenario_id: Optional[str] = Query(None)
):
    """Get comprehensive dashboard summary data."""
    # Generate sample dashboard data (in production, this would fetch from DB)
    
    summary_cards = [
        SummaryCard(
            id="total_gwp",
            title="Total Carbon Footprint",
            value="156,234",
            unit="t CO2e/year",
            change=-12.5,
            change_label="vs last year",
            icon="cloud",
            color="#2E7D32"
        ),
        SummaryCard(
            id="production",
            title="Production Volume",
            value="85,000",
            unit="tonnes",
            change=5.2,
            change_label="vs last year",
            icon="factory",
            color="#1976D2"
        ),
        SummaryCard(
            id="circularity",
            title="Circularity Score",
            value="68%",
            unit="MCI",
            change=8.0,
            change_label="improvement",
            icon="autorenew",
            color="#00897B"
        ),
        SummaryCard(
            id="compliance",
            title="Compliance Status",
            value="PASS",
            unit="",
            icon="verified",
            color="#388E3C"
        )
    ]
    
    # Generate chart configurations
    charts = [
        {
            "id": "gwp_trend",
            "type": "line",
            "title": "GWP Trend (Monthly)",
            "config": {
                "type": "line",
                "data": {
                    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    "datasets": [{
                        "label": "kg CO2e/t",
                        "data": [1850, 1820, 1780, 1750, 1720, 1690],
                        "borderColor": "#1976D2",
                        "fill": False
                    }]
                }
            }
        },
        {
            "id": "breakdown",
            "type": "pie",
            "title": "Impact Breakdown",
            "config": {
                "type": "pie",
                "data": {
                    "labels": ["Smelting", "Mining", "Transport", "Refining", "Other"],
                    "datasets": [{
                        "data": [45, 25, 12, 10, 8],
                        "backgroundColor": ["#2E7D32", "#66BB6A", "#A5D6A7", "#C8E6C9", "#E8F5E9"]
                    }]
                }
            }
        },
        {
            "id": "circularity_gauge",
            "type": "gauge",
            "title": "Circularity Score",
            "config": {
                "value": 68,
                "max": 100,
                "thresholds": [
                    {"value": 40, "color": "#D32F2F"},
                    {"value": 70, "color": "#FBC02D"},
                    {"value": 100, "color": "#388E3C"}
                ]
            }
        }
    ]
    
    alerts = [
        Alert(
            id="cbam_deadline",
            type="warning",
            title="CBAM Reporting Deadline",
            message="Q4 2024 CBAM report due in 15 days",
            action="Prepare report",
            timestamp=datetime.now().isoformat()
        ),
        Alert(
            id="target_achieved",
            type="success",
            title="Target Achieved",
            message="Circularity target of 65% exceeded!",
            timestamp=datetime.now().isoformat()
        )
    ]
    
    recent_runs = [
        {
            "id": str(uuid.uuid4()),
            "name": "Steel Production LCA",
            "status": "completed",
            "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
            "gwp_result": 1720
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Recycling Scenario",
            "status": "completed",
            "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
            "gwp_result": 1450
        }
    ]
    
    compliance_status = {
        "overall": "pass",
        "checks": [
            {"regulation": "EU CBAM", "status": "pass", "next_action": "Q4 report"},
            {"regulation": "Indian EPA", "status": "pass", "next_action": None},
            {"regulation": "PAT Scheme", "status": "warning", "next_action": "Energy audit"}
        ]
    }
    
    circularity_overview = {
        "mci": 0.68,
        "recycled_content": 0.45,
        "recyclability": 0.92,
        "waste_recovery": 0.78,
        "trend": "improving"
    }
    
    return DashboardResponse(
        summary_cards=summary_cards,
        charts=charts,
        alerts=alerts,
        recent_runs=recent_runs,
        compliance_status=compliance_status,
        circularity_overview=circularity_overview
    )


@dashboard_router.post("/compare-scenarios")
async def compare_scenarios(request: ScenarioComparisonRequest):
    """Compare multiple LCA scenarios."""
    if len(request.scenario_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 scenarios required")
    
    # Generate comparison data (in production, fetch from DB/calculate)
    scenarios = []
    for idx, sid in enumerate(request.scenario_ids):
        base_gwp = 1800 - (idx * 200)
        scenarios.append({
            "id": sid,
            "name": f"Scenario {idx + 1}",
            "metrics": {
                "gwp": base_gwp,
                "energy": 18 - (idx * 2),
                "water": 5 - (idx * 0.5),
                "circularity": 0.4 + (idx * 0.15)
            }
        })
    
    # Calculate comparison
    best_scenario = min(scenarios, key=lambda s: s["metrics"]["gwp"])
    worst_scenario = max(scenarios, key=lambda s: s["metrics"]["gwp"])
    
    improvement = 0
    if worst_scenario["metrics"]["gwp"] > 0:
        improvement = (worst_scenario["metrics"]["gwp"] - best_scenario["metrics"]["gwp"]) / worst_scenario["metrics"]["gwp"] * 100
    
    # Generate comparison chart
    chart = {
        "id": "scenario_comparison",
        "type": "bar",
        "title": "Scenario Comparison",
        "config": {
            "type": "bar",
            "data": {
                "labels": [s["name"] for s in scenarios],
                "datasets": []
            }
        }
    }
    
    # Add datasets for each metric
    colors = ["#1976D2", "#2E7D32", "#00897B", "#FF7043"]
    for idx, metric in enumerate(request.metrics):
        chart["config"]["data"]["datasets"].append({
            "label": metric.upper(),
            "data": [s["metrics"].get(metric, 0) for s in scenarios],
            "backgroundColor": colors[idx % len(colors)]
        })
    
    return {
        "scenarios": scenarios,
        "comparison": {
            "best_scenario": best_scenario["id"],
            "improvement_potential_percent": round(improvement, 1),
            "ranking": [s["id"] for s in sorted(scenarios, key=lambda x: x["metrics"]["gwp"])]
        },
        "chart": chart
    }


@dashboard_router.get("/india-map")
async def get_india_map_data(
    metric: str = Query("emission_intensity"),
    year: int = Query(2024)
):
    """Get India state-wise data for choropleth map."""
    # India state data for metals production
    states_data = {
        "Odisha": {
            "emission_intensity": 2.1,
            "production": 45000,
            "circularity": 0.42,
            "major_metals": ["steel", "aluminium"],
            "lat": 20.9517,
            "lng": 85.0985
        },
        "Jharkhand": {
            "emission_intensity": 2.3,
            "production": 38000,
            "circularity": 0.38,
            "major_metals": ["steel", "copper"],
            "lat": 23.6102,
            "lng": 85.2799
        },
        "Chhattisgarh": {
            "emission_intensity": 2.0,
            "production": 32000,
            "circularity": 0.45,
            "major_metals": ["steel", "aluminium"],
            "lat": 21.2787,
            "lng": 81.8661
        },
        "Karnataka": {
            "emission_intensity": 1.6,
            "production": 28000,
            "circularity": 0.55,
            "major_metals": ["steel"],
            "lat": 15.3173,
            "lng": 75.7139
        },
        "Gujarat": {
            "emission_intensity": 1.7,
            "production": 22000,
            "circularity": 0.52,
            "major_metals": ["steel", "copper"],
            "lat": 22.2587,
            "lng": 71.1924
        },
        "Maharashtra": {
            "emission_intensity": 1.5,
            "production": 25000,
            "circularity": 0.58,
            "major_metals": ["steel"],
            "lat": 19.7515,
            "lng": 75.7139
        },
        "Tamil Nadu": {
            "emission_intensity": 1.4,
            "production": 18000,
            "circularity": 0.62,
            "major_metals": ["steel", "aluminium"],
            "lat": 11.1271,
            "lng": 78.6569
        },
        "West Bengal": {
            "emission_intensity": 1.9,
            "production": 20000,
            "circularity": 0.48,
            "major_metals": ["steel"],
            "lat": 22.9868,
            "lng": 87.8550
        }
    }
    
    # Calculate min/max for color scale
    values = [s[metric] for s in states_data.values()]
    min_val = min(values)
    max_val = max(values)
    
    # Add normalized values and colors
    for state, data in states_data.items():
        normalized = (data[metric] - min_val) / (max_val - min_val) if max_val > min_val else 0.5
        data["normalized"] = normalized
        
        # Color based on metric (lower emission = green, higher circularity = green)
        if metric == "emission_intensity":
            # Invert for emissions (lower is better)
            data["color"] = _get_color(1 - normalized)
        else:
            data["color"] = _get_color(normalized)
    
    return {
        "metric": metric,
        "year": year,
        "states": states_data,
        "scale": {
            "min": min_val,
            "max": max_val,
            "unit": _get_metric_unit(metric)
        },
        "national_average": sum(values) / len(values)
    }


@dashboard_router.post("/generate-report")
async def generate_report(request: ReportRequest):
    """Generate PDF/HTML report."""
    # In production, this would generate actual reports
    
    report_id = str(uuid.uuid4())
    
    # Generate HTML report content
    html_content = _generate_html_report(
        project_id=request.project_id,
        scenario_id=request.scenario_id,
        sections=request.sections
    )
    
    if request.format == "html":
        return HTMLResponse(content=html_content)
    elif request.format == "json":
        return {
            "report_id": report_id,
            "format": request.format,
            "sections": request.sections,
            "generated_at": datetime.now().isoformat()
        }
    else:
        # For PDF, return download info
        return {
            "report_id": report_id,
            "format": "pdf",
            "download_url": f"/api/dashboard/reports/{report_id}/download",
            "generated_at": datetime.now().isoformat()
        }


# ============================================================================
# WebSocket for Real-time Updates
# ============================================================================

class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, channel: str = "default"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
    
    def disconnect(self, websocket: WebSocket, channel: str = "default"):
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
    
    async def broadcast(self, message: dict, channel: str = "default"):
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except:
                    pass


manager = ConnectionManager()


@dashboard_router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
            
            elif data.get("type") == "subscribe":
                # Subscribe to specific updates
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": channel,
                    "topics": data.get("topics", [])
                })
            
            elif data.get("type") == "run_update":
                # Broadcast run status updates to all connections in channel
                await manager.broadcast({
                    "type": "run_status",
                    "data": data.get("data", {})
                }, channel)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


# ============================================================================
# Helper Functions
# ============================================================================

def _get_color(normalized: float) -> str:
    """Get color for value (0 = red, 1 = green)."""
    if normalized >= 0.7:
        return "#388E3C"  # Green
    elif normalized >= 0.4:
        return "#FBC02D"  # Yellow
    else:
        return "#D32F2F"  # Red


def _get_metric_unit(metric: str) -> str:
    """Get unit for metric."""
    units = {
        "emission_intensity": "t CO2e/t product",
        "production": "tonnes/year",
        "circularity": "MCI score"
    }
    return units.get(metric, "")


def _generate_html_report(
    project_id: str,
    scenario_id: Optional[str],
    sections: List[str]
) -> str:
    """Generate HTML report content."""
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CircuMetal LCA Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }}
        .header {{ text-align: center; border-bottom: 2px solid #1976D2; padding-bottom: 20px; margin-bottom: 30px; }}
        .header h1 {{ color: #1976D2; margin-bottom: 5px; }}
        .header .subtitle {{ color: #666; }}
        .section {{ margin-bottom: 30px; page-break-inside: avoid; }}
        .section h2 {{ color: #2E7D32; border-left: 4px solid #2E7D32; padding-left: 10px; }}
        .metric-card {{ display: inline-block; background: #f5f5f5; padding: 15px 25px; margin: 10px; border-radius: 8px; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #1976D2; }}
        .metric-label {{ font-size: 12px; color: #666; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background: #1976D2; color: white; }}
        tr:nth-child(even) {{ background: #f9f9f9; }}
        .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }}
        .status-pass {{ color: #388E3C; font-weight: bold; }}
        .status-warn {{ color: #FBC02D; font-weight: bold; }}
        .status-fail {{ color: #D32F2F; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔄 CircuMetal LCA Report</h1>
        <p class="subtitle">Life Cycle Assessment & Circularity Analysis</p>
        <p>Project ID: {project_id} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
    </div>
"""

    if "executive_summary" in sections:
        html += """
    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metric-card">
            <div class="metric-value">1,720</div>
            <div class="metric-label">kg CO2e/tonne</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">68%</div>
            <div class="metric-label">Circularity Score</div>
        </div>
        <div class="metric-card">
            <div class="metric-value status-pass">PASS</div>
            <div class="metric-label">Compliance Status</div>
        </div>
        <p>This Life Cycle Assessment evaluates the environmental impacts of steel production 
        following ISO 14040/14044 methodology. Key findings indicate significant opportunities 
        for emission reduction through increased recycled content and renewable energy adoption.</p>
    </div>
"""

    if "results" in sections:
        html += """
    <div class="section">
        <h2>Impact Assessment Results</h2>
        <table>
            <tr>
                <th>Impact Category</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Benchmark</th>
            </tr>
            <tr>
                <td>Global Warming Potential (GWP)</td>
                <td>1,720</td>
                <td>kg CO2e/t</td>
                <td>1,800</td>
            </tr>
            <tr>
                <td>Energy Consumption</td>
                <td>18.5</td>
                <td>GJ/t</td>
                <td>20.0</td>
            </tr>
            <tr>
                <td>Water Consumption</td>
                <td>4.2</td>
                <td>m³/t</td>
                <td>5.0</td>
            </tr>
            <tr>
                <td>Material Circularity Indicator</td>
                <td>0.68</td>
                <td>MCI</td>
                <td>0.50</td>
            </tr>
        </table>
    </div>
"""

    if "recommendations" in sections:
        html += """
    <div class="section">
        <h2>Recommendations</h2>
        <ol>
            <li><strong>Increase recycled content to 60%</strong> - Potential 25% GWP reduction</li>
            <li><strong>Transition to renewable energy</strong> - Target 40% renewable by 2025</li>
            <li><strong>Implement waste heat recovery</strong> - 8% energy efficiency improvement</li>
            <li><strong>Optimize transport logistics</strong> - Reduce transport emissions by 15%</li>
        </ol>
    </div>
"""

    html += f"""
    <div class="footer">
        <p>Generated by CircuMetal LCA Platform | ISO 14040/14044 Compliant</p>
        <p>© {datetime.now().year} CircuMetal | Circular Economy for Metals</p>
    </div>
</body>
</html>
"""
    return html
