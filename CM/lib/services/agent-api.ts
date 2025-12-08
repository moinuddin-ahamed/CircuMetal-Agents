/**
 * CircuMetal Agent API Service
 * 
 * Client-side service for interacting with the Python multi-agent LCA system
 */

export interface AnalysisRequest {
    process_description: string
    input_amount?: string
    material: string
    energy_source?: string
    location?: string
    project_id?: string
    scenario_id?: string
}

export interface AnalysisResponse {
    job_id: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    message?: string
}

export interface AnalysisStatus {
    job_id: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    current_step?: string
    progress?: number
    result?: AnalysisResult
    error?: string
}

export interface AnalysisResult {
    data_extraction?: any
    estimated_parameters?: EstimatedParameters
    lca_results?: LCAResults
    circularity_assessment?: CircularityAssessment
    scenarios?: Scenario[]
    visualizations?: Visualizations
    report?: string
    compliance?: ComplianceCheck
    critique?: CritiqueResult
}

export interface EstimatedParameters {
    emission_factors: Record<string, number>
    energy_consumption: Record<string, number>
    transport_distances: Record<string, number>
    circularity_indicators?: {
        recycled_content: number
        resource_efficiency: number
        product_life_factor: number
        reuse_potential: number
        eol_recycling_rate: number
    }
    data_quality_score?: number
}

export interface LCAResults {
    total_gwp: number
    gwp_by_stage: Record<string, number>
    calculation_tables?: {
        stage: string
        amount: number
        emission_factor: number
        total_gwp: number
        formula: string
    }[]
    functional_unit: string
    system_boundary: string
    assumptions?: string[]
}

export interface CircularityAssessment {
    mci_score: number
    recycled_content: number
    recyclability_rate: number
    resource_efficiency: number
    circular_flow_opportunities?: {
        opportunity: string
        potential_impact: string
        implementation_difficulty: string
    }[]
    value_chain_analysis?: {
        stage: string
        linear_flow: string
        circular_opportunity: string
    }[]
}

export interface Scenario {
    name: string
    description: string
    gwp_change: number
    mci_change: number
    parameters_changed: Record<string, any>
    comparison_to_baseline?: {
        metric: string
        baseline: number
        scenario: number
        improvement: number
    }[]
}

export interface Visualizations {
    sankey_diagram?: string
    gwp_breakdown_chart?: string
    scenario_comparison?: string
    circular_flow_diagram?: string
    pathway_comparison?: string
}

export interface ComplianceCheck {
    iso_14040_compliant: boolean
    iso_14044_compliant: boolean
    iso_14067_compliant: boolean
    issues?: string[]
    recommendations?: string[]
}

export interface CritiqueResult {
    status: 'success' | 'needs_revision'
    issues?: string[]
    severity?: 'minor' | 'major' | 'critical'
}

export interface AgentInfo {
    name: string
    description: string
    available: boolean
}

/**
 * Agent API client class
 */
class AgentAPIService {
    private baseUrl: string

    constructor(baseUrl: string = '/api/agent') {
        this.baseUrl = baseUrl
    }

    /**
     * Start a new analysis
     */
    async startAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
        const response = await fetch(`${this.baseUrl}/analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to start analysis')
        }

        return response.json()
    }

    /**
     * Check the status of an analysis job
     */
    async checkStatus(jobId: string): Promise<AnalysisStatus> {
        const response = await fetch(`${this.baseUrl}/analysis/${jobId}/status`)

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to check status')
        }

        return response.json()
    }

    /**
     * Poll for analysis completion
     */
    async waitForCompletion(
        jobId: string,
        options: {
            pollInterval?: number
            maxWaitTime?: number
            onProgress?: (status: AnalysisStatus) => void
        } = {}
    ): Promise<AnalysisResult> {
        const {
            pollInterval = 2000,
            maxWaitTime = 300000, // 5 minutes
            onProgress
        } = options

        const startTime = Date.now()

        while (Date.now() - startTime < maxWaitTime) {
            const status = await this.checkStatus(jobId)

            if (onProgress) {
                onProgress(status)
            }

            if (status.status === 'completed') {
                return status.result!
            }

            if (status.status === 'failed') {
                throw new Error(status.error || 'Analysis failed')
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval))
        }

        throw new Error('Analysis timed out')
    }

    /**
     * Run a full analysis and wait for results
     */
    async analyze(
        request: AnalysisRequest,
        onProgress?: (status: AnalysisStatus) => void
    ): Promise<AnalysisResult> {
        const { job_id } = await this.startAnalysis(request)
        return this.waitForCompletion(job_id, { onProgress })
    }

    /**
     * Run a single agent
     */
    async runAgent(
        agentName: string,
        input: string
    ): Promise<any> {
        const response = await fetch(`${this.baseUrl}/${agentName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || `Failed to run agent ${agentName}`)
        }

        return response.json()
    }

    /**
     * Get list of available agents
     */
    async getAgents(): Promise<AgentInfo[]> {
        const response = await fetch(`${this.baseUrl}s`) // /api/agents

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to get agents')
        }

        const data = await response.json()
        return data.agents
    }
}

// Export singleton instance
export const agentAPI = new AgentAPIService()

// Export class for custom instances
export { AgentAPIService }
