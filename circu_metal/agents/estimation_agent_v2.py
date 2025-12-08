"""
Enhanced Estimation Agent with ML Integration.

This agent combines LLM reasoning with ML-based emission factor estimation
from the estimation microservice.
"""

import os
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class EstimationAgentV2(BaseCircuMetalAgent):
    """
    Enhanced estimation agent with ML integration.
    
    Capabilities:
    - ML-based emission factor estimation
    - Circularity score calculation
    - Energy intensity estimation
    - Uncertainty quantification
    - Hybrid LLM + ML reasoning
    """
    
    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None
    ):
        super().__init__(
            name="estimation_agent",
            model_name=model_name,
            prompt_file="estimation_agent.md",
            service_config=service_config
        )
        
        # Cache for estimation results
        self._estimation_cache: Dict[str, Dict] = {}

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process estimation request using ML service + LLM reasoning.
        """
        provenance = []
        
        # Extract request parameters
        metal_type = input_data.get("metal_type", "iron_steel")
        process_stage = input_data.get("process_stage", "smelting")
        recycled_content = input_data.get("recycled_content", 0.0)
        production_volume = input_data.get("production_volume", 100000)
        energy_source = input_data.get("energy_source", {})
        location = input_data.get("location", "IN")
        technology_level = input_data.get("technology_level", "conventional")
        
        # Build estimation request
        estimation_request = {
            "metal_type": metal_type,
            "process_stage": process_stage,
            "recycled_content": recycled_content,
            "production_volume": production_volume,
            "energy_source": energy_source,
            "location": location,
            "technology_level": technology_level,
            "estimation_types": input_data.get(
                "estimation_types",
                ["emission_factor", "circularity_score", "energy_intensity"]
            )
        }
        
        # Call ML estimation service
        ml_result = await self._call_estimation_service(estimation_request)
        
        if ml_result.get("status") == "success":
            provenance.append(self._create_provenance(
                source="ml_estimation_service",
                citation="CircuMetal ML Estimator v1.0",
                quality_score=ml_result.get("results", {}).get(
                    "emission_factor", {}
                ).get("confidence", 0.7)
            ))
        
        # Enhance with LLM reasoning for context and recommendations
        llm_input = {
            "task": "analyze_estimation",
            "ml_results": ml_result,
            "process_context": {
                "metal_type": metal_type,
                "process_stage": process_stage,
                "location": location,
                "technology": technology_level
            },
            "request": "Analyze the ML estimation results and provide recommendations for reducing emissions and improving circularity."
        }
        
        try:
            llm_response = await self.run_llm(llm_input)
            llm_result = self._parse_llm_response(llm_response)
            provenance.append(self._create_provenance(
                source="llm_reasoning",
                quality_score=0.75
            ))
        except Exception as e:
            logger.warning(f"LLM reasoning failed: {e}")
            llm_result = {}
        
        # Combine results
        return self._build_response(
            ml_result=ml_result,
            llm_result=llm_result,
            provenance=provenance,
            run_id=run_id
        )

    async def _call_estimation_service(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call the ML estimation microservice."""
        try:
            result = await self.call_service(
                service="estimation",
                endpoint="/estimate",
                method="POST",
                data=request
            )
            return result
        except Exception as e:
            logger.error(f"Estimation service call failed: {e}")
            # Fall back to rule-based estimation
            return self._fallback_estimation(request)

    def _fallback_estimation(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fallback rule-based estimation when service is unavailable."""
        from estimation.estimators import (
            EmissionFactorEstimator,
            CircularityEstimator,
            EnergyIntensityEstimator
        )
        
        results = {}
        
        # Emission factor
        ef_estimator = EmissionFactorEstimator()
        ef_result = ef_estimator.estimate(request)
        results["emission_factor"] = {
            "value": ef_result.value,
            "confidence": ef_result.confidence,
            "lower_bound": ef_result.lower_bound,
            "upper_bound": ef_result.upper_bound,
            "method": ef_result.method
        }
        
        # Circularity
        circ_estimator = CircularityEstimator()
        circ_result = circ_estimator.estimate(request)
        results["circularity_score"] = {
            "value": circ_result.value,
            "confidence": circ_result.confidence,
            "lower_bound": circ_result.lower_bound,
            "upper_bound": circ_result.upper_bound,
            "method": circ_result.method
        }
        
        # Energy intensity
        ei_estimator = EnergyIntensityEstimator()
        ei_result = ei_estimator.estimate(request)
        results["energy_intensity"] = {
            "value": ei_result.value,
            "confidence": ei_result.confidence,
            "lower_bound": ei_result.lower_bound,
            "upper_bound": ei_result.upper_bound,
            "method": ei_result.method
        }
        
        return {
            "status": "success",
            "results": results,
            "method": "fallback_rule_based"
        }

    def _build_response(
        self,
        ml_result: Dict[str, Any],
        llm_result: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Build the final response combining ML and LLM results."""
        # Extract estimations
        estimations = ml_result.get("results", {})
        
        # Get emission factor details
        ef = estimations.get("emission_factor", {})
        circ = estimations.get("circularity_score", {})
        ei = estimations.get("energy_intensity", {})
        
        # Calculate overall confidence
        confidences = [
            ef.get("confidence", 0.5),
            circ.get("confidence", 0.5),
            ei.get("confidence", 0.5)
        ]
        avg_confidence = sum(confidences) / len(confidences)
        
        # Build data payload
        data = {
            "emission_factor": {
                "value": ef.get("value", 0),
                "unit": "kg CO2e/tonne",
                "confidence_interval": {
                    "lower": ef.get("lower_bound", 0),
                    "upper": ef.get("upper_bound", 0)
                },
                "method": ef.get("method", "unknown")
            },
            "circularity_score": {
                "value": circ.get("value", 0),
                "scale": "0-1 (MCI-inspired)",
                "confidence_interval": {
                    "lower": circ.get("lower_bound", 0),
                    "upper": circ.get("upper_bound", 0)
                }
            },
            "energy_intensity": {
                "value": ei.get("value", 0),
                "unit": "GJ/tonne",
                "confidence_interval": {
                    "lower": ei.get("lower_bound", 0),
                    "upper": ei.get("upper_bound", 0)
                }
            },
            "recommendations": llm_result.get("recommendations", []),
            "analysis": llm_result.get("analysis", "")
        }
        
        # Build log message
        log_parts = [
            f"Emission factor: {ef.get('value', 0):.1f} kg CO2e/t",
            f"Circularity: {circ.get('value', 0):.2f}",
            f"Energy: {ei.get('value', 0):.1f} GJ/t"
        ]
        log = "Estimation complete. " + ", ".join(log_parts)
        
        return {
            "status": "success",
            "data": data,
            "log": log,
            "confidence": avg_confidence,
            "provenance": provenance,
            "run_id": run_id
        }

    async def estimate_batch(
        self,
        requests: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Estimate multiple processes in batch.
        
        Args:
            requests: List of estimation requests
            
        Returns:
            List of estimation results
        """
        try:
            result = await self.call_service(
                service="estimation",
                endpoint="/estimate/batch",
                method="POST",
                data={"requests": requests}
            )
            return result.get("results", [])
        except Exception as e:
            logger.error(f"Batch estimation failed: {e}")
            return []


# For backward compatibility
class EstimationAgent(EstimationAgentV2):
    """Alias for backward compatibility."""
    pass
