# LCA Platform Database Architecture

## Overview

The LCA Platform uses a database-agnostic architecture that allows seamless switching between PostgreSQL and MongoDB implementations without changing business logic.

## Quick Start - Switching Databases

### Use PostgreSQL (Default)
```env
DB_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@host:5432/lca_platform
```

### Use MongoDB
```env
DB_PROVIDER=mongo
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=lca_platform
```

## Key Design Principles

1. **Repository Pattern**: All data access goes through repository interfaces
2. **Abstraction Layer**: Business logic never directly queries the database
3. **Factory Pattern**: Environment variables determine which implementation to use
4. **Type Safety**: TypeScript interfaces ensure consistency

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│              (Components, API Routes, etc.)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Interfaces                       │
│  (IProjectRepository, IScenarioRepository, etc.)             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│ SQL Implementation│      │ Mongo Implementation│
│ (PostgreSQL/MySQL)       │ (MongoDB)        │
└──────────────────┘      └──────────────────┘
        │                          │
        └────────────┬─────────────┘
                     ▼
        ┌──────────────────────────┐
        │   Actual Database        │
        └──────────────────────────┘
\`\`\`

## Tables & Collections

### Core Domain

#### Users
- Stores user accounts and authentication
- **Fields**: user_id, email, password_hash, name, role, created_at, updated_at

#### User Settings
- Stores per-user preferences and LCA defaults
- **Fields**: settings_id, user_id, theme, default_region, mass_unit, distance_unit, lci_db_version, etc.

#### Projects
- Top-level LCA projects belonging to users
- **Fields**: project_id, user_id, name, metal_type, region, status, functional_unit, created_at, updated_at

#### Scenarios
- Variations within a project (baseline vs circular)
- **Fields**: scenario_id, project_id, name, is_baseline, status, created_at, updated_at

#### Process Stages
- Steps in the lifecycle (mining, refining, smelting, etc.)
- **Fields**: stage_id, scenario_id, stage_order, stage_type, name

#### Stage Parameters
- Input values for each stage (energy use, scrap rate, etc.)
- **Fields**: param_id, stage_id, parameter_name, value, unit, source_type, confidence

### Results & Outputs

#### Results - Environmental
- LCA environmental impact metrics (GWP, energy, water, waste)
- **Fields**: result_env_id, scenario_id, indicator, value, unit

#### Results - Circularity
- Circularity metrics (recycled content, recovery rate)
- **Fields**: result_circ_id, scenario_id, indicator, value, unit

### AI & Logging

#### AI Prediction Logs
- Tracks all AI/ML predictions for parameters
- **Fields**: prediction_id, user_id, project_id, scenario_id, stage_id, parameter_name, predicted_value, model_name, confidence

#### LLM Calls
- Logs all LLM requests for reports and recommendations
- **Fields**: llm_call_id, user_id, project_id, scenario_id, request_type, model_name, input_tokens, output_tokens, latency_ms

#### LLM Outputs
- Stores generated text (reports, recommendations)
- **Fields**: output_id, llm_call_id, content_type, content

## Security Principles

1. **Row-Level Security**: All queries must filter by `user_id` of logged-in user
2. **Foreign Key Constraints**: Enforce referential integrity
3. **Indexed Queries**: User-based filtering is indexed for performance
4. **No Direct Client Queries**: All access through server-side repositories

## MongoDB Equivalent Schema

\`\`\`
db.users - { _id, email, passwordHash, name, role, createdAt, updatedAt }
db.userSettings - { _id, userId, theme, defaultRegion, ... }
db.projects - { _id, userId, name, metalType, region, status, ... }
db.scenarios - { _id, projectId, name, isBaseline, status, ... }
db.processStages - { _id, scenarioId, stageOrder, stageType, name, ... }
db.stageParameters - { _id, stageId, parameterName, value, unit, sourceType, ... }
db.results.environmental - { _id, scenarioId, indicator, value, unit, ... }
db.results.circularity - { _id, scenarioId, indicator, value, unit, ... }
db.aiPredictions - { _id, userId, projectId, scenarioId, stageId, ... }
db.llmCalls - { _id, userId, projectId, scenarioId, requestType, ... }
db.llmOutputs - { _id, llmCallId, contentType, content, ... }
\`\`\`

## Migration Path

To switch from SQL to MongoDB (or vice versa):

1. Set `DB_PROVIDER=mongo` in environment variables
2. Factory functions automatically load MongoDB implementations
3. No changes needed in business logic
4. Data migration handled by migration scripts

## Implementation Roadmap

- [x] PostgreSQL implementations via `pg` driver
- [x] MongoDB implementations via `mongodb` driver
- [ ] Migration utilities and data transformation scripts
- [x] API Route Handlers that use repositories
- [x] Server Actions for mutations

## MongoDB Collection Structure

### Users Collection
```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  password_hash: "hashed_password",
  name: "User Name",
  created_at: ISODate,
  updated_at: ISODate
}
```

### Projects Collection
```javascript
{
  _id: ObjectId,
  user_id: Number,
  name: "Project Name",
  description: "Description",
  metal_type: "copper",
  region: "Europe",
  functional_unit: "1",
  status: "draft",
  created_at: ISODate,
  updated_at: ISODate
}
```

### Scenarios Collection
```javascript
{
  _id: ObjectId,
  user_id: Number,
  project_id: Number,
  name: "Scenario Name",
  route_type: "primary",
  is_baseline: true,
  status: "draft",
  description: "Description",
  created_at: ISODate,
  updated_at: ISODate
}
```

### Lifecycle Stages Collection
```javascript
{
  _id: ObjectId,
  scenario_id: Number,
  stage_order: 1,
  stage_type: "mining",
  name: "Mining",
  description: "Description",
  created_at: ISODate,
  updated_at: ISODate
}
```

### Stage Parameters Collection
```javascript
{
  _id: ObjectId,
  stage_id: Number,
  parameter_name: "energy_consumption",
  parameter_type: "numeric",
  unit: "kWh/tonne",
  value: 50,
  is_ai_predicted: false,
  ai_model_name: null,
  ai_model_version: null,
  ai_confidence: null,
  source: "manual",
  created_at: ISODate,
  updated_at: ISODate
}
```

### Results Environmental Collection
```javascript
{
  _id: ObjectId,
  scenario_id: Number,
  stage_id: Number,
  indicator_type: "gwp",
  value: 100.5,
  unit: "kg CO2e",
  calculation_method: "IPCC 2021",
  created_at: ISODate,
  updated_at: ISODate
}
```

### Results Circularity Collection
```javascript
{
  _id: ObjectId,
  scenario_id: Number,
  metric_type: "recycled_content",
  value: 45.5,
  unit: "%",
  calculation_method: "Ellen MacArthur",
  details: { /* additional data */ },
  created_at: ISODate,
  updated_at: ISODate
}
```

## Indexes

MongoDB collections have the following indexes for performance:

- **users**: `{ email: 1 }` (unique)
- **projects**: `{ user_id: 1 }`, `{ user_id: 1, name: 1 }` (unique)
- **scenarios**: `{ project_id: 1 }`, `{ user_id: 1 }`
- **lifecycle_stages**: `{ scenario_id: 1 }`, `{ scenario_id: 1, stage_order: 1 }`
- **stage_parameters**: `{ stage_id: 1 }`
- **results_environmental**: `{ scenario_id: 1 }`
- **results_circularity**: `{ scenario_id: 1 }`

## Data Migration

To migrate from PostgreSQL to MongoDB:

1. Export PostgreSQL data using the migration script
2. Set `DB_PROVIDER=mongo` in environment
3. Run the application to initialize MongoDB indexes
4. Import the exported data

```bash
# Export from PostgreSQL
npm run db:export

# Switch to MongoDB
DB_PROVIDER=mongo npm run db:init

# Import to MongoDB
npm run db:import
```
