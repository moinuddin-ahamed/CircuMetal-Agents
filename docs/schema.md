# CircuMetal Database Schema Documentation

This document describes the canonical data schema for the CircuMetal multi-agent LCA and circularity platform.

## Overview

CircuMetal uses MongoDB for persistent storage with the following collections:

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| `projects` | Project metadata and ownership | `user_id`, `material`, `value_chain` |
| `inventories` | Life Cycle Inventory data | `project_id`, `material` |
| `scenarios` | LCA scenario configurations and results | `project_id`, `status` |
| `batch_runs` | Real-time production batch data | `project_id`, `process_id`, `timestamp` |
| `digital_product_passports` | DPP per EU CBAM/ESPR | `scenario_id`, `project_id`, `material` |
| `agent_logs` | Agent execution logs | `run_id`, `agent_id`, `timestamp` |
| `audit_log` | Immutable audit trail | `run_id`, `timestamp`, `action` |
| `processes` | Canonical process definitions | `stage`, `material` |
| `flows` | Material/energy flows between processes | `from_process`, `to_process` |
| `runs` | Analysis run tracking | `project_id`, `status` |
| `reports` | Generated reports | `run_id`, `project_id` |

---

## Entity Schemas

### Process

Represents a unit process in the life cycle (mining, smelting, transport, etc.).

```json
{
  "id": "uuid",
  "name": "Primary Aluminium Smelting",
  "stage": "smelting",  // enum: mining, beneficiation, smelting, refining, transport, fabrication, use, recycling, end_of_life
  "unit": "tonne",
  "description": "Hall-Héroult process for primary aluminium production",
  
  "emission_factors": {
    "CO2e_kg_per_unit": 16500,
    "energy_kWh": 15000,
    "water_m3": 5.2,
    "SO2e_kg": 12.5,
    "NOx_kg": 3.2,
    "PM_kg": 0.8
  },
  
  "typical_range": {
    "energy_kWh": {
      "min": 13000,
      "max": 17000,
      "unit": "kWh/t",
      "source": "International Aluminium Institute"
    }
  },
  
  "provenance": {
    "source": "International Aluminium Institute",
    "citation": "IAI Life Cycle Inventory 2023",
    "date": "2023-06-15T00:00:00Z",
    "dataset_id": "iai_lci_2023",
    "license": "CC-BY-4.0",
    "quality_score": 0.85
  },
  
  "material": "aluminium",
  "location": "India",
  "technology": "Hall-Héroult",
  "data_quality": "calculated",
  
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Flow

Represents material or energy flow between two processes.

```json
{
  "id": "uuid",
  "from_process": "process_id_mining",
  "to_process": "process_id_smelting",
  "flow_type": "material",  // material, energy, transport
  
  "mass_tonnes": 4.5,
  "losses_tonnes": 0.15,
  
  "energy_content_MJ": null,
  "distance_km": 250,
  "transport_mode": "rail",
  
  "provenance": {
    "source": "Indian Minerals Yearbook 2023",
    "citation": "IBM Annual Report",
    "date": "2023-12-01T00:00:00Z"
  },
  
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Batch

Real-time production batch data from sensors or manual entry.

```json
{
  "id": "uuid",
  "process_id": "process_uuid",
  "project_id": "project_uuid",
  
  "throughput_t": 1000,
  "ore_grade": 55.0,
  "scrap_intake_percent": 25.0,
  
  "timestamp": "2025-01-15T08:30:00Z",
  
  "assay": {
    "elements_ppm": {
      "Fe": 550000,
      "Si": 25000,
      "Al": 15000,
      "Mn": 5000
    },
    "grade_percent": 55.0,
    "moisture_percent": 8.5
  },
  
  "energy_mix": {
    "grid": 0.6,
    "solar": 0.2,
    "captive_coal": 0.15,
    "captive_gas": 0.05,
    "wind": 0.0,
    "hydro": 0.0
  },
  "energy_consumed_kWh": 450000,
  
  "emissions_CO2e_t": 850,
  
  "metadata": {
    "shift": "morning",
    "operator_id": "OP123",
    "equipment_id": "FURNACE_01"
  },
  "sensor_source": "iot"
}
```

### Scenario

LCA scenario configuration and results.

```json
{
  "id": "uuid",
  "project_id": "project_uuid",
  "name": "High Recycled Content Scenario",
  "description": "Scenario with 60% recycled steel input",
  
  "inputs": {
    "material": "steel",
    "process_type": "secondary",
    "throughput_t": 1.0,
    "recycled_content_percent": 60.0,
    "scrap_share_percent": 65.0,
    "eol_recycling_rate": 90.0,
    "energy_source": "grid",
    "energy_mix": {
      "grid": 0.5,
      "solar": 0.3,
      "wind": 0.2
    },
    "renewable_percent": 50.0,
    "process_efficiency": 92.0,
    "ore_grade": null,
    "transport_mode": "rail",
    "transport_distance_km": 150,
    "custom_parameters": {}
  },
  
  "outputs": {
    "gwp_CO2e_t_per_t": 0.85,
    "total_energy_kWh_per_t": 650,
    "water_m3_per_t": 3.2,
    "waste_mass_t_per_t": 0.08,
    "recycled_content_percent": 60.0,
    "MCI_score": 0.72,
    "recovery_potential_percent": 92.0,
    "stage_breakdown": {
      "mining": {"gwp": 0.0, "energy": 0},
      "smelting": {"gwp": 0.45, "energy": 350},
      "transport": {"gwp": 0.05, "energy": 50},
      "recycling": {"gwp": 0.35, "energy": 250}
    },
    "uncertainty": {
      "gwp_CO2e_t_per_t": {
        "ci_lower": 0.75,
        "ci_upper": 0.95,
        "std": 0.05
      }
    },
    "mass_balance_ok": true,
    "mass_balance_details": null
  },
  
  "comparison_summary": {
    "baseline_name": "Primary Steel",
    "gwp_reduction_percent": 59.5,
    "energy_reduction_percent": 45.2,
    "cost_delta_usd": -120
  },
  "baseline_scenario_id": "baseline_uuid",
  
  "confidence_scores": {
    "overall": 0.82,
    "data_quality": 0.78,
    "model_confidence": 0.85,
    "coverage": 0.84
  },
  
  "provenance": [
    {
      "source": "ecoinvent 3.9",
      "citation": "Steel production, EAF",
      "date": "2023-01-01T00:00:00Z"
    }
  ],
  
  "lca_mode": "attributional",
  "status": "completed",
  
  "created_at": "2025-01-10T00:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z",
  "completed_at": "2025-01-10T12:00:00Z"
}
```

### DigitalProductPassport

Digital Product Passport per EU CBAM/ESPR requirements.

```json
{
  "id": "uuid",
  "scenario_id": "scenario_uuid",
  "project_id": "project_uuid",
  
  "product_name": "Secondary Steel Billet",
  "product_category": "Steel Products",
  "material": "steel",
  "mass_kg": 1000,
  
  "batch_ids": ["batch_uuid_1", "batch_uuid_2"],
  
  "emissions_summary": {
    "total_CO2e_kg": 850,
    "scope1_kg": 320,
    "scope2_kg": 280,
    "scope3_upstream_kg": 200,
    "scope3_downstream_kg": 50,
    "energy_kWh": 650,
    "water_m3": 3.2,
    "waste_kg": 80,
    "by_stage": {
      "smelting": 450,
      "transport": 50,
      "recycling": 350
    },
    "methodology": "ISO 14067",
    "boundary": "cradle-to-gate"
  },
  
  "recycled_content_percent": 60.0,
  "recyclability_percent": 92.0,
  "mci_score": 0.72,
  
  "compliance_status": "pass",
  "regulations_checked": ["EU_CBAM", "EU_ETS", "ESPR"],
  
  "provenance": [
    {
      "source": "CircuMetal Analysis",
      "citation": "Run ID: run_uuid",
      "date": "2025-01-10T12:00:00Z"
    }
  ],
  
  "signatures": [
    {
      "signer_id": "user_uuid",
      "signer_role": "analyst",
      "timestamp": "2025-01-10T12:30:00Z",
      "signature_hash": "sha256_hash",
      "certificate_id": null
    }
  ],
  
  "valid_from": "2025-01-10T00:00:00Z",
  "valid_until": "2026-01-10T00:00:00Z",
  "version": "1.0",
  
  "created_at": "2025-01-10T12:30:00Z"
}
```

### AgentLog

Agent execution log entry.

```json
{
  "id": "uuid",
  "run_id": "run_uuid",
  "agent_id": "estimation_agent",
  "agent_name": "EstimationAgent",
  
  "timestamp": "2025-01-10T12:00:05Z",
  "level": "info",
  "message": "Estimated missing parameter: kWh_per_t = 450 (confidence: 0.82)",
  
  "execution_time_ms": 1250,
  
  "inputs": {
    "process_type": "smelting",
    "ore_grade": 55,
    "missing": ["kWh_per_t"]
  },
  
  "outputs": {
    "kWh_per_t": 450,
    "confidence": 0.82
  },
  
  "model_id": "rf_estimator_v1",
  "confidence": 0.82,
  
  "provenance": [
    {
      "source": "training_dataset_v1",
      "date": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### AuditEntry

Immutable audit log entry for compliance and governance.

```json
{
  "id": "uuid",
  "timestamp": "2025-01-10T12:00:00Z",
  "run_id": "run_uuid",
  
  "action": "agent_start",  // agent_start, api_call, model_prediction, user_action, scenario_created, dpp_generated
  
  "agent_id": "lca_agent",
  "user_id": null,
  
  "details": {
    "agent_name": "LCAAgent",
    "mode": "attributional",
    "scenario_id": "scenario_uuid"
  },
  
  "inputs_hash": "sha256_hash_of_inputs",
  "outputs_hash": "sha256_hash_of_outputs"
}
```

### Project

Project metadata and ownership.

```json
{
  "id": "uuid",
  "name": "Steel Recycling Analysis - Jharkhand",
  "description": "LCA analysis of steel recycling operations in Jharkhand steel cluster",
  
  "material": "steel",
  "location": "India",
  "industry": "metals",
  
  "user_id": "user_uuid",
  "organization": "Ministry of Steel",
  
  "value_chain": "steel",
  
  "status": "active",
  
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-10T00:00:00Z",
  
  "tags": ["recycling", "jharkhand", "pilot"],
  "metadata": {
    "region": "East India",
    "cluster": "Jamshedpur"
  }
}
```

### Inventory

Life Cycle Inventory data.

```json
{
  "id": "uuid",
  "project_id": "project_uuid",
  "name": "EAF Steel Production Inventory",
  "description": "Inventory for Electric Arc Furnace steel production with 60% scrap",
  
  "process_name": "EAF Steel Production",
  "functional_unit": "1 tonne",
  "material": "steel",
  "process_type": "secondary",
  
  "location": "India",
  "energy_source": "grid",
  
  "inputs": [
    {
      "id": "item_uuid",
      "name": "Steel Scrap",
      "amount": 650,
      "unit": "kg",
      "category": "material",
      "source_type": "recycled",
      "origin": "domestic",
      "emission_factor": 0.1,
      "emission_factor_unit": "kg CO2e/kg",
      "data_quality": "calculated",
      "provenance": {
        "source": "World Steel Association",
        "date": "2023-01-01T00:00:00Z"
      }
    },
    {
      "id": "item_uuid",
      "name": "Iron Ore",
      "amount": 350,
      "unit": "kg",
      "category": "material",
      "source_type": "primary",
      "origin": "Odisha",
      "emission_factor": 0.05,
      "emission_factor_unit": "kg CO2e/kg",
      "data_quality": "estimated"
    }
  ],
  
  "outputs": [
    {
      "id": "item_uuid",
      "name": "Steel Billet",
      "amount": 1000,
      "unit": "kg",
      "category": "product"
    },
    {
      "id": "item_uuid",
      "name": "Slag",
      "amount": 120,
      "unit": "kg",
      "category": "co_product"
    }
  ],
  
  "energy": [
    {
      "id": "item_uuid",
      "name": "Electricity",
      "amount": 550,
      "unit": "kWh",
      "category": "energy",
      "emission_factor": 0.82,
      "emission_factor_unit": "kg CO2e/kWh"
    }
  ],
  
  "transport": [
    {
      "id": "item_uuid",
      "name": "Scrap Transport",
      "amount": 150,
      "unit": "tkm",
      "category": "transport",
      "emission_factor": 0.1,
      "emission_factor_unit": "kg CO2e/tkm"
    }
  ],
  
  "recycled_content_percent": 60.0,
  "eol_recycling_rate": 90.0,
  "process_efficiency": 92.0,
  
  "overall_data_quality": "calculated",
  "provenance": [
    {
      "source": "Plant Data",
      "date": "2025-01-01T00:00:00Z"
    }
  ],
  
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-05T00:00:00Z"
}
```

---

## Indexes

### Primary Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| `projects` | `user_id` | Single | Filter by owner |
| `projects` | `material` | Single | Filter by material type |
| `projects` | `(name, user_id)` | Compound, Unique | Prevent duplicate names per user |
| `scenarios` | `project_id` | Single | Get scenarios for project |
| `scenarios` | `status` | Single | Filter by status |
| `batch_runs` | `timestamp` | Single | Time-series queries |
| `batch_runs` | `(project_id, timestamp)` | Compound | Project timeline |
| `agent_logs` | `(run_id, timestamp)` | Compound | Ordered logs for run |
| `audit_log` | `(run_id, timestamp)` | Compound | Audit trail |

---

## Data Quality Levels

| Level | Description | Confidence Range |
|-------|-------------|------------------|
| `measured` | Direct measurement from sensors/instruments | 0.9 - 1.0 |
| `calculated` | Calculated from measured data | 0.7 - 0.9 |
| `estimated` | ML/AI estimated from similar processes | 0.5 - 0.8 |
| `default` | Default values from literature | 0.3 - 0.6 |

---

## Migration Notes

### From SQLite to MongoDB

1. Export existing SQLite data using provided migration script
2. Transform to new schema format
3. Import to MongoDB collections
4. Verify indexes are created
5. Update application to use new database module

### Environment Configuration

```env
MONGODB_URI=mongodb://localhost:27017
MONGO_DB_NAME=circumetal
```

For production with Atlas:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=circumetal_prod
```
