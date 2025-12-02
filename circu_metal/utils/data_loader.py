"""
Data Loader Utility for CircuMetal Agents

This module provides functions to load reference datasets for LCA calculations,
emission factors, circularity benchmarks, and material properties.
"""

import json
import os
from typing import Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

_cache: Dict[str, Any] = {}

def load_json_data(filename: str) -> Dict[str, Any]:
    """
    Load a JSON data file from the data directory.
    Uses caching to avoid repeated file reads.
    """
    if filename in _cache:
        return _cache[filename]
    
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            _cache[filename] = data
            return data
    return {}

def get_emission_factors() -> Dict[str, Any]:
    """Load emission factors database."""
    return load_json_data('emission_factors.json')

def get_circularity_benchmarks() -> Dict[str, Any]:
    """Load circularity benchmarks and industry standards."""
    return load_json_data('circularity_benchmarks.json')

def get_material_properties() -> Dict[str, Any]:
    """Load material properties database."""
    return load_json_data('material_properties.json')

def get_process_templates() -> Dict[str, Any]:
    """Load process templates and reference LCA data."""
    return load_json_data('process_templates.json')

def get_emission_factor(material: str, source_type: str = 'primary_production') -> Optional[float]:
    """
    Get emission factor for a specific material.
    
    Args:
        material: Material name (e.g., 'aluminium', 'steel')
        source_type: Type of production ('primary_production', 'secondary_recycled', etc.)
    
    Returns:
        Emission factor in kg CO2e/kg, or None if not found
    """
    data = get_emission_factors()
    materials = data.get('materials', {})
    
    # Check metals
    if 'metals' in materials:
        for metal_name, metal_data in materials['metals'].items():
            if material.lower() in metal_name.lower():
                if source_type in metal_data:
                    return metal_data[source_type].get('emission_factor')
    
    return None

def get_electricity_factor(region: str = 'grid_world_average') -> Optional[float]:
    """
    Get electricity emission factor for a region.
    
    Args:
        region: Region name (e.g., 'grid_europe', 'renewable_solar')
    
    Returns:
        Emission factor in kg CO2e/kWh
    """
    data = get_emission_factors()
    electricity = data.get('energy', {}).get('electricity', {})
    
    # Try exact match first
    if region in electricity:
        return electricity[region].get('emission_factor')
    
    # Try partial match
    for key, value in electricity.items():
        if region.lower() in key.lower():
            return value.get('emission_factor')
    
    # Default to world average
    return electricity.get('grid_world_average', {}).get('emission_factor', 0.5)

def get_transport_factor(mode: str) -> Optional[float]:
    """
    Get transport emission factor.
    
    Args:
        mode: Transport mode (e.g., 'truck_diesel', 'rail', 'sea')
    
    Returns:
        Emission factor in kg CO2e/tkm
    """
    data = get_emission_factors()
    transport = data.get('transport', {})
    
    for category, modes in transport.items():
        for mode_name, mode_data in modes.items():
            if mode.lower() in mode_name.lower():
                return mode_data.get('emission_factor')
    
    return None

def get_material_recycling_rate(material: str) -> Optional[float]:
    """
    Get global recycling rate for a material.
    
    Args:
        material: Material name
    
    Returns:
        Recycling rate as percentage
    """
    data = get_circularity_benchmarks()
    metals = data.get('metals', {})
    
    for metal_name, metal_data in metals.items():
        if material.lower() in metal_name.lower():
            return metal_data.get('global_recycling_rate')
    
    return None

def get_mci_rating(mci_value: float) -> Dict[str, Any]:
    """
    Get MCI rating category for a given MCI value.
    
    Args:
        mci_value: Material Circularity Index (0-1)
    
    Returns:
        Rating info with category and description
    """
    data = get_circularity_benchmarks()
    ratings = data.get('industry_benchmarks', {}).get('mci_ratings', {})
    
    for category, bounds in ratings.items():
        if bounds['min'] <= mci_value <= bounds['max']:
            return {
                'category': category,
                'description': bounds['description'],
                'min': bounds['min'],
                'max': bounds['max']
            }
    
    return {'category': 'unknown', 'description': 'Unable to classify'}

def get_process_template(process_name: str) -> Optional[Dict[str, Any]]:
    """
    Get reference LCA data for a process.
    
    Args:
        process_name: Process identifier
    
    Returns:
        Process template with inputs, outputs, and impacts
    """
    data = get_process_templates()
    processes = data.get('processes', {})
    
    # Try exact match
    if process_name in processes:
        return processes[process_name]
    
    # Try partial match
    for key, value in processes.items():
        if process_name.lower() in key.lower():
            return value
    
    return None

def get_comparison_baseline(material: str, scenario: str = 'current_industry_average') -> Optional[Dict[str, Any]]:
    """
    Get comparison baseline for a material.
    
    Args:
        material: Material name
        scenario: 'conventional_linear', 'current_industry_average', or 'best_practice_circular'
    
    Returns:
        Baseline data for comparison
    """
    data = get_process_templates()
    baselines = data.get('comparison_baselines', {})
    
    for mat_name, scenarios in baselines.items():
        if material.lower() in mat_name.lower():
            return scenarios.get(scenario)
    
    return None

def format_data_context_for_agent() -> str:
    """
    Format all reference data as a context string for agent prompts.
    
    Returns:
        Formatted string with key reference data
    """
    emission_factors = get_emission_factors()
    circularity = get_circularity_benchmarks()
    
    context = """
## Reference Data Available

### Key Emission Factors (kg CO2e/unit):
**Metals (per kg):**
- Aluminium Primary: 16.5 | Recycled: 0.5
- Steel BOF: 2.1 | EAF/Recycled: 0.4
- Copper Primary: 4.0 | Recycled: 0.5
- Zinc Primary: 3.1 | Recycled: 0.8
- Nickel Primary: 12.0 | Recycled: 1.5

**Electricity (per kWh):**
- World Average: 0.5 | Europe: 0.3 | USA: 0.4
- China: 0.6 | India: 0.7
- Solar: 0.04 | Wind: 0.01 | Hydro: 0.02

**Transport (per tkm):**
- Truck Diesel: 0.1 | Truck Electric: 0.03
- Rail Diesel: 0.03 | Rail Electric: 0.01
- Sea Container: 0.01 | Air: 1.0

### Circularity Benchmarks:
**Global Recycling Rates:**
- Aluminium: 76% | Steel: 85% | Copper: 65%
- Lead: 95% | Zinc: 60% | Nickel: 68%

**MCI Ratings:**
- Excellent: 0.8-1.0 | Good: 0.6-0.8 | Moderate: 0.4-0.6
- Low: 0.2-0.4 | Very Low: 0.0-0.2
"""
    return context

# Initialize cache on import
def _init_cache():
    """Pre-load all data files into cache."""
    for filename in ['emission_factors.json', 'circularity_benchmarks.json', 
                     'material_properties.json', 'process_templates.json']:
        try:
            load_json_data(filename)
        except:
            pass

_init_cache()
