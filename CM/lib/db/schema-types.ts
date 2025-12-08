// TypeScript types matching the database schema
// These ensure type safety across the application
import { PoolClient } from 'pg'

// ============================================================================
// USER
// ============================================================================

export interface IUserRepository {
  getUserById(userId: number): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  createUser(email: string, passwordHash: string, name?: string): Promise<User>
  updateUser(userId: number, data: Partial<User>): Promise<User>
}

export interface User {
  user_id: number
  email: string
  password_hash: string
  name: string | null
  created_at: Date
  updated_at: Date
}

// ============================================================================
// PROJECT
// ============================================================================

export interface IProjectRepository {
  getProjectById(userId: number, projectId: number): Promise<Project | null>
  listProjectsByUser(userId: number, limit?: number): Promise<Project[]>
  createProject(userId: number, data: CreateProjectInput): Promise<Project>
  updateProject(projectId: number, data: Partial<Project>): Promise<Project>
  deleteProject(projectId: number): Promise<boolean>
  getRecentProjects(userId: number, limit: number): Promise<Project[]>
}

export interface Project {
  project_id: number
  user_id: number
  name: string
  description: string | null
  metal_type: string
  region: string | null
  status: 'draft' | 'active' | 'archived'
  created_at: Date
  updated_at: Date
}

export interface CreateProjectInput {
  name: string
  description?: string
  metal_type: string
  region?: string
  status?: string
}

// ============================================================================
// SCENARIO
// ============================================================================

export interface IScenarioRepository {
  getScenarioById(userId: number, scenarioId: number): Promise<Scenario | null>
  listScenariosByProject(userId: number, projectId: number): Promise<Scenario[]>
  createScenario(userId: number, data: CreateScenarioInput): Promise<Scenario>
  updateScenario(scenarioId: number, data: Partial<Scenario>): Promise<Scenario>
  deleteScenario(scenarioId: number): Promise<boolean>
  getScenariosByStatus(userId: number, status: string): Promise<Scenario[]>
}

export interface Scenario {
  scenario_id: number
  user_id: number
  project_id: number
  name: string
  route_type: 'primary' | 'secondary' | 'hybrid'
  is_baseline: boolean
  status: 'draft' | 'in-progress' | 'complete' | 'archived'
  description: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateScenarioInput {
  project_id: number
  name: string
  route_type: 'primary' | 'secondary' | 'hybrid'
  is_baseline?: boolean
  description?: string
}

// ============================================================================
// LIFECYCLE STAGE
// ============================================================================

export interface IStageRepository {
  getStageById(stageId: number): Promise<LifecycleStage | null>
  listStagesByScenario(scenarioId: number): Promise<LifecycleStage[]>
  createStage(data: CreateStageInput): Promise<LifecycleStage>
  updateStage(stageId: number, data: Partial<LifecycleStage>): Promise<LifecycleStage>
  deleteStage(stageId: number): Promise<boolean>
  reorderStages(scenarioId: number, stageOrders: Record<number, number>): Promise<void>
}

export interface LifecycleStage {
  stage_id: number
  scenario_id: number
  stage_order: number
  stage_type: string
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateStageInput {
  scenario_id: number
  stage_order: number
  stage_type: string
  name: string
  description?: string
}

// ============================================================================
// STAGE PARAMETERS
// ============================================================================

export interface IStageParametersRepository {
  getParameterById(parameterId: number): Promise<StageParameter | null>
  listParametersByStage(stageId: number): Promise<StageParameter[]>
  listParametersByScenario(scenarioId: number): Promise<StageParameter[]>
  createParameter(data: CreateParameterInput): Promise<StageParameter>
  updateParameter(parameterId: number, data: Partial<StageParameter>): Promise<StageParameter>
  deleteParameter(parameterId: number): Promise<boolean>
  getIncompleteParameters(scenarioId: number): Promise<StageParameter[]>
}

export interface StageParameter {
  parameter_id: number
  stage_id: number
  parameter_name: string
  parameter_type: 'numeric' | 'text' | 'score' | 'choice'
  unit: string | null
  value: number | string | null
  is_ai_predicted: boolean
  ai_model_name: string | null
  ai_model_version: string | null
  ai_confidence: number | null
  source: 'manual' | 'ai_prediction' | 'industry_default'
  created_at: Date
  updated_at: Date
}

export interface CreateParameterInput {
  stage_id: number
  parameter_name: string
  parameter_type: 'numeric' | 'text' | 'score' | 'choice'
  unit?: string
  value?: number | string
  is_ai_predicted?: boolean
  ai_model_name?: string
  ai_model_version?: string
  ai_confidence?: number
  source?: 'manual' | 'ai_prediction' | 'industry_default'
}

// ============================================================================
// AI PREDICTIONS
// ============================================================================

export interface IAIPredictionRepository {
  getPredictionById(predictionId: number): Promise<AIPrediction | null>
  listPredictionsByScenario(scenarioId: number): Promise<AIPrediction[]>
  listPredictionsByUser(userId: number, limit?: number): Promise<AIPrediction[]>
  createPrediction(data: CreatePredictionInput): Promise<AIPrediction>
  updatePrediction(predictionId: number, data: Partial<AIPrediction>): Promise<AIPrediction>
}

export interface AIPrediction {
  prediction_id: number
  user_id: number
  scenario_id: number
  stage_id: number | null
  request_type: 'parameter_prediction' | 'scenario_summary' | 'recommendation'
  model_name: string
  model_version: string
  input_data: Record<string, any>
  output_data: Record<string, any>
  confidence: number
  status: 'pending' | 'completed' | 'failed'
  error_message: string | null
  created_at: Date
  completed_at: Date | null
}

export interface CreatePredictionInput {
  user_id: number
  scenario_id: number
  stage_id?: number
  request_type: 'parameter_prediction' | 'scenario_summary' | 'recommendation'
  model_name: string
  model_version: string
  input_data: Record<string, any>
  output_data?: Record<string, any>
  confidence?: number
  status?: 'pending' | 'completed' | 'failed'
  error_message?: string
}

// ============================================================================
// RESULTS - ENVIRONMENTAL
// ============================================================================

export interface IResultsRepository {
  getEnvironmentalById(resultId: number): Promise<EnvironmentalResult | null>
  listEnvironmentalByScenario(scenarioId: number): Promise<EnvironmentalResult[]>
  listEnvironmentalByStage(stageId: number): Promise<EnvironmentalResult[]>
  createEnvironmental(data: CreateEnvironmentalResultInput): Promise<EnvironmentalResult>
  getCircularityById(resultId: number): Promise<CircularityResult | null>
  listCircularityByScenario(scenarioId: number): Promise<CircularityResult[]>
  createCircularity(data: CreateCircularityResultInput): Promise<CircularityResult>
}

export interface EnvironmentalResult {
  result_id: number
  scenario_id: number
  stage_id: number | null
  indicator_type: 'gwp' | 'energy' | 'water' | string
  value: number
  unit: string
  calculation_method: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateEnvironmentalResultInput {
  scenario_id: number
  stage_id?: number
  indicator_type: string
  value: number
  unit: string
  calculation_method?: string
}

// ============================================================================
// RESULTS - CIRCULARITY
// ============================================================================

export interface CircularityResult {
  result_id: number
  scenario_id: number
  metric_type: 'recycled_content' | 'recovery_rate' | 'efficiency_index' | 'loss_rate' | 'loop_closure'
  value: number
  unit: string
  calculation_method: string | null
  details: Record<string, any> | null
  created_at: Date
  updated_at: Date
}

export interface CreateCircularityResultInput {
  scenario_id: number
  metric_type: string
  value: number
  unit: string
  calculation_method?: string
  details?: Record<string, any>
}

// ============================================================================
// MATERIAL FLOWS
// ============================================================================

export interface IMaterialFlowRepository {
  getMaterialFlowById(flowId: number): Promise<MaterialFlow | null>
  listFlowsByScenario(scenarioId: number): Promise<MaterialFlow[]>
  createFlow(data: CreateMaterialFlowInput): Promise<MaterialFlow>
  updateFlow(flowId: number, data: Partial<MaterialFlow>): Promise<MaterialFlow>
}

export interface MaterialFlow {
  flow_id: number
  scenario_id: number
  from_stage_id: number | null
  to_stage_id: number | null
  material_type: string
  quantity_tonnes: number
  percentage: number
  created_at: Date
  updated_at: Date
}

export interface CreateMaterialFlowInput {
  scenario_id: number
  from_stage_id?: number
  to_stage_id?: number
  material_type: string
  quantity_tonnes: number
  percentage?: number
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface IAuditLogRepository {
  logAction(data: AuditLogEntry): Promise<void>
  getAuditLog(userId: number, limit?: number): Promise<AuditLogEntry[]>
}

export interface AuditLogEntry {
  log_id: number
  user_id: number
  entity_type: string
  entity_id: number | null
  action: 'create' | 'update' | 'delete' | 'predict' | 'compute'
  details: Record<string, any>
  created_at: Date
}
