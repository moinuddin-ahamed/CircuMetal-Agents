"use client"

import { MoreVertical, ArrowUpRight } from "lucide-react"
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
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
  }

  const circularityScore = Math.round(project.recycledContent * 0.6 + (100 - project.gwp) * 0.4)
  const getCircularityGrade = (score: number) => {
    if (score >= 85) return { grade: "A+", color: "bg-emerald-100 text-emerald-700" }
    if (score >= 75) return { grade: "A", color: "bg-emerald-100 text-emerald-700" }
    if (score >= 65) return { grade: "B", color: "bg-blue-100 text-blue-700" }
    if (score >= 50) return { grade: "C", color: "bg-amber-100 text-amber-700" }
    return { grade: "D", color: "bg-red-100 text-red-700" }
  }

  const grade = getCircularityGrade(circularityScore)
  const isMissingData = project.recycledContent === 0 && project.gwp === 0

  return (
    <Card
      className="p-5 bg-white hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 transition-all duration-300 cursor-pointer border border-slate-100 rounded-2xl group hover:-translate-y-1"
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">{project.name}</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">{project.region}</p>
        </div>
        <button className="text-slate-300 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-50 transition-all opacity-0 group-hover:opacity-100">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Metal & Status */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-0 font-medium">
          {project.metal}
        </Badge>
        <Badge className={`${statusColors[project.status as keyof typeof statusColors]} text-xs border font-medium`}>
          {project.status}
        </Badge>
        {isMissingData && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border font-medium">Missing Data</Badge>}
      </div>

      {/* Metrics */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">GWP (kg CO₂e/unit)</span>
          <span className="font-semibold text-slate-800 text-sm">{project.gwp}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">Recycled Content</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500" 
                style={{ width: `${project.recycledContent}%` }} 
              />
            </div>
            <span className="text-xs font-semibold text-slate-700">{project.recycledContent}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-slate-500 font-medium cursor-help">Circularity Score</span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 text-white text-xs rounded-lg">
                Based on recycled content (60%) and low GWP (40%)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className={`px-2.5 py-1 rounded-lg font-bold text-sm ${grade.color}`}>{grade.grade}</div>
        </div>
      </div>
    </Card>
  )
}
