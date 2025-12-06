"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLCA } from "@/lib/lca-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Circle } from "lucide-react"

export default function AIPredictionLog() {
  const { projects } = useLCA()

  const predictionLogs = projects.flatMap((project) =>
    project.scenarios.flatMap((scenario) =>
      scenario.stages.flatMap((stage) =>
        stage.parameters
          .filter((p) => p.source === "ai_predicted")
          .map((param) => ({
            parameter: param.name,
            predictedValue: param.value,
            unit: param.unit,
            sourceStage: stage.name,
            confidence: param.confidence || "Medium",
            modelVersion: "v2.1",
            overridden: false,
            projectName: project.name,
            scenarioName: scenario.name,
            timestamp: new Date(),
          })),
      ),
    ),
  )

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High":
        return "bg-emerald-500/20 text-emerald-700"
      case "Medium":
        return "bg-amber-500/20 text-amber-700"
      case "Low":
        return "bg-red-500/20 text-red-700"
      default:
        return "bg-gray-500/20 text-gray-700"
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Predictions Log</h1>
        <p className="text-muted-foreground mt-1">Track all AI-assisted parameter predictions</p>
      </div>

      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Parameter</TableHead>
                <TableHead className="text-muted-foreground">Predicted Value</TableHead>
                <TableHead className="text-muted-foreground">Source Stage</TableHead>
                <TableHead className="text-muted-foreground">Confidence</TableHead>
                <TableHead className="text-muted-foreground">Model Version</TableHead>
                <TableHead className="text-muted-foreground">Project</TableHead>
                <TableHead className="text-muted-foreground text-center">Overridden</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictionLogs.length > 0 ? (
                predictionLogs.slice(0, 20).map((log, idx) => (
                  <TableRow key={idx} className="border-border hover:bg-secondary/30">
                    <TableCell className="font-medium text-foreground">{log.parameter}</TableCell>
                    <TableCell className="text-foreground">
                      {log.predictedValue} {log.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.sourceStage}</TableCell>
                    <TableCell>
                      <Badge className={`${confidenceColor(log.confidence)} border-0`}>{log.confidence}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{log.modelVersion}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{log.projectName}</TableCell>
                    <TableCell className="text-center">
                      {log.overridden ? (
                        <CheckCircle className="w-4 h-4 text-primary inline" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No AI predictions yet. Start by creating an assessment with missing parameters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {predictionLogs.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          Showing {Math.min(20, predictionLogs.length)} of {predictionLogs.length} predictions
        </div>
      )}
    </div>
  )
}
