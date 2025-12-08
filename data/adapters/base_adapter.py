"""
Base adapter class for all data source adapters.

Provides common interface and utilities for data ingestion.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DataQuality(str, Enum):
    """Data quality classification per ISO 14044."""
    HIGH = "high"         # Primary data, measured
    MEDIUM = "medium"     # Secondary data, calculated
    LOW = "low"           # Estimated or default values
    UNKNOWN = "unknown"


@dataclass
class AdapterResult:
    """Result from a data adapter operation."""
    success: bool
    data: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    source_url: Optional[str] = None
    source_type: Optional[str] = None
    records_processed: int = 0
    records_skipped: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "data": self.data,
            "errors": self.errors,
            "warnings": self.warnings,
            "source_url": self.source_url,
            "source_type": self.source_type,
            "records_processed": self.records_processed,
            "records_skipped": self.records_skipped,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


class BaseAdapter(ABC):
    """
    Abstract base class for all data adapters.
    
    Provides common interface for:
    - Data ingestion from various sources
    - Validation and transformation
    - Error handling and logging
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize adapter with optional configuration.
        
        Args:
            config: Optional configuration dictionary
        """
        self.config = config or {}
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    async def fetch(self, **kwargs) -> AdapterResult:
        """
        Fetch data from the source.
        
        Returns:
            AdapterResult with fetched data
        """
        pass

    @abstractmethod
    async def parse(self, raw_data: Any) -> AdapterResult:
        """
        Parse raw data into structured format.
        
        Args:
            raw_data: Raw data from source
            
        Returns:
            AdapterResult with parsed data
        """
        pass

    @abstractmethod
    async def transform_to_inventory(self, data: List[Dict]) -> List[Dict]:
        """
        Transform parsed data into CircuMetal inventory format.
        
        Args:
            data: Parsed data records
            
        Returns:
            List of inventory-compatible dictionaries
        """
        pass

    async def validate_record(self, record: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Validate a single record.
        
        Args:
            record: Record to validate
            
        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []
        
        # Check required fields
        required_fields = self.get_required_fields()
        for field in required_fields:
            if field not in record or record[field] is None:
                errors.append(f"Missing required field: {field}")
        
        return len(errors) == 0, errors

    def get_required_fields(self) -> List[str]:
        """
        Get list of required fields for this adapter.
        
        Override in subclass to specify required fields.
        """
        return []

    def assess_data_quality(self, record: Dict[str, Any]) -> DataQuality:
        """
        Assess data quality of a record.
        
        Args:
            record: Record to assess
            
        Returns:
            DataQuality enum value
        """
        # Default implementation - override in subclass
        if record.get("source_type") == "measured":
            return DataQuality.HIGH
        elif record.get("source_type") == "calculated":
            return DataQuality.MEDIUM
        elif record.get("source_type") == "estimated":
            return DataQuality.LOW
        return DataQuality.UNKNOWN

    def log_progress(self, processed: int, total: int, interval: int = 100):
        """Log progress at specified intervals."""
        if processed % interval == 0:
            self.logger.info(f"Processed {processed}/{total} records")

    @staticmethod
    def clean_numeric(value: Any, default: float = 0.0) -> float:
        """Clean and convert a value to float."""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove commas and whitespace
            cleaned = value.replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return default
        return default

    @staticmethod
    def clean_string(value: Any, default: str = "") -> str:
        """Clean a string value."""
        if value is None:
            return default
        return str(value).strip()

    @staticmethod
    def parse_year(value: Any, default: int = None) -> Optional[int]:
        """Parse a year value."""
        if value is None:
            return default
        try:
            return int(str(value).strip()[:4])
        except (ValueError, TypeError):
            return default
