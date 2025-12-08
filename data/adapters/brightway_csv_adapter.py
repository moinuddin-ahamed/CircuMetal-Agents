"""
Brightway CSV Export Adapter.

Ingests LCA data from Brightway2/Brightway25 CSV exports.
Supports activity and exchange data in standard Brightway format.
"""

import csv
import aiofiles
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from .base_adapter import BaseAdapter, AdapterResult, DataQuality


class BrightwayCSVAdapter(BaseAdapter):
    """
    Adapter for Brightway CSV exports.
    
    Brightway exports typically include:
    - Activities (processes)
    - Exchanges (flows between activities)
    - Characterization factors
    
    This adapter handles the standard CSV format used by bw2io.
    """

    # Standard Brightway CSV columns
    ACTIVITY_COLUMNS = [
        "name", "code", "location", "unit", "database", "type",
        "comment", "categories"
    ]
    
    EXCHANGE_COLUMNS = [
        "input_code", "output_code", "amount", "unit", "type",
        "uncertainty_type", "loc", "scale", "formula"
    ]

    def get_required_fields(self) -> List[str]:
        """Required fields for Brightway activity data."""
        return ["name", "code", "unit"]

    async def fetch(self, file_path: str, **kwargs) -> AdapterResult:
        """
        Read CSV file from disk.
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            AdapterResult with raw CSV data
        """
        try:
            path = Path(file_path)
            if not path.exists():
                return AdapterResult(
                    success=False,
                    errors=[f"File not found: {file_path}"]
                )

            async with aiofiles.open(path, mode='r', encoding='utf-8-sig') as f:
                content = await f.read()

            return AdapterResult(
                success=True,
                data=[{"content": content, "file_path": str(path)}],
                source_url=str(path),
                source_type="brightway_csv"
            )

        except Exception as e:
            self.logger.error(f"Error reading file: {e}")
            return AdapterResult(
                success=False,
                errors=[str(e)]
            )

    async def parse(self, raw_data: Any) -> AdapterResult:
        """
        Parse Brightway CSV content.
        
        Args:
            raw_data: Raw CSV content or AdapterResult from fetch
            
        Returns:
            AdapterResult with parsed records
        """
        try:
            if isinstance(raw_data, AdapterResult):
                content = raw_data.data[0]["content"]
            else:
                content = raw_data

            # Parse CSV
            lines = content.strip().split('\n')
            if not lines:
                return AdapterResult(success=False, errors=["Empty CSV file"])

            reader = csv.DictReader(lines)
            records = []
            errors = []
            warnings = []
            
            for i, row in enumerate(reader):
                try:
                    record = self._parse_row(row)
                    is_valid, validation_errors = await self.validate_record(record)
                    
                    if is_valid:
                        record["data_quality"] = self.assess_data_quality(record).value
                        records.append(record)
                    else:
                        errors.extend([f"Row {i+2}: {e}" for e in validation_errors])
                        
                except Exception as e:
                    warnings.append(f"Row {i+2}: {str(e)}")

            return AdapterResult(
                success=len(records) > 0,
                data=records,
                errors=errors,
                warnings=warnings,
                records_processed=len(records),
                records_skipped=len(errors),
                source_type="brightway_csv"
            )

        except Exception as e:
            self.logger.error(f"Parse error: {e}")
            return AdapterResult(success=False, errors=[str(e)])

    def _parse_row(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Parse a single CSV row into structured format."""
        return {
            "name": self.clean_string(row.get("name")),
            "code": self.clean_string(row.get("code")),
            "location": self.clean_string(row.get("location", "GLO")),
            "unit": self.clean_string(row.get("unit")),
            "database": self.clean_string(row.get("database")),
            "type": self.clean_string(row.get("type", "process")),
            "comment": self.clean_string(row.get("comment")),
            "categories": self._parse_categories(row.get("categories")),
            "amount": self.clean_numeric(row.get("amount"), 1.0),
            "uncertainty_type": self.clean_string(row.get("uncertainty_type")),
            "loc": self.clean_numeric(row.get("loc")) if row.get("loc") else None,
            "scale": self.clean_numeric(row.get("scale")) if row.get("scale") else None,
        }

    def _parse_categories(self, categories_str: str) -> List[str]:
        """Parse categories string into list."""
        if not categories_str:
            return []
        # Handle both tuple-like and comma-separated formats
        cleaned = categories_str.strip("()[]").replace("'", "").replace('"', "")
        return [c.strip() for c in cleaned.split(",") if c.strip()]

    def assess_data_quality(self, record: Dict[str, Any]) -> DataQuality:
        """Assess data quality based on Brightway metadata."""
        # Check for uncertainty information
        if record.get("uncertainty_type") and record.get("scale"):
            return DataQuality.HIGH
        elif record.get("comment") or record.get("categories"):
            return DataQuality.MEDIUM
        return DataQuality.LOW

    async def transform_to_inventory(self, data: List[Dict]) -> List[Dict]:
        """
        Transform Brightway records to CircuMetal inventory format.
        
        Maps Brightway activity/exchange data to our Process and Flow models.
        """
        inventories = []
        
        for record in data:
            # Map to CircuMetal inventory structure
            inventory = {
                "name": record["name"],
                "code": record["code"],
                "location": record["location"],
                "unit": record["unit"],
                "source_database": record.get("database", "brightway_import"),
                "categories": record.get("categories", []),
                "data_quality": record.get("data_quality", "medium"),
                "imported_at": datetime.utcnow().isoformat(),
                "original_data": record,
                
                # Map to CircuMetal process fields
                "process_type": self._map_process_type(record),
                "sector": self._infer_sector(record),
                "emission_factor": self._extract_emission_factor(record),
            }
            
            inventories.append(inventory)
        
        return inventories

    def _map_process_type(self, record: Dict) -> str:
        """Map Brightway type to CircuMetal process type."""
        bw_type = record.get("type", "").lower()
        mapping = {
            "process": "production",
            "emission": "emission",
            "production": "production",
            "biosphere": "emission",
            "technosphere": "production",
        }
        return mapping.get(bw_type, "production")

    def _infer_sector(self, record: Dict) -> str:
        """Infer industrial sector from categories and name."""
        categories = record.get("categories", [])
        name = record.get("name", "").lower()
        
        # Check for metal-related keywords
        metal_keywords = ["steel", "iron", "aluminium", "aluminum", "bauxite", 
                          "copper", "zinc", "smelting", "mining", "ore"]
        for kw in metal_keywords:
            if kw in name or any(kw in c.lower() for c in categories):
                return "metals"
        
        # Check for energy
        energy_keywords = ["electricity", "power", "energy", "fuel", "coal", "gas"]
        for kw in energy_keywords:
            if kw in name or any(kw in c.lower() for c in categories):
                return "energy"
        
        return "general"

    def _extract_emission_factor(self, record: Dict) -> Optional[float]:
        """Extract emission factor if available."""
        # Look for CO2 or GWP related amounts
        name = record.get("name", "").lower()
        if "co2" in name or "carbon dioxide" in name:
            return record.get("amount")
        return None


async def load_brightway_export(
    file_path: str,
    transform: bool = True
) -> AdapterResult:
    """
    Convenience function to load a Brightway CSV export.
    
    Args:
        file_path: Path to CSV file
        transform: Whether to transform to CircuMetal format
        
    Returns:
        AdapterResult with processed data
    """
    adapter = BrightwayCSVAdapter()
    
    # Fetch file
    fetch_result = await adapter.fetch(file_path)
    if not fetch_result.success:
        return fetch_result
    
    # Parse CSV
    parse_result = await adapter.parse(fetch_result)
    if not parse_result.success:
        return parse_result
    
    # Transform if requested
    if transform:
        transformed = await adapter.transform_to_inventory(parse_result.data)
        parse_result.data = transformed
        parse_result.metadata["transformed"] = True
    
    return parse_result
