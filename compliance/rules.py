"""
Compliance Rules Definitions.

Contains regulatory rules for:
- Indian environmental regulations
- EU CBAM (Carbon Border Adjustment Mechanism)
- EPR (Extended Producer Responsibility)
"""

from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from .models import (
    ComplianceStatus,
    ComplianceCheckResult,
    RegulationType,
    Jurisdiction,
)


@dataclass
class ComplianceRule:
    """Base class for compliance rules."""
    id: str
    name: str
    description: str
    regulation_type: RegulationType
    jurisdiction: Jurisdiction
    applicable_metals: List[str] = field(default_factory=lambda: ["iron_steel", "aluminium"])
    threshold_value: Optional[float] = None
    threshold_unit: Optional[str] = None
    effective_date: Optional[datetime] = None
    
    def check(self, data: Dict[str, Any]) -> ComplianceCheckResult:
        """Check compliance against this rule."""
        raise NotImplementedError("Subclasses must implement check()")


class IndianRegulations:
    """
    Indian environmental regulations for metals industry.
    
    Key regulations:
    - Environment Protection Act, 1986
    - Air (Prevention and Control of Pollution) Act, 1981
    - Water (Prevention and Control of Pollution) Act, 1974
    - E-Waste Management Rules, 2016
    - Plastic Waste Management Rules, 2016
    - EPR regulations for steel and aluminium
    """
    
    # Emission limits (kg CO2e per tonne)
    EMISSION_BENCHMARKS = {
        "iron_steel": {
            "bf_bof": 2200,      # Blast furnace route
            "eaf": 600,          # Electric arc furnace
            "dri_eaf": 1400,     # DRI-EAF route
            "best_available": 1800,
        },
        "aluminium": {
            "primary": 16000,     # Primary smelting
            "secondary": 600,     # Secondary/recycled
            "best_available": 12000,
        }
    }
    
    # PAT (Perform, Achieve, Trade) targets
    PAT_TARGETS = {
        "iron_steel": {
            "sec_target_gcal_per_tcs": 5.5,  # Specific energy consumption
            "reduction_target_pct": 4.5,      # % reduction required
        },
        "aluminium": {
            "sec_target_kwh_per_t": 14000,
            "reduction_target_pct": 3.0,
        }
    }
    
    # Production thresholds requiring compliance
    REPORTING_THRESHOLDS = {
        "ghg_reporting": 25000,  # tonnes CO2e/year
        "environmental_clearance": 100000,  # tonnes production/year
        "consent_to_operate": 0,  # All require CTO
    }
    
    @classmethod
    def get_rules(cls) -> List[ComplianceRule]:
        """Get all Indian regulation rules."""
        rules = []
        
        # GHG emission limit for steel
        rules.append(ComplianceRule(
            id="IN_STEEL_GHG_001",
            name="Steel GHG Emission Benchmark",
            description="GHG emission intensity benchmark for steel production (NITI Aayog)",
            regulation_type=RegulationType.EMISSION_LIMIT,
            jurisdiction=Jurisdiction.INDIA,
            applicable_metals=["iron_steel"],
            threshold_value=2200,
            threshold_unit="kg CO2e/tonne",
        ))
        
        # GHG emission limit for aluminium
        rules.append(ComplianceRule(
            id="IN_ALUMINIUM_GHG_001",
            name="Aluminium GHG Emission Benchmark",
            description="GHG emission intensity benchmark for primary aluminium",
            regulation_type=RegulationType.EMISSION_LIMIT,
            jurisdiction=Jurisdiction.INDIA,
            applicable_metals=["aluminium"],
            threshold_value=16000,
            threshold_unit="kg CO2e/tonne",
        ))
        
        # PAT Scheme
        rules.append(ComplianceRule(
            id="IN_PAT_001",
            name="PAT Scheme Compliance",
            description="Perform Achieve Trade scheme for designated consumers",
            regulation_type=RegulationType.CERTIFICATION,
            jurisdiction=Jurisdiction.INDIA,
            applicable_metals=["iron_steel", "aluminium"],
        ))
        
        # Environmental Clearance
        rules.append(ComplianceRule(
            id="IN_EC_001",
            name="Environmental Clearance",
            description="EC required for production > 100,000 TPA",
            regulation_type=RegulationType.CERTIFICATION,
            jurisdiction=Jurisdiction.INDIA,
            threshold_value=100000,
            threshold_unit="tonnes/year",
        ))
        
        # Consent to Operate
        rules.append(ComplianceRule(
            id="IN_CTO_001",
            name="Consent to Operate",
            description="CTO from State Pollution Control Board",
            regulation_type=RegulationType.CERTIFICATION,
            jurisdiction=Jurisdiction.INDIA,
        ))
        
        return rules
    
    @classmethod
    def check_emission_compliance(
        cls, 
        metal_type: str, 
        gwp_per_tonne: float,
        process_route: str = "best_available"
    ) -> ComplianceCheckResult:
        """Check emission compliance against Indian benchmarks."""
        benchmarks = cls.EMISSION_BENCHMARKS.get(metal_type, {})
        threshold = benchmarks.get(process_route, benchmarks.get("best_available", 2000))
        
        if gwp_per_tonne <= threshold * 0.8:
            status = ComplianceStatus.COMPLIANT
            message = f"Emissions well below benchmark ({gwp_per_tonne:.0f} vs {threshold:.0f} kg CO2e/t)"
            recommendations = ["Continue current practices", "Consider applying for green certification"]
        elif gwp_per_tonne <= threshold:
            status = ComplianceStatus.COMPLIANT
            message = f"Emissions within benchmark ({gwp_per_tonne:.0f} vs {threshold:.0f} kg CO2e/t)"
            recommendations = ["Monitor emissions regularly", "Explore efficiency improvements"]
        elif gwp_per_tonne <= threshold * 1.1:
            status = ComplianceStatus.WARNING
            message = f"Emissions approaching limit ({gwp_per_tonne:.0f} vs {threshold:.0f} kg CO2e/t)"
            recommendations = [
                "Implement emission reduction measures",
                "Increase recycled content",
                "Transition to renewable energy"
            ]
        else:
            status = ComplianceStatus.NON_COMPLIANT
            message = f"Emissions exceed benchmark ({gwp_per_tonne:.0f} vs {threshold:.0f} kg CO2e/t)"
            recommendations = [
                "Immediate action required",
                "Conduct energy audit",
                "Develop emission reduction roadmap",
                "Consider technology upgrade"
            ]
        
        return ComplianceCheckResult(
            regulation_id=f"IN_{metal_type.upper()}_GHG_001",
            regulation_name=f"{metal_type.title()} GHG Emission Benchmark",
            status=status,
            actual_value=gwp_per_tonne,
            threshold_value=threshold,
            unit="kg CO2e/tonne",
            message=message,
            recommendations=recommendations,
            severity="critical" if status == ComplianceStatus.NON_COMPLIANT else "warning" if status == ComplianceStatus.WARNING else "info"
        )


class EUCBAMRules:
    """
    EU Carbon Border Adjustment Mechanism (CBAM) rules.
    
    CBAM applies to imports of:
    - Iron and steel
    - Aluminium
    - Cement
    - Fertilizers
    - Electricity
    - Hydrogen
    
    Timeline:
    - Oct 2023 - Dec 2025: Transitional period (reporting only)
    - Jan 2026: Full implementation (certificates required)
    """
    
    # CN codes for covered products
    CN_CODES = {
        "iron_steel": [
            "7201", "7202", "7203", "7204", "7205", "7206", "7207",
            "7208", "7209", "7210", "7211", "7212", "7213", "7214",
            "7215", "7216", "7217", "7218", "7219", "7220", "7221",
            "7222", "7223", "7224", "7225", "7226", "7227", "7228",
            "7229", "7301", "7302", "7303", "7304", "7305", "7306",
        ],
        "aluminium": [
            "7601", "7602", "7603", "7604", "7605", "7606", "7607",
            "7608", "7609", "7610", "7611", "7612", "7613", "7614",
            "7615", "7616",
        ]
    }
    
    # Default values (kg CO2e per tonne) when actual data unavailable
    DEFAULT_VALUES = {
        "iron_steel": {
            "pig_iron": 1600,
            "crude_steel": 1850,
            "finished_products": 2000,
        },
        "aluminium": {
            "unwrought": 14500,
            "semi_finished": 15000,
        }
    }
    
    # Carbon price (will fluctuate with ETS)
    CARBON_PRICE_EUR = 90.0  # EUR per tCO2e (approximate)
    
    # Phase-in schedule
    PHASE_IN = {
        2023: 0.0,   # Reporting only
        2024: 0.0,   # Reporting only
        2025: 0.0,   # Reporting only
        2026: 0.025,  # 2.5% of certificates
        2027: 0.05,
        2028: 0.10,
        2029: 0.225,
        2030: 0.475,
        2031: 0.725,
        2032: 0.90,
        2033: 0.975,
        2034: 1.0,   # Full implementation
    }
    
    @classmethod
    def get_rules(cls) -> List[ComplianceRule]:
        """Get CBAM rules."""
        rules = []
        
        rules.append(ComplianceRule(
            id="EU_CBAM_REPORTING_001",
            name="CBAM Quarterly Reporting",
            description="Quarterly CBAM report required for covered imports",
            regulation_type=RegulationType.REPORTING,
            jurisdiction=Jurisdiction.EU,
            effective_date=datetime(2023, 10, 1),
        ))
        
        rules.append(ComplianceRule(
            id="EU_CBAM_CERT_001",
            name="CBAM Certificate Requirement",
            description="CBAM certificates required for embedded emissions",
            regulation_type=RegulationType.TAX,
            jurisdiction=Jurisdiction.EU,
            effective_date=datetime(2026, 1, 1),
        ))
        
        return rules
    
    @classmethod
    def calculate_cbam_liability(
        cls,
        metal_type: str,
        volume_tonnes: float,
        embedded_emissions_per_tonne: float,
        carbon_price_paid_origin: float = 0.0,
        year: int = 2025
    ) -> Dict[str, Any]:
        """
        Calculate CBAM liability.
        
        Args:
            metal_type: Type of metal
            volume_tonnes: Import volume in tonnes
            embedded_emissions_per_tonne: kg CO2e per tonne of product
            carbon_price_paid_origin: Carbon price already paid in origin (EUR/tCO2e)
            year: Year for phase-in calculation
            
        Returns:
            Dict with calculation details
        """
        # Total embedded emissions
        total_emissions_t = (embedded_emissions_per_tonne * volume_tonnes) / 1000  # Convert to tCO2e
        
        # Carbon price
        carbon_price = cls.CARBON_PRICE_EUR
        
        # Gross liability
        gross_liability = total_emissions_t * carbon_price
        
        # Credit for carbon price paid in origin
        credit = total_emissions_t * carbon_price_paid_origin
        
        # Net liability before phase-in
        net_before_phasein = max(0, gross_liability - credit)
        
        # Phase-in adjustment
        phase_in_pct = cls.PHASE_IN.get(year, 1.0)
        final_liability = net_before_phasein * phase_in_pct
        
        # Check if actual data used or default
        defaults = cls.DEFAULT_VALUES.get(metal_type, {})
        default_value = list(defaults.values())[0] if defaults else 2000
        using_default = embedded_emissions_per_tonne >= default_value * 0.95
        
        return {
            "metal_type": metal_type,
            "volume_tonnes": volume_tonnes,
            "embedded_emissions_per_tonne": embedded_emissions_per_tonne,
            "total_emissions_tco2e": round(total_emissions_t, 2),
            "carbon_price_eur": carbon_price,
            "gross_liability_eur": round(gross_liability, 2),
            "credit_for_origin_price": round(credit, 2),
            "net_liability_before_phasein": round(net_before_phasein, 2),
            "phase_in_year": year,
            "phase_in_percentage": phase_in_pct,
            "final_liability_eur": round(final_liability, 2),
            "using_default_value": using_default,
            "applicable_cn_codes": cls.CN_CODES.get(metal_type, [])[:5],
        }
    
    @classmethod
    def check_cbam_compliance(
        cls,
        exports_to_eu: bool,
        has_verified_emissions: bool,
        has_quarterly_reports: bool,
        year: int = 2025
    ) -> ComplianceCheckResult:
        """Check CBAM compliance status."""
        if not exports_to_eu:
            return ComplianceCheckResult(
                regulation_id="EU_CBAM_001",
                regulation_name="EU CBAM",
                status=ComplianceStatus.NOT_APPLICABLE,
                message="CBAM not applicable - no EU exports",
                recommendations=[]
            )
        
        # Transitional period (2023-2025)
        if year <= 2025:
            if has_quarterly_reports:
                status = ComplianceStatus.COMPLIANT
                message = "CBAM transitional reporting requirements met"
                recommendations = ["Prepare for full implementation in 2026"]
            else:
                status = ComplianceStatus.NON_COMPLIANT
                message = "CBAM quarterly reports not submitted"
                recommendations = [
                    "Submit quarterly CBAM reports immediately",
                    "Calculate embedded emissions for all EU-bound products",
                    "Register with CBAM transitional registry"
                ]
        else:
            # Full implementation
            if has_verified_emissions and has_quarterly_reports:
                status = ComplianceStatus.COMPLIANT
                message = "CBAM compliance requirements met"
                recommendations = ["Maintain verification and reporting"]
            elif has_verified_emissions:
                status = ComplianceStatus.WARNING
                message = "Verified emissions available but reporting incomplete"
                recommendations = ["Complete quarterly CBAM certificate surrender"]
            else:
                status = ComplianceStatus.NON_COMPLIANT
                message = "CBAM requirements not met - default values will apply"
                recommendations = [
                    "Obtain third-party verification of embedded emissions",
                    "Using default values increases CBAM costs significantly",
                    "Engage accredited verifier immediately"
                ]
        
        return ComplianceCheckResult(
            regulation_id="EU_CBAM_001",
            regulation_name="EU CBAM Compliance",
            status=status,
            message=message,
            recommendations=recommendations,
            severity="critical" if status == ComplianceStatus.NON_COMPLIANT else "warning"
        )


class EPRRequirements:
    """
    Extended Producer Responsibility (EPR) requirements.
    
    India's EPR framework for:
    - E-waste
    - Plastic waste
    - Metal packaging (proposed)
    - End-of-life vehicles
    """
    
    # EPR targets for metals (proposed/indicative)
    TARGETS = {
        "iron_steel": {
            "collection_target_2025": 0.30,
            "collection_target_2030": 0.50,
            "recycling_target_2025": 0.70,
            "recycling_target_2030": 0.85,
        },
        "aluminium": {
            "collection_target_2025": 0.35,
            "collection_target_2030": 0.55,
            "recycling_target_2025": 0.75,
            "recycling_target_2030": 0.90,
        }
    }
    
    # EPR fee estimates (INR per kg)
    EPR_FEES = {
        "iron_steel": 0.50,
        "aluminium": 2.00,
    }
    
    @classmethod
    def get_rules(cls) -> List[ComplianceRule]:
        """Get EPR rules."""
        return [
            ComplianceRule(
                id="IN_EPR_REGISTRATION",
                name="EPR Registration",
                description="Producer registration with CPCB EPR portal",
                regulation_type=RegulationType.EPR,
                jurisdiction=Jurisdiction.INDIA,
            ),
            ComplianceRule(
                id="IN_EPR_COLLECTION",
                name="EPR Collection Target",
                description="Meet mandated collection targets for end-of-life products",
                regulation_type=RegulationType.EPR,
                jurisdiction=Jurisdiction.INDIA,
            ),
            ComplianceRule(
                id="IN_EPR_RECYCLING",
                name="EPR Recycling Target",
                description="Meet mandated recycling targets for collected waste",
                regulation_type=RegulationType.EPR,
                jurisdiction=Jurisdiction.INDIA,
            ),
        ]
    
    @classmethod
    def assess_epr_compliance(
        cls,
        metal_type: str,
        production_volume: float,
        current_collection_rate: float,
        current_recycling_rate: float,
        is_registered: bool,
        year: int = 2025
    ) -> Dict[str, Any]:
        """Assess EPR compliance."""
        targets = cls.TARGETS.get(metal_type, {})
        
        collection_target = targets.get(f"collection_target_{year}", 0.30)
        recycling_target = targets.get(f"recycling_target_{year}", 0.70)
        
        # Check registration
        registration_status = "registered" if is_registered else "not_registered"
        
        # Check targets
        collection_gap = max(0, collection_target - current_collection_rate)
        recycling_gap = max(0, recycling_target - current_recycling_rate)
        
        # Calculate fees
        fee_per_tonne = cls.EPR_FEES.get(metal_type, 1.0) * 1000  # Convert to per tonne
        total_fee = production_volume * fee_per_tonne
        
        # Determine status
        if not is_registered:
            status = ComplianceStatus.NON_COMPLIANT
        elif collection_gap > 0.1 or recycling_gap > 0.1:
            status = ComplianceStatus.WARNING
        elif collection_gap > 0 or recycling_gap > 0:
            status = ComplianceStatus.WARNING
        else:
            status = ComplianceStatus.COMPLIANT
        
        return {
            "applicable": True,
            "epr_registration_required": True,
            "registration_status": registration_status,
            "collection_target_pct": collection_target,
            "recycling_target_pct": recycling_target,
            "current_collection_pct": current_collection_rate,
            "current_recycling_pct": current_recycling_rate,
            "collection_gap_pct": collection_gap,
            "recycling_gap_pct": recycling_gap,
            "epr_fee_per_tonne_inr": fee_per_tonne,
            "total_epr_liability_inr": total_fee,
            "status": status.value,
        }
