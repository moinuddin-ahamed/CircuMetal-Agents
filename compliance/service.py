"""
FastAPI Service for Compliance Checks.

Provides REST API for:
- POST /compliance/assess - Comprehensive compliance assessment
- POST /compliance/cbam - CBAM-specific calculation
- POST /compliance/epr - EPR assessment
- GET /compliance/regulations - List applicable regulations
"""

import logging
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    ComplianceRequest,
    ComplianceResponse,
    ComplianceReport,
    CBAMCalculation,
    EPRAssessment,
    Regulation,
)
from .engine import ComplianceEngine
from .rules import IndianRegulations, EUCBAMRules, EPRRequirements

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service start time
SERVICE_START_TIME = datetime.utcnow()


class ComplianceService:
    """Compliance assessment service."""
    
    def __init__(self):
        """Initialize service."""
        self.engine = ComplianceEngine()
        logger.info("Compliance Service initialized")
    
    def assess(self, request: ComplianceRequest) -> ComplianceResponse:
        """Perform compliance assessment."""
        return self.engine.assess(request)
    
    def generate_report(self, request: ComplianceRequest) -> ComplianceReport:
        """Generate compliance report."""
        return self.engine.generate_report(request)
    
    def calculate_cbam(
        self,
        metal_type: str,
        volume_tonnes: float,
        emissions_per_tonne: float,
        year: int = 2025
    ) -> dict:
        """Calculate CBAM liability."""
        return EUCBAMRules.calculate_cbam_liability(
            metal_type=metal_type,
            volume_tonnes=volume_tonnes,
            embedded_emissions_per_tonne=emissions_per_tonne,
            year=year
        )


# Create service instance
compliance_service = ComplianceService()


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Compliance Service starting up...")
    yield
    logger.info("Compliance Service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="CircuMetal Compliance Service",
    description="Regulatory compliance assessment for metals industry",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Endpoints

@app.get("/health", tags=["Health"])
async def health_check():
    """Check service health."""
    uptime = (datetime.utcnow() - SERVICE_START_TIME).total_seconds()
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "assessments_performed": compliance_service.engine.assessment_count,
    }


@app.post("/compliance/assess", response_model=ComplianceResponse, tags=["Compliance"])
async def assess_compliance(request: ComplianceRequest):
    """
    Perform comprehensive compliance assessment.
    
    Checks against:
    - Indian environmental regulations
    - EU CBAM requirements (if exporting to EU)
    - EPR obligations
    - Required certifications
    """
    try:
        return compliance_service.assess(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Assessment error: {e}")
        raise HTTPException(status_code=500, detail="Assessment failed")


@app.post("/compliance/report", response_model=ComplianceReport, tags=["Compliance"])
async def generate_compliance_report(request: ComplianceRequest):
    """
    Generate comprehensive compliance report.
    
    Includes detailed CBAM calculation and EPR assessment.
    """
    try:
        return compliance_service.generate_report(request)
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Report generation failed")


@app.post("/compliance/cbam", tags=["CBAM"])
async def calculate_cbam(
    metal_type: str = "iron_steel",
    volume_tonnes: float = 10000,
    emissions_per_tonne: float = 1850,
    year: int = 2025
):
    """
    Calculate EU CBAM liability.
    
    Returns detailed CBAM calculation including phase-in adjustments.
    """
    try:
        return compliance_service.calculate_cbam(
            metal_type=metal_type,
            volume_tonnes=volume_tonnes,
            emissions_per_tonne=emissions_per_tonne,
            year=year
        )
    except Exception as e:
        logger.error(f"CBAM calculation error: {e}")
        raise HTTPException(status_code=500, detail="CBAM calculation failed")


@app.get("/compliance/regulations", tags=["Reference"])
async def list_regulations(jurisdiction: Optional[str] = None):
    """
    List applicable regulations.
    
    Optional filter by jurisdiction (india, eu, global).
    """
    regulations = []
    
    # Add Indian regulations
    for rule in IndianRegulations.get_rules():
        if jurisdiction is None or jurisdiction.lower() == "india":
            regulations.append({
                "id": rule.id,
                "name": rule.name,
                "description": rule.description,
                "type": rule.regulation_type.value,
                "jurisdiction": rule.jurisdiction.value,
                "threshold": rule.threshold_value,
                "threshold_unit": rule.threshold_unit,
            })
    
    # Add CBAM rules
    for rule in EUCBAMRules.get_rules():
        if jurisdiction is None or jurisdiction.lower() == "eu":
            regulations.append({
                "id": rule.id,
                "name": rule.name,
                "description": rule.description,
                "type": rule.regulation_type.value,
                "jurisdiction": rule.jurisdiction.value,
                "effective_date": rule.effective_date.isoformat() if rule.effective_date else None,
            })
    
    # Add EPR rules
    for rule in EPRRequirements.get_rules():
        if jurisdiction is None or jurisdiction.lower() == "india":
            regulations.append({
                "id": rule.id,
                "name": rule.name,
                "description": rule.description,
                "type": rule.regulation_type.value,
                "jurisdiction": rule.jurisdiction.value,
            })
    
    return regulations


@app.get("/compliance/benchmarks/{metal_type}", tags=["Reference"])
async def get_emission_benchmarks(metal_type: str):
    """Get emission benchmarks for a metal type."""
    benchmarks = IndianRegulations.EMISSION_BENCHMARKS.get(metal_type)
    
    if not benchmarks:
        raise HTTPException(status_code=404, detail=f"Benchmarks not found for {metal_type}")
    
    return {
        "metal_type": metal_type,
        "benchmarks": benchmarks,
        "unit": "kg CO2e/tonne",
        "source": "Indian regulatory guidelines",
    }


@app.get("/compliance/cbam/default-values", tags=["CBAM"])
async def get_cbam_default_values():
    """Get CBAM default emission values."""
    return {
        "default_values": EUCBAMRules.DEFAULT_VALUES,
        "unit": "kg CO2e/tonne",
        "note": "Default values apply when actual verified emissions are not available",
        "carbon_price_eur": EUCBAMRules.CARBON_PRICE_EUR,
        "phase_in_schedule": EUCBAMRules.PHASE_IN,
    }


# Quick check endpoint for agents
@app.post("/compliance/quick", tags=["Compliance"])
async def quick_compliance_check(
    metal_type: str = "iron_steel",
    gwp_per_tonne: float = 1850,
    production_volume_tpa: float = 1000000,
    exports_to_eu: bool = False
):
    """
    Quick compliance check with minimal parameters.
    
    Returns summary status and key metrics.
    """
    # Check emission compliance
    emission_check = IndianRegulations.check_emission_compliance(
        metal_type=metal_type,
        gwp_per_tonne=gwp_per_tonne
    )
    
    result = {
        "emission_status": emission_check.status.value,
        "gwp_per_tonne": gwp_per_tonne,
        "threshold": emission_check.threshold_value,
        "compliant": emission_check.status == "compliant",
    }
    
    # CBAM if applicable
    if exports_to_eu:
        cbam = EUCBAMRules.calculate_cbam_liability(
            metal_type=metal_type,
            volume_tonnes=production_volume_tpa * 0.1,  # Assume 10% to EU
            embedded_emissions_per_tonne=gwp_per_tonne,
        )
        result["cbam_liability_eur"] = cbam["final_liability_eur"]
        result["cbam_phase"] = "transitional" if datetime.now().year <= 2025 else "full"
    
    return result


# Run with: uvicorn compliance.service:app --reload --port 8003
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
