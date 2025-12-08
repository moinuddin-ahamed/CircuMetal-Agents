"""
Enhanced Data Agent for Data Retrieval and Validation.

This agent handles data retrieval from multiple sources,
validation, and quality assessment.
"""

import os
import json
import logging
from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime
from pathlib import Path

from circu_metal.agents.base_agent import BaseCircuMetalAgent, ServiceConfig

logger = logging.getLogger(__name__)


class DataAgentV2(BaseCircuMetalAgent):
    """
    Enhanced data agent for data management.
    
    Capabilities:
    - Multi-source data retrieval
    - Data validation and quality scoring
    - Emission factor lookup
    - Material property database
    - External API integration
    """
    
    # Data quality levels
    QUALITY_LEVELS: ClassVar[Dict[str, Dict[str, Any]]] = {
        "verified": {"score": 1.0, "description": "Third-party verified data"},
        "measured": {"score": 0.9, "description": "Direct measurements"},
        "calculated": {"score": 0.7, "description": "Calculated from known inputs"},
        "estimated": {"score": 0.5, "description": "Estimated using proxies"},
        "default": {"score": 0.3, "description": "Default/generic values"}
    }

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        service_config: Optional[ServiceConfig] = None,
        data_dir: Optional[str] = None
    ):
        super().__init__(
            name="data_agent",
            model_name=model_name,
            prompt_file="data_agent.md",
            service_config=service_config
        )
        
        # Set data directory
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = Path(__file__).parent.parent / "data"
        
        # Load static data
        self._emission_factors = self._load_json("emission_factors.json")
        self._material_properties = self._load_json("material_properties.json")
        self._circularity_benchmarks = self._load_json("circularity_benchmarks.json")
        self._process_templates = self._load_json("process_templates.json")

    def _load_json(self, filename: str) -> Dict[str, Any]:
        """Load JSON data file."""
        filepath = self.data_dir / filename
        if filepath.exists():
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load {filename}: {e}")
        return {}

    async def _async_handle(
        self,
        input_data: Dict[str, Any],
        run_id: str
    ) -> Dict[str, Any]:
        """
        Process data request.
        """
        provenance = []
        action = input_data.get("action", "query")
        
        if action == "query":
            return await self._query_data(input_data, provenance, run_id)
        elif action == "emission_factor":
            return await self._get_emission_factor(input_data, provenance, run_id)
        elif action == "material_properties":
            return await self._get_material_properties(input_data, provenance, run_id)
        elif action == "validate":
            return await self._validate_data(input_data, provenance, run_id)
        elif action == "process_template":
            return await self._get_process_template(input_data, provenance, run_id)
        else:
            return await super()._async_handle(input_data, run_id)

    async def _query_data(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Query data from available sources."""
        query_type = input_data.get("query_type", "emission_factor")
        filters = input_data.get("filters", {})
        
        results = []
        
        if query_type == "emission_factor":
            results = self._search_emission_factors(filters)
            provenance.append(self._create_provenance(
                source="emission_factor_database",
                citation="CircuMetal EF Database v2.0",
                quality_score=0.85
            ))
            
        elif query_type == "material":
            results = self._search_materials(filters)
            provenance.append(self._create_provenance(
                source="material_properties_database",
                quality_score=0.9
            ))
            
        elif query_type == "benchmark":
            results = self._search_benchmarks(filters)
            provenance.append(self._create_provenance(
                source="circularity_benchmarks",
                citation="Industry benchmarks 2024",
                quality_score=0.8
            ))
        
        return {
            "status": "success",
            "data": {
                "query_type": query_type,
                "filters": filters,
                "results": results,
                "result_count": len(results)
            },
            "log": f"Found {len(results)} results for {query_type} query",
            "confidence": 0.85,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _get_emission_factor(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Get emission factor for specific process."""
        material = input_data.get("material", "steel")
        process = input_data.get("process", "smelting")
        location = input_data.get("location", "GLO")
        year = input_data.get("year", datetime.now().year)
        
        # Look up in database
        ef_data = self._lookup_emission_factor(material, process, location)
        
        if ef_data:
            quality = ef_data.get("data_quality", "estimated")
            quality_info = self.QUALITY_LEVELS.get(quality, self.QUALITY_LEVELS["estimated"])
            
            provenance.append(self._create_provenance(
                source=ef_data.get("source", "emission_factor_database"),
                citation=ef_data.get("citation"),
                quality_score=quality_info["score"]
            ))
            
            return {
                "status": "success",
                "data": {
                    "material": material,
                    "process": process,
                    "location": location,
                    "emission_factor": ef_data.get("value", 0),
                    "unit": ef_data.get("unit", "kg CO2e/tonne"),
                    "uncertainty": ef_data.get("uncertainty", 0.2),
                    "data_quality": quality,
                    "quality_score": quality_info["score"],
                    "source": ef_data.get("source"),
                    "year": ef_data.get("year", year)
                },
                "log": f"Found emission factor: {ef_data.get('value', 0)} {ef_data.get('unit', 'kg CO2e/t')}",
                "confidence": quality_info["score"],
                "provenance": provenance,
                "run_id": run_id
            }
        else:
            # Fall back to estimation service
            return await self._estimate_emission_factor(
                material, process, location, provenance, run_id
            )

    async def _estimate_emission_factor(
        self,
        material: str,
        process: str,
        location: str,
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Estimate emission factor using ML service."""
        try:
            result = await self.call_service(
                service="estimation",
                endpoint="/estimate",
                method="POST",
                data={
                    "metal_type": material,
                    "process_stage": process,
                    "location": location,
                    "estimation_types": ["emission_factor"]
                }
            )
            
            ef = result.get("results", {}).get("emission_factor", {})
            
            provenance.append(self._create_provenance(
                source="ml_estimation_service",
                quality_score=ef.get("confidence", 0.6)
            ))
            
            return {
                "status": "success",
                "data": {
                    "material": material,
                    "process": process,
                    "location": location,
                    "emission_factor": ef.get("value", 0),
                    "unit": "kg CO2e/tonne",
                    "uncertainty": 0.25,
                    "data_quality": "estimated",
                    "quality_score": ef.get("confidence", 0.6),
                    "source": "ML Estimation"
                },
                "log": f"Estimated emission factor: {ef.get('value', 0)} kg CO2e/t",
                "confidence": ef.get("confidence", 0.6),
                "provenance": provenance,
                "run_id": run_id
            }
        except Exception as e:
            logger.error(f"Estimation service failed: {e}")
            return {
                "status": "failure",
                "data": {},
                "log": f"Failed to get emission factor: {e}",
                "confidence": 0.0,
                "provenance": provenance,
                "run_id": run_id
            }

    async def _get_material_properties(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Get material properties."""
        material = input_data.get("material", "steel")
        
        props = self._material_properties.get(material, {})
        
        if props:
            provenance.append(self._create_provenance(
                source="material_properties_database",
                quality_score=0.95
            ))
            
            return {
                "status": "success",
                "data": {
                    "material": material,
                    "properties": props,
                    "recyclability": props.get("recyclability", 0.9),
                    "embodied_energy": props.get("embodied_energy", 0),
                    "density": props.get("density", 0)
                },
                "log": f"Found properties for {material}",
                "confidence": 0.95,
                "provenance": provenance,
                "run_id": run_id
            }
        else:
            return {
                "status": "failure",
                "data": {"material": material},
                "log": f"Material {material} not found in database",
                "confidence": 0.0,
                "provenance": provenance,
                "run_id": run_id
            }

    async def _validate_data(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Validate input data quality."""
        data_to_validate = input_data.get("data", {})
        validation_rules = input_data.get("rules", [])
        
        validation_results = []
        issues = []
        
        # Check required fields
        required_fields = ["material", "process", "production_volume"]
        for field in required_fields:
            if field not in data_to_validate:
                issues.append({
                    "field": field,
                    "issue": "missing_required_field",
                    "severity": "error"
                })
            else:
                validation_results.append({
                    "field": field,
                    "status": "valid"
                })
        
        # Check value ranges
        if "production_volume" in data_to_validate:
            vol = data_to_validate["production_volume"]
            if vol <= 0:
                issues.append({
                    "field": "production_volume",
                    "issue": "invalid_value",
                    "message": "Production volume must be positive",
                    "severity": "error"
                })
            elif vol > 10000000:
                issues.append({
                    "field": "production_volume",
                    "issue": "unusual_value",
                    "message": "Very high production volume",
                    "severity": "warning"
                })
        
        if "recycled_content" in data_to_validate:
            rc = data_to_validate["recycled_content"]
            if not 0 <= rc <= 1:
                issues.append({
                    "field": "recycled_content",
                    "issue": "out_of_range",
                    "message": "Recycled content must be between 0 and 1",
                    "severity": "error"
                })
        
        # Calculate overall quality score
        errors = sum(1 for i in issues if i["severity"] == "error")
        warnings = sum(1 for i in issues if i["severity"] == "warning")
        
        if errors > 0:
            quality_score = 0.0
            status = "invalid"
        elif warnings > 0:
            quality_score = 0.7
            status = "valid_with_warnings"
        else:
            quality_score = 1.0
            status = "valid"
        
        provenance.append(self._create_provenance(
            source="data_validator",
            quality_score=0.95
        ))
        
        return {
            "status": "success",
            "data": {
                "validation_status": status,
                "quality_score": quality_score,
                "validation_results": validation_results,
                "issues": issues,
                "error_count": errors,
                "warning_count": warnings
            },
            "log": f"Validation complete: {status} ({errors} errors, {warnings} warnings)",
            "confidence": 0.95,
            "provenance": provenance,
            "run_id": run_id
        }

    async def _get_process_template(
        self,
        input_data: Dict[str, Any],
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Get process template for LCA."""
        material = input_data.get("material", "steel")
        process_type = input_data.get("process_type", "primary")
        
        # Look up template
        key = f"{material}_{process_type}"
        template = self._process_templates.get(key, {})
        
        if not template:
            # Try to get a generic template
            template = self._process_templates.get(material, {})
        
        if template:
            provenance.append(self._create_provenance(
                source="process_template_database",
                quality_score=0.85
            ))
            
            return {
                "status": "success",
                "data": {
                    "material": material,
                    "process_type": process_type,
                    "template": template,
                    "stages": template.get("stages", []),
                    "default_emission_factors": template.get("emission_factors", {})
                },
                "log": f"Found process template for {material} ({process_type})",
                "confidence": 0.85,
                "provenance": provenance,
                "run_id": run_id
            }
        else:
            # Use LLM to generate template
            return await self._generate_process_template(
                material, process_type, provenance, run_id
            )

    async def _generate_process_template(
        self,
        material: str,
        process_type: str,
        provenance: List[Dict],
        run_id: str
    ) -> Dict[str, Any]:
        """Generate process template using LLM."""
        llm_input = {
            "task": "generate_process_template",
            "material": material,
            "process_type": process_type,
            "request": (
                f"Generate a process template for {material} production "
                f"via {process_type} route. Include stages, typical inputs/outputs, "
                f"and emission factors."
            )
        }
        
        try:
            response = await self.run_llm(llm_input)
            template = self._parse_llm_response(response)
            
            provenance.append(self._create_provenance(
                source="llm_generated",
                quality_score=0.6
            ))
            
            return {
                "status": "success",
                "data": {
                    "material": material,
                    "process_type": process_type,
                    "template": template,
                    "generated": True
                },
                "log": f"Generated process template for {material}",
                "confidence": 0.6,
                "provenance": provenance,
                "run_id": run_id
            }
        except Exception as e:
            return {
                "status": "failure",
                "data": {},
                "log": f"Failed to generate template: {e}",
                "confidence": 0.0,
                "provenance": provenance,
                "run_id": run_id
            }

    def _lookup_emission_factor(
        self,
        material: str,
        process: str,
        location: str
    ) -> Optional[Dict[str, Any]]:
        """Look up emission factor from database."""
        # Try exact match
        key = f"{material}_{process}_{location}"
        if key in self._emission_factors:
            return self._emission_factors[key]
        
        # Try without location
        key = f"{material}_{process}"
        if key in self._emission_factors:
            return self._emission_factors[key]
        
        # Try nested structure
        material_data = self._emission_factors.get(material, {})
        if isinstance(material_data, dict):
            process_data = material_data.get(process, {})
            if isinstance(process_data, dict):
                return process_data.get(location, process_data.get("GLO"))
            return {"value": process_data} if process_data else None
        
        return None

    def _search_emission_factors(self, filters: Dict[str, Any]) -> List[Dict]:
        """Search emission factors by filters."""
        results = []
        material_filter = filters.get("material")
        process_filter = filters.get("process")
        
        for key, value in self._emission_factors.items():
            if isinstance(value, dict):
                if material_filter and material_filter not in key:
                    continue
                if process_filter and process_filter not in key:
                    continue
                results.append({"key": key, **value})
        
        return results[:20]  # Limit results

    def _search_materials(self, filters: Dict[str, Any]) -> List[Dict]:
        """Search materials by filters."""
        results = []
        for material, props in self._material_properties.items():
            if isinstance(props, dict):
                results.append({"material": material, **props})
        return results

    def _search_benchmarks(self, filters: Dict[str, Any]) -> List[Dict]:
        """Search benchmarks by filters."""
        results = []
        for key, data in self._circularity_benchmarks.items():
            if isinstance(data, dict):
                results.append({"key": key, **data})
        return results


# For backward compatibility
class DataAgent(DataAgentV2):
    """Alias for backward compatibility."""
    pass
