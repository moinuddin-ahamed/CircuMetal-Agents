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
    <div className="h-full bg-gradient-to-br from-white via-green-50/30 to-white p-8 space-y-6 overflow-auto">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl font-bold text-slate-800">AI Predictions Log</h1>
        <p className="text-slate-500 mt-1">Track all AI-assisted parameter predictions</p>
      </div>

      <Card className="border-green-100/50 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-green-100 hover:bg-transparent">
                <TableHead className="text-slate-500">Parameter</TableHead>
                <TableHead className="text-slate-500">Predicted Value</TableHead>
                <TableHead className="text-slate-500">Source Stage</TableHead>
                <TableHead className="text-slate-500">Confidence</TableHead>
                <TableHead className="text-slate-500">Model Version</TableHead>
                <TableHead className="text-slate-500">Project</TableHead>
                <TableHead className="text-slate-500 text-center">Overridden</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictionLogs.length > 0 ? (
                predictionLogs.slice(0, 20).map((log, idx) => (
                  <TableRow key={idx} className="border-green-100 hover:bg-green-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-800">{log.parameter}</TableCell>
                    <TableCell className="text-slate-800">
                      {log.predictedValue} {log.unit}
                    </TableCell>
                    <TableCell className="text-slate-500">{log.sourceStage}</TableCell>
                    <TableCell>
                      <Badge className={`${confidenceColor(log.confidence)} border-0`}>{log.confidence}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{log.modelVersion}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{log.projectName}</TableCell>
                    <TableCell className="text-center">
                      {log.overridden ? (
                        <CheckCircle className="w-4 h-4 text-green-600 inline" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
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
