"""
LCA Calculation Engine.

Implements life cycle assessment calculations following ISO 14040/14044.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime

from .models import (
    LCARequest,
    LCAResponse,
    ImpactResult,
    ImpactCategory,
    CircularityMetrics,
    ProcessDefinition,
    ProcessStage,
    ScenarioComparison,
    ScenarioComparisonRequest,
    ScenarioComparisonResult,
    ScenarioDefinition,
)

logger = logging.getLogger(__name__)


# Emission factors database (kg CO2e per unit)
EMISSION_FACTORS = {
    # Energy sources (per kWh or GJ)
    "electricity_india_grid": 0.82,      # kg CO2e/kWh
    "electricity_renewable": 0.02,
    "coal": 2.9,                          # kg CO2e/kg coal
    "natural_gas": 56.1,                  # kg CO2e/GJ
    "diesel": 2.68,                       # kg CO2e/litre
    
    # Iron & Steel
    "iron_ore_mining": 45.0,              # kg CO2e/tonne ore
    "coking_coal": 2900.0,                # kg CO2e/tonne
    "limestone": 12.0,                    # kg CO2e/tonne
    "bf_hot_metal": 1650.0,               # kg CO2e/tonne
    "bof_steel": 180.0,                   # kg CO2e/tonne
    "eaf_steel": 280.0,                   # kg CO2e/tonne (grid dependent)
    "steel_scrap": 60.0,                  # kg CO2e/tonne (collection + processing)
    "steel_rolling": 150.0,               # kg CO2e/tonne
    
    # Aluminium
    "bauxite_mining": 35.0,               # kg CO2e/tonne
    "alumina_bayer": 850.0,               # kg CO2e/tonne alumina
    "aluminium_smelting": 12500.0,        # kg CO2e/tonne (coal power)
    "aluminium_smelting_renewable": 2000.0,
    "aluminium_remelting": 450.0,         # kg CO2e/tonne
    "aluminium_scrap": 70.0,              # kg CO2e/tonne
    
    # Transport
    "truck_transport": 0.062,             # kg CO2e/tonne-km
    "rail_transport": 0.022,              # kg CO2e/tonne-km
    "ship_transport": 0.016,              # kg CO2e/tonne-km
}

# Water footprint factors (m³ per tonne)
WATER_FACTORS = {
    "iron_ore_mining": 0.5,
    "bf_hot_metal": 3.5,
    "steel_rolling": 2.0,
    "bauxite_mining": 0.2,
    "alumina_bayer": 2.5,
    "aluminium_smelting": 1.5,
}

# Energy intensity factors (GJ per tonne)
ENERGY_FACTORS = {
    "iron_ore_mining": 0.5,
    "bf_hot_metal": 18.0,
    "bof_steel": 0.5,
    "eaf_steel": 1.6,
    "steel_rolling": 2.5,
    "bauxite_mining": 0.3,
    "alumina_bayer": 12.0,
    "aluminium_smelting": 55.0,
    "aluminium_remelting": 3.0,
}


@dataclass
class ProcessResult:
    """Result of process calculation."""
    stage: str
    gwp: float
    water: float
    energy: float
    inputs_used: Dict[str, float] = field(default_factory=dict)
    emissions: Dict[str, float] = field(default_factory=dict)


class LCAEngine:
    """
    Life Cycle Assessment calculation engine.
    
    Implements cradle-to-gate LCA for metal production following ISO 14040.
    """
    
    def __init__(self):
        """Initialize LCA engine."""
        self.emission_factors = EMISSION_FACTORS.copy()
        self.water_factors = WATER_FACTORS.copy()
        self.energy_factors = ENERGY_FACTORS.copy()
    
    def calculate(self, request: LCARequest) -> LCAResponse:
        """
        Perform LCA calculation.
        
        Args:
            request: LCA calculation request
            
        Returns:
            LCAResponse with impact results
        """
        import time
        import uuid
        
        start_time = time.time()
        request_id = f"lca_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"Starting LCA calculation: {request.name}")
        
        # If processes provided, use them; otherwise generate from parameters
        if request.processes:
            process_results = self._calculate_from_processes(request)
        else:
            process_results = self._calculate_from_parameters(request)
        
        # Aggregate results
        total_gwp = sum(r.gwp for r in process_results)
        total_water = sum(r.water for r in process_results)
        total_energy = sum(r.energy for r in process_results)
        
        # Build process contributions
        process_contributions = {}
        for result in process_results:
            process_contributions[result.stage] = {
                "gwp": result.gwp,
                "water": result.water,
                "energy": result.energy,
                "share_gwp": result.gwp / total_gwp if total_gwp > 0 else 0,
            }
        
        # Calculate circularity metrics
        circularity = self._calculate_circularity(request)
        
        # Build impact results
        impacts = []
        
        if ImpactCategory.GWP in request.impact_categories:
            gwp_breakdown = {r.stage: r.gwp for r in process_results}
            impacts.append(ImpactResult(
                category=ImpactCategory.GWP,
                value=round(total_gwp, 2),
                unit="kg CO2e",
                breakdown=gwp_breakdown,
                confidence=0.85,
                data_quality="medium"
            ))
        
        if ImpactCategory.WATER in request.impact_categories:
            water_breakdown = {r.stage: r.water for r in process_results}
            impacts.append(ImpactResult(
                category=ImpactCategory.WATER,
                value=round(total_water, 2),
                unit="m³",
                breakdown=water_breakdown,
                confidence=0.75,
                data_quality="medium"
            ))
        
        if ImpactCategory.ENERGY in request.impact_categories:
            energy_breakdown = {r.stage: r.energy for r in process_results}
            impacts.append(ImpactResult(
                category=ImpactCategory.ENERGY,
                value=round(total_energy, 2),
                unit="GJ",
                breakdown=energy_breakdown,
                confidence=0.80,
                data_quality="medium"
            ))
        
        processing_time = (time.time() - start_time) * 1000
        
        response = LCAResponse(
            request_id=request_id,
            name=request.name,
            functional_unit=request.functional_unit,
            metal_type=request.metal_type,
            impacts=impacts,
            total_gwp=round(total_gwp, 2),
            circularity=circularity,
            process_contributions=process_contributions,
            calculation_method="process_lca",
            data_sources=["CircuMetal emission factors", "IPCC guidelines"],
            assumptions=[
                f"Recycled content: {request.recycled_content*100:.0f}%",
                f"Energy mix: {request.energy_source}",
                f"Allocation method: {request.allocation_method}",
            ],
            processing_time_ms=round(processing_time, 2)
        )
        
        logger.info(f"LCA complete: {total_gwp:.0f} kg CO2e per {request.functional_unit}")
        
        return response
    
    def _calculate_from_parameters(self, request: LCARequest) -> List[ProcessResult]:
        """Calculate LCA from high-level parameters."""
        results = []
        
        recycled = request.recycled_content
        energy_source = request.energy_source
        
        if request.metal_type == "iron_steel":
            results = self._calculate_steel_lca(recycled, energy_source, request)
        elif request.metal_type == "aluminium":
            results = self._calculate_aluminium_lca(recycled, energy_source, request)
        else:
            # Generic metal calculation
            results = self._calculate_generic_metal_lca(request)
        
        return results
    
    def _calculate_steel_lca(
        self, 
        recycled: float, 
        energy_source: Dict[str, float],
        request: LCARequest
    ) -> List[ProcessResult]:
        """Calculate LCA for steel production."""
        results = []
        
        # Determine route based on recycled content
        if recycled >= 0.7:
            # EAF route (scrap-based)
            route = "eaf"
        elif recycled >= 0.3:
            # Mixed route
            route = "mixed"
        else:
            # BF-BOF route (ore-based)
            route = "bf_bof"
        
        # Grid carbon intensity
        grid_intensity = self._get_grid_intensity(energy_source)
        
        # 1. Raw materials
        if route == "bf_bof":
            # Iron ore mining
            ore_needed = 1.6 * (1 - recycled)  # tonnes ore per tonne steel
            mining_gwp = ore_needed * self.emission_factors["iron_ore_mining"]
            mining_water = ore_needed * self.water_factors.get("iron_ore_mining", 0.5)
            mining_energy = ore_needed * self.energy_factors.get("iron_ore_mining", 0.5)
            
            results.append(ProcessResult(
                stage="extraction",
                gwp=mining_gwp,
                water=mining_water,
                energy=mining_energy,
                inputs_used={"iron_ore": ore_needed}
            ))
            
            # Blast furnace
            hot_metal_needed = 0.92 * (1 - recycled)
            bf_gwp = hot_metal_needed * self.emission_factors["bf_hot_metal"]
            bf_water = hot_metal_needed * self.water_factors.get("bf_hot_metal", 3.5)
            bf_energy = hot_metal_needed * self.energy_factors.get("bf_hot_metal", 18.0)
            
            results.append(ProcessResult(
                stage="smelting",
                gwp=bf_gwp,
                water=bf_water,
                energy=bf_energy,
                inputs_used={"hot_metal": hot_metal_needed}
            ))
            
            # BOF steelmaking
            bof_gwp = self.emission_factors["bof_steel"] * (1 - recycled)
            
            results.append(ProcessResult(
                stage="refining",
                gwp=bof_gwp,
                water=0.5,
                energy=0.5,
                inputs_used={"crude_steel": 1.0}
            ))
        
        # Scrap processing (for recycled content)
        if recycled > 0:
            scrap_gwp = recycled * self.emission_factors["steel_scrap"]
            
            results.append(ProcessResult(
                stage="recycling",
                gwp=scrap_gwp,
                water=0.3 * recycled,
                energy=0.5 * recycled,
                inputs_used={"steel_scrap": recycled * 1.05}
            ))
        
        # EAF (if applicable)
        if route in ["eaf", "mixed"]:
            eaf_fraction = recycled if route == "mixed" else 1.0
            # EAF GWP depends on grid
            eaf_base = self.emission_factors["eaf_steel"]
            eaf_gwp = eaf_fraction * eaf_base * grid_intensity
            eaf_energy = eaf_fraction * self.energy_factors.get("eaf_steel", 1.6)
            
            results.append(ProcessResult(
                stage="eaf_smelting",
                gwp=eaf_gwp,
                water=0.5 * eaf_fraction,
                energy=eaf_energy,
                inputs_used={"electricity_kwh": 450 * eaf_fraction}
            ))
        
        # Rolling
        rolling_gwp = self.emission_factors["steel_rolling"]
        rolling_water = self.water_factors.get("steel_rolling", 2.0)
        rolling_energy = self.energy_factors.get("steel_rolling", 2.5)
        
        results.append(ProcessResult(
            stage="rolling",
            gwp=rolling_gwp,
            water=rolling_water,
            energy=rolling_energy
        ))
        
        # Transport (if included)
        if request.include_transport:
            transport_distance = 250  # km default
            transport_gwp = transport_distance * self.emission_factors["truck_transport"]
            
            results.append(ProcessResult(
                stage="transport",
                gwp=transport_gwp,
                water=0,
                energy=transport_distance * 0.001
            ))
        
        return results
    
    def _calculate_aluminium_lca(
        self,
        recycled: float,
        energy_source: Dict[str, float],
        request: LCARequest
    ) -> List[ProcessResult]:
        """Calculate LCA for aluminium production."""
        results = []
        
        grid_intensity = self._get_grid_intensity(energy_source)
        renewable_share = energy_source.get("renewable", 0.0)
        
        # Primary aluminium route
        primary_fraction = 1 - recycled
        
        if primary_fraction > 0:
            # Bauxite mining
            bauxite_needed = primary_fraction * 5.0  # ~5 tonnes bauxite per tonne Al
            bauxite_gwp = bauxite_needed * self.emission_factors["bauxite_mining"]
            bauxite_water = bauxite_needed * self.water_factors.get("bauxite_mining", 0.2)
            bauxite_energy = bauxite_needed * self.energy_factors.get("bauxite_mining", 0.3)
            
            results.append(ProcessResult(
                stage="extraction",
                gwp=bauxite_gwp,
                water=bauxite_water,
                energy=bauxite_energy,
                inputs_used={"bauxite": bauxite_needed}
            ))
            
            # Alumina refining (Bayer process)
            alumina_needed = primary_fraction * 1.93
            alumina_gwp = alumina_needed * self.emission_factors["alumina_bayer"]
            alumina_water = alumina_needed * self.water_factors.get("alumina_bayer", 2.5)
            alumina_energy = alumina_needed * self.energy_factors.get("alumina_bayer", 12.0)
            
            results.append(ProcessResult(
                stage="refining",
                gwp=alumina_gwp,
                water=alumina_water,
                energy=alumina_energy,
                inputs_used={"alumina": alumina_needed}
            ))
            
            # Smelting (Hall-Héroult)
            # Highly dependent on electricity source
            if renewable_share > 0.5:
                smelting_ef = self.emission_factors["aluminium_smelting_renewable"]
            else:
                smelting_ef = self.emission_factors["aluminium_smelting"]
            
            smelting_gwp = primary_fraction * smelting_ef * grid_intensity
            smelting_water = primary_fraction * self.water_factors.get("aluminium_smelting", 1.5)
            smelting_energy = primary_fraction * self.energy_factors.get("aluminium_smelting", 55.0)
            
            results.append(ProcessResult(
                stage="smelting",
                gwp=smelting_gwp,
                water=smelting_water,
                energy=smelting_energy,
                inputs_used={"electricity_kwh": primary_fraction * 14500}
            ))
        
        # Secondary aluminium (recycling)
        if recycled > 0:
            # Scrap collection and processing
            scrap_gwp = recycled * self.emission_factors["aluminium_scrap"]
            
            results.append(ProcessResult(
                stage="scrap_processing",
                gwp=scrap_gwp,
                water=0.2 * recycled,
                energy=0.3 * recycled,
                inputs_used={"aluminium_scrap": recycled * 1.08}
            ))
            
            # Remelting
            remelt_gwp = recycled * self.emission_factors["aluminium_remelting"]
            remelt_water = recycled * 0.3
            remelt_energy = recycled * self.energy_factors.get("aluminium_remelting", 3.0)
            
            results.append(ProcessResult(
                stage="remelting",
                gwp=remelt_gwp,
                water=remelt_water,
                energy=remelt_energy,
                inputs_used={"electricity_kwh": recycled * 350}
            ))
        
        # Transport
        if request.include_transport:
            transport_gwp = 300 * self.emission_factors["truck_transport"]  # 300 km
            
            results.append(ProcessResult(
                stage="transport",
                gwp=transport_gwp,
                water=0,
                energy=0.3
            ))
        
        return results
    
    def _calculate_generic_metal_lca(self, request: LCARequest) -> List[ProcessResult]:
        """Generic metal LCA calculation."""
        recycled = request.recycled_content
        
        # Simplified calculation
        base_gwp = 1500  # Default kg CO2e/tonne
        adjusted_gwp = base_gwp * (1 - recycled * 0.7)
        
        return [
            ProcessResult(
                stage="production",
                gwp=adjusted_gwp,
                water=5.0,
                energy=15.0
            )
        ]
    
    def _calculate_from_processes(self, request: LCARequest) -> List[ProcessResult]:
        """Calculate LCA from detailed process definitions."""
        results = []
        
        for process in request.processes:
            # Calculate emissions from inputs
            gwp = 0.0
            water = 0.0
            energy = 0.0
            
            for inp in process.inputs:
                if inp.emission_factor:
                    gwp += inp.amount * inp.emission_factor
                elif inp.name in self.emission_factors:
                    gwp += inp.amount * self.emission_factors[inp.name]
                
                if inp.category == "energy":
                    energy += inp.amount * 0.0036  # kWh to GJ
            
            # Add process-specific emissions
            gwp += process.emission_factors.get("gwp", 0)
            water += process.emission_factors.get("water", 0)
            energy += process.emission_factors.get("energy", 0)
            
            results.append(ProcessResult(
                stage=process.stage.value,
                gwp=gwp,
                water=water,
                energy=energy,
                inputs_used={inp.name: inp.amount for inp in process.inputs}
            ))
        
        return results
    
    def _calculate_circularity(self, request: LCARequest) -> CircularityMetrics:
        """Calculate circularity metrics."""
        recycled_input = request.recycled_content
        
        # Metals are highly recyclable
        recyclability = 0.95 if request.metal_type in ["iron_steel", "aluminium"] else 0.80
        
        # Estimate waste recovery (byproduct use)
        waste_recovery = 0.4 + recycled_input * 0.3
        
        # Byproduct utilization (slag, dross)
        byproduct_util = 0.3 if recycled_input < 0.5 else 0.5
        
        # Material Circularity Indicator (simplified)
        # MCI = 1 - Linear Flow Index
        linear_fraction = (1 - recycled_input) * (1 - recyclability * 0.9)
        mci = 1 - linear_fraction
        mci = max(0, min(1, mci))
        
        return CircularityMetrics(
            material_circularity_indicator=round(mci, 3),
            recycled_input_rate=recycled_input,
            recyclability=recyclability,
            waste_recovery_rate=round(waste_recovery, 3),
            byproduct_utilization=round(byproduct_util, 3)
        )
    
    def _get_grid_intensity(self, energy_source: Dict[str, float]) -> float:
        """Calculate effective grid carbon intensity multiplier."""
        renewable = energy_source.get("renewable", 0.0)
        coal = energy_source.get("coal", 0.0)
        
        # Base is 1.0 for Indian grid average
        intensity = 1.0
        
        # Adjust for renewable share
        intensity -= renewable * 0.8
        
        # Adjust for coal-heavy mix
        intensity += coal * 0.2
        
        return max(0.1, min(1.5, intensity))
    
    def compare_scenarios(
        self, 
        request: ScenarioComparisonRequest
    ) -> ScenarioComparison:
        """
        Compare multiple LCA scenarios.
        
        Args:
            request: Comparison request with baseline and alternatives
            
        Returns:
            ScenarioComparison with relative improvements
        """
        # Calculate baseline
        baseline_lca = self._calculate_scenario(request.baseline)
        
        baseline_result = ScenarioComparisonResult(
            scenario_id=request.baseline.scenario_id,
            name=request.baseline.name,
            scenario_type=request.baseline.scenario_type,
            impacts={
                "gwp": baseline_lca.total_gwp,
                "energy": sum(i.value for i in baseline_lca.impacts if i.category == ImpactCategory.ENERGY),
                "water": sum(i.value for i in baseline_lca.impacts if i.category == ImpactCategory.WATER),
            },
            circularity_score=baseline_lca.circularity.material_circularity_indicator,
            relative_to_baseline={"gwp": 0.0, "circularity": 0.0}
        )
        
        # Calculate alternatives
        alternative_results = []
        best_scenario = request.baseline.name
        max_gwp_reduction = 0.0
        max_circularity_improvement = 0.0
        
        for alt in request.alternatives:
            alt_lca = self._calculate_scenario(alt)
            
            # Calculate relative changes
            gwp_reduction = (baseline_lca.total_gwp - alt_lca.total_gwp) / baseline_lca.total_gwp
            circ_improvement = (
                alt_lca.circularity.material_circularity_indicator - 
                baseline_lca.circularity.material_circularity_indicator
            )
            
            alt_result = ScenarioComparisonResult(
                scenario_id=alt.scenario_id,
                name=alt.name,
                scenario_type=alt.scenario_type,
                impacts={
                    "gwp": alt_lca.total_gwp,
                    "energy": sum(i.value for i in alt_lca.impacts if i.category == ImpactCategory.ENERGY),
                    "water": sum(i.value for i in alt_lca.impacts if i.category == ImpactCategory.WATER),
                },
                circularity_score=alt_lca.circularity.material_circularity_indicator,
                relative_to_baseline={
                    "gwp_reduction": round(gwp_reduction * 100, 1),
                    "circularity_improvement": round(circ_improvement * 100, 1),
                }
            )
            
            alternative_results.append(alt_result)
            
            if gwp_reduction > max_gwp_reduction:
                max_gwp_reduction = gwp_reduction
                best_scenario = alt.name
            
            if circ_improvement > max_circularity_improvement:
                max_circularity_improvement = circ_improvement
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            baseline_result, alternative_results
        )
        
        return ScenarioComparison(
            project_id=request.project_id,
            baseline=baseline_result,
            alternatives=alternative_results,
            best_scenario=best_scenario,
            max_gwp_reduction=round(max_gwp_reduction * 100, 1),
            max_circularity_improvement=round(max_circularity_improvement * 100, 1),
            recommendations=recommendations
        )
    
    def _calculate_scenario(self, scenario: ScenarioDefinition) -> LCAResponse:
        """Calculate LCA for a scenario definition."""
        if scenario.lca_request:
            return self.calculate(scenario.lca_request)
        
        # Build request from parameters
        params = scenario.parameters
        request = LCARequest(
            name=scenario.name,
            metal_type=params.get("metal_type", "iron_steel"),
            production_volume=params.get("production_volume", 1000000),
            recycled_content=params.get("recycled_content", 0.0),
            energy_source=params.get("energy_source", {"grid": 1.0}),
        )
        
        return self.calculate(request)
    
    def _generate_recommendations(
        self,
        baseline: ScenarioComparisonResult,
        alternatives: List[ScenarioComparisonResult]
    ) -> List[str]:
        """Generate recommendations based on scenario comparison."""
        recommendations = []
        
        # Find best alternative
        if alternatives:
            best_alt = max(alternatives, key=lambda x: x.relative_to_baseline.get("gwp_reduction", 0))
            
            if best_alt.relative_to_baseline.get("gwp_reduction", 0) > 50:
                recommendations.append(
                    f"Adopting '{best_alt.name}' could reduce GWP by "
                    f"{best_alt.relative_to_baseline.get('gwp_reduction', 0):.0f}%"
                )
            
            # Circularity recommendations
            if best_alt.circularity_score > 0.7:
                recommendations.append(
                    f"'{best_alt.name}' achieves high circularity score of "
                    f"{best_alt.circularity_score:.2f}"
                )
            
            # Energy recommendations
            if best_alt.impacts.get("energy", 0) < baseline.impacts.get("energy", 999) * 0.7:
                recommendations.append(
                    "Consider transitioning to the circular scenario for significant energy savings"
                )
        
        # General recommendations
        if baseline.circularity_score < 0.3:
            recommendations.append(
                "Increase recycled content to improve circularity and reduce environmental impact"
            )
        
        if not recommendations:
            recommendations.append(
                "Continue monitoring and optimizing production processes"
            )
        
        return recommendations
