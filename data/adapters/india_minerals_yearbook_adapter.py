"""
India Minerals Yearbook Adapter.

Ingests mineral production data from the Indian Bureau of Mines
Minerals Yearbook publications. Supports PDF and pre-extracted CSV.
"""

import re
import csv
import aiofiles
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from .base_adapter import BaseAdapter, AdapterResult, DataQuality


class IndiaMineralsYearbookAdapter(BaseAdapter):
    """
    Adapter for India Minerals Yearbook data.
    
    The Indian Bureau of Mines publishes annual Minerals Yearbook with:
    - State-wise mineral production statistics
    - Mine-wise production data
    - Reserve estimates
    - Export/import statistics
    
    This adapter handles pre-extracted CSV/Excel data from the yearbooks.
    For PDF extraction, use the pdf_extractor utility first.
    """

    # India-specific constants
    IRON_ORE_STATES = [
        "Odisha", "Chhattisgarh", "Karnataka", "Jharkhand", 
        "Goa", "Maharashtra", "Madhya Pradesh"
    ]
    
    BAUXITE_STATES = [
        "Odisha", "Gujarat", "Jharkhand", "Maharashtra",
        "Chhattisgarh", "Madhya Pradesh", "Tamil Nadu"
    ]
    
    # Unit conversions to metric tonnes
    UNIT_CONVERSIONS = {
        "tonnes": 1.0,
        "mt": 1.0,
        "thousand tonnes": 1000.0,
        "million tonnes": 1000000.0,
        "lakh tonnes": 100000.0,
        "crore tonnes": 10000000.0,
        "kg": 0.001,
    }

    def get_required_fields(self) -> List[str]:
        """Required fields for minerals yearbook data."""
        return ["mineral", "year", "production"]

    async def fetch(self, file_path: str, **kwargs) -> AdapterResult:
        """
        Read pre-extracted minerals data from CSV.
        
        Args:
            file_path: Path to CSV file with extracted yearbook data
            
        Returns:
            AdapterResult with raw data
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
                source_type="india_minerals_yearbook"
            )

        except Exception as e:
            self.logger.error(f"Error reading file: {e}")
            return AdapterResult(success=False, errors=[str(e)])

    async def parse(self, raw_data: Any) -> AdapterResult:
        """
        Parse minerals yearbook CSV data.
        
        Handles various formats from different yearbook editions.
        """
        try:
            if isinstance(raw_data, AdapterResult):
                content = raw_data.data[0]["content"]
            else:
                content = raw_data

            lines = content.strip().split('\n')
            if not lines:
                return AdapterResult(success=False, errors=["Empty file"])

            reader = csv.DictReader(lines)
            records = []
            errors = []
            warnings = []

            for i, row in enumerate(reader):
                try:
                    record = self._parse_minerals_row(row)
                    if record:
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
                source_type="india_minerals_yearbook"
            )

        except Exception as e:
            self.logger.error(f"Parse error: {e}")
            return AdapterResult(success=False, errors=[str(e)])

    def _parse_minerals_row(self, row: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Parse a minerals yearbook row."""
        # Handle various column name formats
        mineral = (
            row.get("mineral") or 
            row.get("Mineral") or 
            row.get("mineral_name") or
            row.get("commodity")
        )
        
        if not mineral:
            return None

        # Extract production value with unit handling
        production_raw = (
            row.get("production") or 
            row.get("Production") or
            row.get("production_qty") or
            row.get("quantity")
        )
        
        unit = self.clean_string(
            row.get("unit") or row.get("Unit") or "tonnes"
        ).lower()
        
        production = self._convert_to_tonnes(production_raw, unit)
        
        return {
            "mineral": self.clean_string(mineral).lower(),
            "year": self.parse_year(row.get("year") or row.get("Year")),
            "production": production,
            "unit": "tonnes",  # Normalized
            "state": self.clean_string(row.get("state") or row.get("State")),
            "district": self.clean_string(row.get("district") or row.get("District")),
            "mine_name": self.clean_string(row.get("mine_name") or row.get("Mine Name")),
            "owner": self.clean_string(row.get("owner") or row.get("Owner")),
            "grade": self.clean_string(row.get("grade") or row.get("Grade")),
            "reserves": self.clean_numeric(row.get("reserves") or row.get("Reserves")),
            "source": "India Minerals Yearbook",
            "original_unit": unit,
            "original_value": self.clean_numeric(production_raw),
        }

    def _convert_to_tonnes(self, value: Any, unit: str) -> float:
        """Convert production value to metric tonnes."""
        numeric_value = self.clean_numeric(value)
        conversion_factor = self.UNIT_CONVERSIONS.get(unit, 1.0)
        return numeric_value * conversion_factor

    def assess_data_quality(self, record: Dict[str, Any]) -> DataQuality:
        """Assess data quality for minerals yearbook data."""
        # Official government data is generally high quality
        if record.get("mine_name") and record.get("owner"):
            return DataQuality.HIGH
        elif record.get("state"):
            return DataQuality.MEDIUM
        return DataQuality.LOW

    async def transform_to_inventory(self, data: List[Dict]) -> List[Dict]:
        """
        Transform minerals yearbook data to CircuMetal format.
        
        Maps to Process model for Indian mining operations.
        """
        inventories = []
        
        for record in data:
            mineral = record.get("mineral", "").lower()
            
            # Determine metal category
            metal_category = self._classify_mineral(mineral)
            
            # Map to emission factors (from our emission_factors.json)
            emission_factor = self._get_emission_factor(mineral, record.get("state"))
            
            inventory = {
                "name": f"{mineral.title()} Mining - {record.get('state', 'India')}",
                "code": f"IN-{record.get('state', 'IND')[:3].upper()}-{mineral[:4].upper()}-{record.get('year', 'XXXX')}",
                "location": f"IN-{record.get('state', 'IND')}",
                "unit": "tonnes",
                "source_database": "india_minerals_yearbook",
                "categories": ["mining", metal_category, "primary"],
                "data_quality": record.get("data_quality", "medium"),
                "imported_at": datetime.utcnow().isoformat(),
                
                # Process-specific fields
                "process_type": "mining",
                "sector": "metals",
                "stage": "extraction",
                
                # Production data
                "annual_production": record.get("production"),
                "production_year": record.get("year"),
                "mine_name": record.get("mine_name"),
                "owner": record.get("owner"),
                "grade": record.get("grade"),
                "reserves": record.get("reserves"),
                
                # Emission factors
                "emission_factor": emission_factor,
                "emission_factor_unit": "kg CO2e/tonne",
                
                # Geographic data
                "state": record.get("state"),
                "district": record.get("district"),
                "country": "India",
                
                # Original record for reference
                "original_data": record,
            }
            
            inventories.append(inventory)
        
        return inventories

    def _classify_mineral(self, mineral: str) -> str:
        """Classify mineral into metal category."""
        iron_keywords = ["iron", "hematite", "magnetite"]
        aluminium_keywords = ["bauxite", "alumina", "aluminium", "aluminum"]
        
        mineral_lower = mineral.lower()
        
        for kw in iron_keywords:
            if kw in mineral_lower:
                return "iron_steel"
        
        for kw in aluminium_keywords:
            if kw in mineral_lower:
                return "aluminium"
        
        return "other_metals"

    def _get_emission_factor(self, mineral: str, state: Optional[str]) -> float:
        """
        Get emission factor for mining operation.
        
        Values based on Indian mining energy intensity studies.
        """
        # Base emission factors (kg CO2e per tonne of ore)
        # These are India-specific values accounting for grid mix
        base_factors = {
            "iron": 50.0,
            "hematite": 45.0,
            "magnetite": 55.0,
            "bauxite": 35.0,
            "alumina": 850.0,  # Refining is energy intensive
        }
        
        # State-specific modifiers based on grid carbon intensity
        state_modifiers = {
            "Chhattisgarh": 1.2,   # Coal-heavy grid
            "Odisha": 1.15,
            "Jharkhand": 1.2,
            "Karnataka": 0.9,      # More hydro
            "Gujarat": 1.0,
            "Maharashtra": 1.0,
        }
        
        mineral_lower = mineral.lower()
        base = 50.0  # Default
        
        for key, factor in base_factors.items():
            if key in mineral_lower:
                base = factor
                break
        
        modifier = state_modifiers.get(state, 1.0) if state else 1.0
        
        return round(base * modifier, 2)

    async def get_state_summary(self, data: List[Dict]) -> Dict[str, Any]:
        """
        Get production summary by state.
        
        Useful for dashboard visualizations.
        """
        state_totals = {}
        
        for record in data:
            state = record.get("state", "Unknown")
            mineral = record.get("mineral", "Unknown")
            production = record.get("production", 0)
            
            if state not in state_totals:
                state_totals[state] = {"total": 0, "minerals": {}}
            
            state_totals[state]["total"] += production
            
            if mineral not in state_totals[state]["minerals"]:
                state_totals[state]["minerals"][mineral] = 0
            state_totals[state]["minerals"][mineral] += production
        
        return state_totals


async def load_minerals_yearbook(
    file_path: str,
    transform: bool = True
) -> AdapterResult:
    """
    Convenience function to load India Minerals Yearbook data.
    
    Args:
        file_path: Path to CSV file with extracted yearbook data
        transform: Whether to transform to CircuMetal format
        
    Returns:
        AdapterResult with processed data
    """
    adapter = IndiaMineralsYearbookAdapter()
    
    fetch_result = await adapter.fetch(file_path)
    if not fetch_result.success:
        return fetch_result
    
    parse_result = await adapter.parse(fetch_result)
    if not parse_result.success:
        return parse_result
    
    if transform:
        transformed = await adapter.transform_to_inventory(parse_result.data)
        parse_result.data = transformed
        parse_result.metadata["transformed"] = True
        
        # Add state summary
        state_summary = await adapter.get_state_summary(parse_result.data)
        parse_result.metadata["state_summary"] = state_summary
    
    return parse_result
