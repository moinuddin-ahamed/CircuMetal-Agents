"""
Pydantic models for LCA Service.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum


class ImpactCategory(str, Enum):
    """LCA impact categories."""
    GWP = "gwp"                     # Global Warming Potential
    WATER = "water"                 # Water footprint
    ENERGY = "energy"               # Energy consumption
    ACIDIFICATION = "acidification" # Acidification potential
    EUTROPHICATION = "eutrophication"
    RESOURCE_DEPLETION = "resource_depletion"


class ProcessStage(str, Enum):
    """Process stages in metal lifecycle."""
    EXTRACTION = "extraction"
    REFINING = "refining"
    SMELTING = "smelting"
    CASTING = "casting"
    ROLLING = "rolling"
    FABRICATION = "fabrication"
    USE = "use"
    END_OF_LIFE = "end_of_life"
    RECYCLING = "recycling"
    TRANSPORT = "transport"


class FlowType(str, Enum):
    """Types of flows in LCA."""
    INPUT = "input"
    OUTPUT = "output"
    EMISSION = "emission"
    WASTE = "waste"
    BYPRODUCT = "byproduct"


class ProcessInput(BaseModel):
    """Input to a process."""
    name: str
    amount: float
    unit: str
    category: str = "materials"
    emission_factor: Optional[float] = None
    emission_factor_unit: Optional[str] = None


class ProcessOutput(BaseModel):
    """Output from a process."""
    name: str
    amount: float
    unit: str
    category: str = "product"
    is_reference: bool = False


class ProcessDefinition(BaseModel):
    """Definition of a single process in the lifecycle."""
    name: str
    stage: ProcessStage
    inputs: List[ProcessInput] = []
    outputs: List[ProcessOutput] = []
    location: str = "IN"
    emission_factors: Dict[str, float] = {}
    metadata: Dict[str, Any] = {}


class LCARequest(BaseModel):
    """Request for LCA calculation."""
    project_id: Optional[str] = None
    scenario_id: Optional[str] = None
    name: str = Field(..., description="Name of the LCA study")
    functional_unit: str = Field(
        "1 tonne of product",
        description="Functional unit for comparison"
    )
    metal_type: str = Field(..., description="Type of metal (iron_steel, aluminium)")
    
    # Process chain
    processes: List[ProcessDefinition] = Field(
        default_factory=list,
        description="List of processes in the lifecycle"
    )
    
    # Scenario parameters
    production_volume: float = Field(
        1000000,
        description="Annual production volume in tonnes"
    )
    recycled_content: float = Field(
        0.0,
        ge=0, le=1,
        description="Fraction of recycled input"
    )
    energy_source: Dict[str, float] = Field(
        default_factory=lambda: {"grid": 1.0},
        description="Energy source mix"
    )
    
    # Impact categories to calculate
    impact_categories: List[ImpactCategory] = Field(
        default_factory=lambda: [ImpactCategory.GWP, ImpactCategory.ENERGY, ImpactCategory.WATER],
        description="Impact categories to assess"
    )
    
    # Options
    include_transport: bool = True
    include_end_of_life: bool = True
    allocation_method: str = "mass"  # mass, economic, cutoff
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Steel Production LCA",
                "functional_unit": "1 tonne of crude steel",
                "metal_type": "iron_steel",
                "production_volume": 1000000,
                "recycled_content": 0.2,
                "energy_source": {"coal": 0.7, "grid": 0.2, "renewable": 0.1},
                "impact_categories": ["gwp", "energy", "water"]
            }
        }


class ImpactResult(BaseModel):
    """Result for a single impact category."""
    category: ImpactCategory
    value: float
    unit: str
    breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Breakdown by process stage"
    )
    confidence: float = Field(0.8, ge=0, le=1)
    data_quality: str = "medium"


class CircularityMetrics(BaseModel):
    """Circularity metrics for the product system."""
    material_circularity_indicator: float = Field(
        ..., ge=0, le=1,
        description="MCI score (0-1)"
    )
    recycled_input_rate: float = Field(
        ..., ge=0, le=1,
        description="Fraction of recycled input"
    )
    recyclability: float = Field(
        ..., ge=0, le=1,
        description="End-of-life recyclability"
    )
    waste_recovery_rate: float = Field(
        ..., ge=0, le=1,
        description="Waste recovered/recycled"
    )
    byproduct_utilization: float = Field(
        ..., ge=0, le=1,
        description="Byproducts utilized"
    )


class LCAResponse(BaseModel):
    """Response from LCA calculation."""
    request_id: str
    name: str
    functional_unit: str
    metal_type: str
    
    # Impact results
    impacts: List[ImpactResult] = []
    total_gwp: float = Field(..., description="Total GWP in kg CO2e per functional unit")
    
    # Circularity
    circularity: CircularityMetrics
    
    # Process breakdown
    process_contributions: Dict[str, Dict[str, float]] = Field(
        default_factory=dict,
        description="Impact contribution by process"
    )
    
    # Metadata
    calculation_method: str = "process_lca"
    data_sources: List[str] = []
    assumptions: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: float = 0


class ScenarioDefinition(BaseModel):
    """Definition of a scenario for comparison."""
    scenario_id: str
    name: str
    description: str = ""
    scenario_type: str = Field(..., description="baseline or circular")
    parameters: Dict[str, Any] = {}
    lca_request: Optional[LCARequest] = None


class ScenarioComparisonRequest(BaseModel):
    """Request to compare multiple scenarios."""
    project_id: Optional[str] = None
    baseline: ScenarioDefinition
    alternatives: List[ScenarioDefinition] = []
    comparison_metrics: List[str] = Field(
        default_factory=lambda: ["gwp", "circularity", "energy"],
        description="Metrics to compare"
    )


class ScenarioComparisonResult(BaseModel):
    """Result for a single scenario in comparison."""
    scenario_id: str
    name: str
    scenario_type: str
    impacts: Dict[str, float]
    circularity_score: float
    relative_to_baseline: Dict[str, float] = Field(
        default_factory=dict,
        description="Percentage change vs baseline"
    )


class ScenarioComparison(BaseModel):
    """Comparison of multiple scenarios."""
    project_id: Optional[str] = None
    baseline: ScenarioComparisonResult
    alternatives: List[ScenarioComparisonResult] = []
    
    # Summary metrics
    best_scenario: str
    max_gwp_reduction: float
    max_circularity_improvement: float
    
    # Recommendations
    recommendations: List[str] = []
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ReportRequest(BaseModel):
    """Request for PDF report generation."""
    lca_response: Optional[LCAResponse] = None
    scenario_comparison: Optional[ScenarioComparison] = None
    project_id: Optional[str] = None
    
    # Report options
    include_methodology: bool = True
    include_assumptions: bool = True
    include_charts: bool = True
    include_recommendations: bool = True
    
    # Branding
    organization_name: str = "CircuMetal"
    report_title: str = "Life Cycle Assessment Report"
    
    # Output
    output_format: str = "pdf"  # pdf, html


class ReportResponse(BaseModel):
    """Response with generated report."""
    report_id: str
    filename: str
    content_type: str
    size_bytes: int
    download_url: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)
