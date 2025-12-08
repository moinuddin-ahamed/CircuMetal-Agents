/**
 * LCA Computation Engine & Scenario Service Logic
 * 
 * MongoDB-based implementation for lifecycle assessment calculations.
 */
import type { Scenario, LifecycleStage, StageParameter } from '@/lib/db/schema-types'
import type { StageRecord, ParameterRecord, EnvironmentalResultRecord, CircularityResultRecord } from '@/lib/db/repositories'
import { createStageRepository, createParameterRepository, createResultsRepository, createMaterialFlowRepository } from '@/lib/db/factory'
import { getCollection, Collections } from '@/lib/db/mongo/connection'

// Runtime type guards for parameter_type and source
function toParameterType(val: string): 'numeric' | 'text' | 'score' | 'choice' {
    if (val === 'numeric' || val === 'text' || val === 'score' || val === 'choice') return val;
    return 'numeric';
}

function toParameterSource(val: string): 'manual' | 'ai_prediction' | 'industry_default' {
    if (val === 'manual' || val === 'ai_prediction' || val === 'industry_default') return val;
    return 'manual';
}

// ============================================================================
// LCA COMPUTATION ENGINE
// ============================================================================

export interface LCAComputationInput {
    scenario_id: number
    stages: StageRecord[]
    parameters: ParameterRecord[]
}

export interface LCAResult {
    environmental: EnvironmentalResultRecord[]
    circularity: CircularityResultRecord[]
}

export class LCAComputationEngine {
    /**
     * Computes environmental impact indicators from scenario parameters
     * GWP: Global Warming Potential (kg CO2e)
     * Energy: Total energy consumption (kWh)
     */
    async computeEnvironmentalIndicators(input: LCAComputationInput): Promise<EnvironmentalResultRecord[]> {
        const results: EnvironmentalResultRecord[] = []
        const resultsRepo = createResultsRepository()

        // Group parameters by stage
        const paramsByStage = new Map<number, ParameterRecord[]>()
        for (const param of input.parameters) {
            if (!paramsByStage.has(param.stage_id)) {
                paramsByStage.set(param.stage_id, [])
            }
            paramsByStage.get(param.stage_id)!.push(param)
        }

        let totalGWP = 0
        let totalEnergy = 0

        // Calculate per-stage impacts
        for (const stage of input.stages) {
            const stageParams = paramsByStage.get(stage.stage_id!) || []

            // Extract key parameters
            const energyParam = stageParams.find((p: any) => p.parameter_name === 'energy_consumption')
            const emissionFactorParam = stageParams.find((p: any) => p.parameter_name === 'emission_factor')

            if (energyParam?.value) {
                const energy = Number(energyParam.value)
                const emissionFactor = emissionFactorParam?.value ? Number(emissionFactorParam.value) : 0.5 // default kg CO2e per kWh
                const gwp = energy * emissionFactor

                totalGWP += gwp
                totalEnergy += energy

                // Save stage-level GWP
                const gwpResult = await resultsRepo.createEnvironmental({
                    scenario_id: input.scenario_id,
                    stage_id: stage.stage_id,
                    indicator_type: 'gwp',
                    value: gwp,
                    unit: 'kg CO2e',
                    calculation_method: `energy (${energy} kWh) × emission_factor (${emissionFactor} kg CO2e/kWh)`,
                })
                results.push(gwpResult)

                // Save stage-level energy
                const energyResult = await resultsRepo.createEnvironmental({
                    scenario_id: input.scenario_id,
                    stage_id: stage.stage_id,
                    indicator_type: 'energy',
                    value: energy,
                    unit: 'kWh',
                    calculation_method: 'energy_consumption',
                })
                results.push(energyResult)
            }
        }

        // Save scenario-level totals
        const totalGWPResult = await resultsRepo.createEnvironmental({
            scenario_id: input.scenario_id,
            indicator_type: 'gwp',
            value: totalGWP,
            unit: 'kg CO2e',
            calculation_method: 'sum of stage GWP values',
        })
        results.push(totalGWPResult)

        const totalEnergyResult = await resultsRepo.createEnvironmental({
            scenario_id: input.scenario_id,
            indicator_type: 'energy',
            value: totalEnergy,
            unit: 'kWh',
            calculation_method: 'sum of stage energy values',
        })
        results.push(totalEnergyResult)

        return results
    }

    /**
     * Computes circularity indicators
     */
    async computeCircularityMetrics(input: LCAComputationInput): Promise<CircularityResultRecord[]> {
        const results: CircularityResultRecord[] = []
        const resultsRepo = createResultsRepository()

        const paramsByStage = new Map<number, ParameterRecord[]>();
        for (const param of input.parameters) {
            if (!paramsByStage.has(param.stage_id)) {
                paramsByStage.set(param.stage_id!, []);
            }
            paramsByStage.get(param.stage_id!)!.push(param);
        }

        // 1. Recycled Content %
        let recycledContent = 0;
        const sourcingStage = input.stages.find((s: any) => s.stage_type === 'scrap_sorting' || s.stage_type === 'remelting');
        if (sourcingStage) {
            const params = paramsByStage.get(sourcingStage.stage_id!) || [];
            const recycledContentParam = params.find((p: any) => p.parameter_name === 'recycled_content_percentage');
            recycledContent = recycledContentParam?.value ? Number(recycledContentParam.value) : 0;

            const result = await resultsRepo.createCircularity({
                scenario_id: input.scenario_id,
                metric_type: 'recycled_content',
                value: recycledContent,
                unit: '%',
                calculation_method: 'recycled_content_percentage parameter',
                details: { source_stage: sourcingStage.name },
            });
            results.push(result);
        }

        // 2. Material Yield / Efficiency Index
        let totalYield = 100;
        for (const stage of input.stages) {
            const params = paramsByStage.get(stage.stage_id!) || [];
            const yieldParam = params.find((p: any) => p.parameter_name === 'material_yield');
            if (yieldParam?.value) {
                totalYield *= Number(yieldParam.value) / 100;
            }
        }

        const efficiencyResult = await resultsRepo.createCircularity({
            scenario_id: input.scenario_id,
            metric_type: 'efficiency_index',
            value: totalYield,
            unit: '%',
            calculation_method: 'product of material yield percentages across all stages',
        });
        results.push(efficiencyResult);

        // 3. Recovery Rate at EoL
        const eolStage = input.stages.find((s: any) => s.stage_type === 'eol');
        let recoveryRate = 70;
        if (eolStage) {
            const params = paramsByStage.get(eolStage.stage_id!) || [];
            const recoveryParam = params.find((p: any) => p.parameter_name === 'recycling_rate');
            recoveryRate = recoveryParam?.value ? Number(recoveryParam.value) : 70;

            const recoveryResult = await resultsRepo.createCircularity({
                scenario_id: input.scenario_id,
                metric_type: 'recovery_rate',
                value: recoveryRate,
                unit: '%',
                calculation_method: 'recycling_rate parameter at EoL',
                details: { eol_stage: eolStage.name },
            });
            results.push(recoveryResult);
        }

        // 4. Material Loss Rate per Stage
        let totalLossRate = 0;
        for (const stage of input.stages) {
            const params = paramsByStage.get(stage.stage_id!) || [];
            const scrapRateParam = params.find((p: any) => p.parameter_name === 'scrap_rate');
            const lossRate = scrapRateParam?.value ? Number(scrapRateParam.value) : 0;
            totalLossRate += lossRate;
        }

        const lossResult = await resultsRepo.createCircularity({
            scenario_id: input.scenario_id,
            metric_type: 'loss_rate',
            value: totalLossRate,
            unit: '%',
            calculation_method: 'sum of all stage scrap rates',
        });
        results.push(lossResult);

        // 5. Loop Closure % (recycled content that closes the loop)
        const loopClosure = (recycledContent || 0) * ((recoveryRate || 70) / 100);
        const loopClosureResult = await resultsRepo.createCircularity({
            scenario_id: input.scenario_id,
            metric_type: 'loop_closure',
            value: loopClosure || 0,
            unit: '%',
            calculation_method: 'recycled_content % × recovery_rate %',
        });
        results.push(loopClosureResult);

        return results;
    }

    /**
     * Main computation entry point
     */
    async computeAllResults(scenarioId: number): Promise<LCAResult> {
        const stageRepo = createStageRepository()
        const paramRepo = createParameterRepository()

        // Fetch all stages and parameters
        const stages = await stageRepo.listStagesByScenario(scenarioId)
        const parameters = await paramRepo.listParametersByScenario(scenarioId)

        const input: LCAComputationInput = {
            scenario_id: scenarioId,
            stages,
            parameters,
        }

        const environmental = await this.computeEnvironmentalIndicators(input)
        const circularity = await this.computeCircularityMetrics(input)

        return { environmental, circularity }
    }
}

// ============================================================================
// SCENARIO SERVICE
// ============================================================================

export class ScenarioService {
    private engine = new LCAComputationEngine()

    /**
     * Auto-generates lifecycle stages based on route type
     */
    async generateStagesFromTemplate(scenarioId: number, routeType: 'primary' | 'secondary' | 'hybrid'): Promise<LifecycleStage[]> {
        const stageRepo = createStageRepository()

        // Fetch stage template from MongoDB
        const templatesCollection = await getCollection(Collections.STAGE_TEMPLATES)
        const template = await templatesCollection.findOne({ route_type: routeType })

        if (!template) {
            throw new Error(`No template found for route type: ${routeType}`)
        }

        const stages: LifecycleStage[] = []
        for (const stageData of template.stages) {
            const stage = await stageRepo.createStage({
                scenario_id: scenarioId,
                stage_order: stageData.stage_order,
                stage_type: stageData.stage_type,
                name: stageData.name,
            })
            if (stage.stage_id === undefined || stage.scenario_id === undefined || stage.stage_order === undefined || stage.stage_type === undefined || stage.name === undefined) {
                throw new Error('Invalid stage record returned from repository')
            }
            stages.push({
                stage_id: stage.stage_id,
                scenario_id: stage.scenario_id,
                stage_order: stage.stage_order,
                stage_type: stage.stage_type,
                name: stage.name,
                description: (stage as any).description ?? null,
                created_at: (stage as any).created_at ?? new Date(),
                updated_at: (stage as any).updated_at ?? new Date(),
            })
        }

        return stages
    }

    /**
     * Generates empty parameter placeholders for a stage
     */
    async generateParameterPlaceholders(stageId: number): Promise<StageParameter[]> {
        const paramRepo = createParameterRepository()
        const stage = await createStageRepository().getStageById(stageId)

        if (!stage) {
            throw new Error(`Stage not found: ${stageId}`)
        }

        // Fetch industry defaults for this stage type from MongoDB
        const templatesCollection = await getCollection(Collections.PARAMETER_TEMPLATES)
        const templates = await templatesCollection.find({ stage_type: stage.stage_type }).toArray()

        const created: StageParameter[] = []
        for (const template of templates) {
            const param = await paramRepo.createParameter({
                stage_id: stageId,
                parameter_name: template.parameter_name,
                parameter_type: toParameterType(template.parameter_type),
                unit: template.unit,
                source: 'industry_default',
            })
            if (param.parameter_id === undefined || param.stage_id === undefined || param.parameter_name === undefined || param.parameter_type === undefined) {
                throw new Error('Invalid parameter record returned from repository')
            }
            created.push({
                parameter_id: param.parameter_id,
                stage_id: param.stage_id,
                parameter_name: param.parameter_name,
                parameter_type: toParameterType(param.parameter_type),
                unit: param.unit ?? null,
                value: param.value ?? null,
                is_ai_predicted: param.is_ai_predicted ?? false,
                ai_model_name: (param as any).ai_model_name ?? null,
                ai_model_version: (param as any).ai_model_version ?? null,
                ai_confidence: (param as any).ai_confidence ?? null,
                source: toParameterSource(param.source ?? 'manual'),
                created_at: (param as any).created_at ?? new Date(),
                updated_at: (param as any).updated_at ?? new Date(),
            })
        }

        return created
    }

    /**
     * Checks if a scenario is complete (all required parameters filled)
     */
    async isScenarioComplete(scenarioId: number): Promise<boolean> {
        const paramRepo = createParameterRepository()
        const incomplete = await paramRepo.getIncompleteParameters(scenarioId)
        return incomplete.length === 0
    }

    /**
     * Computes scenario results if all parameters are present
     */
    async computeScenarioResults(scenarioId: number): Promise<LCAResult> {
        const isComplete = await this.isScenarioComplete(scenarioId)

        if (!isComplete) {
            throw new Error('Scenario is incomplete - missing required parameters')
        }

        return this.engine.computeAllResults(scenarioId)
    }
}

let scenarioService: ScenarioService | null = null

export function getScenarioService(): ScenarioService {
    if (!scenarioService) {
        scenarioService = new ScenarioService()
    }
    return scenarioService
}

// ============================================================================
// Scenario Completeness Utilities
// ============================================================================

export async function getScenarioSummary(scenarioId: number): Promise<{
    scenario: Scenario
    stages: LifecycleStage[]
    parameters: StageParameter[]
    incomplete_count: number
    is_complete: boolean
}> {
    const scenariosCollection = await getCollection(Collections.SCENARIOS)
    const scenario = await scenariosCollection.findOne({ scenario_id: scenarioId })
    if (!scenario) throw new Error('Scenario not found')

    const stageRecords = await createStageRepository().listStagesByScenario(scenarioId)
    const parameterRecords = await createParameterRepository().listParametersByScenario(scenarioId)
    
    // Map StageRecord[] to LifecycleStage[]
    const stages: LifecycleStage[] = stageRecords.map(stage => {
        if (stage.stage_id === undefined || stage.scenario_id === undefined || stage.stage_order === undefined || stage.stage_type === undefined || stage.name === undefined) {
            throw new Error('Invalid stage record returned from repository')
        }
        return {
            stage_id: stage.stage_id,
            scenario_id: stage.scenario_id,
            stage_order: stage.stage_order,
            stage_type: stage.stage_type,
            name: stage.name,
            description: (stage as any).description ?? null,
            created_at: (stage as any).created_at ?? new Date(),
            updated_at: (stage as any).updated_at ?? new Date(),
        }
    })
    
    // Map ParameterRecord[] to StageParameter[]
    const parameters: StageParameter[] = parameterRecords.map(param => {
        if (param.parameter_id === undefined || param.stage_id === undefined || param.parameter_name === undefined || param.parameter_type === undefined) {
            throw new Error('Invalid parameter record returned from repository')
        }
        return {
            parameter_id: param.parameter_id,
            stage_id: param.stage_id,
            parameter_name: param.parameter_name,
            parameter_type: toParameterType(param.parameter_type),
            unit: param.unit ?? null,
            value: param.value ?? null,
            is_ai_predicted: param.is_ai_predicted ?? false,
            ai_model_name: (param as any).ai_model_name ?? null,
            ai_model_version: (param as any).ai_model_version ?? null,
            ai_confidence: (param as any).ai_confidence ?? null,
            source: toParameterSource(param.source ?? 'manual'),
            created_at: (param as any).created_at ?? new Date(),
            updated_at: (param as any).updated_at ?? new Date(),
        }
    })
    const incomplete = parameters.filter((p: any) => p.value === null)

    return {
        scenario: scenario as unknown as Scenario,
        stages,
        parameters,
        incomplete_count: incomplete.length,
        is_complete: incomplete.length === 0,
    }
}
