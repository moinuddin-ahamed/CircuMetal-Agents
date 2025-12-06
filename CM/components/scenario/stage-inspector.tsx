"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Zap, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Stage, Parameter } from "@/lib/lca-context"

interface StageInspectorProps {
  stage: Stage
  onUpdateParameter?: (stageId: string, param: Parameter) => void
}

export default function StageInspector({ stage, onUpdateParameter }: StageInspectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [editingParams, setEditingParams] = useState(
    stage.parameters.reduce((acc, p) => ({ ...acc, [p.name]: p.value }), {} as Record<string, string>),
  )

  const sourceColors = {
    user_input: "bg-primary/20 text-primary",
    ai_predicted: "bg-accent/20 text-accent",
    db_default: "bg-muted",
  }

  const handleParamChange = (paramName: string, value: string) => {
    setEditingParams({ ...editingParams, [paramName]: value })
    const param = stage.parameters.find((p) => p.name === paramName)
    if (param && onUpdateParameter) {
      onUpdateParameter(stage.id, { ...param, value })
    }
  }

  const handleAddParameter = () => {
    const newParam: Parameter = {
      name: "New Parameter",
      value: "",
      unit: "unit",
      source: "user_input",
    }
    if (onUpdateParameter) {
      onUpdateParameter(stage.id, newParam)
    }
  }

  const handleAIPredict = () => {
    setIsLoading(true)
    setTimeout(() => {
      // Simulate AI prediction for missing parameters
      const predictions = [
        { name: "Energy use", value: String(Math.round(Math.random() * 300 + 200)), unit: "kWh/tonne" },
        { name: "Scrap rate", value: String(Math.round(Math.random() * 15 + 5)), unit: "%" },
        { name: "Yield", value: String(Math.round(Math.random() * 8 + 92)), unit: "%" },
      ]

      predictions.forEach((pred) => {
        const existingParam = stage.parameters.find((p) => p.name === pred.name)
        if (!existingParam && onUpdateParameter) {
          onUpdateParameter(stage.id, {
            name: pred.name,
            value: pred.value,
            unit: pred.unit,
            source: "ai_predicted",
            confidence: "High",
          })
        }
      })
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-4">
      {/* Stage Header */}
      <Card className="p-4 bg-secondary border-border">
        <h3 className="font-semibold text-foreground mb-1">{stage.name}</h3>
        <p className="text-xs text-muted-foreground">Configure parameters for this stage</p>
      </Card>

      {/* Parameters */}
      <div className="space-y-4">
        {stage.parameters.length > 0 ? (
          stage.parameters.map((param, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">{param.name}</label>
                <Badge className={sourceColors[param.source as keyof typeof sourceColors]}>
                  {param.source === "user_input" && "User Input"}
                  {param.source === "ai_predicted" && `AI (${param.confidence})`}
                  {param.source === "db_default" && "Database"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  value={editingParams[param.name] || param.value}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="bg-input text-foreground border-border flex-1"
                />
                <select className="px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm">
                  <option>{param.unit}</option>
                </select>
              </div>
            </div>
          ))
        ) : (
          <Card className="p-4 bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground">No parameters configured yet</p>
          </Card>
        )}
      </div>

      {/* Add Parameter Button */}
      <Button
        variant="outline"
        onClick={handleAddParameter}
        className="w-full border-border text-foreground bg-transparent hover:bg-secondary"
      >
        + Add Parameter
      </Button>

      {/* AI Assist */}
      <Card className="p-4 bg-accent/10 border border-accent/30">
        <Button
          onClick={handleAIPredict}
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Auto-complete with AI
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">AI will predict missing parameters based on industry data</p>
      </Card>
    </div>
  )
}
