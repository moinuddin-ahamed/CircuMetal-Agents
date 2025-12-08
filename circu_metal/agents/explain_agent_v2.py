"""
Enhanced Explain Agent for LCA Result Interpretation.

This agent provides natural language explanations of LCA results,
making complex environmental data accessible to stakeholders.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class ExplainAgentV2(BaseCircuMetalAgent):
    """
    Enhanced explain agent for result interpretation.
    
    Capabilities:
    - Natural language LCA explanations
    - Stakeholder-specific summaries
    - Technical to non-technical translation
    - Recommendation synthesis
    - Executive summary generation
    """
    
    # Stakeholder profiles
    STAKEHOLDERS: ClassVar[Dict[str, Dict[str, Any]]] = {
        "executive": {
            "focus": ["costs", "risks", "competitive_advantage", "compliance"],
            "detail_level": "summary",
            "metrics": ["total_cost", "carbon_footprint", "compliance_status"]
        },
        "sustainability_manager": {
            "focus": ["emissions", "circularity", "targets", "reporting"],
            "detail_level": "detailed",
            "metrics": ["gwp", "mci", "water", "energy"]
        },
        "operations": {
            "focus": ["efficiency", "processes", "implementation", "timeline"],
            "detail_level": "technical",
            "metrics": ["energy_intensity", "material_efficiency", "yield"]
        },
        "investor": {
            "focus": ["esg", "risks", "opportunities", "disclosure"],
            "detail_level": "summary",
            "metrics": ["carbon_intensity", "scope_emissions", "targets"]
        },
        "regulator": {
            "focus": ["compliance", "thresholds", "reporting", "verification"],
            "detail_level": "detailed",
            "metrics": ["emission_limits", "compliance_status", "verification"]
        }
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="explain_agent",
            model_name=model_name,
            prompt_file="explain_agent.md",
            service_config=service_config
        )

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process explanation request.
        """
        provenance = []
        action = input_data.get("action", "explain")
        
        if action == "explain":
            return await self._explain_results(input_data, provenance, run_id)
        elif action == "summary":
            return await self._generate_summary(input_data, provenance, run_id)
        elif action == "compare":
            return await self._explain_comparison(input_data, provenance, run_id)
        elif action == "recommend":
            return await self._generate_recommendations(input_data, provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _explain_results(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate explanation of LCA results."""
        lca_results = input_data.get("lca_results", {})
        stakeholder = input_data.get("stakeholder", "sustainability_manager")
        language = input_data.get("language", "en")
        
        # Get stakeholder profile
        profile = self.STAKEHOLDERS.get(stakeholder, self.STAKEHOLDERS["sustainability_manager"])
        
        # Extract key metrics
        key_metrics = self._extract_key_metrics(lca_results, profile["metrics"])
        
        # Generate explanation using LLM
        llm_input = {
            "task": "explain_lca_results",
            "lca_results": lca_results,
            "key_metrics": key_metrics,
            "stakeholder": stakeholder,
            "stakeholder_focus": profile["focus"],
            "detail_level": profile["detail_level"],
            "language": language,
            "request": (
                f"Explain these LCA results for a {stakeholder}. "
                f"Focus on {', '.join(profile['focus'])}. "
                f"Use {profile['detail_level']} level of detail."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            explanation = self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"LLM explanation failed: {e}")
            explanation = self._generate_fallback_explanation(lca_results, profile)
        
        provenance.append(self._create_provenance(
            source="explain_agent",
            quality_score=0.85
        ))
        
        return {
            "status": "success",
            "data": {
                "explanation": explanation.get("explanation", str(explanation)),
                "key_points": explanation.get("key_points", []),
                "stakeholder": stakeholder,
                "key_metrics": key_metrics,
                "recommendations": explanation.get("recommendations", [])
            },
            "log": f"Generated explanation for {stakeholder}",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _generate_summary(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate executive summary."""
        lca_results = input_data.get("lca_results", {})
        project_name = input_data.get("project_name", "LCA Study")
        
        # Generate summary using LLM
        llm_input = {
            "task": "generate_executive_summary",
            "project_name": project_name,
            "lca_results": lca_results,
            "request": (
                "Generate a concise executive summary of this LCA study. "
                "Include: key findings, environmental hotspots, "
                "compliance status, and recommended next steps. "
                "Keep it to 3-4 paragraphs."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            summary = self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            summary = {"summary": "Executive summary generation failed."}
        
        provenance.append(self._create_provenance(
            source="summary_generator",
            quality_score=0.8
        ))
        
        return {
            "status": "success",
            "data": {
                "project_name": project_name,
                "executive_summary": summary.get("summary", str(summary)),
                "key_findings": summary.get("key_findings", []),
                "action_items": summary.get("action_items", [])
            },
            "log": f"Generated executive summary for {project_name}",
            "confidence": 0.8,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _explain_comparison(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Explain scenario comparison results."""
        scenarios = input_data.get("scenarios", [])
        comparison = input_data.get("comparison", {})
        
        if len(scenarios) < 2:
            return {
                "status": "failure",
                "data": {},
                "log": "At least 2 scenarios needed for comparison explanation",
                "confidence": 0.0
            }
        
        # Generate comparison explanation
        llm_input = {
            "task": "explain_scenario_comparison",
            "scenarios": scenarios,
            "comparison": comparison,
            "request": (
                "Explain the differences between these scenarios. "
                "Highlight why certain scenarios perform better. "
                "Discuss trade-offs and implementation considerations."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            explanation = self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"Comparison explanation failed: {e}")
            explanation = {}
        
        provenance.append(self._create_provenance(
            source="comparison_explainer",
            quality_score=0.85
        ))
        
        return {
            "status": "success",
            "data": {
                "scenario_count": len(scenarios),
                "explanation": explanation.get("explanation", ""),
                "winner_analysis": explanation.get("winner_analysis", ""),
                "trade_offs": explanation.get("trade_offs", []),
                "recommendation": explanation.get("recommendation", "")
            },
            "log": f"Explained comparison of {len(scenarios)} scenarios",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _generate_recommendations(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate actionable recommendations."""
        lca_results = input_data.get("lca_results", {})
        compliance_results = input_data.get("compliance_results", {})
        constraints = input_data.get("constraints", {})
        
        # Generate recommendations using LLM
        llm_input = {
            "task": "generate_recommendations",
            "lca_results": lca_results,
            "compliance_results": compliance_results,
            "constraints": constraints,
            "request": (
                "Based on the LCA and compliance results, generate "
                "prioritized, actionable recommendations. Consider: "
                "1. Quick wins (low cost, high impact) "
                "2. Medium-term improvements "
                "3. Long-term strategic changes "
                "Include estimated costs and benefits where possible."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            recs = self._parse_llm_response(response)
        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            recs = {}
        
        provenance.append(self._create_provenance(
            source="recommendation_engine",
            quality_score=0.8
        ))
        
        return {
            "status": "success",
            "data": {
                "quick_wins": recs.get("quick_wins", []),
                "medium_term": recs.get("medium_term", []),
                "long_term": recs.get("long_term", []),
                "prioritized_list": recs.get("prioritized_list", []),
                "estimated_impact": recs.get("estimated_impact", {})
            },
            "log": "Generated prioritized recommendations",
            "confidence": 0.8,
            "provenance": provenance,
            "run_id": run_id
        }

    def _extract_key_metrics(
        self,
        lca_results: Dict[str, Any],
        metrics_to_extract: List[str]
    ) -> Dict[str, Any]:
        """Extract key metrics from LCA results."""
        extracted = {}
        
        # Map metric names to result paths
        metric_paths = {
            "gwp": ["impact_assessment", "total_gwp_kg_co2e"],
            "total_gwp": ["impact_assessment", "total_gwp_kg_co2e"],
            "gwp_per_tonne": ["impact_assessment", "gwp_per_tonne"],
            "water": ["impact_assessment", "water_consumption_m3"],
            "energy": ["impact_assessment", "energy_consumption_gj"],
            "mci": ["circularity_metrics", "mci"],
            "carbon_intensity": ["impact_assessment", "gwp_per_tonne"],
            "carbon_footprint": ["impact_assessment", "total_gwp_kg_co2e"]
        }
        
        for metric in metrics_to_extract:
            path = metric_paths.get(metric, [metric])
            value = lca_results
            for key in path:
                if isinstance(value, dict):
                    value = value.get(key)
                else:
                    value = None
                    break
            if value is not None:
                extracted[metric] = value
        
        return extracted

    def _generate_fallback_explanation(
        self,
        lca_results: Dict[str, Any],
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate fallback explanation when LLM fails."""
        impact = lca_results.get("impact_assessment", {})
        gwp = impact.get("total_gwp_kg_co2e", 0)
        gwp_per_t = impact.get("gwp_per_tonne", 0)
        
        explanation = (
            f"The life cycle assessment shows a total carbon footprint of "
            f"{gwp:,.0f} kg CO2e ({gwp_per_t:,.0f} kg CO2e per tonne of product). "
        )
        
        if gwp_per_t > 2000:
            explanation += "This is above typical industry benchmarks, indicating room for improvement."
        elif gwp_per_t > 1500:
            explanation += "This is within typical industry ranges for this type of production."
        else:
            explanation += "This is below typical benchmarks, indicating good environmental performance."
        
        return {
            "explanation": explanation,
            "key_points": [
                f"Total GWP: {gwp:,.0f} kg CO2e",
                f"Intensity: {gwp_per_t:,.0f} kg CO2e/t"
            ]
        }


# For backward compatibility
class ExplainAgent(ExplainAgentV2):
    """Alias for backward compatibility."""
    pass
