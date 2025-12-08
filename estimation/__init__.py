"""
ML-based Estimation Microservice for CircuMetal LCA Platform.

This microservice provides:
- Emission factor estimation when data is missing
- Uncertainty quantification with confidence intervals
- Model training pipeline on historical data
- REST API for integration with main application
"""

from .service import app, EstimationService
from .models import (
    EstimationRequest,
    EstimationResponse,
    TrainingRequest,
    ModelInfo,
)
from .estimators import (
    EmissionFactorEstimator,
    CircularityEstimator,
    EnergyIntensityEstimator,
)

__all__ = [
    "app",
    "EstimationService",
    "EstimationRequest",
    "EstimationResponse",
    "TrainingRequest",
    "ModelInfo",
    "EmissionFactorEstimator",
    "CircularityEstimator",
    "EnergyIntensityEstimator",
]
