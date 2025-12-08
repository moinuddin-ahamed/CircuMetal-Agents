"""
LCA Service Microservice for CircuMetal Platform.

Provides:
- Life Cycle Assessment calculations
- Scenario comparison (baseline vs circular)
- Impact assessment (GWP, water, energy)
- PDF report generation
"""

from .engine import LCAEngine
from .service import app
from .models import (
    LCARequest,
    LCAResponse,
    ScenarioComparison,
    ImpactCategory,
)

__all__ = [
    "LCAEngine",
    "app",
    "LCARequest",
    "LCAResponse",
    "ScenarioComparison",
    "ImpactCategory",
]
