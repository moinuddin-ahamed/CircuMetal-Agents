"""
Data Adapters for CircuMetal LCA Platform.

This module provides adapters for ingesting data from various sources:
- Brightway CSV exports
- India Minerals Yearbook PDFs
- data.gov.in API connectors
- Custom CSV/Excel importers
"""

from .base_adapter import BaseAdapter, AdapterResult
from .brightway_csv_adapter import BrightwayCSVAdapter
from .india_minerals_yearbook_adapter import IndiaMineralsYearbookAdapter
from .data_gov_in_adapter import DataGovInAdapter

__all__ = [
    "BaseAdapter",
    "AdapterResult",
    "BrightwayCSVAdapter",
    "IndiaMineralsYearbookAdapter",
    "DataGovInAdapter",
]
