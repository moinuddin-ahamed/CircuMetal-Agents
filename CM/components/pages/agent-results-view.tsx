"use client"

import { useState, useEffect } from "react"
import { useLCA } from "@/lib/lca-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useAgentAnalysis, getStepLabel, ANALYSIS_STEPS } from "@/hooks/use-agent-analysis"
import type { AnalysisResult, LCAResults, CircularityAssessment, Scenario } from "@/lib/services/agent-api"

interface AgentResultsViewProps {
  onNavigate: (view: any) => void
}

const COLORS = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#34d399"]

export default function AgentResultsView({ onNavigate }: AgentResultsViewProps) {
  const { currentScenario, currentProject } = useLCA()
  const [agentResult, setAgentResult] = useState<AnalysisResult | null>(null)

  const {
    isLoading,
    isRunning,
    progress,
    currentStep,
    result,
    error,
    startAnalysis,
    reset
  } = useAgentAnalysis({
    onComplete: (result) => {
      setAgentResult(result)
    }
  })

  // Trigger analysis when component mounts if we have project data
  useEffect(() => {
    if (currentProject && currentScenario && !result && !isRunning) {
      handleRunAnalysis()
    }
  }, [currentProject?.id, currentScenario?.id])

  const handleRunAnalysis = () => {
    if (!currentProject || !currentScenario) return

    startAnalysis({
      process_description: `${currentScenario.route} production of ${currentProject.metal}`,
      input_amount: `${currentProject.functionalUnit} tonne`,
      material: currentProject.metal,
      energy_source: "Grid Electricity",
      location: currentProject.region,
      project_id: currentProject.id,
      scenario_id: currentScenario.id
    })
  }

  if (!currentScenario || !currentProject) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No results available. Please select a project and scenario.</p>
        <Button
          variant="outline"
          onClick={() => onNavigate("dashboard")}
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Show loading state during analysis
  if (isRunning) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl mx-auto p-8 bg-card border-border">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Running AI Analysis
            </h2>
            <p className="text-muted-foreground mb-6">
              {getStepLabel(currentStep)}
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Step indicators */}
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-4">
              {ANALYSIS_STEPS.slice(0, 6).map((step) => (
                <div
                  key={step.key}
                  className={`flex items-center gap-1 ${currentStep === step.key ? 'text-primary font-medium' : ''
                    }`}
                >
                  {currentStep === step.key ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : progress >= (step.order / ANALYSIS_STEPS.length) * 100 ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                  )}
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl mx-auto p-8 bg-destructive/10 border-destructive/20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Analysis Failed
            </h2>
            <p className="text-muted-foreground mb-6">
              {error.message}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => onNavigate("scenario")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleRunAnalysis}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Analysis
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Use agent results or fall back to mock data
  const lcaResults: LCAResults = agentResult?.lca_results || {
    total_gwp: 8.6,
    gwp_by_stage: {
      "Mining": 4.2,
      "Refining": 2.1,
      "Smelting": 1.8,
      "Fabrication": 0.3,
      "Transport": 0.2
    },
    functional_unit: "1 tonne",
    system_boundary: "Cradle-to-gate"
  }

  const circularityResults: CircularityAssessment = agentResult?.circularity_assessment || {
    mci_score: 0.45,
    recycled_content: 25,
    recyclability_rate: 82,
    resource_efficiency: 0.68
  }

  const scenarios: Scenario[] = agentResult?.scenarios || []

  // Prepare chart data
  const gwpChartData = Object.entries(lcaResults.gwp_by_stage).map(([stage, gwp]) => ({
    stage,
    gwp: typeof gwp === 'number' ? gwp : 0
  }))

  const circularityMetrics = [
    { name: "MCI Score", value: Math.round((circularityResults.mci_score || 0) * 100), unit: "%" },
    { name: "Recycled Content", value: Math.round(circularityResults.recycled_content || 0), unit: "%" },
    { name: "Recyclability Rate", value: Math.round(circularityResults.recyclability_rate || 0), unit: "%" },
    { name: "Resource Efficiency", value: Math.round((circularityResults.resource_efficiency || 0) * 100), unit: "%" },
  ]

  // Circular flow opportunities
  const circularOpportunities = circularityResults.circular_flow_opportunities || []

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI-Powered LCA Results</h1>
          <p className="text-muted-foreground mt-1">
            {currentScenario.name} | {currentProject.metal} Production
          </p>
          {agentResult && (
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Analysis complete - Powered by CircuMetal AI Agents
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRunAnalysis}
            disabled={isRunning}
            className="border-border text-foreground bg-transparent gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            Re-run Analysis
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate("scenario")}
            className="border-border text-foreground bg-transparent gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Summary Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total GWP",
            value: lcaResults.total_gwp?.toFixed(1) || "N/A",
            unit: "kg CO₂e/tonne"
          },
          {
            label: "MCI Score",
            value: ((circularityResults.mci_score || 0) * 100).toFixed(0),
            unit: "% circular"
          },
          {
            label: "Recycled Content",
            value: (circularityResults.recycled_content || 0).toFixed(0),
            unit: "%"
          },
          {
            label: "Recyclability",
            value: (circularityResults.recyclability_rate || 0).toFixed(0),
            unit: "%"
          }
        ].map((indicator) => (
          <Card key={indicator.label} className="p-6 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">{indicator.label}</p>
            <p className="text-2xl font-bold text-foreground">{indicator.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{indicator.unit}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GWP by Stage */}
        <Card className="lg:col-span-2 p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            GWP by Process Stage
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gwpChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
              <XAxis dataKey="stage" stroke="oklch(0.65 0 0)" />
              <YAxis stroke="oklch(0.65 0 0)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0 0)",
                  border: "1px solid oklch(0.25 0 0)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "oklch(0.97 0.01 0)" }}
              />
              <Legend />
              <Bar
                dataKey="gwp"
                fill="oklch(0.4 0.15 165)"
                name="GWP (kg CO₂e)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Circularity Metrics */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Circularity Indicators
          </h2>
          <div className="space-y-4">
            {circularityMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-foreground">{metric.name}</span>
                  <span className="text-sm font-semibold text-accent">
                    {metric.value}{metric.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Scenario Comparison */}
      {scenarios.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Improvement Scenarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario, index) => (
              <Card key={index} className="p-4 bg-secondary/30 border-border">
                <h3 className="font-medium text-foreground mb-2">{scenario.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GWP Change:</span>
                  <span className={scenario.gwp_change < 0 ? 'text-green-500' : 'text-red-500'}>
                    {scenario.gwp_change > 0 ? '+' : ''}{scenario.gwp_change}%
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">MCI Change:</span>
                  <span className={scenario.mci_change > 0 ? 'text-green-500' : 'text-red-500'}>
                    {scenario.mci_change > 0 ? '+' : ''}{scenario.mci_change}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Circular Flow Opportunities */}
      {circularOpportunities.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Circular Flow Opportunities
          </h2>
          <div className="space-y-3">
            {circularOpportunities.map((opp, index) => (
              <div key={index} className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-foreground">{opp.opportunity}</p>
                    <p className="text-sm text-muted-foreground mt-1">{opp.potential_impact}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${opp.implementation_difficulty === 'Low'
                      ? 'bg-green-500/20 text-green-500'
                      : opp.implementation_difficulty === 'Medium'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                    {opp.implementation_difficulty} Effort
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="p-6 bg-primary/5 border border-primary/20">
        <h2 className="font-semibold text-foreground mb-3">
          AI-Generated Recommendations
        </h2>
        {agentResult?.report ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{
              __html: agentResult.report.substring(0, 1000).replace(/\n/g, '<br/>')
            }} />
            {agentResult.report.length > 1000 && (
              <p className="text-primary cursor-pointer mt-2">
                Show full report...
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-2 text-sm text-foreground">
            <li>• Increase recycled {currentProject.metal.toLowerCase()} content to reduce primary material impact</li>
            <li>• Consider renewable energy sources for high-energy stages like smelting</li>
            <li>• Optimize transport logistics to reduce scope 3 emissions</li>
            <li>• Implement design for disassembly to improve end-of-life recovery</li>
          </ul>
        )}
      </Card>

      {/* Compliance Status */}
      {agentResult?.compliance && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            ISO Compliance Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { standard: 'ISO 14040', compliant: agentResult.compliance.iso_14040_compliant },
              { standard: 'ISO 14044', compliant: agentResult.compliance.iso_14044_compliant },
              { standard: 'ISO 14067', compliant: agentResult.compliance.iso_14067_compliant },
            ].map((item) => (
              <div key={item.standard} className="flex items-center gap-2">
                {item.compliant ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="text-foreground">{item.standard}</span>
                <span className={`text-sm ${item.compliant ? 'text-green-500' : 'text-yellow-500'}`}>
                  {item.compliant ? 'Compliant' : 'Review Needed'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" className="border-border text-foreground bg-transparent">
          Export PDF
        </Button>
        <Button variant="outline" className="border-border text-foreground bg-transparent">
          Export CSV
        </Button>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          Compare Scenarios
        </Button>
      </div>
    </div>
  )
}
