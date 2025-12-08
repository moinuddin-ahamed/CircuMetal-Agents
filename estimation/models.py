"""
Pydantic models for the Estimation Microservice.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum


class MetalType(str, Enum):
    """Supported metal types."""
    IRON_STEEL = "iron_steel"
    ALUMINIUM = "aluminium"
    COPPER = "copper"
    ZINC = "zinc"
    OTHER = "other"


class ProcessStage(str, Enum):
    """Process stages in metal lifecycle."""
    EXTRACTION = "extraction"
    REFINING = "refining"
    SMELTING = "smelting"
    CASTING = "casting"
    ROLLING = "rolling"
    RECYCLING = "recycling"
    TRANSPORT = "transport"


class EstimationType(str, Enum):
    """Types of estimation."""
    EMISSION_FACTOR = "emission_factor"
    CIRCULARITY_SCORE = "circularity_score"
    ENERGY_INTENSITY = "energy_intensity"
    WATER_FOOTPRINT = "water_footprint"


class EstimationRequest(BaseModel):
    """Request for ML-based estimation."""
    estimation_type: EstimationType = Field(
        ..., 
        description="Type of value to estimate"
    )
    metal_type: MetalType = Field(
        ..., 
        description="Type of metal being processed"
    )
    process_stage: ProcessStage = Field(
        ..., 
        description="Stage in the production process"
    )
    
    # Process parameters
    production_volume: Optional[float] = Field(
        None, 
        description="Annual production in tonnes"
    )
    recycled_content: Optional[float] = Field(
        None, 
        ge=0, le=1,
        description="Fraction of recycled input (0-1)"
    )
    energy_source: Optional[Dict[str, float]] = Field(
        None, 
        description="Energy mix (e.g., {'coal': 0.7, 'renewable': 0.3})"
    )
    location: Optional[str] = Field(
        None, 
        description="Geographic location (ISO code or state name)"
    )
    ore_grade: Optional[float] = Field(
        None, 
        description="Ore grade (0-1)"
    )
    technology_level: Optional[str] = Field(
        None, 
        description="Technology: 'conventional', 'best_available', 'advanced'"
    )
    
    # Additional context
    context: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional context for estimation"
    )
    
    # Request metadata
    request_id: Optional[str] = Field(
        None, 
        description="Unique request identifier"
    )
    include_uncertainty: bool = Field(
        True, 
        description="Include confidence intervals"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "estimation_type": "emission_factor",
                "metal_type": "iron_steel",
                "process_stage": "smelting",
                "production_volume": 1000000,
                "recycled_content": 0.2,
                "energy_source": {"coal": 0.7, "natural_gas": 0.2, "renewable": 0.1},
                "location": "IN-Odisha",
                "include_uncertainty": True
            }
        }


class ConfidenceInterval(BaseModel):
    """Confidence interval for estimation."""
    lower: float = Field(..., description="Lower bound")
    upper: float = Field(..., description="Upper bound")
    confidence_level: float = Field(0.95, description="Confidence level (e.g., 0.95)")


class EstimationResult(BaseModel):
    """Single estimation result."""
    value: float = Field(..., description="Estimated value")
    unit: str = Field(..., description="Unit of measurement")
    confidence: float = Field(
        ..., 
        ge=0, le=1,
        description="Confidence score (0-1)"
    )
    confidence_interval: Optional[ConfidenceInterval] = Field(
        None, 
        description="Statistical confidence interval"
    )
    method: str = Field(..., description="Estimation method used")
    data_quality: str = Field(
        "estimated", 
        description="Data quality: 'measured', 'calculated', 'estimated'"
    )


class EstimationResponse(BaseModel):
    """Response from estimation service."""
    request_id: str = Field(..., description="Request identifier")
    estimation_type: EstimationType = Field(..., description="Type of estimation")
    result: EstimationResult = Field(..., description="Estimation result")
    
    # Provenance
    model_version: str = Field(..., description="Model version used")
    features_used: List[str] = Field(
        default_factory=list,
        description="Features used in estimation"
    )
    similar_processes: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Similar processes from database for reference"
    )
    
    # Metadata
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Estimation timestamp"
    )
    processing_time_ms: Optional[float] = Field(
        None, 
        description="Processing time in milliseconds"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "request_id": "est_12345",
                "estimation_type": "emission_factor",
                "result": {
                    "value": 1850.5,
                    "unit": "kgCO2e/tonne",
                    "confidence": 0.85,
                    "confidence_interval": {
                        "lower": 1650.0,
                        "upper": 2050.0,
                        "confidence_level": 0.95
                    },
                    "method": "random_forest",
                    "data_quality": "estimated"
                },
                "model_version": "1.0.0",
                "features_used": ["metal_type", "process_stage", "recycled_content", "energy_source"],
                "timestamp": "2025-01-20T12:00:00Z",
                "processing_time_ms": 45.2
            }
        }


class TrainingRequest(BaseModel):
    """Request to train or update ML models."""
    model_type: str = Field(
        "random_forest",
        description="Model type: 'random_forest', 'gradient_boosting', 'ensemble'"
    )
    estimation_type: EstimationType = Field(
        ..., 
        description="Type of estimation model to train"
    )
    training_data_source: str = Field(
        "database",
        description="Source: 'database', 'file', 'api'"
    )
    hyperparameters: Optional[Dict[str, Any]] = Field(
        None, 
        description="Model hyperparameters"
    )
    validation_split: float = Field(
        0.2, 
        ge=0.1, le=0.4,
        description="Validation set fraction"
    )


class TrainingResult(BaseModel):
    """Result of model training."""
    model_id: str
    model_type: str
    estimation_type: EstimationType
    metrics: Dict[str, float] = Field(
        ..., 
        description="Training metrics (rmse, mae, r2)"
    )
    feature_importance: Dict[str, float] = Field(
        default_factory=dict,
        description="Feature importance scores"
    )
    training_samples: int
    validation_samples: int
    trained_at: datetime = Field(default_factory=datetime.utcnow)


class ModelInfo(BaseModel):
    """Information about a trained model."""
    model_id: str
    model_type: str
    estimation_type: EstimationType
    version: str
    trained_at: datetime
    metrics: Dict[str, float]
    status: str = Field("active", description="Model status: 'active', 'deprecated', 'training'")
    

class BatchEstimationRequest(BaseModel):
    """Batch estimation request."""
    requests: List[EstimationRequest] = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="List of estimation requests"
    )


class BatchEstimationResponse(BaseModel):
    """Batch estimation response."""
    results: List[EstimationResponse]
    total_requests: int
    successful: int
    failed: int
    total_processing_time_ms: float


class HealthStatus(BaseModel):
    """Service health status."""
    status: str = "healthy"
    version: str
    models_loaded: Dict[str, bool]
    uptime_seconds: float
    last_training: Optional[datetime] = None
