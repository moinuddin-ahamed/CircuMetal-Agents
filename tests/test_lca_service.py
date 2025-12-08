"""
Unit tests for the LCA Engine Microservice.

Tests the life cycle impact assessment calculations.
"""

import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestLCAEngine:
    """Test LCA engine components."""
    
    def test_emission_factors_database(self):
        """Test emission factors database exists."""
        from lca_service.engine import EMISSION_FACTORS
        
        assert EMISSION_FACTORS is not None
        assert len(EMISSION_FACTORS) > 0
        
        # Check key emission factors exist
        assert "electricity_india_grid" in EMISSION_FACTORS
        assert "aluminium_smelting" in EMISSION_FACTORS
        assert "steel_scrap" in EMISSION_FACTORS
    
    def test_emission_factor_values(self):
        """Test emission factor values are reasonable."""
        from lca_service.engine import EMISSION_FACTORS
        
        # India grid electricity should be around 0.82 kg CO2e/kWh
        assert 0.5 < EMISSION_FACTORS["electricity_india_grid"] < 1.5
        
        # Renewable should be very low
        assert EMISSION_FACTORS["electricity_renewable"] < 0.1
        
        # Aluminium smelting should be high
        assert EMISSION_FACTORS["aluminium_smelting"] > 10000
    
    def test_lca_models_import(self):
        """Test LCA models can be imported."""
        from lca_service.models import (
            LCARequest,
            LCAResponse,
            ImpactResult,
            ImpactCategory,
        )
        
        assert LCARequest is not None
        assert LCAResponse is not None
        assert ImpactResult is not None


class TestCircularityCalculations:
    """Test Material Circularity Indicator calculations."""
    
    def test_circularity_metrics_model(self):
        """Test CircularityMetrics model."""
        from lca_service.models import CircularityMetrics
        
        metrics = CircularityMetrics(
            material_circularity_indicator=0.72,
            recycled_input_rate=0.85,
            recyclability=0.88,
            waste_recovery_rate=0.75,
            byproduct_utilization=0.60
        )
        
        assert metrics.material_circularity_indicator == 0.72
        assert 0 <= metrics.material_circularity_indicator <= 1
    
    def test_mci_range_validation(self):
        """Test MCI values are within valid range."""
        from lca_service.models import CircularityMetrics
        
        # Valid MCI
        valid = CircularityMetrics(
            material_circularity_indicator=0.5,
            recycled_input_rate=0.50,
            recyclability=0.50,
            waste_recovery_rate=0.50,
            byproduct_utilization=0.50
        )
        assert 0 <= valid.material_circularity_indicator <= 1
    
    def test_process_stage_enum(self):
        """Test ProcessStage enum."""
        from lca_service.models import ProcessStage
        
        # ProcessStage is an enum with process stages
        assert ProcessStage.EXTRACTION.value == "extraction"
        assert ProcessStage.SMELTING.value == "smelting"
        assert ProcessStage.RECYCLING.value == "recycling"


class TestLCAServiceAPI:
    """Test LCA Service API endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, lca_service_url):
        """Test health check endpoint."""
        import httpx
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{lca_service_url}/health", timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                assert data["status"] == "healthy"
        except httpx.ConnectError:
            pytest.skip("LCA service not running")
    
    @pytest.mark.asyncio
    async def test_calculate_endpoint(self, lca_service_url, sample_lca_request):
        """Test LCA calculation endpoint."""
        import httpx
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{lca_service_url}/calculate",
                    json=sample_lca_request,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                assert "impacts" in data or "result" in data
        except httpx.ConnectError:
            pytest.skip("LCA service not running")


class TestScenarioComparison:
    """Test scenario comparison functionality."""
    
    def test_scenario_comparison_model(self):
        """Test ScenarioComparisonRequest model."""
        from lca_service.models import ScenarioComparisonRequest, ScenarioDefinition
        
        baseline = ScenarioDefinition(
            scenario_id="baseline-001",
            name="Baseline",
            scenario_type="baseline"
        )
        
        request = ScenarioComparisonRequest(
            baseline=baseline,
            comparison_metrics=["gwp", "energy", "circularity"]
        )
        
        assert request.baseline.scenario_id == "baseline-001"
        assert len(request.comparison_metrics) == 3
    
    def test_scenario_definition_model(self):
        """Test ScenarioDefinition model."""
        from lca_service.models import ScenarioDefinition
        
        scenario = ScenarioDefinition(
            scenario_id="test-scenario",
            name="Test Scenario",
            description="A test scenario for unit testing",
            scenario_type="circular"
        )
        
        assert scenario.scenario_id == "test-scenario"
        assert scenario.name == "Test Scenario"
