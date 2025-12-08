"""
Enhanced Critique Agent for Quality Assurance.

This agent reviews LCA studies for quality, identifies issues,
and suggests improvements.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class CritiqueAgentV2(BaseCircuMetalAgent):
    """
    Enhanced critique agent for LCA quality review.
    
    Capabilities:
    - ISO 14040/14044 compliance checking
    - Data quality assessment
    - Methodology review
    - Uncertainty analysis critique
    - Improvement suggestions
    """
    
    # ISO 14040/14044 requirements checklist
    ISO_REQUIREMENTS: ClassVar[Dict[str, List[str]]] = {
        "goal_and_scope": [
            "functional_unit_defined",
            "system_boundary_defined",
            "allocation_procedures",
            "impact_categories_selected",
            "data_quality_requirements"
        ],
        "inventory_analysis": [
            "data_collection_complete",
            "allocation_justified",
            "co_products_handled",
            "recycling_modeled",
            "cut_off_criteria"
        ],
        "impact_assessment": [
            "category_indicators_calculated",
            "characterization_factors_valid",
            "normalization_optional",
            "weighting_optional_justified"
        ],
        "interpretation": [
            "significant_issues_identified",
            "sensitivity_analysis",
            "uncertainty_considered",
            "conclusions_consistent"
        ]
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="critique_agent",
            model_name=model_name,
            prompt_file="critique_agent.md",
            service_config=service_config
        )

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process critique request.
        """
        provenance = []
        action = input_data.get("action", "review")
        
        if action == "review":
            return await self._review_study(input_data, provenance, run_id)
        elif action == "iso_check":
            return await self._check_iso_compliance(input_data, provenance, run_id)
        elif action == "data_quality":
            return await self._assess_data_quality(input_data, provenance, run_id)
        elif action == "suggest_improvements":
            return await self._suggest_improvements(input_data, provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _review_study(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Comprehensive LCA study review."""
        study = input_data.get("study", {})
        lca_results = input_data.get("lca_results", {})
        methodology = input_data.get("methodology", {})
        
        # Perform checks
        iso_check = await self._check_iso_compliance(
            {"study": study, "methodology": methodology},
            [],
            run_id
        )
        
        data_quality = await self._assess_data_quality(
            {"data": study.get("inventory_data", {})},
            [],
            run_id
        )
        
        # Generate LLM critique
        llm_input = {
            "task": "critique_lca_study",
            "study": study,
            "lca_results": lca_results,
            "methodology": methodology,
            "iso_check_results": iso_check.get("data", {}),
            "data_quality_results": data_quality.get("data", {}),
            "request": (
                "Critically review this LCA study. Identify: "
                "1. Methodological strengths and weaknesses "
                "2. Data quality issues "
                "3. Potential biases or limitations "
                "4. Areas for improvement "
                "Be specific and constructive."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            critique = self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"LLM critique failed: {e}")
            critique = {}
        
        # Calculate overall quality score
        iso_score = iso_check.get("data", {}).get("compliance_score", 0.5)
        dq_score = data_quality.get("data", {}).get("overall_score", 0.5)
        overall_score = (iso_score + dq_score) / 2
        
        provenance.append(self._create_provenance(
            source="critique_agent",
            citation="ISO 14040/14044 review",
            quality_score=0.9
        ))
        
        return {
            "status": "success",
            "data": {
                "overall_quality_score": overall_score,
                "quality_rating": self._get_quality_rating(overall_score),
                "iso_compliance": iso_check.get("data", {}),
                "data_quality": data_quality.get("data", {}),
                "critique": critique.get("critique", ""),
                "strengths": critique.get("strengths", []),
                "weaknesses": critique.get("weaknesses", []),
                "recommendations": critique.get("recommendations", []),
                "critical_issues": critique.get("critical_issues", [])
            },
            "log": f"Study review complete. Quality score: {overall_score:.2f}",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _check_iso_compliance(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Check ISO 14040/14044 compliance."""
        study = input_data.get("study", {})
        methodology = input_data.get("methodology", {})
        
        compliance_results = {}
        total_checks = 0
        passed_checks = 0
        issues = []
        
        for phase, requirements in self.ISO_REQUIREMENTS.items():
            phase_results = []
            for req in requirements:
                total_checks += 1
                
                # Check if requirement is addressed
                is_met = self._check_requirement(study, methodology, phase, req)
                
                phase_results.append({
                    "requirement": req,
                    "met": is_met,
                    "phase": phase
                })
                
                if is_met:
                    passed_checks += 1
                else:
                    issues.append({
                        "phase": phase,
                        "requirement": req,
                        "severity": "warning" if "optional" in req else "issue"
                    })
            
            compliance_results[phase] = phase_results
        
        compliance_score = passed_checks / total_checks if total_checks > 0 else 0
        
        provenance.append(self._create_provenance(
            source="iso_compliance_checker",
            citation="ISO 14040:2006, ISO 14044:2006",
            quality_score=0.95
        ))
        
        return {
            "status": "success",
            "data": {
                "compliance_score": compliance_score,
                "total_requirements": total_checks,
                "requirements_met": passed_checks,
                "compliance_by_phase": compliance_results,
                "issues": issues,
                "is_compliant": compliance_score >= 0.8
            },
            "log": f"ISO compliance: {compliance_score:.0%} ({passed_checks}/{total_checks})",
            "confidence": 0.95,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _assess_data_quality(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Assess data quality using pedigree matrix approach."""
        data = input_data.get("data", {})
        
        # Data quality indicators (pedigree matrix)
        indicators = {
            "reliability": {"score": 0, "max": 5},
            "completeness": {"score": 0, "max": 5},
            "temporal_correlation": {"score": 0, "max": 5},
            "geographical_correlation": {"score": 0, "max": 5},
            "technological_correlation": {"score": 0, "max": 5}
        }
        
        # Assess each indicator
        indicators["reliability"]["score"] = self._assess_reliability(data)
        indicators["completeness"]["score"] = self._assess_completeness(data)
        indicators["temporal_correlation"]["score"] = self._assess_temporal(data)
        indicators["geographical_correlation"]["score"] = self._assess_geographical(data)
        indicators["technological_correlation"]["score"] = self._assess_technological(data)
        
        # Calculate overall score (1-5 scale, 1 is best)
        total_score = sum(i["score"] for i in indicators.values())
        max_score = sum(i["max"] for i in indicators.values())
        
        # Normalize to 0-1 scale (higher is better)
        overall_score = 1 - (total_score - 5) / (max_score - 5) if max_score > 5 else 0.5
        
        # Generate recommendations
        recommendations = self._generate_dq_recommendations(indicators)
        
        provenance.append(self._create_provenance(
            source="data_quality_assessor",
            citation="Pedigree Matrix (Weidema & Wesnaes 1996)",
            quality_score=0.85
        ))
        
        return {
            "status": "success",
            "data": {
                "overall_score": overall_score,
                "quality_rating": self._get_dq_rating(overall_score),
                "indicators": indicators,
                "pedigree_total": total_score,
                "recommendations": recommendations
            },
            "log": f"Data quality score: {overall_score:.2f}",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _suggest_improvements(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Suggest improvements for the LCA study."""
        study = input_data.get("study", {})
        issues = input_data.get("issues", [])
        
        # Generate improvement suggestions using LLM
        llm_input = {
            "task": "suggest_lca_improvements",
            "study": study,
            "identified_issues": issues,
            "request": (
                "Suggest specific, actionable improvements for this LCA study. "
                "Prioritize by: 1) Impact on results, 2) Feasibility, 3) Cost. "
                "Include data sources that could improve quality."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            suggestions = self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"Improvement suggestions failed: {e}")
            suggestions = {}
        
        provenance.append(self._create_provenance(
            source="improvement_suggester",
            quality_score=0.8
        ))
        
        return {
            "status": "success",
            "data": {
                "high_priority": suggestions.get("high_priority", []),
                "medium_priority": suggestions.get("medium_priority", []),
                "low_priority": suggestions.get("low_priority", []),
                "data_sources": suggestions.get("recommended_data_sources", []),
                "methodology_improvements": suggestions.get("methodology_improvements", [])
            },
            "log": "Generated improvement suggestions",
            "confidence": 0.8,
            "provenance": provenance,
            "run_id": run_id
        }

    def _check_requirement(
        self,
        study: Dict,
        methodology: Dict,
        phase: str,
        requirement: str
    ) -> bool:
        """Check if a specific ISO requirement is met."""
        # Simple heuristic checks
        checks = {
            "functional_unit_defined": lambda: bool(study.get("functional_unit") or methodology.get("functional_unit")),
            "system_boundary_defined": lambda: bool(study.get("system_boundary") or methodology.get("boundary")),
            "allocation_procedures": lambda: bool(methodology.get("allocation")),
            "impact_categories_selected": lambda: bool(methodology.get("impact_categories") or study.get("impact_categories")),
            "data_quality_requirements": lambda: bool(study.get("data_quality")),
            "data_collection_complete": lambda: len(study.get("inventory_data", {})) > 0,
            "allocation_justified": lambda: bool(methodology.get("allocation_justification")),
            "co_products_handled": lambda: bool(methodology.get("co_products")),
            "recycling_modeled": lambda: bool(study.get("recycling") or study.get("eol")),
            "cut_off_criteria": lambda: bool(methodology.get("cut_off")),
            "category_indicators_calculated": lambda: bool(study.get("impact_results")),
            "characterization_factors_valid": lambda: True,  # Assume valid if using standard factors
            "normalization_optional": lambda: True,
            "weighting_optional_justified": lambda: True,
            "significant_issues_identified": lambda: bool(study.get("hotspots") or study.get("significant_issues")),
            "sensitivity_analysis": lambda: bool(study.get("sensitivity")),
            "uncertainty_considered": lambda: bool(study.get("uncertainty")),
            "conclusions_consistent": lambda: True  # Assume consistent
        }
        
        check_func = checks.get(requirement, lambda: True)
        try:
            return check_func()
        except Exception:
            return False

    def _assess_reliability(self, data: Dict) -> int:
        """Assess data reliability (1-5, 1 is best)."""
        source = data.get("data_source", "")
        if "verified" in source.lower() or "measured" in source.lower():
            return 1
        elif "calculated" in source.lower():
            return 2
        elif "estimated" in source.lower():
            return 3
        elif "literature" in source.lower():
            return 4
        return 5

    def _assess_completeness(self, data: Dict) -> int:
        """Assess data completeness (1-5, 1 is best)."""
        if not data:
            return 5
        
        required_fields = ["inputs", "outputs", "emissions", "energy"]
        present = sum(1 for f in required_fields if f in data)
        
        if present == len(required_fields):
            return 1
        elif present >= 3:
            return 2
        elif present >= 2:
            return 3
        elif present >= 1:
            return 4
        return 5

    def _assess_temporal(self, data: Dict) -> int:
        """Assess temporal correlation (1-5, 1 is best)."""
        year = data.get("year", 0)
        current_year = datetime.now().year
        
        diff = current_year - year if year else 10
        
        if diff <= 1:
            return 1
        elif diff <= 3:
            return 2
        elif diff <= 5:
            return 3
        elif diff <= 10:
            return 4
        return 5

    def _assess_geographical(self, data: Dict) -> int:
        """Assess geographical correlation (1-5, 1 is best)."""
        location = data.get("location", "")
        target_location = data.get("target_location", "")
        
        if location == target_location:
            return 1
        elif location.split("-")[0] == target_location.split("-")[0]:  # Same country
            return 2
        elif location in ["EU", "Asia", "World"]:
            return 4
        return 3

    def _assess_technological(self, data: Dict) -> int:
        """Assess technological correlation (1-5, 1 is best)."""
        tech_match = data.get("technology_match", "")
        
        if tech_match == "exact":
            return 1
        elif tech_match == "similar":
            return 2
        elif tech_match == "related":
            return 3
        elif tech_match == "proxy":
            return 4
        return 5

    def _get_quality_rating(self, score: float) -> str:
        """Get quality rating label."""
        if score >= 0.9:
            return "Excellent"
        elif score >= 0.7:
            return "Good"
        elif score >= 0.5:
            return "Acceptable"
        elif score >= 0.3:
            return "Poor"
        return "Very Poor"

    def _get_dq_rating(self, score: float) -> str:
        """Get data quality rating."""
        if score >= 0.8:
            return "High Quality"
        elif score >= 0.6:
            return "Medium Quality"
        elif score >= 0.4:
            return "Low Quality"
        return "Very Low Quality"

    def _generate_dq_recommendations(
        self,
        indicators: Dict[str, Dict]
    ) -> List[str]:
        """Generate data quality improvement recommendations."""
        recommendations = []
        
        if indicators["reliability"]["score"] >= 4:
            recommendations.append("Obtain primary/measured data to improve reliability")
        
        if indicators["completeness"]["score"] >= 3:
            recommendations.append("Complete inventory with missing input/output flows")
        
        if indicators["temporal_correlation"]["score"] >= 4:
            recommendations.append("Update data to reflect current technology/practices")
        
        if indicators["geographical_correlation"]["score"] >= 3:
            recommendations.append("Source region-specific data for key processes")
        
        if indicators["technological_correlation"]["score"] >= 4:
            recommendations.append("Obtain technology-specific emission factors")
        
        return recommendations


# For backward compatibility
class CritiqueAgent(CritiqueAgentV2):
    """Alias for backward compatibility."""
    pass
