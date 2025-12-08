"""
data.gov.in API Adapter.

Fetches open government data from India's national data portal.
Provides access to industrial, environmental, and energy statistics.
"""

import aiohttp
import asyncio
import json
from typing import Any, Dict, List, Optional
from datetime import datetime
from urllib.parse import urlencode
import os

from .base_adapter import BaseAdapter, AdapterResult, DataQuality


class DataGovInAdapter(BaseAdapter):
    """
    Adapter for data.gov.in Open Government Data Platform.
    
    Provides access to:
    - Ministry of Mines datasets
    - Ministry of Steel production data
    - Ministry of Environment statistics
    - Energy production and consumption data
    
    API Documentation: https://data.gov.in/help/apis
    """

    BASE_URL = "https://api.data.gov.in/resource"
    
    # Useful dataset resource IDs for metals LCA
    DATASETS = {
        # Steel production
        "steel_production": "9ef84268-d588-465a-a308-a864a43d0070",
        # Mineral production
        "mineral_production": "b39a1a18-e5c8-4b5f-9f2c-c58b9c7f1e1f",
        # Power generation
        "power_generation": "b8eb8b7d-71e5-44c7-9c62-4e3e1d4e5b7c",
        # Industrial emissions
        "industrial_emissions": "c2f8a9d1-3e4b-5c6d-7e8f-9a0b1c2d3e4f",
        # Manufacturing output
        "manufacturing_output": "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a",
    }
    
    # Known fields in common datasets
    COMMON_FIELDS = [
        "year", "month", "state", "district", "sector", "commodity",
        "production", "consumption", "exports", "imports", "unit"
    ]

    def __init__(self, api_key: Optional[str] = None, config: Optional[Dict] = None):
        """
        Initialize with API key.
        
        Args:
            api_key: data.gov.in API key. Get from https://data.gov.in/user/register
            config: Optional additional configuration
        """
        super().__init__(config)
        self.api_key = api_key or os.environ.get("DATA_GOV_IN_API_KEY", "")
        self.session: Optional[aiohttp.ClientSession] = None

    async def _ensure_session(self):
        """Ensure aiohttp session exists."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)

    async def close(self):
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()

    def get_required_fields(self) -> List[str]:
        """Required fields for data.gov.in records."""
        return ["year"]  # Minimal requirement

    async def fetch(
        self,
        resource_id: str,
        filters: Optional[Dict[str, str]] = None,
        limit: int = 1000,
        offset: int = 0,
        **kwargs
    ) -> AdapterResult:
        """
        Fetch data from data.gov.in API.
        
        Args:
            resource_id: Dataset resource ID
            filters: Optional field filters (e.g., {"state": "Maharashtra"})
            limit: Max records to return (max 10000)
            offset: Pagination offset
            
        Returns:
            AdapterResult with fetched data
        """
        if not self.api_key:
            return AdapterResult(
                success=False,
                errors=["API key required. Set DATA_GOV_IN_API_KEY environment variable."]
            )

        try:
            await self._ensure_session()
            
            # Build query parameters
            params = {
                "api-key": self.api_key,
                "format": "json",
                "limit": min(limit, 10000),
                "offset": offset,
            }
            
            # Add filters
            if filters:
                for field, value in filters.items():
                    params[f"filters[{field}]"] = value

            url = f"{self.BASE_URL}/{resource_id}?{urlencode(params)}"
            
            self.logger.info(f"Fetching from data.gov.in: {resource_id}")
            
            async with self.session.get(url) as response:
                if response.status == 401:
                    return AdapterResult(
                        success=False,
                        errors=["Invalid API key"]
                    )
                elif response.status == 404:
                    return AdapterResult(
                        success=False,
                        errors=[f"Dataset not found: {resource_id}"]
                    )
                elif response.status != 200:
                    return AdapterResult(
                        success=False,
                        errors=[f"API error: {response.status}"]
                    )

                data = await response.json()
                
                return AdapterResult(
                    success=True,
                    data=[data],
                    source_url=url.split("api-key")[0],  # Don't log API key
                    source_type="data_gov_in",
                    metadata={
                        "total_records": data.get("total", 0),
                        "returned_records": data.get("count", 0),
                        "resource_id": resource_id,
                    }
                )

        except aiohttp.ClientError as e:
            self.logger.error(f"Network error: {e}")
            return AdapterResult(success=False, errors=[f"Network error: {str(e)}"])
        except Exception as e:
            self.logger.error(f"Fetch error: {e}")
            return AdapterResult(success=False, errors=[str(e)])

    async def parse(self, raw_data: Any) -> AdapterResult:
        """
        Parse data.gov.in API response.
        
        The API returns data in a standard format with a 'records' array.
        """
        try:
            if isinstance(raw_data, AdapterResult):
                response = raw_data.data[0]
            else:
                response = raw_data

            records = response.get("records", [])
            
            if not records:
                return AdapterResult(
                    success=False,
                    errors=["No records in API response"],
                    metadata={"total": response.get("total", 0)}
                )

            parsed_records = []
            warnings = []

            for i, record in enumerate(records):
                try:
                    parsed = self._normalize_record(record)
                    parsed["data_quality"] = self.assess_data_quality(parsed).value
                    parsed_records.append(parsed)
                except Exception as e:
                    warnings.append(f"Record {i}: {str(e)}")

            return AdapterResult(
                success=len(parsed_records) > 0,
                data=parsed_records,
                warnings=warnings,
                records_processed=len(parsed_records),
                records_skipped=len(warnings),
                source_type="data_gov_in",
                metadata={
                    "total_available": response.get("total", 0),
                }
            )

        except Exception as e:
            self.logger.error(f"Parse error: {e}")
            return AdapterResult(success=False, errors=[str(e)])

    def _normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize field names and values from API response."""
        normalized = {}
        
        for key, value in record.items():
            # Normalize key to lowercase with underscores
            norm_key = key.lower().replace(" ", "_").replace("-", "_")
            
            # Clean value
            if isinstance(value, str):
                normalized[norm_key] = self.clean_string(value)
            elif isinstance(value, (int, float)):
                normalized[norm_key] = value
            else:
                normalized[norm_key] = value
        
        # Extract common fields with fallbacks
        normalized["year"] = self.parse_year(
            record.get("year") or record.get("Year") or record.get("financial_year")
        )
        normalized["state"] = self.clean_string(
            record.get("state") or record.get("State") or record.get("state_ut")
        )
        
        return normalized

    def assess_data_quality(self, record: Dict[str, Any]) -> DataQuality:
        """Assess data quality for government data."""
        # Government official data is generally reliable
        if record.get("source") and record.get("year"):
            return DataQuality.HIGH
        elif record.get("year"):
            return DataQuality.MEDIUM
        return DataQuality.LOW

    async def transform_to_inventory(self, data: List[Dict]) -> List[Dict]:
        """
        Transform data.gov.in records to CircuMetal format.
        """
        inventories = []
        
        for record in data:
            # Infer sector and category
            sector = self._infer_sector(record)
            
            inventory = {
                "name": self._generate_name(record),
                "code": self._generate_code(record),
                "location": f"IN-{record.get('state', 'IND')[:3].upper()}",
                "unit": record.get("unit", "tonnes"),
                "source_database": "data_gov_in",
                "categories": [sector],
                "data_quality": record.get("data_quality", "medium"),
                "imported_at": datetime.utcnow().isoformat(),
                
                "sector": sector,
                "year": record.get("year"),
                "state": record.get("state"),
                "production": self.clean_numeric(record.get("production")),
                "consumption": self.clean_numeric(record.get("consumption")),
                
                "original_data": record,
            }
            
            inventories.append(inventory)
        
        return inventories

    def _infer_sector(self, record: Dict) -> str:
        """Infer sector from record fields."""
        all_text = " ".join(str(v).lower() for v in record.values())
        
        if any(kw in all_text for kw in ["steel", "iron", "pig iron"]):
            return "iron_steel"
        elif any(kw in all_text for kw in ["aluminium", "aluminum", "bauxite"]):
            return "aluminium"
        elif any(kw in all_text for kw in ["power", "electricity", "energy"]):
            return "energy"
        elif any(kw in all_text for kw in ["coal", "lignite"]):
            return "coal"
        return "general"

    def _generate_name(self, record: Dict) -> str:
        """Generate a descriptive name for the record."""
        commodity = record.get("commodity") or record.get("product") or "Data"
        state = record.get("state", "India")
        year = record.get("year", "")
        return f"{commodity} - {state} ({year})"

    def _generate_code(self, record: Dict) -> str:
        """Generate a unique code for the record."""
        state = record.get("state", "IND")[:3].upper()
        year = str(record.get("year", "0000"))[:4]
        commodity = (record.get("commodity") or "DATA")[:4].upper()
        return f"DGIN-{state}-{commodity}-{year}"

    # Convenience methods for specific datasets
    
    async def fetch_steel_production(
        self,
        year: Optional[int] = None,
        state: Optional[str] = None,
        limit: int = 1000
    ) -> AdapterResult:
        """Fetch steel production statistics."""
        filters = {}
        if year:
            filters["year"] = str(year)
        if state:
            filters["state"] = state
            
        result = await self.fetch(
            self.DATASETS["steel_production"],
            filters=filters,
            limit=limit
        )
        
        if result.success:
            return await self.parse(result)
        return result

    async def fetch_mineral_production(
        self,
        mineral: Optional[str] = None,
        state: Optional[str] = None,
        year: Optional[int] = None,
        limit: int = 1000
    ) -> AdapterResult:
        """Fetch mineral production data."""
        filters = {}
        if mineral:
            filters["mineral"] = mineral
        if state:
            filters["state"] = state
        if year:
            filters["year"] = str(year)
            
        result = await self.fetch(
            self.DATASETS["mineral_production"],
            filters=filters,
            limit=limit
        )
        
        if result.success:
            return await self.parse(result)
        return result

    async def fetch_power_generation(
        self,
        state: Optional[str] = None,
        year: Optional[int] = None,
        limit: int = 1000
    ) -> AdapterResult:
        """Fetch power generation data for grid carbon intensity."""
        filters = {}
        if state:
            filters["state"] = state
        if year:
            filters["year"] = str(year)
            
        result = await self.fetch(
            self.DATASETS["power_generation"],
            filters=filters,
            limit=limit
        )
        
        if result.success:
            return await self.parse(result)
        return result

    async def search_datasets(self, query: str, limit: int = 20) -> AdapterResult:
        """
        Search for datasets on data.gov.in.
        
        Args:
            query: Search query
            limit: Max results
            
        Returns:
            AdapterResult with matching datasets
        """
        if not self.api_key:
            return AdapterResult(
                success=False,
                errors=["API key required"]
            )

        try:
            await self._ensure_session()
            
            # Use the catalog search endpoint
            url = f"https://data.gov.in/backend/api/v2/catalog/search"
            params = {
                "api-key": self.api_key,
                "q": query,
                "limit": limit,
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    return AdapterResult(
                        success=False,
                        errors=[f"Search API error: {response.status}"]
                    )

                data = await response.json()
                
                datasets = []
                for item in data.get("result", {}).get("items", []):
                    datasets.append({
                        "title": item.get("title"),
                        "resource_id": item.get("resource_id"),
                        "description": item.get("description"),
                        "org": item.get("org_title"),
                        "sector": item.get("sector"),
                    })
                
                return AdapterResult(
                    success=True,
                    data=datasets,
                    source_type="data_gov_in_catalog",
                    records_processed=len(datasets)
                )

        except Exception as e:
            return AdapterResult(success=False, errors=[str(e)])


async def create_data_gov_adapter(api_key: Optional[str] = None) -> DataGovInAdapter:
    """
    Create and initialize a data.gov.in adapter.
    
    Args:
        api_key: Optional API key (defaults to environment variable)
        
    Returns:
        Initialized DataGovInAdapter
    """
    return DataGovInAdapter(api_key=api_key)


# Example usage function for documentation
async def example_usage():
    """Example of using the data.gov.in adapter."""
    adapter = await create_data_gov_adapter()
    
    try:
        # Fetch steel production data for Maharashtra
        result = await adapter.fetch_steel_production(
            year=2023,
            state="Maharashtra",
            limit=100
        )
        
        if result.success:
            print(f"Fetched {len(result.data)} records")
            
            # Transform to CircuMetal format
            inventories = await adapter.transform_to_inventory(result.data)
            print(f"Transformed {len(inventories)} inventory records")
        else:
            print(f"Error: {result.errors}")
            
    finally:
        await adapter.close()
