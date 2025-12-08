"""
Pydantic Models for CircuMetal API

Defines all request/response schemas for the REST API.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================

class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessType(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    HYBRID = "hybrid"


# ============================================================================
# Inventory Models
# ============================================================================

class InventoryInput(BaseModel):
    """Single inventory input item (material, energy, transport)"""
    name: str
    amount: float
    unit: str
    category: str = "material"  # material, energy, transport, waste
    source_type: Optional[str] = None  # primary, secondary, recycled
    emission_factor: Optional[float] = None


class InventoryOutput(BaseModel):
    """Single inventory output item"""
    name: str
    amount: float
    unit: str
    category: str = "product"  # product, co_product, waste, emission


class InventoryData(BaseModel):
    """Complete inventory data for a process"""
    process_name: str
    functional_unit: str = "1 ton"
    material: str
    process_type: ProcessType = ProcessType.PRIMARY
    location: str = "Europe"
    energy_source: str = "Grid Electricity"
    
    inputs: List[InventoryInput] = []
    outputs: List[InventoryOutput] = []
    energy: List[InventoryInput] = []
    transport: List[InventoryInput] = []
    
    # Circularity parameters
    recycled_content_percent: Optional[float] = 0.0
    eol_recycling_rate: Optional[float] = 75.0
    process_efficiency: Optional[float] = 90.0
    
    # Additional metadata
    notes: Optional[str] = None
    data_quality: Optional[str] = "estimated"


class CreateInventoryRequest(BaseModel):
    """Request to create/save inventory"""
    project_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    inventory: InventoryData


class InventoryResponse(BaseModel):
    """Response after creating inventory"""
    id: str
    project_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    inventory: InventoryData
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Scenario Models
# ============================================================================

class ScenarioConfig(BaseModel):
    """Configuration for a scenario variation"""
    name: str
    description: Optional[str] = None
    
    # Parameter modifications
    recycled_content_percent: Optional[float] = None
    eol_recycling_rate: Optional[float] = None
    energy_source: Optional[str] = None
    process_efficiency: Optional[float] = None
    
    # Custom overrides
    parameter_overrides: Dict[str, Any] = {}


# ============================================================================
# Run Models
# ============================================================================

class StartRunRequest(BaseModel):
    """Request to start a new analysis run"""
    inventory_id: str
    project_id: Optional[str] = None
    scenarios: List[ScenarioConfig] = []
    
    # Optional direct inventory (if not using stored inventory)
    inventory: Optional[InventoryData] = None
    
    # Run options
    include_compliance_check: bool = True
    generate_report: bool = True
    generate_visualizations: bool = True


class RunLogEntry(BaseModel):
    """Single log entry during run execution"""
    timestamp: datetime
    agent: str
    level: str  # info, warning, error
    message: str
    data: Optional[Dict[str, Any]] = None


class AgentResult(BaseModel):
    """Result from a single agent"""
    agent_name: str
    status: str
    execution_time_ms: int
    data: Dict[str, Any] = {}
    errors: List[str] = []


class ImpactScores(BaseModel):
    """Environmental impact scores"""
    gwp: float = Field(..., description="Global Warming Potential (kg CO2e)")
    energy_consumption: float = Field(..., description="Total Energy (MJ)")
    water_consumption: Optional[float] = Field(None, description="Water Use (m³)")
    acidification: Optional[float] = Field(None, description="Acidification Potential (kg SO2e)")
    eutrophication: Optional[float] = Field(None, description="Eutrophication (kg PO4e)")
    
    # Per-stage breakdown
    stage_breakdown: Dict[str, Dict[str, float]] = {}


class CircularityMetrics(BaseModel):
    """Circularity assessment metrics"""
    mci: float = Field(..., description="Material Circularity Indicator (0-1)")
    recycled_content: float = Field(..., description="Recycled Content %")
    recyclability: float = Field(..., description="End-of-Life Recyclability %")
    resource_efficiency: float = Field(..., description="Resource Efficiency %")
    waste_reduction: float = Field(..., description="Waste Reduction Score")
    loop_closure: float = Field(..., description="Loop Closure Rate %")
    
    # Detailed metrics
    detailed_metrics: Dict[str, Any] = {}


class ComplianceResult(BaseModel):
    """Compliance check result"""
    compliant: bool
    regulations_checked: List[str]
    flags: List[Dict[str, Any]] = []
    recommendations: List[str] = []


class ScenarioResult(BaseModel):
    """Result for a single scenario"""
    scenario_name: str
    impact_scores: ImpactScores
    circularity_metrics: CircularityMetrics
    comparison_to_baseline: Optional[Dict[str, float]] = None


class VisualizationData(BaseModel):
    """Data for visualizations"""
    sankey_data: Optional[Dict[str, Any]] = None
    bar_chart_data: Optional[List[Dict[str, Any]]] = None
    comparison_chart_data: Optional[List[Dict[str, Any]]] = None
    sankey_base64: Optional[str] = None
    pathway_base64: Optional[str] = None


class RunResult(BaseModel):
    """Complete result of an analysis run"""
    run_id: str
    status: RunStatus
    
    # Core results
    impact_scores: Optional[ImpactScores] = None
    circularity_metrics: Optional[CircularityMetrics] = None
    
    # Scenario comparisons
    scenarios: List[ScenarioResult] = []
    
    # Compliance
    compliance: Optional[ComplianceResult] = None
    
    # Visualizations
    visualizations: Optional[VisualizationData] = None
    
    # Report
    report_markdown: Optional[str] = None
    explanation: Optional[str] = None
    
    # Agent outputs
    agent_results: Dict[str, AgentResult] = {}
    
    # Execution metadata
    execution_time_ms: int = 0
    completed_at: Optional[datetime] = None


class RunResponse(BaseModel):
    """Response when starting a new run"""
    success: bool
    message: str
    run_id: str
    status: str
    estimated_time: Optional[int] = None  # Estimated seconds


class RunStatusResponse(BaseModel):
    """Response for run status check"""
    run_id: str
    status: RunStatus
    progress: int = 0
    current_agent: Optional[str] = None
    logs: List[RunLogEntry] = []
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class RunResultResponse(BaseModel):
    """Full result response"""
    run_id: str
    status: RunStatus
    result: Optional[RunResult] = None
    error: Optional[str] = None


# ============================================================================
# Project Models
# ============================================================================

class CreateProjectRequest(BaseModel):
    """Request to create a new project"""
    name: str
    description: Optional[str] = None
    material: str
    process_type: ProcessType = ProcessType.PRIMARY
    location: str = "Europe"


class ProjectResponse(BaseModel):
    """Project response"""
    id: str
    name: str
    description: Optional[str] = None
    material: str
    process_type: ProcessType
    location: str
    inventories: List[str] = []
    runs: List[str] = []
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Reference Data Models
# ============================================================================

class EmissionFactorData(BaseModel):
    """Emission factor reference data"""
    material: str
    source_type: str
    emission_factor: float
    unit: str
    data_source: str
    region: Optional[str] = None


class MaterialProperty(BaseModel):
    """Material property data"""
    material: str
    density: Optional[float] = None
    melting_point: Optional[float] = None
    recyclability_score: Optional[float] = None
    typical_applications: List[str] = []


# ============================================================================
# Visualization Models
# ============================================================================

class VisualizationType(str, Enum):
    FLOWCHART = "flowchart"
    SANKEY = "sankey"


class Visualization(BaseModel):
    """Visualization diagram data"""
    id: Optional[str] = None
    project_id: str
    project_name: str
    metal_name: str
    ore_type: Optional[str] = None
    diagram_type: VisualizationType
    html_content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}


class CreateVisualizationRequest(BaseModel):
    """Request to save a visualization"""
    project_id: str
    project_name: str
    metal_name: str
    ore_type: Optional[str] = None
    diagram_type: VisualizationType
    html_content: str
    metadata: Optional[Dict[str, Any]] = {}

