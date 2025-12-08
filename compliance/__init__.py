"""
Compliance Rule Engine for CircuMetal LCA Platform.

Provides:
- Indian environmental regulations check
- EU CBAM compliance assessment
- EPR (Extended Producer Responsibility) rules
- Threshold alerts and notifications
- Compliance scoring and recommendations
"""

from .engine import ComplianceEngine
from .rules import (
    ComplianceRule,
    IndianRegulations,
    EUCBAMRules,
    EPRRequirements,
)
from .models import (
    ComplianceRequest,
    ComplianceResponse,
    ComplianceStatus,
    Regulation,
)

__all__ = [
    "ComplianceEngine",
    "ComplianceRule",
    "IndianRegulations",
    "EUCBAMRules",
    "EPRRequirements",
    "ComplianceRequest",
    "ComplianceResponse",
    "ComplianceStatus",
    "Regulation",
]
