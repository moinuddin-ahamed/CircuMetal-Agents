"""
Enhanced LCA Agent with Service Integration.

This agent combines LLM reasoning with the LCA calculation engine
for comprehensive life cycle assessments.
"""

import os
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class LCAAgentV2(BaseCircuMetalAgent):
    """
    Enhanced LCA agent with engine integration.
    
    Capabilities:
    - Full LCA calculation via LCA service
    - Scenario comparison
    - Impact assessment interpretation
    - Report generation
    - Hotspot identification
    """
    
    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="lca_agent",
            model_name=model_name,
            prompt_file="lca_agent.md",
            service_config=service_config
        )

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process LCA request using LCA service + LLM reasoning.
        """
        provenance = []
        action = input_data.get("action", "calculate")
        
        if action == "calculate":
            return await self._calculate_lca(input_data, provenance, run_id)
        elif action == "compare":
            return await self._compare_scenarios(input_data, provenance, run_id)
        elif action == "report":
            return await self._generate_report(input_data, provenance, run_id)
        else:
            # Default to LLM handling
            return await super()._async_handle(input_data, run_id)

    async def _calculate_lca(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Calculate LCA using the LCA service."""
        # Build LCA request
        lca_request = {
            "project_id": input_data.get("project_id", "default"),
            "scenario_id": input_data.get("scenario_id", "baseline"),
            "metal_type": input_data.get("metal_type", "steel"),
            "production_route": input_data.get("production_route", "bf_bof"),
            "production_volume_tonnes": input_data.get("production_volume", 100000),
            "recycled_content": input_data.get("recycled_content", 0.0),
            "energy_mix": input_data.get("energy_mix", {}),
            "location": input_data.get("location", "IN"),
            "include_transport": input_data.get("include_transport", True),
            "transport_km": input_data.get("transport_km", 500),
            "functional_unit": input_data.get("functional_unit", "1 tonne product")
        }
        
        # Call LCA service
        lca_result = await self._call_lca_service(lca_request)
        
        if lca_result.get("status") == "success":
            provenance.append(self._create_provenance(
                source="lca_calculation_engine",
                citation="ISO 14040/14044 methodology",
                quality_score=0.85
            ))
        
        # Get LLM interpretation
        interpretation = await self._interpret_results(lca_result, input_data)
        
        return self._build_lca_response(
            lca_result=lca_result,
            interpretation=interpretation,
            provenance=provenance,
            run_id=run_id
        )

    async def _call_lca_service(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call the LCA calculation service."""
        try:
            result = await self.call_service(
                service="lca",
                endpoint="/lca/calculate",
                method="POST",
                data=request
            )
            return result
        except Exception as e:
            logger.error(f"LCA service call failed: {e}")
            return self._fallback_lca(request)

    def _fallback_lca(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback LCA calculation when service is unavailable."""
        try:
            from lca_service.engine import LCAEngine
            
            engine = LCAEngine()
            result = engine.calculate(
                metal_type=request.get("metal_type", "steel"),
                production_route=request.get("production_route", "bf_bof"),
                production_volume=request.get("production_volume_tonnes", 100000),
                recycled_content=request.get("recycled_content", 0.0),
                energy_mix=request.get("energy_mix"),
                location=request.get("location", "IN")
            )
            
            return {
                "status": "success",
                "results": {
                    "total_gwp": result.get("total_gwp", 0),
                    "gwp_per_tonne": result.get("gwp_per_tonne", 0),
                    "breakdown": result.get("breakdown", {}),
                    "circularity": result.get("circularity", {})
                },
                "method": "fallback_local_engine"
            }
        except Exception as e:
            logger.error(f"Fallback LCA failed: {e}")
            return {"status": "error", "error": str(e)}

    async def _interpret_results(
        self,
        lca_result: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use LLM to interpret LCA results."""
        llm_input = {
            "task": "interpret_lca_results",
            "lca_results": lca_result,
            "context": {
                "metal_type": context.get("metal_type"),
                "location": context.get("location"),
                "production_route": context.get("production_route")
            },
            "request": (
                "Analyze these LCA results. Identify hotspots, compare to industry "
                "benchmarks, and provide actionable recommendations for improvement. "
                "Consider both environmental and economic factors."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            return self._parse_llm_response(response)
        except Exception as e:
            logger.warning(f"LLM interpretation failed: {e}")
            return {}

    async def _compare_scenarios(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Compare multiple LCA scenarios."""
        scenarios = input_data.get("scenarios", [])
        
        if len(scenarios) < 2:
            return {
                "status": "failure",
                "data": {},
                "log": "At least 2 scenarios required for comparison",
                "confidence": 0.0
            }
        
        # Calculate LCA for each scenario
        results = []
        for scenario in scenarios:
            result = await self._call_lca_service(scenario)
            results.append({
                "scenario_id": scenario.get("scenario_id", "unknown"),
                "scenario_name": scenario.get("name", "Unnamed"),
                "results": result.get("results", {})
            })
        
        provenance.append(self._create_provenance(
            source="lca_comparison_engine",
            quality_score=0.85
        ))
        
        # Analyze comparison
        comparison = self._analyze_comparison(results)
        
        return {
            "status": "success",
            "data": {
                "scenarios": results,
                "comparison": comparison,
                "best_scenario": comparison.get("best_scenario"),
                "improvement_potential": comparison.get("improvement_potential", 0)
            },
            "log": f"Compared {len(scenarios)} scenarios",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    def _analyze_comparison(
        self,
        results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze scenario comparison results."""
        if not results:
            return {}
        
        # Find best and worst scenarios by GWP
        gwp_values = []
        for r in results:
            gwp = r.get("results", {}).get("total_gwp", float("inf"))
            gwp_values.append((r.get("scenario_id"), gwp))
        
        gwp_values.sort(key=lambda x: x[1])
        
        best = gwp_values[0] if gwp_values else ("unknown", 0)
        worst = gwp_values[-1] if gwp_values else ("unknown", 0)
        
        improvement = 0
        if worst[1] > 0:
            improvement = (worst[1] - best[1]) / worst[1] * 100
        
        return {
            "best_scenario": best[0],
            "best_gwp": best[1],
            "worst_scenario": worst[0],
            "worst_gwp": worst[1],
            "improvement_potential": round(improvement, 1),
            "ranking": [s[0] for s in gwp_values]
        }

    async def _generate_report(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate an LCA report."""
        project_id = input_data.get("project_id", "default")
        scenario_id = input_data.get("scenario_id", "baseline")
        
        try:
            result = await self.call_service(
                service="lca",
                endpoint="/lca/report",
                method="POST",
                data={
                    "project_id": project_id,
                    "scenario_id": scenario_id,
                    "format": input_data.get("format", "html")
                }
            )
            
            return {
                "status": "success",
                "data": {
                    "report_url": result.get("report_url"),
                    "report_content": result.get("report_html", "")[:5000]
                },
                "log": f"Generated {input_data.get('format', 'html')} report",
                "confidence": 0.9,
                "provenance": provenance,
                "run_id": run_id
            }
        except Exception as e:
            return {
                "status": "failure",
                "data": {},
                "log": f"Report generation failed: {str(e)}",
                "confidence": 0.0
            }

    def _build_lca_response(
        self,
        lca_result: Dict[str, Any],
        interpretation: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Build the final LCA response."""
        results = lca_result.get("results", {})
        
        data = {
            "impact_assessment": {
                "total_gwp_kg_co2e": results.get("total_gwp", 0),
                "gwp_per_tonne": results.get("gwp_per_tonne", 0),
                "water_consumption_m3": results.get("total_water", 0),
                "energy_consumption_gj": results.get("total_energy", 0)
            },
            "breakdown": results.get("breakdown", {}),
            "circularity_metrics": results.get("circularity", {}),
            "hotspots": interpretation.get("hotspots", []),
            "recommendations": interpretation.get("recommendations", []),
            "benchmark_comparison": interpretation.get("benchmark_comparison", {}),
            "interpretation": interpretation.get("analysis", "")
        }
        
        log = (
            f"LCA complete. Total GWP: {results.get('total_gwp', 0):,.0f} kg CO2e "
            f"({results.get('gwp_per_tonne', 0):,.0f} kg/t)"
        )
        
        return {
            "status": "success",
            "data": data,
            "log": log,
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }


# For backward compatibility
class LCAAgent(LCAAgentV2):
    """Alias for backward compatibility."""
    pass
