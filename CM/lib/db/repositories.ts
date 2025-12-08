// Repository interfaces for DB access
export interface UserRecord {
  user_id?: number
  email: string
  password_hash?: string
  name?: string
  created_at?: string
}

export interface ProjectRecord {
  project_id?: number
  user_id: number
  name: string
  description?: string
  metal_type?: string
  region?: string
  functional_unit?: string
  status?: string
  gwp?: number
  recycled_content?: number
  created_at?: string
  updated_at?: string
}

export interface ScenarioRecord {
  scenario_id?: number
  user_id?: number
  project_id: number
  name: string
  route_type?: string
  is_baseline?: boolean
  status?: string
  description?: string
  created_at?: string
}

export interface StageRecord {
  stage_id?: number
  scenario_id: number
  stage_order?: number
  stage_type?: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface ParameterRecord {
  parameter_id?: number
  stage_id: number
  parameter_name: string
  parameter_type?: string
  unit?: string | null
  value?: number | string | null
  is_ai_predicted?: boolean | null
  ai_model_name?: string | null
  ai_model_version?: string | null
  ai_confidence?: number | null
  source?: string | null
  created_at?: string
  updated_at?: string
}

export interface EnvironmentalResultRecord {
  result_id?: number
  scenario_id: number
  stage_id?: number | null
  indicator_type: string
  value: number
  unit?: string | null
  calculation_method?: string | null
  created_at?: string
  updated_at?: string
}

export interface CircularityResultRecord {
  result_id?: number
  scenario_id: number
  metric_type: string
  value: number
  unit?: string | null
  calculation_method?: string | null
  details?: any
  created_at?: string
  updated_at?: string
}

export interface PredictionRecord {
  prediction_id?: number
  scenario_id: number
  input: string
  output: string
  model_name?: string
  model_version?: string
  confidence?: number
  created_at?: string
}

export interface UserRepository {
  createUser(u: Partial<UserRecord>): Promise<UserRecord>
  getUserByEmail(email: string): Promise<UserRecord | null>
  getUserById(id: number): Promise<UserRecord | null>
  updateUser(u: Partial<UserRecord> & { user_id: number }): Promise<UserRecord | null>
}

export interface ProjectRepository {
  createProject(p: Partial<ProjectRecord>): Promise<ProjectRecord>
  getProjectById(id: number): Promise<ProjectRecord | null>
  listProjectsByUser(userId: number): Promise<ProjectRecord[]>
  updateProject(p: Partial<ProjectRecord> & { project_id: number }): Promise<ProjectRecord | null>
}

export interface ScenarioRepository {
  createScenario(s: Partial<ScenarioRecord>): Promise<ScenarioRecord>
  getScenarioById(id: number): Promise<ScenarioRecord | null>
  listScenariosByProject(projectId: number): Promise<ScenarioRecord[]>
  updateScenario(s: Partial<ScenarioRecord> & { scenario_id: number }): Promise<ScenarioRecord | null>
}

export interface StageRepository {
  createStage(s: Partial<StageRecord>): Promise<StageRecord>
  listStagesByScenario(scenarioId: number): Promise<StageRecord[]>
  getStageById(stageId: number): Promise<StageRecord | null>
}

export interface ParameterRepository {
  createParameter(p: Partial<ParameterRecord>): Promise<ParameterRecord>
  listParametersByStage(stageId: number): Promise<ParameterRecord[]>
  listParametersByScenario(scenarioId: number): Promise<ParameterRecord[]>
  updateParameter(p: Partial<ParameterRecord> & { parameter_id: number }): Promise<ParameterRecord | null>
  getIncompleteParameters(scenarioId: number): Promise<ParameterRecord[]>
  getParameterById(parameterId: number): Promise<ParameterRecord | null>
}

export interface ResultsRepository {
  createEnvironmental(r: Partial<EnvironmentalResultRecord>): Promise<EnvironmentalResultRecord>
  createCircularity(r: Partial<CircularityResultRecord>): Promise<CircularityResultRecord>
  listEnvironmentalByScenario(scenarioId: number): Promise<EnvironmentalResultRecord[]>
  listCircularityByScenario(scenarioId: number): Promise<CircularityResultRecord[]>
}

export interface PredictionsRepository {
  createPrediction(p: Partial<PredictionRecord>): Promise<PredictionRecord>
  listPredictionsByScenario(scenarioId: number): Promise<PredictionRecord[]>
}
// Database-agnostic repository interfaces for Data Access Layer
// These interfaces allow swapping between SQL and MongoDB implementations
// without changing business logic

import type { Project, Scenario } from "@/lib/lca-context"

// User Repository
export interface IUserRepository {
  getUserById(userId: string): Promise<any | null>
  getUserByEmail(email: string): Promise<any | null>
  createUser(email: string, name: string, passwordHash: string): Promise<any>
  updateUser(userId: string, data: Record<string, any>): Promise<void>
}

// User Settings Repository
export interface IUserSettingsRepository {
  getSettings(userId: string): Promise<any | null>
  updateSettings(userId: string, settings: Record<string, any>): Promise<void>
}

// Project Repository
export interface IProjectRepository {
  listProjectsByUser(userId: string): Promise<Project[]>
  getProjectById(userId: string, projectId: string): Promise<Project | null>
  createProject(userId: string, data: Record<string, any>): Promise<Project>
  updateProject(projectId: string, data: Partial<Project>): Promise<void>
  deleteProject(projectId: string): Promise<void>
  getRecentProjects(userId: string, limit: number): Promise<Project[]>
}

// Scenario Repository
export interface IScenarioRepository {
  listScenariosByProject(projectId: string): Promise<Scenario[]>
  getScenarioById(scenarioId: string): Promise<Scenario | null>
  createScenario(projectId: string, data: Record<string, any>): Promise<Scenario>
  updateScenario(scenarioId: string, data: Partial<Scenario>): Promise<void>
  deleteScenario(scenarioId: string): Promise<void>
}

// Stage Repository
export interface IStageRepository {
  listStagesByScenario(scenarioId: string): Promise<any[]>
  getStageById(stageId: string): Promise<any | null>
  createStage(scenarioId: string, data: Record<string, any>): Promise<any>
  updateStage(stageId: string, data: Record<string, any>): Promise<void>
}

// Stage Parameters Repository
export interface IStageParametersRepository {
  getParametersByStage(stageId: string): Promise<any[]>
  updateParameter(paramId: string, data: Record<string, any>): Promise<void>
  createParameter(stageId: string, data: Record<string, any>): Promise<any>
}

// Results Repository
export interface IResultsRepository {
  getEnvironmentalResults(scenarioId: string): Promise<any[]>
  getCircularityResults(scenarioId: string): Promise<any[]>
  saveEnvironmentalResults(scenarioId: string, results: any[]): Promise<void>
  saveCircularityResults(scenarioId: string, results: any[]): Promise<void>
}

// AI Predictions Repository
export interface IAIPredictionRepository {
  savePrediction(data: Record<string, any>): Promise<any>
  getPredictionsByProject(projectId: string, limit: number): Promise<any[]>
  getPredictionsByScenario(scenarioId: string): Promise<any[]>
}

// LLM Calls Repository
export interface ILLMRepository {
  saveLLMCall(data: Record<string, any>): Promise<any>
  saveLLMOutput(llmCallId: string, content: string, contentType: string): Promise<void>
  getLLMHistoryByUser(userId: string, limit: number): Promise<any[]>
}
