"use client"

import { MoreVertical } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    metal: string
    region: string
    status: string
    gwp: number
    recycledContent: number
  }
  onOpen: () => void
}

export default function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const statusColors = {
    completed: "bg-primary/20 text-primary",
    "in-progress": "bg-accent/20 text-accent",
    draft: "bg-muted text-muted-foreground",
  }

  const circularityScore = Math.round(project.recycledContent * 0.6 + (100 - project.gwp) * 0.4)
  const getCircularityGrade = (score: number) => {
    if (score >= 85) return { grade: "A+", color: "bg-emerald-500/20 text-emerald-700" }
    if (score >= 75) return { grade: "A", color: "bg-emerald-500/20 text-emerald-700" }
    if (score >= 65) return { grade: "B", color: "bg-blue-500/20 text-blue-700" }
    if (score >= 50) return { grade: "C", color: "bg-amber-500/20 text-amber-700" }
    return { grade: "D", color: "bg-red-500/20 text-red-700" }
  }

  const grade = getCircularityGrade(circularityScore)
  const isMissingData = project.recycledContent === 0 && project.gwp === 0

  return (
    <Card
      className="p-6 bg-card hover:border-primary/50 transition-all cursor-pointer border border-border"
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-base">{project.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{project.region}</p>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Metal & Status */}
      <div className="flex gap-2 mb-4">
        <Badge variant="secondary" className="text-xs">
          {project.metal}
        </Badge>
        <Badge className={`${statusColors[project.status as keyof typeof statusColors]} text-xs`}>
          {project.status}
        </Badge>
        {isMissingData && <Badge className="bg-amber-500/20 text-amber-700 text-xs">Missing Data</Badge>}
      </div>

      {/* Metrics */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground font-medium">GWP (kg CO₂e/unit)</span>
          <span className="font-semibold text-foreground text-sm">{project.gwp}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground font-medium">Recycled Content</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${project.recycledContent}%` }} />
            </div>
            <span className="text-xs font-medium text-foreground">{project.recycledContent}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground font-medium cursor-help">Circularity Score</span>
              </TooltipTrigger>
              <TooltipContent>Based on recycled content (60%) and low GWP (40%)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className={`px-2 py-1 rounded font-bold text-sm ${grade.color}`}>{grade.grade}</div>
        </div>
      </div>
    </Card>
  )
}
