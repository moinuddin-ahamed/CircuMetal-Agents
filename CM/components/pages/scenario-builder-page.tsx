"use client"

import { useState } from "react"
import { Play, Settings, ArrowLeft, Loader2, Zap, Recycle, Truck, Factory } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useStartRun, ScenarioConfig } from "@/lib/api"

interface ScenarioBuilderProps {
  inventoryId: string
  projectId?: string
  onRunStarted: (runId: string) => void
  onBack: () => void
}

const ENERGY_SOURCES = [
  { value: "grid", label: "Grid Electricity" },
  { value: "renewable", label: "100% Renewable" },
  { value: "solar", label: "Solar PV" },
  { value: "wind", label: "Wind Power" },
  { value: "hydro", label: "Hydroelectric" },
  { value: "natural_gas", label: "Natural Gas" },
  { value: "coal", label: "Coal (Baseline)" },
]

const TRANSPORT_MODES = [
  { value: "truck", label: "Road (Truck)" },
  { value: "rail", label: "Rail" },
  { value: "ship", label: "Maritime Shipping" },
  { value: "multimodal", label: "Multimodal" },
]

const EOL_STRATEGIES = [
  { value: "recycling", label: "Full Recycling" },
  { value: "downcycling", label: "Downcycling" },
  { value: "reuse", label: "Direct Reuse" },
  { value: "landfill", label: "Landfill (Baseline)" },
  { value: "incineration", label: "Incineration with Energy Recovery" },
]

export default function ScenarioBuilder({
  inventoryId,
  projectId,
  onRunStarted,
  onBack,
}: ScenarioBuilderProps) {
  // Scenario configuration state
  const [recycledContentTarget, setRecycledContentTarget] = useState(30)
  const [energySource, setEnergySource] = useState("grid")
  const [transportMode, setTransportMode] = useState("truck")
  const [eolStrategy, setEolStrategy] = useState("recycling")
  const [processEfficiency, setProcessEfficiency] = useState(85)
  const [enableScenarioComparison, setEnableScenarioComparison] = useState(true)
  
  const startRun = useStartRun()

  const handleStartRun = async () => {
    const scenarioConfig: ScenarioConfig = {
      recycled_content_target: recycledContentTarget,
      energy_source: energySource,
      transport_mode: transportMode,
      eol_strategy: eolStrategy,
      custom_parameters: {
        process_efficiency: processEfficiency,
        enable_scenario_comparison: enableScenarioComparison,
      },
    }

    try {
      const result = await startRun.mutateAsync({
        inventory_id: inventoryId,
        project_id: projectId,
        name: `Analysis - ${new Date().toLocaleString()}`,
        scenario_config: scenarioConfig,
      })
      if (result && typeof result === 'object' && 'run_id' in result) {
        onRunStarted((result as { run_id: string }).run_id)
      }
    } catch (error) {
      console.error("Failed to start run:", error)
      alert("Failed to start analysis. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold text-foreground">Scenario Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Configure analysis parameters and run the multi-agent LCA
            </p>
          </div>
        </div>

        {/* Scenario Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Circularity Settings */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Recycle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Circularity Parameters</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Recycled Content Target</Label>
                  <span className="text-sm font-medium text-primary">{recycledContentTarget}%</span>
                </div>
                <Slider
                  value={[recycledContentTarget]}
                  onValueChange={(v) => setRecycledContentTarget(v[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Target percentage of recycled material in input
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Process Efficiency</Label>
                  <span className="text-sm font-medium text-primary">{processEfficiency}%</span>
                </div>
                <Slider
                  value={[processEfficiency]}
                  onValueChange={(v) => setProcessEfficiency(v[0])}
                  min={50}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Material yield in the production process
                </p>
              </div>

              <div className="space-y-2">
                <Label>End-of-Life Strategy</Label>
                <Select value={eolStrategy} onValueChange={setEolStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EOL_STRATEGIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Energy & Transport Settings */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Energy & Transport</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Factory className="w-4 h-4" />
                  Energy Source
                </Label>
                <Select value={energySource} onValueChange={setEnergySource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENERGY_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Primary energy source for manufacturing
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Transport Mode
                </Label>
                <Select value={transportMode} onValueChange={setTransportMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Primary transportation method for materials
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Analysis Options */}
        <Card className="p-6 bg-card border-border mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Analysis Options</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Generate Alternative Scenarios</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will generate and compare alternative production pathways
                </p>
              </div>
              <Switch
                checked={enableScenarioComparison}
                onCheckedChange={setEnableScenarioComparison}
              />
            </div>
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-6 bg-primary/5 border border-primary/20 mb-8">
          <h2 className="font-semibold text-foreground mb-4">Configuration Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Recycled Content</p>
              <p className="font-semibold text-foreground">{recycledContentTarget}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Energy Source</p>
              <p className="font-semibold text-foreground">
                {ENERGY_SOURCES.find((s) => s.value === energySource)?.label}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Transport</p>
              <p className="font-semibold text-foreground">
                {TRANSPORT_MODES.find((s) => s.value === transportMode)?.label}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">End of Life</p>
              <p className="font-semibold text-foreground">
                {EOL_STRATEGIES.find((s) => s.value === eolStrategy)?.label}
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={handleStartRun}
            disabled={startRun.isPending}
            className="gap-2"
          >
            {startRun.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting Analysis...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run LCA Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
