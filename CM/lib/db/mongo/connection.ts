/**
 * MongoDB Connection Manager
 * 
 * Handles connection to MongoDB using the native MongoDB driver.
 * Supports both sync (MongoClient) and can be extended for async (Motor) patterns.
 */

import { MongoClient, Db, Collection, ObjectId, Document as MongoDocument } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

/**
 * Get or create MongoDB connection
 */
export async function getMongoClient(): Promise<MongoClient> {
    if (client) {
        return client
    }

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI
    if (!mongoUri) {
        throw new Error('MONGO_URI or MONGODB_URI environment variable is not set')
    }

    client = new MongoClient(mongoUri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
    })

    await client.connect()
    console.log('MongoDB connected successfully')

    return client
}

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<Db> {
    if (db) {
        return db
    }

    const mongoClient = await getMongoClient()
    const dbName = process.env.MONGO_DB_NAME || 'lca_platform'
    db = mongoClient.db(dbName)

    return db
}

/**
 * Get a specific collection
 */
export async function getCollection<T extends MongoDocument = MongoDocument>(collectionName: string): Promise<Collection<T>> {
    const database = await getDatabase()
    return database.collection<T>(collectionName)
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoConnection(): Promise<void> {
    if (client) {
        await client.close()
        client = null
        db = null
        console.log('MongoDB connection closed')
    }
}

/**
 * Helper to convert string ID to ObjectId
 */
export function toObjectId(id: string | number): ObjectId {
    if (typeof id === 'number') {
        // For backward compatibility with numeric IDs, create a deterministic ObjectId
        return new ObjectId(id.toString().padStart(24, '0'))
    }
    try {
        return new ObjectId(id)
    } catch {
        // If the string is not a valid ObjectId, create one from the string
        return new ObjectId(id.padStart(24, '0').slice(0, 24))
    }
}

/**
 * Helper to convert ObjectId to string for API responses
 */
export function fromObjectId(id: ObjectId | string): string {
    return id.toString()
}

/**
 * Collection names as constants
 */
export const Collections = {
    USERS: 'users',
    SESSIONS: 'sessions',
    PROJECTS: 'projects',
    SCENARIOS: 'scenarios',
    LIFECYCLE_STAGES: 'lifecycle_stages',
    STAGE_PARAMETERS: 'stage_parameters',
    AI_PREDICTIONS: 'ai_predictions',
    RESULTS_ENVIRONMENTAL: 'results_environmental',
    RESULTS_CIRCULARITY: 'results_circularity',
    MATERIAL_FLOWS: 'material_flows',
    AUDIT_LOGS: 'audit_logs',
    STAGE_TEMPLATES: 'stage_templates',
    PARAMETER_TEMPLATES: 'parameter_templates',
} as const

/**
 * Initialize indexes for all collections
 * Call this once during application startup
 */
export async function initializeIndexes(): Promise<void> {
    const database = await getDatabase()

    // Users collection indexes
    await database.collection(Collections.USERS).createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { created_at: -1 } }
    ])

    // Sessions collection indexes
    await database.collection(Collections.SESSIONS).createIndexes([
        { key: { user_id: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 } // TTL index
    ])

    // Projects collection indexes
    await database.collection(Collections.PROJECTS).createIndexes([
        { key: { user_id: 1 } },
        { key: { user_id: 1, name: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { created_at: -1 } }
    ])

    // Scenarios collection indexes
    await database.collection(Collections.SCENARIOS).createIndexes([
        { key: { project_id: 1 } },
        { key: { user_id: 1 } },
        { key: { status: 1 } },
        { key: { created_at: -1 } }
    ])

    // Lifecycle stages collection indexes
    await database.collection(Collections.LIFECYCLE_STAGES).createIndexes([
        { key: { scenario_id: 1 } },
        { key: { scenario_id: 1, stage_order: 1 } }
    ])

    // Stage parameters collection indexes
    await database.collection(Collections.STAGE_PARAMETERS).createIndexes([
        { key: { stage_id: 1 } },
        { key: { is_ai_predicted: 1 } }
    ])

    // AI predictions collection indexes
    await database.collection(Collections.AI_PREDICTIONS).createIndexes([
        { key: { user_id: 1 } },
        { key: { scenario_id: 1 } },
        { key: { status: 1 } },
        { key: { created_at: -1 } }
    ])

    // Results environmental collection indexes
    await database.collection(Collections.RESULTS_ENVIRONMENTAL).createIndexes([
        { key: { scenario_id: 1 } },
        { key: { stage_id: 1 } }
    ])

    // Results circularity collection indexes
    await database.collection(Collections.RESULTS_CIRCULARITY).createIndexes([
        { key: { scenario_id: 1 } }
    ])

    // Material flows collection indexes
    await database.collection(Collections.MATERIAL_FLOWS).createIndexes([
        { key: { scenario_id: 1 } }
    ])

    // Audit logs collection indexes
    await database.collection(Collections.AUDIT_LOGS).createIndexes([
        { key: { user_id: 1 } },
        { key: { entity_type: 1, entity_id: 1 } },
        { key: { created_at: -1 } }
    ])

    console.log('MongoDB indexes initialized')
}

/**
 * Seed initial data (stage templates, parameter templates)
 */
export async function seedInitialData(): Promise<void> {
    const database = await getDatabase()

    // Seed stage templates
    const stageTemplatesCollection = database.collection(Collections.STAGE_TEMPLATES)
    const existingTemplates = await stageTemplatesCollection.countDocuments()
    
    if (existingTemplates === 0) {
        await stageTemplatesCollection.insertMany([
            {
                route_type: 'primary',
                stages: [
                    { stage_order: 1, stage_type: 'mining', name: 'Mining' },
                    { stage_order: 2, stage_type: 'refining', name: 'Refining' },
                    { stage_order: 3, stage_type: 'smelting', name: 'Smelting' },
                    { stage_order: 4, stage_type: 'casting', name: 'Casting' },
                    { stage_order: 5, stage_type: 'fabrication', name: 'Fabrication' },
                    { stage_order: 6, stage_type: 'use_phase', name: 'Use Phase' },
                    { stage_order: 7, stage_type: 'eol', name: 'End-of-Life' }
                ],
                created_at: new Date()
            },
            {
                route_type: 'secondary',
                stages: [
                    { stage_order: 1, stage_type: 'scrap_sorting', name: 'Scrap Sorting' },
                    { stage_order: 2, stage_type: 'remelting', name: 'Remelting' },
                    { stage_order: 3, stage_type: 'fabrication', name: 'Fabrication' },
                    { stage_order: 4, stage_type: 'use_phase', name: 'Use Phase' },
                    { stage_order: 5, stage_type: 'eol', name: 'End-of-Life' }
                ],
                created_at: new Date()
            },
            {
                route_type: 'hybrid',
                stages: [
                    { stage_order: 1, stage_type: 'mining', name: 'Mining (30%)' },
                    { stage_order: 2, stage_type: 'scrap_sorting', name: 'Scrap Sorting (70%)' },
                    { stage_order: 3, stage_type: 'refining_remelting', name: 'Refining/Remelting' },
                    { stage_order: 4, stage_type: 'casting', name: 'Casting' },
                    { stage_order: 5, stage_type: 'fabrication', name: 'Fabrication' },
                    { stage_order: 6, stage_type: 'use_phase', name: 'Use Phase' },
                    { stage_order: 7, stage_type: 'eol', name: 'End-of-Life' }
                ],
                created_at: new Date()
            }
        ])
        console.log('Stage templates seeded')
    }

    // Seed parameter templates
    const paramTemplatesCollection = database.collection(Collections.PARAMETER_TEMPLATES)
    const existingParams = await paramTemplatesCollection.countDocuments()
    
    if (existingParams === 0) {
        await paramTemplatesCollection.insertMany([
            { stage_type: 'mining', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 50, description: 'Energy per tonne extracted' },
            { stage_type: 'mining', parameter_name: 'scrap_rate', parameter_type: 'numeric', unit: '%', industry_default: 15, description: 'Mining waste percentage' },
            { stage_type: 'refining', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 80, description: 'Refining energy per tonne' },
            { stage_type: 'smelting', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 3400, description: 'Primary smelting energy' },
            { stage_type: 'casting', parameter_name: 'material_yield', parameter_type: 'numeric', unit: '%', industry_default: 90, description: 'Casting material efficiency' },
            { stage_type: 'fabrication', parameter_name: 'material_yield', parameter_type: 'numeric', unit: '%', industry_default: 85, description: 'Fabrication material efficiency' },
            { stage_type: 'remelting', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 1500, description: 'Secondary remelting energy' },
            { stage_type: 'eol', parameter_name: 'recycling_rate', parameter_type: 'numeric', unit: '%', industry_default: 75, description: 'Material recycling rate at EoL' },
            { stage_type: 'eol', parameter_name: 'recovery_efficiency', parameter_type: 'numeric', unit: '%', industry_default: 80, description: 'Recovery process efficiency' },
            { stage_type: 'use_phase', parameter_name: 'duration_years', parameter_type: 'numeric', unit: 'years', industry_default: 20, description: 'Product use phase duration' }
        ])
        console.log('Parameter templates seeded')
    }
}
