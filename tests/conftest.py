"""
Pytest configuration and shared fixtures for CircuMetal tests.
"""

import pytest
import asyncio
import sys
import os
from typing import Generator, AsyncGenerator
from unittest.mock import MagicMock, AsyncMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================================================
# Async Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_inventory_data():
    """Sample LCA inventory data for testing."""
    return {
        "name": "Test Aluminium Inventory",
        "description": "Unit test inventory",
        "project_id": "test-project-001",
        "functional_unit": "1 tonne aluminium ingot",
        "system_boundary": "cradle-to-gate",
        "data": {
            "material_inputs": [
                {
                    "name": "Aluminium Scrap",
                    "amount": 1100,
                    "unit": "kg",
                    "category": "recycled",
                    "recycled_content": 100
                },
                {
                    "name": "Alumina",
                    "amount": 50,
                    "unit": "kg",
                    "category": "primary"
                }
            ],
            "energy_inputs": [
                {
                    "name": "Grid Electricity",
                    "amount": 850,
                    "unit": "kWh",
                    "source": "Indian Grid Mix"
                },
                {
                    "name": "Natural Gas",
                    "amount": 200,
                    "unit": "m3"
                }
            ],
            "process_stages": [
                {
                    "name": "Sorting",
                    "description": "Scrap sorting and preparation",
                    "efficiency": 0.95
                },
                {
                    "name": "Melting",
                    "description": "Furnace melting",
                    "efficiency": 0.92
                },
                {
                    "name": "Refining",
                    "description": "Alloy adjustment and degassing",
                    "efficiency": 0.98
                },
                {
                    "name": "Casting",
                    "description": "Ingot casting",
                    "efficiency": 0.99
                }
            ]
        }
    }


@pytest.fixture
def sample_estimation_request():
    """Sample estimation request for testing."""
    return {
        "material": "aluminium",
        "process_type": "secondary",
        "region": "India",
        "parameters_needed": ["energy_consumption", "ghg_emissions", "water_usage"]
    }


@pytest.fixture
def sample_lca_request():
    """Sample LCA calculation request."""
    return {
        "inventory_data": {
            "material_inputs": [
                {"name": "Aluminium Scrap", "amount": 1100, "unit": "kg", "recycled_content": 100}
            ],
            "energy_inputs": [
                {"name": "Electricity", "amount": 850, "unit": "kWh"}
            ]
        },
        "impact_method": "CML2001",
        "include_uncertainty": False
    }


@pytest.fixture
def sample_compliance_request():
    """Sample compliance check request."""
    return {
        "material": "Aluminium",
        "gwp": 4.2,
        "recycled_content": 85,
        "production_location": "India",
        "export_destination": "EU",
        "annual_production_tonnes": 5000
    }


@pytest.fixture
def sample_circularity_data():
    """Sample circularity calculation data."""
    return {
        "recycled_input_rate": 0.85,
        "recovery_rate": 0.88,
        "utility_factor": 1.0,
        "efficiency_factor": 0.92
    }


# ============================================================================
# Mock Service Fixtures
# ============================================================================

@pytest.fixture
def mock_estimation_service():
    """Mock estimation microservice responses."""
    mock = AsyncMock()
    mock.estimate.return_value = {
        "success": True,
        "estimates": {
            "energy_consumption": {"value": 850, "unit": "kWh/tonne", "confidence": 0.85},
            "ghg_emissions": {"value": 4.2, "unit": "kg CO2e/kg", "confidence": 0.82},
            "water_usage": {"value": 12.5, "unit": "m3/tonne", "confidence": 0.78}
        },
        "data_sources": ["India Minerals Yearbook", "Industry benchmarks"]
    }
    return mock


@pytest.fixture
def mock_lca_service():
    """Mock LCA calculation service responses."""
    mock = AsyncMock()
    mock.calculate.return_value = {
        "success": True,
        "impacts": {
            "gwp": {"value": 4.2, "unit": "kg CO2e", "category": "climate_change"},
            "ap": {"value": 0.025, "unit": "kg SO2e", "category": "acidification"},
            "ep": {"value": 0.003, "unit": "kg PO4e", "category": "eutrophication"},
            "ozone": {"value": 1.2e-7, "unit": "kg CFC-11e", "category": "ozone_depletion"},
            "abiotic": {"value": 0.015, "unit": "kg Sb-e", "category": "resource_depletion"}
        },
        "total_energy": 850,
        "methodology": "CML2001"
    }
    return mock


@pytest.fixture
def mock_compliance_service():
    """Mock compliance checking service responses."""
    mock = AsyncMock()
    mock.check.return_value = {
        "success": True,
        "regulations_checked": ["EU_CBAM", "INDIA_BIS"],
        "overall_status": "COMPLIANT",
        "findings": [
            {
                "regulation": "EU_CBAM",
                "status": "COMPLIANT",
                "details": "GWP within acceptable range for aluminium",
                "recommendations": []
            },
            {
                "regulation": "INDIA_BIS",
                "status": "COMPLIANT", 
                "details": "Meets BIS 15173:2002 requirements",
                "recommendations": []
            }
        ]
    }
    return mock


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture
def mock_mongodb():
    """Mock MongoDB connection for testing without database."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_collection.find_one = AsyncMock(return_value=None)
    mock_collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id="test-id"))
    mock_collection.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    mock_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)
    return mock_db


# ============================================================================
# HTTP Client Fixtures
# ============================================================================

@pytest.fixture
def api_base_url():
    """Base URL for API testing."""
    return os.environ.get("TEST_API_URL", "http://localhost:8000")


@pytest.fixture
def estimation_service_url():
    """Estimation service URL for testing."""
    return os.environ.get("TEST_ESTIMATION_URL", "http://localhost:8001")


@pytest.fixture
def lca_service_url():
    """LCA service URL for testing."""
    return os.environ.get("TEST_LCA_URL", "http://localhost:8002")


@pytest.fixture
def compliance_service_url():
    """Compliance service URL for testing."""
    return os.environ.get("TEST_COMPLIANCE_URL", "http://localhost:8003")
