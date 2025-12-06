"use client"

import { useState } from "react"
import { useLCA } from "@/lib/lca-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ComparisonViewProps {
  onNavigate: (view: any) => void
}

export default function ComparisonView({ onNavigate }: ComparisonViewProps) {
  const { currentProject, currentScenario } = useLCA()
  const [selectedScenario2, setSelectedScenario2] = useState(currentProject?.scenarios[1] || null)

  if (!currentProject || !currentScenario || !selectedScenario2) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Need at least two scenarios to compare</p>
      </div>
    )
  }

  const results1 = currentScenario.results || { gwp: 8.6, energy: 1095, water: 12.4, waste: 2.3 }
  const results2 = selectedScenario2.results || { gwp: 5.2, energy: 720, water: 8.1, waste: 0.8 }

  const comparisonData = [
    { indicator: "GWP", conventional: results1.gwp, circular: results2.gwp },
    { indicator: "Energy Use", conventional: results1.energy, circular: results2.energy },
    { indicator: "Water Use", conventional: results1.water, circular: results2.water },
    { indicator: "Waste", conventional: results1.waste, circular: results2.waste },
  ]

  const scenarioComparison = [
    { metric: "Recycled Content (%)", conventional: 20, circular: 65 },
    { metric: "Recovery Rate (%)", conventional: 60, circular: 88 },
    { metric: "Lifetime (years)", conventional: 15, circular: 22 },
  ]

  const gwpReduction = (((results1.gwp - results2.gwp) / results1.gwp) * 100).toFixed(1)
  const energyReduction = (((results1.energy - results2.energy) / results1.energy) * 100).toFixed(1)
  const wasteReduction = (((results1.waste - results2.waste) / results1.waste) * 100).toFixed(1)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scenario Comparison</h1>
          <p className="text-muted-foreground mt-1">
            {currentScenario.name} vs {selectedScenario2.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => onNavigate("results")}
          className="border-border text-foreground bg-transparent gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Button>
      </div>

      {/* Impact Reduction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "GWP Reduction",
            value: `${gwpReduction}%`,
            change: `↓ ${(results1.gwp - results2.gwp).toFixed(1)} kg CO₂e/unit`,
          },
          {
            label: "Energy Savings",
            value: `${energyReduction}%`,
            change: `↓ ${Math.round(results1.energy - results2.energy)} kWh/tonne`,
          },
          {
            label: "Waste Reduction",
            value: `${wasteReduction}%`,
            change: `↓ ${(results1.waste - results2.waste).toFixed(1)}%`,
          },
        ].map((item) => (
          <Card key={item.label} className="p-6 bg-primary/10 border border-primary/30">
            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
            <p className="text-2xl font-bold text-accent">{item.value}</p>
            <p className="text-xs text-accent mt-2">{item.change}</p>
          </Card>
        ))}
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Environmental Impact Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
              <XAxis dataKey="indicator" stroke="oklch(0.65 0 0)" />
              <YAxis stroke="oklch(0.65 0 0)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0 0)",
                  border: "1px solid oklch(0.25 0 0)",
                }}
                labelStyle={{ color: "oklch(0.97 0.01 0)" }}
              />
              <Legend />
              <Bar
                dataKey="conventional"
                fill="oklch(0.48 0.15 25)"
                name={currentScenario.name}
                radius={[8, 8, 0, 0]}
              />
              <Bar dataKey="circular" fill="oklch(0.5 0.2 140)" name={selectedScenario2.name} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Circularity Metrics</h2>
          <div className="space-y-6">
            {scenarioComparison.map((item) => (
              <div key={item.metric}>
                <p className="text-sm font-medium text-foreground mb-2">{item.metric}</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{currentScenario.name}</span>
                      <span>{item.conventional}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive rounded-full"
                        style={{ width: `${Math.min(item.conventional, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{selectedScenario2.name}</span>
                      <span>{item.circular}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${Math.min(item.circular, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="p-6 bg-accent/10 border border-accent/30">
        <h2 className="font-semibold text-foreground mb-3">Key Insights</h2>
        <ul className="space-y-2 text-sm text-foreground">
          <li>
            ✓ {selectedScenario2.name} achieves {gwpReduction}% GWP reduction through increased recycled content
          </li>
          <li>✓ Higher recovery rates enable material to stay in use cycles longer</li>
          <li>✓ Design for disassembly improvements support secondary material integration</li>
          <li>✓ Aligns with EU Green Deal and ESG reporting requirements</li>
        </ul>
      </Card>
    </div>
  )
}
