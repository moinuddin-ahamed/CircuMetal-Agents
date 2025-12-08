"""
Enhanced Compliance Agent with Regulatory Service Integration.

This agent combines LLM reasoning with regulatory compliance checking
for EU CBAM, Indian regulations, and EPR requirements.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class ComplianceAgentV2(BaseCircuMetalAgent):
    """
    Enhanced compliance agent with regulatory service integration.
    
    Capabilities:
    - EU CBAM assessment and reporting
    - Indian environmental regulation compliance
    - EPR (Extended Producer Responsibility) assessment
    - Threshold monitoring and alerts
    - Regulatory change tracking
    """
    
    # Regulation references - annotate as ClassVar to avoid Pydantic field detection
    REGULATIONS: ClassVar[Dict[str, Dict[str, str]]] = {
        "eu_cbam": {
            "name": "EU Carbon Border Adjustment Mechanism",
            "reference": "Regulation (EU) 2023/956",
            "effective_date": "2023-10-01",
            "full_implementation": "2026-01-01"
        },
        "in_environment_protection": {
            "name": "Environment Protection Act",
            "reference": "EPA 1986, amended 2023",
            "authority": "MoEFCC"
        },
        "in_pat_scheme": {
            "name": "Perform Achieve Trade Scheme",
            "reference": "PAT Cycle VII (2022-2025)",
            "authority": "BEE"
        },
        "epr_plastics": {
            "name": "Extended Producer Responsibility - Plastics",
            "reference": "Plastic Waste Management Rules 2022",
            "authority": "CPCB"
        }
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="compliance_agent",
            model_name=model_name,
            prompt_file="compliance_agent.md",
            service_config=service_config
        )

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process compliance check request.
        """
        provenance = []
        action = input_data.get("action", "assess")
        
        if action == "assess":
            return await self._assess_compliance(input_data, provenance, run_id)
        elif action == "cbam":
            return await self._assess_cbam(input_data, provenance, run_id)
        elif action == "epr":
            return await self._assess_epr(input_data, provenance, run_id)
        elif action == "regulations":
            return await self._get_regulations(input_data, provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _assess_compliance(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Comprehensive compliance assessment."""
        # Build compliance request
        compliance_request = {
            "metal_type": input_data.get("metal_type", "steel"),
            "emission_intensity": input_data.get("emission_intensity", 0),
            "production_volume": input_data.get("production_volume", 100000),
            "location": input_data.get("location", "IN"),
            "export_destinations": input_data.get("export_destinations", ["EU"]),
            "lca_results": input_data.get("lca_results", {}),
            "year": input_data.get("year", datetime.now().year)
        }
        
        # Call compliance service
        compliance_result = await self._call_compliance_service(
            "/compliance/assess",
            compliance_request
        )
        
        if compliance_result.get("status") != "error":
            provenance.append(self._create_provenance(
                source="compliance_rule_engine",
                citation="Indian EPA, EU CBAM Regulation",
                quality_score=0.9
            ))
        
        # Get LLM analysis for recommendations
        analysis = await self._analyze_compliance(compliance_result, input_data)
        
        return self._build_compliance_response(
            compliance_result=compliance_result,
            analysis=analysis,
            provenance=provenance,
            run_id=run_id
        )

    async def _assess_cbam(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Specific EU CBAM assessment."""
        cbam_request = {
            "cn_code": input_data.get("cn_code", "7208"),
            "embedded_emissions": input_data.get("embedded_emissions", 0),
            "production_volume": input_data.get("production_volume", 100000),
            "production_route": input_data.get("production_route", "bf_bof"),
            "carbon_price_paid": input_data.get("carbon_price_paid", 0),
            "year": input_data.get("year", datetime.now().year)
        }
        
        result = await self._call_compliance_service(
            "/compliance/cbam",
            cbam_request
        )
        
        provenance.append(self._create_provenance(
            source="cbam_calculator",
            citation="EU CBAM Regulation 2023/956",
            quality_score=0.95
        ))
        
        return {
            "status": "success",
            "data": {
                "cbam_assessment": result,
                "regulation": self.REGULATIONS["eu_cbam"],
                "reporting_requirements": self._get_cbam_reporting_requirements(
                    input_data.get("year", datetime.now().year)
                )
            },
            "log": f"CBAM assessment: {result.get('total_liability', 0):,.0f} EUR estimated liability",
            "confidence": 0.9,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _assess_epr(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """EPR compliance assessment."""
        epr_request = {
            "product_category": input_data.get("product_category", "packaging"),
            "material_type": input_data.get("material_type", "steel"),
            "production_volume": input_data.get("production_volume", 100000),
            "recycled_content": input_data.get("recycled_content", 0.0),
            "recyclability": input_data.get("recyclability", 0.9),
            "year": input_data.get("year", datetime.now().year)
        }
        
        # Calculate EPR requirements
        epr_result = self._calculate_epr(epr_request)
        
        provenance.append(self._create_provenance(
            source="epr_calculator",
            citation="CPCB EPR Guidelines 2022",
            quality_score=0.85
        ))
        
        return {
            "status": "success",
            "data": {
                "epr_assessment": epr_result,
                "collection_targets": epr_result.get("collection_targets", {}),
                "compliance_actions": epr_result.get("required_actions", [])
            },
            "log": f"EPR assessment complete. Collection target: {epr_result.get('collection_target_percent', 0)}%",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _get_regulations(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Get applicable regulations for a given context."""
        metal_type = input_data.get("metal_type", "steel")
        location = input_data.get("location", "IN")
        export_destinations = input_data.get("export_destinations", [])
        
        applicable_regulations = []
        
        # Indian regulations always apply for IN location
        if location.startswith("IN"):
            applicable_regulations.extend([
                self.REGULATIONS["in_environment_protection"],
                self.REGULATIONS["in_pat_scheme"]
            ])
        
        # CBAM applies for EU exports
        if "EU" in export_destinations or any(
            d in ["DE", "FR", "IT", "ES", "NL", "PL"] for d in export_destinations
        ):
            applicable_regulations.append(self.REGULATIONS["eu_cbam"])
        
        # EPR may apply
        if input_data.get("has_packaging", True):
            applicable_regulations.append(self.REGULATIONS["epr_plastics"])
        
        return {
            "status": "success",
            "data": {
                "applicable_regulations": applicable_regulations,
                "summary": f"{len(applicable_regulations)} regulations applicable"
            },
            "log": f"Found {len(applicable_regulations)} applicable regulations",
            "confidence": 0.95,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _call_compliance_service(
        self,
        endpoint: str,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call the compliance checking service."""
        try:
            result = await self.call_service(
                service="compliance",
                endpoint=endpoint,
                method="POST",
                data=request
            )
            return result
        except Exception as e:
            logger.error(f"Compliance service call failed: {e}")
            return self._fallback_compliance(request)

    def _fallback_compliance(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fallback compliance check when service is unavailable."""
        try:
            from compliance.engine import ComplianceEngine
            
            engine = ComplianceEngine()
            result = engine.assess(
                metal_type=request.get("metal_type", "steel"),
                emission_intensity=request.get("emission_intensity", 0),
                production_volume=request.get("production_volume", 100000),
                location=request.get("location", "IN")
            )
            
            return result
        except Exception as e:
            logger.error(f"Fallback compliance failed: {e}")
            return {"status": "error", "error": str(e)}

    def _calculate_epr(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate EPR requirements."""
        year = request.get("year", datetime.now().year)
        production_volume = request.get("production_volume", 100000)
        recycled_content = request.get("recycled_content", 0.0)
        
        # EPR collection targets by year (India)
        targets = {
            2024: 0.60,
            2025: 0.70,
            2026: 0.80,
            2027: 0.90,
            2028: 1.00
        }
        
        target_percent = targets.get(year, 0.80) * 100
        
        # Calculate collection obligation
        collection_obligation = production_volume * targets.get(year, 0.80)
        
        # Credit for recycled content
        recycled_credit = production_volume * recycled_content
        net_obligation = max(0, collection_obligation - recycled_credit)
        
        return {
            "collection_target_percent": target_percent,
            "collection_obligation_tonnes": collection_obligation,
            "recycled_content_credit": recycled_credit,
            "net_obligation_tonnes": net_obligation,
            "compliance_status": "compliant" if recycled_content >= 0.3 else "action_required",
            "required_actions": [
                "Register with CPCB EPR portal",
                "Submit quarterly collection reports",
                f"Achieve {target_percent}% collection target by year end"
            ] if net_obligation > 0 else []
        }

    def _get_cbam_reporting_requirements(self, year: int) -> Dict[str, Any]:
        """Get CBAM reporting requirements for a given year."""
        if year < 2026:
            return {
                "phase": "Transitional",
                "reporting_frequency": "Quarterly",
                "data_required": [
                    "Quantity of goods imported",
                    "Type of goods (CN code)",
                    "Country of origin",
                    "Embedded emissions (direct + indirect)",
                    "Carbon price paid in country of origin"
                ],
                "verification_required": False,
                "certificates_required": False
            }
        else:
            return {
                "phase": "Definitive",
                "reporting_frequency": "Annual",
                "data_required": [
                    "All transitional phase data",
                    "Verified embedded emissions",
                    "CBAM certificates purchased/surrendered",
                    "Production route and technology"
                ],
                "verification_required": True,
                "certificates_required": True,
                "certificate_price_basis": "EU ETS weekly average"
            }

    async def _analyze_compliance(
        self,
        compliance_result: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use LLM to analyze compliance results and provide recommendations."""
        llm_input = {
            "task": "analyze_compliance_results",
            "compliance_results": compliance_result,
            "context": {
                "metal_type": context.get("metal_type"),
                "location": context.get("location"),
                "export_destinations": context.get("export_destinations", [])
            },
            "request": (
                "Analyze these compliance results and provide: "
                "1. Priority actions to address any non-compliance "
                "2. Timeline recommendations for implementation "
                "3. Cost-benefit considerations "
                "4. Risk assessment for non-compliance"
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            return self._parse_llm_response(response)
        except Exception as e:
            logger.warning(f"LLM analysis failed: {e}")
            return {}

    def _build_compliance_response(
        self,
        compliance_result: Dict[str, Any],
        analysis: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Build the final compliance response."""
        # Extract status
        overall_status = compliance_result.get("overall_status", "unknown")
        checks = compliance_result.get("checks", [])
        alerts = compliance_result.get("alerts", [])
        
        # Count issues
        warnings = sum(1 for c in checks if c.get("status") == "warn")
        failures = sum(1 for c in checks if c.get("status") == "fail")
        
        data = {
            "overall_status": overall_status,
            "compliance_checks": checks,
            "alerts": alerts,
            "cbam": compliance_result.get("cbam", {}),
            "indian_regulations": compliance_result.get("indian_regulations", {}),
            "epr": compliance_result.get("epr", {}),
            "recommendations": analysis.get("recommendations", []),
            "priority_actions": analysis.get("priority_actions", []),
            "risk_assessment": analysis.get("risk_assessment", {})
        }
        
        status = "success"
        if failures > 0:
            status_text = f"FAIL - {failures} critical issues"
        elif warnings > 0:
            status_text = f"WARN - {warnings} warnings"
        else:
            status_text = "PASS - All checks passed"
        
        log = f"Compliance assessment: {status_text}"
        
        return {
            "status": status,
            "data": data,
            "log": log,
            "confidence": 0.9,
            "provenance": provenance,
            "run_id": run_id
        }


# For backward compatibility
class ComplianceAgent(ComplianceAgentV2):
    """Alias for backward compatibility."""
    pass
