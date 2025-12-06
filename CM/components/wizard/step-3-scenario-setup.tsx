"use client"

import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Info } from "lucide-react"

interface Step3Props {
  formData: any
  setFormData: (data: any) => void
}

export default function WizardStep3({ formData, setFormData }: Step3Props) {
  const scenarioTemplates = [
    {
      id: "conventional",
      name: "Conventional Baseline",
      icon: "⛏️",
      description: "Primary production with standard practices",
    },
    {
      id: "circular",
      name: "High Circularity",
      icon: "♻️",
      description: "Secondary material focus with recovery optimization",
    },
    {
      id: "optimized",
      name: "Optimized Route",
      icon: "⚡",
      description: "Advanced technologies and best practices",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Scenario Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your initial assessment scenario</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">Initial Scenario Name</label>
          <Input
            placeholder="e.g., Conventional Baseline"
            value={formData.scenarioName}
            onChange={(e) => setFormData({ ...formData, scenarioName: e.target.value })}
            className="bg-input text-foreground border-border"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Give this scenario a descriptive name for easy identification
          </p>
        </div>

        <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <Checkbox
            id="baseline"
            checked={formData.isBaseline !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, isBaseline: checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="baseline" className="text-sm font-medium text-foreground cursor-pointer">
              Mark as baseline scenario
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Baseline scenarios are used as reference points for comparing other scenarios
            </p>
          </div>
        </div>

        <Card className="p-4 bg-secondary/50 border-border">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              <p className="font-medium mb-1">What happens next?</p>
              <p className="text-muted-foreground">
                After creation, you can add process stages, input data manually, or use AI to predict missing
                parameters. You can also create additional scenarios to compare different pathways.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
