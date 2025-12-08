"""
Compliance Engine for comprehensive regulatory assessment.
"""

import uuid
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from .models import (
    ComplianceRequest,
    ComplianceResponse,
    ComplianceStatus,
    ComplianceCheckResult,
    CBAMCalculation,
    EPRAssessment,
    ThresholdAlert,
    ComplianceReport,
)
from .rules import (
    IndianRegulations,
    EUCBAMRules,
    EPRRequirements,
)

logger = logging.getLogger(__name__)


class ComplianceEngine:
    """
    Main compliance assessment engine.
    
    Performs comprehensive regulatory compliance checks including:
    - Indian environmental regulations
    - EU CBAM requirements
    - EPR obligations
    - Threshold alerts
    """
    
    def __init__(self):
        """Initialize compliance engine."""
        self.assessment_count = 0
        logger.info("Compliance Engine initialized")
    
    def assess(self, request: ComplianceRequest) -> ComplianceResponse:
        """
        Perform comprehensive compliance assessment.
        
        Args:
            request: Compliance assessment request
            
        Returns:
            ComplianceResponse with all check results
        """
        self.assessment_count += 1
        request_id = f"comp_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"Starting compliance assessment: {request.entity_name or request_id}")
        
        checks: List[ComplianceCheckResult] = []
        alerts: List[ThresholdAlert] = []
        
        # 1. Indian emission regulations
        if request.production_location.lower() in ["india", "in"]:
            emission_check = IndianRegulations.check_emission_compliance(
                metal_type=request.metal_type,
                gwp_per_tonne=request.gwp_per_tonne,
            )
            checks.append(emission_check)
            
            # Check for alerts
            if emission_check.status == ComplianceStatus.WARNING:
                alerts.append(self._create_alert(
                    emission_check,
                    "approaching",
                    request.gwp_per_tonne
                ))
            elif emission_check.status == ComplianceStatus.NON_COMPLIANT:
                alerts.append(self._create_alert(
                    emission_check,
                    "exceeded",
                    request.gwp_per_tonne
                ))
            
            # Environmental clearance check
            if request.production_volume_tpa > 100000:
                ec_check = self._check_environmental_clearance(request)
                checks.append(ec_check)
        
        # 2. EU CBAM checks
        cbam_applicable = "EU" in [d.upper() for d in request.export_destinations]
        cbam_liability = None
        
        if cbam_applicable:
            cbam_check = EUCBAMRules.check_cbam_compliance(
                exports_to_eu=True,
                has_verified_emissions="ISO14064" in request.certifications,
                has_quarterly_reports=True,  # Assume yes for demo
                year=datetime.now().year
            )
            checks.append(cbam_check)
            
            # Calculate CBAM liability
            cbam_calc = EUCBAMRules.calculate_cbam_liability(
                metal_type=request.metal_type,
                volume_tonnes=request.production_volume_tpa * 0.1,  # Assume 10% to EU
                embedded_emissions_per_tonne=request.gwp_per_tonne,
                carbon_price_paid_origin=0,  # India has no carbon price
                year=datetime.now().year
            )
            cbam_liability = cbam_calc["final_liability_eur"]
        
        # 3. EPR assessment
        epr_check = self._check_epr_compliance(request)
        checks.append(epr_check)
        
        # 4. Certification checks
        cert_check = self._check_certifications(request)
        checks.append(cert_check)
        
        # Calculate summary statistics
        compliant_count = sum(1 for c in checks if c.status == ComplianceStatus.COMPLIANT)
        warning_count = sum(1 for c in checks if c.status == ComplianceStatus.WARNING)
        non_compliant_count = sum(1 for c in checks if c.status == ComplianceStatus.NON_COMPLIANT)
        
        # Determine overall status
        if non_compliant_count > 0:
            overall_status = ComplianceStatus.NON_COMPLIANT
        elif warning_count > 0:
            overall_status = ComplianceStatus.WARNING
        else:
            overall_status = ComplianceStatus.COMPLIANT
        
        # Calculate compliance score (0-100)
        total_checks = len([c for c in checks if c.status != ComplianceStatus.NOT_APPLICABLE])
        if total_checks > 0:
            score = (compliant_count / total_checks) * 100
            score -= warning_count * 10  # Penalty for warnings
            score -= non_compliant_count * 25  # Larger penalty for non-compliance
            compliance_score = max(0, min(100, score))
        else:
            compliance_score = 100.0
        
        # Generate priority actions
        priority_actions = self._generate_priority_actions(checks, request)
        
        response = ComplianceResponse(
            request_id=request_id,
            entity_name=request.entity_name,
            overall_status=overall_status,
            compliance_score=round(compliance_score, 1),
            checks=checks,
            compliant_count=compliant_count,
            warning_count=warning_count,
            non_compliant_count=non_compliant_count,
            priority_actions=priority_actions,
            cbam_applicable=cbam_applicable,
            cbam_liability_estimate=cbam_liability,
            cbam_liability_currency="EUR",
        )
        
        logger.info(f"Assessment complete: {overall_status.value}, score: {compliance_score:.0f}")
        
        return response
    
    def _check_environmental_clearance(self, request: ComplianceRequest) -> ComplianceCheckResult:
        """Check environmental clearance requirements."""
        has_ec = "EC" in request.certifications or "environmental_clearance" in [c.lower() for c in request.certifications]
        
        if request.production_volume_tpa <= 100000:
            return ComplianceCheckResult(
                regulation_id="IN_EC_001",
                regulation_name="Environmental Clearance",
                status=ComplianceStatus.NOT_APPLICABLE,
                message="EC not required for production < 100,000 TPA",
                recommendations=[]
            )
        
        if has_ec:
            return ComplianceCheckResult(
                regulation_id="IN_EC_001",
                regulation_name="Environmental Clearance",
                status=ComplianceStatus.COMPLIANT,
                actual_value=request.production_volume_tpa,
                threshold_value=100000,
                unit="tonnes/year",
                message="Valid Environmental Clearance in place",
                recommendations=["Ensure EC renewal before expiry"]
            )
        else:
            return ComplianceCheckResult(
                regulation_id="IN_EC_001",
                regulation_name="Environmental Clearance",
                status=ComplianceStatus.NON_COMPLIANT,
                actual_value=request.production_volume_tpa,
                threshold_value=100000,
                unit="tonnes/year",
                message="Environmental Clearance required but not obtained",
                recommendations=[
                    "Apply for Environmental Clearance immediately",
                    "Prepare Environmental Impact Assessment (EIA)",
                    "Submit to State Environment Impact Assessment Authority (SEIAA)"
                ],
                severity="critical"
            )
    
    def _check_epr_compliance(self, request: ComplianceRequest) -> ComplianceCheckResult:
        """Check EPR compliance."""
        # For metals, EPR is evolving - check basic registration
        epr_registered = "EPR" in request.certifications
        
        if request.production_volume_tpa < 50000:
            return ComplianceCheckResult(
                regulation_id="IN_EPR_001",
                regulation_name="EPR Registration",
                status=ComplianceStatus.NOT_APPLICABLE,
                message="EPR requirements minimal for smaller producers",
                recommendations=["Monitor EPR policy developments"]
            )
        
        if epr_registered:
            return ComplianceCheckResult(
                regulation_id="IN_EPR_001",
                regulation_name="EPR Compliance",
                status=ComplianceStatus.COMPLIANT,
                message="EPR registration active",
                recommendations=[
                    "Meet collection targets",
                    "Submit quarterly EPR reports"
                ]
            )
        else:
            return ComplianceCheckResult(
                regulation_id="IN_EPR_001",
                regulation_name="EPR Registration",
                status=ComplianceStatus.WARNING,
                message="EPR registration recommended for major producers",
                recommendations=[
                    "Register on CPCB EPR portal",
                    "Develop take-back mechanism",
                    "Partner with recyclers"
                ],
                severity="warning"
            )
    
    def _check_certifications(self, request: ComplianceRequest) -> ComplianceCheckResult:
        """Check recommended certifications."""
        required_certs = ["CTO", "ISO14001"]
        recommended_certs = ["ISO50001", "ISO14064", "EPD"]
        
        has_required = all(
            any(cert.upper() in c.upper() for c in request.certifications)
            for cert in required_certs
        )
        
        has_recommended_count = sum(
            1 for cert in recommended_certs
            if any(cert.upper() in c.upper() for c in request.certifications)
        )
        
        if has_required and has_recommended_count >= 2:
            status = ComplianceStatus.COMPLIANT
            message = "All required certifications in place, good coverage of recommended"
            recommendations = ["Maintain certifications", "Consider EPD for market advantage"]
        elif has_required:
            status = ComplianceStatus.COMPLIANT
            message = "Required certifications in place"
            recommendations = [
                "Consider ISO 50001 for energy management",
                "ISO 14064 for GHG verification supports CBAM",
                "EPD provides market advantage"
            ]
        else:
            status = ComplianceStatus.WARNING
            missing = [c for c in required_certs if not any(c.upper() in cert.upper() for cert in request.certifications)]
            message = f"Missing certifications: {', '.join(missing)}"
            recommendations = [
                f"Obtain {cert} certification" for cert in missing
            ]
        
        return ComplianceCheckResult(
            regulation_id="IN_CERT_001",
            regulation_name="Required Certifications",
            status=status,
            message=message,
            recommendations=recommendations
        )
    
    def _create_alert(
        self, 
        check: ComplianceCheckResult, 
        alert_type: str,
        actual_value: float
    ) -> ThresholdAlert:
        """Create threshold alert from check result."""
        return ThresholdAlert(
            alert_id=f"alert_{uuid.uuid4().hex[:6]}",
            alert_type=alert_type,
            regulation_id=check.regulation_id,
            regulation_name=check.regulation_name,
            metric_name="GHG Emissions",
            current_value=actual_value,
            threshold_value=check.threshold_value or 0,
            unit=check.unit or "",
            percentage_of_threshold=(actual_value / check.threshold_value * 100) if check.threshold_value else 0,
            message=check.message,
            recommended_action=check.recommendations[0] if check.recommendations else "Review compliance status",
            severity="critical" if alert_type == "exceeded" else "warning"
        )
    
    def _generate_priority_actions(
        self, 
        checks: List[ComplianceCheckResult],
        request: ComplianceRequest
    ) -> List[str]:
        """Generate prioritized action list."""
        actions = []
        
        # Critical issues first
        for check in checks:
            if check.status == ComplianceStatus.NON_COMPLIANT:
                if check.recommendations:
                    actions.append(f"[CRITICAL] {check.recommendations[0]}")
        
        # Warnings next
        for check in checks:
            if check.status == ComplianceStatus.WARNING:
                if check.recommendations:
                    actions.append(f"[WARNING] {check.recommendations[0]}")
        
        # CBAM specific
        if "EU" in [d.upper() for d in request.export_destinations]:
            if request.gwp_per_tonne > 1500:
                actions.append("[CBAM] Reduce emissions to minimize CBAM liability")
            actions.append("[CBAM] Ensure verified emissions data for CBAM reporting")
        
        # Circularity improvement
        if request.recycled_content < 0.3:
            actions.append("Increase recycled content to improve sustainability profile")
        
        return actions[:5]  # Top 5 priorities
    
    def generate_report(
        self,
        request: ComplianceRequest,
        response: Optional[ComplianceResponse] = None
    ) -> ComplianceReport:
        """Generate full compliance report."""
        if response is None:
            response = self.assess(request)
        
        # CBAM calculation if applicable
        cbam_calc = None
        if response.cbam_applicable:
            calc = EUCBAMRules.calculate_cbam_liability(
                metal_type=request.metal_type,
                volume_tonnes=request.production_volume_tpa * 0.1,
                embedded_emissions_per_tonne=request.gwp_per_tonne,
                year=datetime.now().year
            )
            cbam_calc = CBAMCalculation(
                product_category=request.metal_type,
                embedded_emissions=request.gwp_per_tonne / 1000,
                applicable_cn_codes=calc["applicable_cn_codes"],
                carbon_price_eur=calc["carbon_price_eur"],
                total_liability_eur=calc["gross_liability_eur"],
                carbon_price_paid_origin=0,
                net_liability_eur=calc["net_liability_before_phasein"],
                phase_in_percentage=calc["phase_in_percentage"],
                adjusted_liability_eur=calc["final_liability_eur"],
                default_value_used=calc["using_default_value"],
            )
        
        # EPR assessment
        epr_data = EPRRequirements.assess_epr_compliance(
            metal_type=request.metal_type,
            production_volume=request.production_volume_tpa,
            current_collection_rate=0.25,  # Demo values
            current_recycling_rate=0.60,
            is_registered="EPR" in request.certifications,
        )
        epr_assessment = EPRAssessment(
            applicable=epr_data["applicable"],
            epr_registration_required=epr_data["epr_registration_required"],
            registration_status=epr_data["registration_status"],
            collection_target_pct=epr_data["collection_target_pct"],
            recycling_target_pct=epr_data["recycling_target_pct"],
            current_collection_pct=epr_data["current_collection_pct"],
            current_recycling_pct=epr_data["current_recycling_pct"],
            epr_fee_per_tonne=epr_data["epr_fee_per_tonne_inr"],
            total_epr_liability=epr_data["total_epr_liability_inr"],
            status=ComplianceStatus(epr_data["status"]),
            gap_to_target=epr_data["collection_gap_pct"],
        )
        
        return ComplianceReport(
            report_id=f"report_{uuid.uuid4().hex[:8]}",
            entity_name=request.entity_name or "Unknown Entity",
            reporting_period=f"FY {datetime.now().year}",
            overall_status=response.overall_status,
            compliance_score=response.compliance_score,
            compliance_response=response,
            cbam_calculation=cbam_calc,
            epr_assessment=epr_assessment,
            active_alerts=[],
        )


# Create singleton instance
compliance_engine = ComplianceEngine()
