"""
Pydantic models for Compliance Engine.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum


class ComplianceStatus(str, Enum):
    """Compliance status levels."""
    COMPLIANT = "compliant"
    WARNING = "warning"
    NON_COMPLIANT = "non_compliant"
    PENDING = "pending"
    NOT_APPLICABLE = "not_applicable"


class RegulationType(str, Enum):
    """Types of regulations."""
    EMISSION_LIMIT = "emission_limit"
    REPORTING = "reporting"
    CERTIFICATION = "certification"
    TAX = "tax"
    EPR = "epr"
    DISCLOSURE = "disclosure"


class Jurisdiction(str, Enum):
    """Regulatory jurisdictions."""
    INDIA = "india"
    EU = "eu"
    US = "us"
    GLOBAL = "global"


class Regulation(BaseModel):
    """Definition of a regulation."""
    id: str
    name: str
    description: str
    regulation_type: RegulationType
    jurisdiction: Jurisdiction
    applicable_sectors: List[str] = []
    thresholds: Dict[str, Any] = {}
    effective_date: Optional[datetime] = None
    reference_url: Optional[str] = None
    

class ComplianceCheckResult(BaseModel):
    """Result of a single compliance check."""
    regulation_id: str
    regulation_name: str
    status: ComplianceStatus
    actual_value: Optional[float] = None
    threshold_value: Optional[float] = None
    unit: Optional[str] = None
    message: str
    recommendations: List[str] = []
    severity: str = "info"  # info, warning, critical


class ComplianceRequest(BaseModel):
    """Request for compliance assessment."""
    # Entity info
    entity_name: Optional[str] = None
    entity_type: str = Field("manufacturer", description="manufacturer, importer, processor")
    metal_type: str
    production_volume_tpa: float = Field(..., description="Annual production in tonnes")
    
    # Environmental metrics
    gwp_per_tonne: float = Field(..., description="GHG emissions in kg CO2e/tonne")
    energy_consumption_gj: Optional[float] = None
    water_consumption_m3: Optional[float] = None
    recycled_content: float = Field(0.0, ge=0, le=1)
    
    # Location/jurisdiction
    production_location: str = "India"
    export_destinations: List[str] = []
    
    # Additional context
    certifications: List[str] = []
    last_audit_date: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "entity_name": "Demo Steel Ltd",
                "entity_type": "manufacturer",
                "metal_type": "iron_steel",
                "production_volume_tpa": 1000000,
                "gwp_per_tonne": 1850,
                "recycled_content": 0.2,
                "production_location": "India",
                "export_destinations": ["EU", "US"]
            }
        }


class ComplianceResponse(BaseModel):
    """Response from compliance assessment."""
    request_id: str
    entity_name: Optional[str] = None
    
    # Overall status
    overall_status: ComplianceStatus
    compliance_score: float = Field(..., ge=0, le=100, description="Overall score 0-100")
    
    # Individual checks
    checks: List[ComplianceCheckResult] = []
    
    # Summary counts
    compliant_count: int = 0
    warning_count: int = 0
    non_compliant_count: int = 0
    
    # Recommendations
    priority_actions: List[str] = []
    
    # CBAM specific
    cbam_applicable: bool = False
    cbam_liability_estimate: Optional[float] = None
    cbam_liability_currency: str = "EUR"
    
    # Timestamps
    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None


class CBAMCalculation(BaseModel):
    """EU CBAM calculation details."""
    product_category: str
    embedded_emissions: float  # tCO2e per tonne
    default_value_used: bool = False
    applicable_cn_codes: List[str] = []
    
    # Pricing
    carbon_price_eur: float  # EUR per tCO2e
    total_liability_eur: float
    
    # Credits
    carbon_price_paid_origin: float = 0.0  # Already paid in origin country
    net_liability_eur: float
    
    # Phase-in (2023-2025 transitional, 2026 full)
    phase_in_percentage: float = 1.0
    adjusted_liability_eur: float


class EPRAssessment(BaseModel):
    """Extended Producer Responsibility assessment."""
    applicable: bool
    epr_registration_required: bool
    registration_status: str = "not_registered"
    
    # Obligations
    collection_target_pct: float = 0.0
    recycling_target_pct: float = 0.0
    current_collection_pct: float = 0.0
    current_recycling_pct: float = 0.0
    
    # Fees
    epr_fee_per_tonne: float = 0.0
    total_epr_liability: float = 0.0
    
    # Compliance
    status: ComplianceStatus = ComplianceStatus.NOT_APPLICABLE
    gap_to_target: float = 0.0


class ThresholdAlert(BaseModel):
    """Alert when threshold is approaching or exceeded."""
    alert_id: str
    alert_type: str  # approaching, exceeded, critical
    regulation_id: str
    regulation_name: str
    
    metric_name: str
    current_value: float
    threshold_value: float
    unit: str
    
    percentage_of_threshold: float
    
    message: str
    recommended_action: str
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    severity: str = "warning"  # info, warning, critical


class ComplianceReport(BaseModel):
    """Full compliance report for export."""
    report_id: str
    entity_name: str
    reporting_period: str
    
    # Summary
    overall_status: ComplianceStatus
    compliance_score: float
    
    # Details
    compliance_response: ComplianceResponse
    cbam_calculation: Optional[CBAMCalculation] = None
    epr_assessment: Optional[EPRAssessment] = None
    
    # Alerts
    active_alerts: List[ThresholdAlert] = []
    
    # Audit trail
    generated_by: str = "CircuMetal Compliance Engine"
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    methodology_version: str = "1.0"
