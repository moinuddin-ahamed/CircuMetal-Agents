"""
Enhanced Scenario Agent for What-If Analysis.

This agent manages scenario creation, comparison, and optimization
for LCA studies.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime
from copy import deepcopy

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class ScenarioAgentV2(BaseCircuMetalAgent):
    """
    Enhanced scenario agent for what-if analysis.
    
    Capabilities:
    - Scenario generation from baseline
    - Multi-scenario comparison
    - Sensitivity analysis
    - Monte Carlo uncertainty analysis
    - Scenario optimization
    """
    
    # Predefined scenario templates
    TEMPLATES: ClassVar[Dict[str, Dict[str, Any]]] = {
        "renewable_energy": {
            "name": "Renewable Energy Transition",
            "description": "Shift to renewable energy sources",
            "modifications": {
                "energy_mix": {
                    "coal": 0.1,
                    "natural_gas": 0.2,
                    "renewable": 0.6,
                    "nuclear": 0.1
                }
            }
        },
        "high_recycling": {
            "name": "High Recycled Content",
            "description": "Maximize recycled material input",
            "modifications": {
                "recycled_content": 0.8,
                "production_route": "eaf" 
            }
        },
        "best_available_tech": {
            "name": "Best Available Technology",
            "description": "Implement BAT across all processes",
            "modifications": {
                "technology_level": "best_available",
                "energy_efficiency_improvement": 0.15
            }
        },
        "carbon_capture": {
            "name": "Carbon Capture & Storage",
            "description": "Deploy CCS on major emission sources",
            "modifications": {
                "ccs_capture_rate": 0.9,
                "ccs_coverage": 0.5
            }
        },
        "india_2030": {
            "name": "India 2030 Grid",
            "description": "Projected India grid mix for 2030",
            "modifications": {
                "energy_mix": {
                    "coal": 0.45,
                    "natural_gas": 0.10,
                    "renewable": 0.35,
                    "nuclear": 0.05,
                    "hydro": 0.05
                },
                "grid_carbon_intensity": 0.55
            }
        }
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="scenario_agent",
            model_name=model_name,
            prompt_file="scenario_agent.md",
            service_config=service_config
        )
        
        # Store active scenarios
        self._scenarios: Dict[str, Dict] = {}

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process scenario request.
        """
        provenance = []
        action = input_data.get("action", "generate")
        
        if action == "generate":
            return await self._generate_scenarios(input_data, provenance, run_id)
        elif action == "compare":
            return await self._compare_scenarios(input_data, provenance, run_id)
        elif action == "sensitivity":
            return await self._sensitivity_analysis(input_data, provenance, run_id)
        elif action == "optimize":
            return await self._optimize_scenario(input_data, provenance, run_id)
        elif action == "templates":
            return self._list_templates(provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _generate_scenarios(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate scenarios from baseline."""
        baseline = input_data.get("baseline", {})
        template_ids = input_data.get("templates", ["renewable_energy", "high_recycling"])
        custom_scenarios = input_data.get("custom_scenarios", [])
        
        scenarios = []
        
        # Add baseline
        baseline_scenario = {
            "id": "baseline",
            "name": "Baseline",
            "description": "Current state",
            "parameters": baseline
        }
        scenarios.append(baseline_scenario)
        
        # Generate from templates
        for template_id in template_ids:
            if template_id in self.TEMPLATES:
                template = self.TEMPLATES[template_id]
                scenario = self._apply_template(baseline, template, template_id)
                scenarios.append(scenario)
        
        # Add custom scenarios
        for idx, custom in enumerate(custom_scenarios):
            scenario = {
                "id": custom.get("id", f"custom_{idx + 1}"),
                "name": custom.get("name", f"Custom Scenario {idx + 1}"),
                "description": custom.get("description", ""),
                "parameters": {**baseline, **custom.get("modifications", {})}
            }
            scenarios.append(scenario)
        
        # Calculate LCA for each scenario
        for scenario in scenarios:
            lca_result = await self._calculate_scenario_lca(scenario["parameters"])
            scenario["lca_results"] = lca_result
        
        provenance.append(self._create_provenance(
            source="scenario_generator",
            quality_score=0.85
        ))
        
        # Store scenarios
        for s in scenarios:
            self._scenarios[s["id"]] = s
        
        return {
            "status": "success",
            "data": {
                "scenarios": scenarios,
                "scenario_count": len(scenarios),
                "comparison_available": True
            },
            "log": f"Generated {len(scenarios)} scenarios including baseline",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _compare_scenarios(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Compare multiple scenarios."""
        scenario_ids = input_data.get("scenario_ids", list(self._scenarios.keys()))
        scenarios = input_data.get("scenarios", [])
        
        # Use stored scenarios or provided ones
        if not scenarios:
            scenarios = [
                self._scenarios[sid] for sid in scenario_ids 
                if sid in self._scenarios
            ]
        
        if len(scenarios) < 2:
            return {
                "status": "failure",
                "data": {},
                "log": "At least 2 scenarios required for comparison",
                "confidence": 0.0
            }
        
        # Extract comparison metrics
        comparison = self._extract_comparison_metrics(scenarios)
        
        # Find best scenario
        best = min(scenarios, key=lambda s: s.get("lca_results", {}).get("total_gwp", float("inf")))
        
        # Calculate improvement from baseline
        baseline = next((s for s in scenarios if s["id"] == "baseline"), scenarios[0])
        baseline_gwp = baseline.get("lca_results", {}).get("total_gwp", 0)
        best_gwp = best.get("lca_results", {}).get("total_gwp", 0)
        
        improvement = 0
        if baseline_gwp > 0:
            improvement = (baseline_gwp - best_gwp) / baseline_gwp * 100
        
        # Get LLM analysis
        analysis = await self._analyze_scenarios(scenarios, comparison)
        
        provenance.append(self._create_provenance(
            source="scenario_comparator",
            quality_score=0.85
        ))
        
        return {
            "status": "success",
            "data": {
                "scenarios": scenarios,
                "comparison": comparison,
                "best_scenario": {
                    "id": best["id"],
                    "name": best["name"],
                    "gwp": best_gwp
                },
                "improvement_potential_percent": round(improvement, 1),
                "ranking": comparison.get("ranking", []),
                "analysis": analysis.get("analysis", ""),
                "recommendations": analysis.get("recommendations", [])
            },
            "log": f"Compared {len(scenarios)} scenarios. Best: {best['name']} ({improvement:.1f}% improvement)",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _sensitivity_analysis(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Perform sensitivity analysis on key parameters."""
        baseline = input_data.get("baseline", {})
        parameters = input_data.get("parameters", ["recycled_content", "renewable_share"])
        variation_range = input_data.get("variation_percent", 20)
        
        sensitivity_results = {}
        
        for param in parameters:
            param_results = await self._analyze_parameter_sensitivity(
                baseline=baseline,
                parameter=param,
                variation_percent=variation_range
            )
            sensitivity_results[param] = param_results
        
        # Rank parameters by sensitivity
        ranking = sorted(
            sensitivity_results.items(),
            key=lambda x: x[1].get("sensitivity_score", 0),
            reverse=True
        )
        
        provenance.append(self._create_provenance(
            source="sensitivity_analyzer",
            quality_score=0.8
        ))
        
        return {
            "status": "success",
            "data": {
                "baseline": baseline,
                "parameters_analyzed": parameters,
                "variation_range_percent": variation_range,
                "sensitivity_results": sensitivity_results,
                "parameter_ranking": [p[0] for p in ranking],
                "most_sensitive": ranking[0][0] if ranking else None
            },
            "log": f"Sensitivity analysis complete for {len(parameters)} parameters",
            "confidence": 0.8,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _optimize_scenario(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Find optimal scenario configuration."""
        baseline = input_data.get("baseline", {})
        target_gwp_reduction = input_data.get("target_gwp_reduction_percent", 30)
        constraints = input_data.get("constraints", {})
        
        # Generate optimization candidates
        candidates = self._generate_optimization_candidates(
            baseline=baseline,
            target_reduction=target_gwp_reduction,
            constraints=constraints
        )
        
        # Evaluate each candidate
        for candidate in candidates:
            lca_result = await self._calculate_scenario_lca(candidate["parameters"])
            candidate["lca_results"] = lca_result
        
        # Find optimal
        baseline_gwp = baseline.get("baseline_gwp", 2000)
        target_gwp = baseline_gwp * (1 - target_gwp_reduction / 100)
        
        feasible = [c for c in candidates if c.get("lca_results", {}).get("gwp_per_tonne", float("inf")) <= target_gwp]
        
        if feasible:
            # Sort by cost
            optimal = min(feasible, key=lambda x: x.get("estimated_cost_increase", 0))
        else:
            optimal = min(candidates, key=lambda x: x.get("lca_results", {}).get("gwp_per_tonne", float("inf")))
        
        provenance.append(self._create_provenance(
            source="scenario_optimizer",
            quality_score=0.75
        ))
        
        return {
            "status": "success",
            "data": {
                "optimal_scenario": optimal,
                "all_candidates": candidates,
                "target_achieved": len(feasible) > 0,
                "target_gwp_reduction_percent": target_gwp_reduction,
                "achieved_reduction_percent": self._calculate_reduction(
                    baseline_gwp, 
                    optimal.get("lca_results", {}).get("gwp_per_tonne", baseline_gwp)
                )
            },
            "log": f"Optimization complete. Target {'achieved' if feasible else 'not fully achieved'}",
            "confidence": 0.75,
            "provenance": provenance,
            "run_id": run_id
        }

    def _list_templates(
        self,
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """List available scenario templates."""
        templates = []
        for tid, template in self.TEMPLATES.items():
            templates.append({
                "id": tid,
                "name": template["name"],
                "description": template["description"],
                "modifications": list(template["modifications"].keys())
            })
        
        return {
            "status": "success",
            "data": {
                "templates": templates,
                "template_count": len(templates)
            },
            "log": f"{len(templates)} scenario templates available",
            "confidence": 1.0,
            "provenance": provenance,
            "run_id": run_id
        }

    def _apply_template(
        self,
        baseline: Dict[str, Any],
        template: Dict[str, Any],
        template_id: str
    ) -> Dict[str, Any]:
        """Apply a template to baseline to create scenario."""
        parameters = deepcopy(baseline)
        
        for key, value in template["modifications"].items():
            if isinstance(value, dict) and isinstance(parameters.get(key), dict):
                parameters[key].update(value)
            else:
                parameters[key] = value
        
        return {
            "id": template_id,
            "name": template["name"],
            "description": template["description"],
            "parameters": parameters
        }

    async def _calculate_scenario_lca(
        self,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate LCA for scenario parameters."""
        try:
            result = await self.call_service(
                service="lca",
                endpoint="/lca/quick",
                method="POST",
                data={
                    "metal_type": parameters.get("metal_type", "steel"),
                    "production_route": parameters.get("production_route", "bf_bof"),
                    "production_volume": parameters.get("production_volume", 100000),
                    "recycled_content": parameters.get("recycled_content", 0.0),
                    "energy_mix": parameters.get("energy_mix", {}),
                    "location": parameters.get("location", "IN")
                }
            )
            return result
        except Exception as e:
            logger.warning(f"LCA service call failed: {e}")
            # Return estimated values
            return self._estimate_lca(parameters)

    def _estimate_lca(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate LCA when service unavailable."""
        base_ef = 1800  # kg CO2e/tonne for steel
        
        recycled = parameters.get("recycled_content", 0.0)
        recycled_savings = recycled * 0.75
        
        energy = parameters.get("energy_mix", {})
        renewable = energy.get("renewable", 0.1)
        energy_savings = renewable * 0.5
        
        tech = parameters.get("technology_level", "conventional")
        tech_factor = {"conventional": 1.0, "best_available": 0.85, "advanced": 0.7}.get(tech, 1.0)
        
        gwp = base_ef * (1 - recycled_savings) * (1 - energy_savings) * tech_factor
        
        return {
            "gwp_per_tonne": gwp,
            "total_gwp": gwp * parameters.get("production_volume", 100000),
            "method": "estimated"
        }

    def _extract_comparison_metrics(
        self,
        scenarios: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract comparison metrics from scenarios."""
        metrics = {
            "gwp": [],
            "recycled_content": [],
            "renewable_share": []
        }
        
        for s in scenarios:
            lca = s.get("lca_results", {})
            params = s.get("parameters", {})
            
            metrics["gwp"].append({
                "scenario": s["id"],
                "value": lca.get("gwp_per_tonne", 0)
            })
            metrics["recycled_content"].append({
                "scenario": s["id"],
                "value": params.get("recycled_content", 0)
            })
            
            energy = params.get("energy_mix", {})
            metrics["renewable_share"].append({
                "scenario": s["id"],
                "value": energy.get("renewable", 0)
            })
        
        # Create ranking by GWP
        ranking = sorted(
            [(s["id"], s.get("lca_results", {}).get("gwp_per_tonne", float("inf"))) for s in scenarios],
            key=lambda x: x[1]
        )
        
        return {
            "metrics": metrics,
            "ranking": [r[0] for r in ranking]
        }

    async def _analyze_parameter_sensitivity(
        self,
        baseline: Dict[str, Any],
        parameter: str,
        variation_percent: float
    ) -> Dict[str, Any]:
        """Analyze sensitivity of a single parameter."""
        # Get baseline value
        baseline_value = self._get_nested_value(baseline, parameter)
        if baseline_value is None:
            baseline_value = 0.5
        
        # Create variations
        low_value = baseline_value * (1 - variation_percent / 100)
        high_value = min(1.0, baseline_value * (1 + variation_percent / 100))
        
        # Calculate LCA for each
        results = {}
        for label, value in [("low", low_value), ("baseline", baseline_value), ("high", high_value)]:
            params = deepcopy(baseline)
            self._set_nested_value(params, parameter, value)
            lca = await self._calculate_scenario_lca(params)
            results[label] = {
                "parameter_value": value,
                "gwp": lca.get("gwp_per_tonne", 0)
            }
        
        # Calculate sensitivity score
        gwp_range = results["high"]["gwp"] - results["low"]["gwp"]
        baseline_gwp = results["baseline"]["gwp"]
        sensitivity_score = abs(gwp_range / baseline_gwp) if baseline_gwp > 0 else 0
        
        return {
            "parameter": parameter,
            "baseline_value": baseline_value,
            "low_value": low_value,
            "high_value": high_value,
            "results": results,
            "sensitivity_score": sensitivity_score,
            "gwp_range": gwp_range
        }

    def _get_nested_value(self, d: Dict, key: str) -> Any:
        """Get value from nested dict using dot notation."""
        keys = key.split(".")
        value = d
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return None
        return value

    def _set_nested_value(self, d: Dict, key: str, value: Any):
        """Set value in nested dict using dot notation."""
        keys = key.split(".")
        for k in keys[:-1]:
            d = d.setdefault(k, {})
        d[keys[-1]] = value

    def _generate_optimization_candidates(
        self,
        baseline: Dict[str, Any],
        target_reduction: float,
        constraints: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate candidate scenarios for optimization."""
        candidates = []
        
        # Candidate 1: Increase recycled content
        c1 = deepcopy(baseline)
        c1["recycled_content"] = min(0.8, c1.get("recycled_content", 0) + 0.3)
        candidates.append({
            "name": "Increased Recycling",
            "parameters": c1,
            "estimated_cost_increase": 5
        })
        
        # Candidate 2: Renewable energy
        c2 = deepcopy(baseline)
        c2["energy_mix"] = {"coal": 0.2, "natural_gas": 0.2, "renewable": 0.5, "nuclear": 0.1}
        candidates.append({
            "name": "Renewable Energy",
            "parameters": c2,
            "estimated_cost_increase": 8
        })
        
        # Candidate 3: Combined approach
        c3 = deepcopy(baseline)
        c3["recycled_content"] = min(0.6, c3.get("recycled_content", 0) + 0.2)
        c3["energy_mix"] = {"coal": 0.3, "natural_gas": 0.2, "renewable": 0.4, "nuclear": 0.1}
        c3["technology_level"] = "best_available"
        candidates.append({
            "name": "Combined Approach",
            "parameters": c3,
            "estimated_cost_increase": 10
        })
        
        return candidates

    def _calculate_reduction(self, baseline: float, actual: float) -> float:
        """Calculate percentage reduction."""
        if baseline <= 0:
            return 0
        return round((baseline - actual) / baseline * 100, 1)

    async def _analyze_scenarios(
        self,
        scenarios: List[Dict],
        comparison: Dict[str, Any]
    ) -> Dict[str, Any]:
        """LLM analysis of scenario comparison."""
        llm_input = {
            "task": "analyze_scenario_comparison",
            "scenarios": [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "gwp": s.get("lca_results", {}).get("gwp_per_tonne", 0)
                }
                for s in scenarios
            ],
            "ranking": comparison.get("ranking", []),
            "request": (
                "Analyze this scenario comparison. Explain why certain scenarios "
                "perform better. Recommend the best path forward considering "
                "feasibility and implementation complexity."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            return self._parse_llm_response(response)
        except Exception as e:
            logger.warning(f"LLM analysis failed: {e}")
            return {}


# For backward compatibility
class ScenarioAgent(ScenarioAgentV2):
    """Alias for backward compatibility."""
    pass
