/**
 * MongoDB Database Initialization Script
 * 
 * This script initializes the MongoDB database with:
 * - All required collections
 * - Indexes for optimal query performance
 * - Initial seed data (templates, etc.)
 * 
 * Run with: npx tsx scripts/init-mongodb.ts
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGO_DB_NAME || 'circumetal'

// Collection names
const Collections = {
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

async function initializeMongoDB() {
    console.log('🚀 Starting MongoDB initialization...')
    console.log(`📦 Connecting to: ${MONGODB_URI}`)
    console.log(`📁 Database: ${DB_NAME}`)

    const client = new MongoClient(MONGODB_URI)

    try {
        await client.connect()
        console.log('✅ Connected to MongoDB successfully')

        const db = client.db(DB_NAME)

        // Create collections explicitly
        console.log('\n📂 Creating collections...')
        for (const [key, name] of Object.entries(Collections)) {
            try {
                await db.createCollection(name)
                console.log(`   ✓ Created collection: ${name}`)
            } catch (err: any) {
                if (err.codeName === 'NamespaceExists') {
                    console.log(`   ○ Collection exists: ${name}`)
                } else {
                    throw err
                }
            }
        }

        // Create indexes
        console.log('\n🔍 Creating indexes...')

        // Users collection indexes
        await db.collection(Collections.USERS).createIndexes([
            { key: { email: 1 }, unique: true },
            { key: { created_at: -1 } }
        ])
        console.log('   ✓ Users indexes created')

        // Sessions collection indexes
        await db.collection(Collections.SESSIONS).createIndexes([
            { key: { user_id: 1 } },
            { key: { expires_at: 1 }, expireAfterSeconds: 0 }
        ])
        console.log('   ✓ Sessions indexes created')

        // Projects collection indexes
        await db.collection(Collections.PROJECTS).createIndexes([
            { key: { user_id: 1 } },
            { key: { user_id: 1, name: 1 }, unique: true },
            { key: { status: 1 } },
            { key: { created_at: -1 } }
        ])
        console.log('   ✓ Projects indexes created')

        // Scenarios collection indexes
        await db.collection(Collections.SCENARIOS).createIndexes([
            { key: { project_id: 1 } },
            { key: { user_id: 1 } },
            { key: { status: 1 } },
            { key: { created_at: -1 } }
        ])
        console.log('   ✓ Scenarios indexes created')

        // Lifecycle stages collection indexes
        await db.collection(Collections.LIFECYCLE_STAGES).createIndexes([
            { key: { scenario_id: 1 } },
            { key: { scenario_id: 1, stage_order: 1 } }
        ])
        console.log('   ✓ Lifecycle stages indexes created')

        // Stage parameters collection indexes
        await db.collection(Collections.STAGE_PARAMETERS).createIndexes([
            { key: { stage_id: 1 } },
            { key: { is_ai_predicted: 1 } }
        ])
        console.log('   ✓ Stage parameters indexes created')

        // AI predictions collection indexes
        await db.collection(Collections.AI_PREDICTIONS).createIndexes([
            { key: { user_id: 1 } },
            { key: { scenario_id: 1 } },
            { key: { status: 1 } },
            { key: { created_at: -1 } }
        ])
        console.log('   ✓ AI predictions indexes created')

        // Results environmental collection indexes
        await db.collection(Collections.RESULTS_ENVIRONMENTAL).createIndexes([
            { key: { scenario_id: 1 } },
            { key: { stage_id: 1 } }
        ])
        console.log('   ✓ Environmental results indexes created')

        // Results circularity collection indexes
        await db.collection(Collections.RESULTS_CIRCULARITY).createIndexes([
            { key: { scenario_id: 1 } }
        ])
        console.log('   ✓ Circularity results indexes created')

        // Material flows collection indexes
        await db.collection(Collections.MATERIAL_FLOWS).createIndexes([
            { key: { scenario_id: 1 } }
        ])
        console.log('   ✓ Material flows indexes created')

        // Audit logs collection indexes
        await db.collection(Collections.AUDIT_LOGS).createIndexes([
            { key: { user_id: 1 } },
            { key: { entity_type: 1, entity_id: 1 } },
            { key: { created_at: -1 } }
        ])
        console.log('   ✓ Audit logs indexes created')

        // Seed initial data
        console.log('\n🌱 Seeding initial data...')

        // Seed stage templates
        const stageTemplatesCollection = db.collection(Collections.STAGE_TEMPLATES)
        const existingTemplates = await stageTemplatesCollection.countDocuments()

        if (existingTemplates === 0) {
            await stageTemplatesCollection.insertMany([
                {
                    route_type: 'primary',
                    name: 'Primary Production Route',
                    description: 'Traditional primary metal production from ore extraction',
                    stages: [
                        { stage_order: 1, stage_type: 'mining', name: 'Mining', description: 'Ore extraction and processing' },
                        { stage_order: 2, stage_type: 'refining', name: 'Refining', description: 'Ore concentration and refining' },
                        { stage_order: 3, stage_type: 'smelting', name: 'Smelting', description: 'Primary metal smelting' },
                        { stage_order: 4, stage_type: 'casting', name: 'Casting', description: 'Metal casting operations' },
                        { stage_order: 5, stage_type: 'fabrication', name: 'Fabrication', description: 'Product fabrication and forming' },
                        { stage_order: 6, stage_type: 'use_phase', name: 'Use Phase', description: 'Product use and maintenance' },
                        { stage_order: 7, stage_type: 'eol', name: 'End-of-Life', description: 'End-of-life management and recycling' }
                    ],
                    created_at: new Date()
                },
                {
                    route_type: 'secondary',
                    name: 'Secondary Production Route',
                    description: 'Recycled metal production from scrap',
                    stages: [
                        { stage_order: 1, stage_type: 'scrap_sorting', name: 'Scrap Sorting', description: 'Scrap collection and sorting' },
                        { stage_order: 2, stage_type: 'remelting', name: 'Remelting', description: 'Scrap remelting and refining' },
                        { stage_order: 3, stage_type: 'fabrication', name: 'Fabrication', description: 'Product fabrication and forming' },
                        { stage_order: 4, stage_type: 'use_phase', name: 'Use Phase', description: 'Product use and maintenance' },
                        { stage_order: 5, stage_type: 'eol', name: 'End-of-Life', description: 'End-of-life management and recycling' }
                    ],
                    created_at: new Date()
                },
                {
                    route_type: 'hybrid',
                    name: 'Hybrid Production Route',
                    description: 'Combined primary and secondary production',
                    stages: [
                        { stage_order: 1, stage_type: 'mining', name: 'Mining (30%)', description: 'Primary ore extraction (30% of input)' },
                        { stage_order: 2, stage_type: 'scrap_sorting', name: 'Scrap Sorting (70%)', description: 'Scrap input (70% of input)' },
                        { stage_order: 3, stage_type: 'refining_remelting', name: 'Refining/Remelting', description: 'Combined refining and remelting' },
                        { stage_order: 4, stage_type: 'casting', name: 'Casting', description: 'Metal casting operations' },
                        { stage_order: 5, stage_type: 'fabrication', name: 'Fabrication', description: 'Product fabrication and forming' },
                        { stage_order: 6, stage_type: 'use_phase', name: 'Use Phase', description: 'Product use and maintenance' },
                        { stage_order: 7, stage_type: 'eol', name: 'End-of-Life', description: 'End-of-life management and recycling' }
                    ],
                    created_at: new Date()
                }
            ])
            console.log('   ✓ Stage templates seeded (3 templates)')
        } else {
            console.log(`   ○ Stage templates exist (${existingTemplates} templates)`)
        }

        // Seed parameter templates
        const paramTemplatesCollection = db.collection(Collections.PARAMETER_TEMPLATES)
        const existingParams = await paramTemplatesCollection.countDocuments()

        if (existingParams === 0) {
            await paramTemplatesCollection.insertMany([
                // Mining parameters
                { stage_type: 'mining', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 50, description: 'Energy consumption per tonne of ore extracted', category: 'energy' },
                { stage_type: 'mining', parameter_name: 'scrap_rate', parameter_type: 'numeric', unit: '%', industry_default: 15, description: 'Mining waste percentage', category: 'waste' },
                { stage_type: 'mining', parameter_name: 'water_consumption', parameter_type: 'numeric', unit: 'm³/tonne', industry_default: 2.5, description: 'Water consumption per tonne', category: 'resource' },
                { stage_type: 'mining', parameter_name: 'co2_emissions', parameter_type: 'numeric', unit: 'kg CO2e/tonne', industry_default: 35, description: 'Direct CO2 emissions', category: 'emissions' },

                // Refining parameters
                { stage_type: 'refining', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 80, description: 'Refining energy per tonne', category: 'energy' },
                { stage_type: 'refining', parameter_name: 'material_yield', parameter_type: 'numeric', unit: '%', industry_default: 95, description: 'Material yield percentage', category: 'efficiency' },
                { stage_type: 'refining', parameter_name: 'chemical_consumption', parameter_type: 'numeric', unit: 'kg/tonne', industry_default: 15, description: 'Chemical reagent consumption', category: 'resource' },

                // Smelting parameters
                { stage_type: 'smelting', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 3400, description: 'Primary smelting energy', category: 'energy' },
                { stage_type: 'smelting', parameter_name: 'co2_emissions', parameter_type: 'numeric', unit: 'kg CO2e/tonne', industry_default: 1800, description: 'Smelting CO2 emissions', category: 'emissions' },
                { stage_type: 'smelting', parameter_name: 'anode_consumption', parameter_type: 'numeric', unit: 'kg/tonne', industry_default: 450, description: 'Anode consumption per tonne', category: 'resource' },

                // Casting parameters
                { stage_type: 'casting', parameter_name: 'material_yield', parameter_type: 'numeric', unit: '%', industry_default: 90, description: 'Casting material efficiency', category: 'efficiency' },
                { stage_type: 'casting', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 150, description: 'Casting energy consumption', category: 'energy' },

                // Fabrication parameters
                { stage_type: 'fabrication', parameter_name: 'material_yield', parameter_type: 'numeric', unit: '%', industry_default: 85, description: 'Fabrication material efficiency', category: 'efficiency' },
                { stage_type: 'fabrication', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 200, description: 'Fabrication energy consumption', category: 'energy' },
                { stage_type: 'fabrication', parameter_name: 'scrap_rate', parameter_type: 'numeric', unit: '%', industry_default: 15, description: 'Fabrication scrap generation', category: 'waste' },

                // Remelting parameters (secondary route)
                { stage_type: 'remelting', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 1500, description: 'Secondary remelting energy', category: 'energy' },
                { stage_type: 'remelting', parameter_name: 'co2_emissions', parameter_type: 'numeric', unit: 'kg CO2e/tonne', industry_default: 300, description: 'Remelting CO2 emissions', category: 'emissions' },
                { stage_type: 'remelting', parameter_name: 'material_yield', parameter_type: 'numeric', unit: '%', industry_default: 92, description: 'Remelting material yield', category: 'efficiency' },

                // Scrap sorting parameters
                { stage_type: 'scrap_sorting', parameter_name: 'energy_consumption', parameter_type: 'numeric', unit: 'kWh/tonne', industry_default: 25, description: 'Sorting energy consumption', category: 'energy' },
                { stage_type: 'scrap_sorting', parameter_name: 'sorting_efficiency', parameter_type: 'numeric', unit: '%', industry_default: 85, description: 'Scrap sorting efficiency', category: 'efficiency' },

                // End-of-life parameters
                { stage_type: 'eol', parameter_name: 'recycling_rate', parameter_type: 'numeric', unit: '%', industry_default: 75, description: 'Material recycling rate at EoL', category: 'circularity' },
                { stage_type: 'eol', parameter_name: 'recovery_efficiency', parameter_type: 'numeric', unit: '%', industry_default: 80, description: 'Recovery process efficiency', category: 'efficiency' },
                { stage_type: 'eol', parameter_name: 'collection_rate', parameter_type: 'numeric', unit: '%', industry_default: 85, description: 'Collection rate for recycling', category: 'circularity' },
                { stage_type: 'eol', parameter_name: 'landfill_rate', parameter_type: 'numeric', unit: '%', industry_default: 10, description: 'Material going to landfill', category: 'waste' },

                // Use phase parameters
                { stage_type: 'use_phase', parameter_name: 'duration_years', parameter_type: 'numeric', unit: 'years', industry_default: 20, description: 'Product use phase duration', category: 'lifetime' },
                { stage_type: 'use_phase', parameter_name: 'maintenance_frequency', parameter_type: 'numeric', unit: 'per year', industry_default: 1, description: 'Annual maintenance frequency', category: 'maintenance' },
                { stage_type: 'use_phase', parameter_name: 'operational_energy', parameter_type: 'numeric', unit: 'kWh/year', industry_default: 0, description: 'Operational energy consumption', category: 'energy' }
            ])
            console.log('   ✓ Parameter templates seeded (26 parameters)')
        } else {
            console.log(`   ○ Parameter templates exist (${existingParams} parameters)`)
        }

        // Print database summary
        console.log('\n📊 Database Summary:')
        const collections = await db.listCollections().toArray()
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments()
            console.log(`   ${col.name}: ${count} documents`)
        }

        console.log('\n✅ MongoDB initialization complete!')
        console.log(`\n🔗 Connection string: ${MONGODB_URI}`)
        console.log(`📁 Database: ${DB_NAME}`)

    } catch (error) {
        console.error('❌ Error initializing MongoDB:', error)
        process.exit(1)
    } finally {
        await client.close()
        console.log('\n👋 Connection closed')
    }
}

// Run initialization
initializeMongoDB()
