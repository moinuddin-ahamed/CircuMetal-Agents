"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRunStatus, useRunResult, useRunReport } from "@/lib/api"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"

interface RunResultsPageProps {
  runId: string
  onBack: () => void
}

const AGENT_COLORS: Record<string, string> = {
  DataAgent: "oklch(0.6 0.15 200)",
  EstimationAgent: "oklch(0.6 0.15 280)",
  LCAAgent: "oklch(0.6 0.15 100)",
  CircularityAgent: "oklch(0.6 0.15 165)",
  ScenarioAgent: "oklch(0.6 0.15 50)",
  VisualizationAgent: "oklch(0.6 0.15 320)",
  ExplainAgent: "oklch(0.6 0.15 30)",
  ComplianceAgent: "oklch(0.6 0.15 250)",
  CritiqueAgent: "oklch(0.6 0.15 10)",
}

const CHART_COLORS = [
  "oklch(0.4 0.15 165)", // Teal
  "oklch(0.5 0.15 200)", // Blue
  "oklch(0.5 0.15 50)",  // Orange
  "oklch(0.5 0.15 280)", // Purple
  "oklch(0.5 0.15 100)", // Green
]

export default function RunResultsPage({ runId, onBack }: RunResultsPageProps) {
  const { data: status, isLoading: statusLoading } = useRunStatus(runId, { pollingInterval: 2000 })
  const { data: result, isLoading: resultLoading } = useRunResult(runId)
  const { data: report } = useRunReport(runId)

  const isCompleted = status?.status === "completed"
  const isFailed = status?.status === "failed"
  const isRunning = status?.status === "running" || status?.status === "pending"

  // Prepare chart data from results
  const impactData = result?.impact_scores
    ? [
        { name: "GWP", value: result.impact_scores.gwp, unit: "kg CO₂e" },
        { name: "Energy", value: result.impact_scores.energy_use, unit: "kWh" },
        { name: "Water", value: result.impact_scores.water_use || 0, unit: "m³" },
        { name: "AP", value: result.impact_scores.ap || 0, unit: "kg SO₂e" },
        { name: "EP", value: result.impact_scores.ep || 0, unit: "kg PO₄e" },
      ]
    : []

  const circularityData = result?.circularity_metrics
    ? [
        { name: "MCI", value: result.circularity_metrics.mci * 100, fullMark: 100 },
        { name: "Recycled Content", value: result.circularity_metrics.recycled_content, fullMark: 100 },
        { name: "Recyclability", value: result.circularity_metrics.recyclability_rate, fullMark: 100 },
        { name: "Waste Reduction", value: result.circularity_metrics.waste_reduction || 0, fullMark: 100 },
        { name: "Resource Eff.", value: result.circularity_metrics.resource_efficiency || 0, fullMark: 100 },
      ]
    : []

  const lifecycleData = result?.lifecycle_breakdown
    ? Object.entries(result.lifecycle_breakdown).map(([stage, value]) => ({
        stage: stage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        gwp: typeof value === "object" ? (value as Record<string, number>).gwp || 0 : value,
      }))
    : []

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Analysis Results</h1>
            <p className="text-muted-foreground mt-2">Run ID: {runId}</p>
          </div>
          {isCompleted && (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Share Results
              </Button>
            </div>
          )}
        </div>

        {/* Status Card */}
        <Card className="p-6 bg-card border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isRunning && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              {isCompleted && <CheckCircle className="w-6 h-6 text-green-500" />}
              {isFailed && <XCircle className="w-6 h-6 text-red-500" />}
              <div>
                <h2 className="font-semibold text-foreground">
                  {isRunning && "Analysis in Progress"}
                  {isCompleted && "Analysis Complete"}
                  {isFailed && "Analysis Failed"}
                </h2>
                {status?.current_agent && isRunning && (
                  <p className="text-sm text-muted-foreground">
                    Currently running: {status.current_agent}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold text-foreground">{status?.progress || 0}%</p>
            </div>
          </div>
          <Progress value={status?.progress || 0} className="h-2" />

          {/* Agent Progress Log */}
          {status?.logs && status.logs.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">Activity Log</p>
              <div className="space-y-1">
                {status.logs.slice(-5).map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-white text-[10px]"
                      style={{ backgroundColor: AGENT_COLORS[log.agent] || "oklch(0.5 0 0)" }}
                    >
                      {log.agent}
                    </span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {isFailed && (
          <Card className="p-6 bg-red-500/10 border border-red-500/20 mb-6">
            <h3 className="font-semibold text-red-400 mb-2">Error Details</h3>
            <p className="text-sm text-red-300">{status?.error || "An unknown error occurred"}</p>
          </Card>
        )}

        {/* Results Tabs */}
        {isCompleted && result && (
          <Tabs defaultValue="impacts" className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="impacts">Environmental Impacts</TabsTrigger>
              <TabsTrigger value="circularity">Circularity</TabsTrigger>
              <TabsTrigger value="lifecycle">Lifecycle Breakdown</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="report">Full Report</TabsTrigger>
            </TabsList>

            {/* Environmental Impacts Tab */}
            <TabsContent value="impacts">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                {impactData.map((impact) => (
                  <Card key={impact.name} className="p-4 bg-card border-border">
                    <p className="text-sm text-muted-foreground">{impact.name}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {impact.value.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{impact.unit}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4">Impact Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={impactData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0 0)" />
                    <YAxis stroke="oklch(0.65 0 0)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0 0)",
                        border: "1px solid oklch(0.25 0 0)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" fill="oklch(0.4 0.15 165)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* Circularity Tab */}
            <TabsContent value="circularity">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-card border-border">
                  <h3 className="font-semibold text-foreground mb-4">Material Circularity Index</h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          fill="none"
                          stroke="oklch(0.25 0 0)"
                          strokeWidth="16"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          fill="none"
                          stroke="oklch(0.4 0.15 165)"
                          strokeWidth="16"
                          strokeDasharray={`${(result.circularity_metrics?.mci || 0) * 5.024} 502.4`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-foreground">
                          {Math.round((result.circularity_metrics?.mci || 0) * 100)}
                        </span>
                        <span className="text-sm text-muted-foreground">MCI Score</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-card border-border">
                  <h3 className="font-semibold text-foreground mb-4">Circularity Metrics</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={circularityData}>
                      <PolarGrid stroke="oklch(0.25 0 0)" />
                      <PolarAngleAxis dataKey="name" stroke="oklch(0.65 0 0)" />
                      <PolarRadiusAxis stroke="oklch(0.65 0 0)" />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="oklch(0.4 0.15 165)"
                        fill="oklch(0.4 0.15 165)"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {circularityData.map((metric) => (
                  <Card key={metric.name} className="p-4 bg-card border-border">
                    <p className="text-sm text-muted-foreground">{metric.name}</p>
                    <p className="text-2xl font-bold text-foreground">{metric.value.toFixed(1)}%</p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Lifecycle Breakdown Tab */}
            <TabsContent value="lifecycle">
              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4">GWP by Lifecycle Stage</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={lifecycleData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                    <XAxis type="number" stroke="oklch(0.65 0 0)" />
                    <YAxis type="category" dataKey="stage" stroke="oklch(0.65 0 0)" width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0 0)",
                        border: "1px solid oklch(0.25 0 0)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="gwp" fill="oklch(0.4 0.15 165)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* Scenarios Tab */}
            <TabsContent value="scenarios">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.scenarios && result.scenarios.length > 0 ? (
                  result.scenarios.map((scenario: Record<string, unknown>, idx: number) => (
                    <Card key={idx} className="p-6 bg-card border-border">
                      <h3 className="font-semibold text-foreground mb-2">
                        {(scenario.name as string) || `Scenario ${idx + 1}`}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {(scenario.description as string) || "Alternative pathway"}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">GWP Reduction</span>
                          <span className="text-green-400">
                            -{(scenario.gwp_reduction as number)?.toFixed(1) || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Energy Savings</span>
                          <span className="text-blue-400">
                            -{(scenario.energy_reduction as number)?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    No alternative scenarios generated
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Report Tab */}
            <TabsContent value="report">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Full Analysis Report</h3>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Markdown
                  </Button>
                </div>
                <div className="prose prose-invert max-w-none">
                  {report?.report_markdown ? (
                    <pre className="whitespace-pre-wrap text-sm text-foreground bg-background p-4 rounded-lg overflow-auto max-h-[600px]">
                      {report.report_markdown}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">Report not available</p>
                  )}
                </div>
              </Card>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <Card className="p-6 bg-primary/5 border border-primary/20 mt-6">
                  <h3 className="font-semibold text-foreground mb-4">AI Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
