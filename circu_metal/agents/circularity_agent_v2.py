"""
Enhanced Circularity Agent with Material Flow Analysis.

This agent evaluates circular economy metrics and provides
recommendations for improving material circularity.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class CircularityAgentV2(BaseCircuMetalAgent):
    """
    Enhanced circularity agent with material flow analysis.
    
    Capabilities:
    - Material Circularity Indicator (MCI) calculation
    - End-of-life scenario modeling
    - Recycled content optimization
    - Circular economy recommendations
    - Value chain circularity mapping
    """
    
    # Circularity benchmarks by material
    BENCHMARKS: ClassVar[Dict[str, Dict[str, float]]] = {
        "iron_steel": {
            "global_avg_recycled_content": 0.32,
            "best_practice_recycled_content": 0.85,
            "eol_collection_rate": 0.90,
            "downcycling_factor": 0.10
        },
        "aluminium": {
            "global_avg_recycled_content": 0.35,
            "best_practice_recycled_content": 0.75,
            "eol_collection_rate": 0.70,
            "downcycling_factor": 0.05
        },
        "copper": {
            "global_avg_recycled_content": 0.33,
            "best_practice_recycled_content": 0.60,
            "eol_collection_rate": 0.65,
            "downcycling_factor": 0.02
        },
        "zinc": {
            "global_avg_recycled_content": 0.30,
            "best_practice_recycled_content": 0.55,
            "eol_collection_rate": 0.45,
            "downcycling_factor": 0.15
        }
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="circularity_agent",
            model_name=model_name,
            prompt_file="circularity_agent.md",
            service_config=service_config
        )

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process circularity assessment request.
        """
        provenance = []
        action = input_data.get("action", "assess")
        
        if action == "assess":
            return await self._assess_circularity(input_data, provenance, run_id)
        elif action == "mci":
            return await self._calculate_mci(input_data, provenance, run_id)
        elif action == "optimize":
            return await self._optimize_circularity(input_data, provenance, run_id)
        elif action == "benchmark":
            return await self._benchmark_circularity(input_data, provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _assess_circularity(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Comprehensive circularity assessment."""
        metal_type = input_data.get("metal_type", "iron_steel")
        recycled_content = input_data.get("recycled_content", 0.0)
        recyclability = input_data.get("recyclability", 0.9)
        waste_recovery = input_data.get("waste_recovery_rate", 0.5)
        byproduct_util = input_data.get("byproduct_utilization", 0.3)
        product_lifetime = input_data.get("product_lifetime_years", 20)
        
        # Calculate MCI
        mci = self._calculate_mci_score(
            recycled_content=recycled_content,
            recyclability=recyclability,
            waste_recovery=waste_recovery,
            byproduct_util=byproduct_util
        )
        
        # Get benchmarks
        benchmarks = self.BENCHMARKS.get(metal_type, self.BENCHMARKS["iron_steel"])
        
        # Calculate improvement potential
        improvement_potential = self._calculate_improvement_potential(
            current_recycled=recycled_content,
            best_practice=benchmarks["best_practice_recycled_content"]
        )
        
        provenance.append(self._create_provenance(
            source="circularity_calculator",
            citation="Ellen MacArthur Foundation MCI Methodology",
            quality_score=0.85
        ))
        
        # Get LLM recommendations
        recommendations = await self._get_circularity_recommendations(
            mci=mci,
            metal_type=metal_type,
            current_metrics={
                "recycled_content": recycled_content,
                "recyclability": recyclability,
                "waste_recovery": waste_recovery
            }
        )
        
        data = {
            "mci_score": mci,
            "mci_rating": self._get_mci_rating(mci),
            "metrics": {
                "recycled_content": recycled_content,
                "recyclability": recyclability,
                "waste_recovery_rate": waste_recovery,
                "byproduct_utilization": byproduct_util,
                "product_lifetime_years": product_lifetime
            },
            "benchmarks": {
                "global_average": benchmarks["global_avg_recycled_content"],
                "best_practice": benchmarks["best_practice_recycled_content"],
                "your_position": "above_average" if recycled_content > benchmarks["global_avg_recycled_content"] else "below_average"
            },
            "improvement_potential": improvement_potential,
            "recommendations": recommendations.get("recommendations", []),
            "circular_economy_score": mci * 100  # Percentage scale
        }
        
        return {
            "status": "success",
            "data": data,
            "log": f"Circularity assessment: MCI = {mci:.2f} ({self._get_mci_rating(mci)})",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _calculate_mci(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Calculate Material Circularity Indicator."""
        # Call estimation service for circularity
        try:
            result = await self.call_service(
                service="estimation",
                endpoint="/estimate",
                method="POST",
                data={
                    "metal_type": input_data.get("metal_type", "iron_steel"),
                    "recycled_content": input_data.get("recycled_content", 0.0),
                    "recyclability": input_data.get("recyclability", 0.9),
                    "waste_recovery_rate": input_data.get("waste_recovery_rate", 0.5),
                    "byproduct_utilization": input_data.get("byproduct_utilization", 0.3),
                    "estimation_types": ["circularity_score"]
                }
            )
            
            circ = result.get("results", {}).get("circularity_score", {})
            mci = circ.get("value", 0.5)
            
        except Exception as e:
            logger.warning(f"Service call failed, using local calculation: {e}")
            mci = self._calculate_mci_score(
                recycled_content=input_data.get("recycled_content", 0.0),
                recyclability=input_data.get("recyclability", 0.9),
                waste_recovery=input_data.get("waste_recovery_rate", 0.5),
                byproduct_util=input_data.get("byproduct_utilization", 0.3)
            )
        
        provenance.append(self._create_provenance(
            source="mci_calculator",
            citation="Ellen MacArthur Foundation MCI",
            quality_score=0.9
        ))
        
        return {
            "status": "success",
            "data": {
                "mci": mci,
                "rating": self._get_mci_rating(mci),
                "interpretation": self._interpret_mci(mci)
            },
            "log": f"MCI calculated: {mci:.3f}",
            "confidence": 0.9,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _optimize_circularity(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Find optimal circularity configuration."""
        metal_type = input_data.get("metal_type", "iron_steel")
        current_recycled = input_data.get("recycled_content", 0.0)
        target_mci = input_data.get("target_mci", 0.7)
        cost_constraint = input_data.get("max_cost_increase_percent", 10)
        
        # Calculate optimization scenarios
        scenarios = self._generate_optimization_scenarios(
            metal_type=metal_type,
            current_recycled=current_recycled,
            target_mci=target_mci,
            cost_constraint=cost_constraint
        )
        
        # Get LLM analysis
        analysis = await self._analyze_optimization(scenarios, input_data)
        
        provenance.append(self._create_provenance(
            source="circularity_optimizer",
            quality_score=0.8
        ))
        
        return {
            "status": "success",
            "data": {
                "current_mci": self._calculate_mci_score(current_recycled, 0.9, 0.5, 0.3),
                "target_mci": target_mci,
                "scenarios": scenarios,
                "recommended_scenario": scenarios[0] if scenarios else None,
                "analysis": analysis.get("analysis", ""),
                "implementation_steps": analysis.get("steps", [])
            },
            "log": f"Generated {len(scenarios)} optimization scenarios",
            "confidence": 0.8,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _benchmark_circularity(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Benchmark against industry standards."""
        metal_type = input_data.get("metal_type", "iron_steel")
        current_metrics = {
            "recycled_content": input_data.get("recycled_content", 0.0),
            "recyclability": input_data.get("recyclability", 0.9),
            "waste_recovery": input_data.get("waste_recovery_rate", 0.5)
        }
        
        benchmarks = self.BENCHMARKS.get(metal_type, self.BENCHMARKS["iron_steel"])
        
        # Calculate position
        position = self._calculate_benchmark_position(
            current_metrics["recycled_content"],
            benchmarks
        )
        
        provenance.append(self._create_provenance(
            source="industry_benchmarks",
            citation="World Steel Association, IAI, ICSG",
            quality_score=0.85
        ))
        
        return {
            "status": "success",
            "data": {
                "current_metrics": current_metrics,
                "benchmarks": benchmarks,
                "position": position,
                "percentile": position.get("percentile", 50),
                "gap_to_best_practice": position.get("gap", 0)
            },
            "log": f"Benchmark position: {position.get('percentile', 50)}th percentile",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    def _calculate_mci_score(
        self,
        recycled_content: float,
        recyclability: float,
        waste_recovery: float,
        byproduct_util: float
    ) -> float:
        """Calculate Material Circularity Indicator score."""
        # Weights
        w1, w2, w3, w4 = 0.35, 0.30, 0.20, 0.15
        
        mci = (
            w1 * recycled_content +
            w2 * recyclability +
            w3 * waste_recovery +
            w4 * byproduct_util
        )
        
        return max(0.0, min(1.0, mci))

    def _get_mci_rating(self, mci: float) -> str:
        """Get rating label for MCI score."""
        if mci >= 0.8:
            return "Excellent"
        elif mci >= 0.6:
            return "Good"
        elif mci >= 0.4:
            return "Moderate"
        elif mci >= 0.2:
            return "Low"
        else:
            return "Very Low"

    def _interpret_mci(self, mci: float) -> str:
        """Interpret MCI score."""
        if mci >= 0.8:
            return "Highly circular - Leading practice in material circularity"
        elif mci >= 0.6:
            return "Good circularity - Above industry average"
        elif mci >= 0.4:
            return "Moderate circularity - Room for improvement"
        elif mci >= 0.2:
            return "Low circularity - Significant improvement needed"
        else:
            return "Very low circularity - Linear economy model"

    def _calculate_improvement_potential(
        self,
        current_recycled: float,
        best_practice: float
    ) -> Dict[str, Any]:
        """Calculate improvement potential."""
        gap = best_practice - current_recycled
        
        # Estimate emission reduction from increased recycling
        # Typical: 70-95% reduction per unit recycled content
        emission_reduction_potential = gap * 0.80
        
        return {
            "recycled_content_gap": gap,
            "emission_reduction_potential_percent": emission_reduction_potential * 100,
            "estimated_cost_impact": "variable",
            "implementation_complexity": "medium" if gap < 0.3 else "high"
        }

    def _calculate_benchmark_position(
        self,
        recycled_content: float,
        benchmarks: Dict[str, float]
    ) -> Dict[str, Any]:
        """Calculate position relative to benchmarks."""
        avg = benchmarks["global_avg_recycled_content"]
        best = benchmarks["best_practice_recycled_content"]
        
        if recycled_content >= best:
            percentile = 95
            position = "leader"
        elif recycled_content >= avg:
            # Linear interpolation between avg and best
            percentile = 50 + 45 * (recycled_content - avg) / (best - avg)
            position = "above_average"
        else:
            # Linear interpolation between 0 and avg
            percentile = 50 * recycled_content / avg if avg > 0 else 0
            position = "below_average"
        
        return {
            "percentile": round(percentile),
            "position": position,
            "gap": best - recycled_content,
            "gap_to_average": avg - recycled_content
        }

    def _generate_optimization_scenarios(
        self,
        metal_type: str,
        current_recycled: float,
        target_mci: float,
        cost_constraint: float
    ) -> List[Dict[str, Any]]:
        """Generate optimization scenarios."""
        scenarios = []
        benchmarks = self.BENCHMARKS.get(metal_type, self.BENCHMARKS["iron_steel"])
        
        # Scenario 1: Increase recycled content moderately
        scenarios.append({
            "name": "Moderate Recycling Increase",
            "recycled_content": min(current_recycled + 0.15, 0.9),
            "recyclability": 0.9,
            "waste_recovery": 0.6,
            "byproduct_util": 0.4,
            "estimated_cost_increase": 3,
            "implementation_time_months": 6
        })
        
        # Scenario 2: Full secondary route
        scenarios.append({
            "name": "Secondary Production Route",
            "recycled_content": 0.85,
            "recyclability": 0.95,
            "waste_recovery": 0.8,
            "byproduct_util": 0.6,
            "estimated_cost_increase": 8,
            "implementation_time_months": 18
        })
        
        # Scenario 3: Best available technology
        scenarios.append({
            "name": "Best Available Technology",
            "recycled_content": min(current_recycled + 0.25, benchmarks["best_practice_recycled_content"]),
            "recyclability": 0.92,
            "waste_recovery": 0.75,
            "byproduct_util": 0.5,
            "estimated_cost_increase": 5,
            "implementation_time_months": 12
        })
        
        # Calculate MCI for each scenario
        for s in scenarios:
            s["mci"] = self._calculate_mci_score(
                s["recycled_content"],
                s["recyclability"],
                s["waste_recovery"],
                s["byproduct_util"]
            )
            s["meets_target"] = s["mci"] >= target_mci
            s["within_cost"] = s["estimated_cost_increase"] <= cost_constraint
        
        # Sort by MCI
        scenarios.sort(key=lambda x: x["mci"], reverse=True)
        
        return scenarios

    async def _get_circularity_recommendations(
        self,
        mci: float,
        metal_type: str,
        current_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get LLM recommendations for improving circularity."""
        llm_input = {
            "task": "circularity_recommendations",
            "current_mci": mci,
            "metal_type": metal_type,
            "current_metrics": current_metrics,
            "request": (
                "Provide specific, actionable recommendations to improve circularity. "
                "Consider: supply chain changes, technology upgrades, partnerships, "
                "and design for recyclability."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            return self._parse_llm_response(response)
        except Exception as e:
            logger.warning(f"LLM recommendations failed: {e}")
            return {}

    async def _analyze_optimization(
        self,
        scenarios: List[Dict],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """LLM analysis of optimization scenarios."""
        llm_input = {
            "task": "analyze_optimization_scenarios",
            "scenarios": scenarios,
            "context": context,
            "request": (
                "Analyze these circularity optimization scenarios. "
                "Recommend the best path forward considering costs, "
                "timeline, and environmental impact."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            return self._parse_llm_response(response)
        except Exception as e:
            logger.warning(f"LLM analysis failed: {e}")
            return {}


# For backward compatibility
class CircularityAgent(CircularityAgentV2):
    """Alias for backward compatibility."""
    pass
