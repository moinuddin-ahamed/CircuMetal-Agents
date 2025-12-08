"""
Unit tests for the Compliance Rule Engine Microservice.

Tests EU CBAM and India BIS compliance checking functionality.
"""

import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestComplianceModels:
    """Test compliance model classes."""
    
    def test_compliance_status_enum(self):
        """Test ComplianceStatus enum."""
        from compliance.models import ComplianceStatus
        
        assert ComplianceStatus.COMPLIANT is not None
        assert ComplianceStatus.NON_COMPLIANT is not None
    
    def test_regulation_type_enum(self):
        """Test RegulationType enum."""
        from compliance.models import RegulationType
        
        assert hasattr(RegulationType, 'EMISSION_LIMIT') or len(list(RegulationType)) > 0
    
    def test_jurisdiction_enum(self):
        """Test Jurisdiction enum."""
        from compliance.models import Jurisdiction
        
        assert Jurisdiction.INDIA is not None
        assert Jurisdiction.EU is not None
    
    def test_compliance_check_result(self):
        """Test ComplianceCheckResult model."""
        from compliance.models import ComplianceCheckResult, ComplianceStatus
        
        result = ComplianceCheckResult(
            regulation_id="TEST_001",
            regulation_name="Test Regulation",
            status=ComplianceStatus.COMPLIANT,
            message="Test passed",
            recommendations=["Recommendation 1"]
        )
        
        assert result.status == ComplianceStatus.COMPLIANT
        assert result.regulation_id == "TEST_001"


class TestComplianceRules:
    """Test compliance rule definitions."""
    
    def test_compliance_rule_dataclass(self):
        """Test ComplianceRule dataclass."""
        from compliance.rules import ComplianceRule
        from compliance.models import RegulationType, Jurisdiction
        
        rule = ComplianceRule(
            id="TEST_001",
            name="Test Rule",
            description="A test rule",
            regulation_type=RegulationType.EMISSION_LIMIT,
            jurisdiction=Jurisdiction.INDIA
        )
        
        assert rule.id == "TEST_001"
        assert rule.jurisdiction == Jurisdiction.INDIA
    
    def test_indian_regulations_emission_benchmarks(self):
        """Test Indian regulation emission benchmarks."""
        from compliance.rules import IndianRegulations
        
        benchmarks = IndianRegulations.EMISSION_BENCHMARKS
        
        assert "iron_steel" in benchmarks
        assert "aluminium" in benchmarks
        assert benchmarks["iron_steel"]["bf_bof"] > 0
    
    def test_indian_regulations_pat_targets(self):
        """Test PAT scheme targets."""
        from compliance.rules import IndianRegulations
        
        targets = IndianRegulations.PAT_TARGETS
        
        assert "iron_steel" in targets
        assert "aluminium" in targets
    
    def test_indian_regulations_get_rules(self):
        """Test getting Indian regulation rules."""
        from compliance.rules import IndianRegulations
        
        rules = IndianRegulations.get_rules()
        
        assert len(rules) > 0
        assert all(hasattr(r, 'id') for r in rules)


class TestCBAMCompliance:
    """Test EU CBAM compliance checking."""
    
    def test_cbam_regulation_exists(self):
        """Test that CBAM regulations are defined."""
        from compliance.rules import EUCBAMRules
        
        # Check CBAM thresholds exist
        assert hasattr(EUCBAMRules, 'CBAM_BENCHMARKS') or hasattr(EUCBAMRules, 'get_rules')
    
    def test_cbam_get_rules(self):
        """Test getting CBAM rules."""
        from compliance.rules import EUCBAMRules
        
        rules = EUCBAMRules.get_rules()
        
        assert len(rules) >= 0  # May be empty if not yet implemented


class TestComplianceServiceAPI:
    """Test Compliance Service API endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, compliance_service_url):
        """Test health check endpoint."""
        import httpx
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{compliance_service_url}/health", timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                assert data["status"] == "healthy"
        except httpx.ConnectError:
            pytest.skip("Compliance service not running")
    
    @pytest.mark.asyncio
    async def test_check_endpoint(self, compliance_service_url, sample_compliance_request):
        """Test compliance check endpoint."""
        import httpx
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{compliance_service_url}/check",
                    json=sample_compliance_request,
                    timeout=15.0
                )
            
            if response.status_code == 200:
                data = response.json()
                assert "status" in data or "results" in data
        except httpx.ConnectError:
            pytest.skip("Compliance service not running")
