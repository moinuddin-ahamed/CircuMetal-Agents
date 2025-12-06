"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLCA } from "@/lib/lca-context"
import ProcessStageCard from "@/components/scenario/process-stage-card"
import StageInspector from "@/components/scenario/stage-inspector"

interface ScenarioEditorProps {
  onNavigate: (view: any) => void
}

export default function ScenarioEditor({ onNavigate }: ScenarioEditorProps) {
  const { currentProject, currentScenario, setCurrentScenario, runAssessment, updateStageParameter } = useLCA()
  const [selectedStage, setSelectedStage] = useState(currentScenario?.stages[0] || null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  if (!currentScenario || !currentProject) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No scenario selected</p>
      </div>
    )
  }

  const handleRunAssessment = () => {
    setIsRunning(true)
    setTimeout(() => {
      runAssessment(currentProject.id, currentScenario.id)
      setIsRunning(false)
      onNavigate("results")
    }, 1500)
  }

  const handleParameterUpdate = (stageId: string, param: any) => {
    updateStageParameter(currentProject.id, currentScenario.id, stageId, param)
    const updatedStage = currentScenario.stages.find((s) => s.id === stageId)
    if (updatedStage) {
      setSelectedStage(updatedStage)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scenario: {currentScenario.name}</h1>
          <p className="text-muted-foreground mt-1">
            {currentProject.metal} | {currentProject.region}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-border text-foreground bg-transparent"
            onClick={() => setIsSaving(true)}
            onTransitionEnd={() => setIsSaving(false)}
          >
            {isSaving ? "Saved ✓" : "Save"}
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleRunAssessment}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run Assessment"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Process Flow */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Process Flow</h2>
          <div className="space-y-2">
            {currentScenario.stages.map((stage, idx) => (
              <div key={stage.id}>
                <ProcessStageCard
                  stage={stage}
                  isSelected={selectedStage?.id === stage.id}
                  onClick={() => setSelectedStage(stage)}
                />
                {idx < currentScenario.stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stage Inspector */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Stage Details</h2>
          {selectedStage ? (
            <StageInspector stage={selectedStage} onUpdateParameter={handleParameterUpdate} />
          ) : (
            <Card className="p-8 bg-card border-border flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">Select a stage to view and edit parameters</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
