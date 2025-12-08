"use client"

import { useLCA } from "@/lib/lca-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ResultsViewProps {
  onNavigate: (view: any) => void
}

export default function ResultsView({ onNavigate }: ResultsViewProps) {
  const { currentScenario, currentProject } = useLCA()

  if (!currentScenario || !currentProject) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No results available</p>
      </div>
    )
  }

  const environmentalData = [
    { stage: "Mining", gwp: 4.2, energy: 450 },
    { stage: "Refining", gwp: 2.1, energy: 250 },
    { stage: "Smelting", gwp: 1.8, energy: 320 },
    { stage: "Fabrication", gwp: 0.3, energy: 45 },
    { stage: "Transport", gwp: 0.2, energy: 30 },
  ]

  const results = currentScenario.results || {
    gwp: 8.6,
    energy: 1095,
    water: 12.4,
    waste: 2.3,
    recycledContent: 45,
    recoveryRate: 82,
  }

  const circularityMetrics = [
    { name: "Recycled Content", value: Math.round(results.recycledContent), unit: "%" },
    { name: "Recovery Rate", value: Math.round(results.recoveryRate), unit: "%" },
    { name: "Lifetime Extension", value: 7, unit: "years" },
    { name: "Design for Disassembly", value: 68, unit: "score" },
  ]

  return (
    <div className="h-full bg-gradient-to-br from-white via-green-50/30 to-white p-8 space-y-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-600/20">
            <ArrowLeft className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Assessment Results</h1>
            <p className="text-slate-500 mt-1">
              {currentScenario.name} | {currentProject.metal} Profile
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => onNavigate("scenario")}
          className="border-green-200 text-slate-700 bg-white hover:bg-green-50 hover:border-green-300 gap-2 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scenario
        </Button>
      </div>

      {/* Summary Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total GWP", value: results.gwp.toFixed(1), unit: "kg CO₂e/unit" },
          { label: "Total Energy", value: Math.round(results.energy).toString(), unit: "kWh/tonne" },
          { label: "Water Use", value: results.water.toFixed(1), unit: "m³/tonne" },
          { label: "Waste Generated", value: results.waste.toFixed(1), unit: "%" },
        ].map((indicator) => (
          <Card key={indicator.label} className="p-6 bg-white/80 backdrop-blur-sm border-green-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
            <p className="text-sm text-slate-500 mb-1">{indicator.label}</p>
            <p className="text-2xl font-bold text-slate-800">{indicator.value}</p>
            <p className="text-xs text-slate-400 mt-1">{indicator.unit}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GWP by Stage */}
        <Card className="lg:col-span-2 p-6 bg-white/80 backdrop-blur-sm border-green-100/50 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">GWP by Process Stage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={environmentalData}>
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
              <Bar dataKey="gwp" fill="oklch(0.4 0.15 165)" name="GWP (kg CO₂e)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Circularity Metrics */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Circularity Indicators</h2>
          <div className="space-y-4">
            {circularityMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-foreground">{metric.name}</span>
                  <span className="text-sm font-semibold text-accent">
                    {metric.value}
                    {metric.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(metric.value, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="p-6 bg-primary/5 border border-primary/20">
        <h2 className="font-semibold text-foreground mb-3">AI-Generated Recommendations</h2>
        <ul className="space-y-2 text-sm text-foreground">
          <li>• Switching to 60% recycled {currentProject.metal.toLowerCase()} could reduce GWP by 35%</li>
          <li>
            • Optimizing smelting energy source to renewables could save {(results.gwp * 0.15).toFixed(1)} kg CO₂e per
            unit
          </li>
          <li>• Design for disassembly improvements could increase recovery rate by 15%</li>
        </ul>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" className="border-border text-foreground bg-transparent">
          Export PDF
        </Button>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">Compare Scenarios</Button>
      </div>
    </div>
  )
}
