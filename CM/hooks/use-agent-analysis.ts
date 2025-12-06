import { useState, useCallback } from 'react'
import { 
    agentAPI, 
    AnalysisRequest, 
    AnalysisResult, 
    AnalysisStatus 
} from '@/lib/services/agent-api'

export interface UseAgentAnalysisOptions {
    onProgress?: (status: AnalysisStatus) => void
    onComplete?: (result: AnalysisResult) => void
    onError?: (error: Error) => void
}

export interface UseAgentAnalysisReturn {
    isLoading: boolean
    isRunning: boolean
    progress: number
    currentStep: string | null
    result: AnalysisResult | null
    error: Error | null
    startAnalysis: (request: AnalysisRequest) => Promise<void>
    reset: () => void
}

/**
 * React hook for running CircuMetal agent analysis
 */
export function useAgentAnalysis(
    options: UseAgentAnalysisOptions = {}
): UseAgentAnalysisReturn {
    const { onProgress, onComplete, onError } = options

    const [isLoading, setIsLoading] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentStep, setCurrentStep] = useState<string | null>(null)
    const [result, setResult] = useState<AnalysisResult | null>(null)
    const [error, setError] = useState<Error | null>(null)

    const handleProgress = useCallback((status: AnalysisStatus) => {
        setProgress(status.progress || 0)
        setCurrentStep(status.current_step || null)
        onProgress?.(status)
    }, [onProgress])

    const startAnalysis = useCallback(async (request: AnalysisRequest) => {
        setIsLoading(true)
        setIsRunning(true)
        setProgress(0)
        setCurrentStep(null)
        setResult(null)
        setError(null)

        try {
            const analysisResult = await agentAPI.analyze(request, handleProgress)
            setResult(analysisResult)
            setProgress(100)
            onComplete?.(analysisResult)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            onError?.(error)
        } finally {
            setIsLoading(false)
            setIsRunning(false)
        }
    }, [handleProgress, onComplete, onError])

    const reset = useCallback(() => {
        setIsLoading(false)
        setIsRunning(false)
        setProgress(0)
        setCurrentStep(null)
        setResult(null)
        setError(null)
    }, [])

    return {
        isLoading,
        isRunning,
        progress,
        currentStep,
        result,
        error,
        startAnalysis,
        reset
    }
}

/**
 * Step names for progress display
 */
export const ANALYSIS_STEPS = [
    { key: 'data_extraction', label: 'Extracting Data', order: 1 },
    { key: 'estimation', label: 'Estimating Parameters', order: 2 },
    { key: 'lca_calculation', label: 'Calculating LCA', order: 3 },
    { key: 'circularity', label: 'Assessing Circularity', order: 4 },
    { key: 'scenarios', label: 'Generating Scenarios', order: 5 },
    { key: 'visualization', label: 'Creating Visualizations', order: 6 },
    { key: 'explanation', label: 'Generating Report', order: 7 },
    { key: 'compliance', label: 'Checking Compliance', order: 8 },
    { key: 'critique', label: 'Quality Review', order: 9 }
]

export function getStepProgress(currentStep: string | null): number {
    if (!currentStep) return 0
    const step = ANALYSIS_STEPS.find(s => s.key === currentStep)
    return step ? (step.order / ANALYSIS_STEPS.length) * 100 : 0
}

export function getStepLabel(currentStep: string | null): string {
    if (!currentStep) return 'Initializing...'
    const step = ANALYSIS_STEPS.find(s => s.key === currentStep)
    return step?.label || currentStep
}
