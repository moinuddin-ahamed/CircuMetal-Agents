/**
 * Database Factory
 * 
 * Provides MongoDB repository instances for all database operations.
 */

// MongoDB Repositories
import { MongoUserRepository } from './mongo/users'
import { MongoProjectRepository } from './mongo/projects'
import { MongoScenarioRepository } from './mongo/scenarios'
import { MongoStageRepository } from './mongo/stages'
import { MongoParameterRepository } from './mongo/parameters'
import { MongoResultsRepository } from './mongo/results'
import { MongoPredictionsRepository } from './mongo/predictions'
import { MongoAuditLogsRepository } from './mongo/auditLogs'
import { MongoMaterialFlowsRepository } from './mongo/materialFlows'

// Repository interfaces
import type {
  UserRepository,
  ProjectRepository,
  ScenarioRepository,
  StageRepository,
  ParameterRepository,
  ResultsRepository,
  PredictionsRepository,
  ILLMRepository,
  IUserSettingsRepository,
} from './repositories'

/**
 * Check if using MongoDB (always true now)
 */
export function isMongoProvider(): boolean {
  return true
}

/**
 * Create all repositories
 */
export const createRepositories = () => {
  return {
    users: new MongoUserRepository(),
    projects: new MongoProjectRepository(),
    scenarios: new MongoScenarioRepository(),
    stages: new MongoStageRepository(),
    parameters: new MongoParameterRepository(),
    results: new MongoResultsRepository(),
    predictions: new MongoPredictionsRepository(),
    auditLogs: new MongoAuditLogsRepository(),
    materialFlows: new MongoMaterialFlowsRepository(),
  }
}

export type Repos = ReturnType<typeof createRepositories>

/**
 * Individual repository factory functions
 */
export function createUserRepository(): UserRepository {
  return new MongoUserRepository()
}

export function createProjectRepository(): ProjectRepository {
  return new MongoProjectRepository()
}

export function createScenarioRepository(): ScenarioRepository {
  return new MongoScenarioRepository()
}

export function createStageRepository(): StageRepository {
  return new MongoStageRepository()
}

export function createParameterRepository(): ParameterRepository {
  return new MongoParameterRepository()
}

export function createResultsRepository(): ResultsRepository {
  return new MongoResultsRepository()
}

export function createPredictionsRepository(): PredictionsRepository {
  return new MongoPredictionsRepository()
}

export function createAuditLogsRepository() {
  return new MongoAuditLogsRepository()
}

export function createMaterialFlowRepository() {
  return new MongoMaterialFlowsRepository()
}

// Alias functions for interface compatibility
export function createStageParametersRepository(): ParameterRepository {
  return createParameterRepository()
}

export function createAIPredictionRepository(): PredictionsRepository {
  return createPredictionsRepository()
}

export function createLLMRepository(): ILLMRepository {
  return {} as ILLMRepository
}

export function createUserSettingsRepository(): IUserSettingsRepository {
  return {} as IUserSettingsRepository
}

/**
 * Initialize database connection and indexes
 * Call this on application startup
 */
export async function initializeDatabase(): Promise<void> {
  const { initializeIndexes, seedInitialData } = await import('./mongo/connection')
  await initializeIndexes()
  await seedInitialData()
  console.log('MongoDB database initialized')
}

/**
 * Close database connections
 * Call this on application shutdown
 */
export async function closeDatabaseConnection(): Promise<void> {
  const { closeMongoConnection } = await import('./mongo/connection')
  await closeMongoConnection()
}
