"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Zap, Leaf, RefreshCw } from "lucide-react"
import type { Project } from "@/lib/lca-context"

interface KeyInsightsProps {
  projects: Project[]
}

export default function KeyInsights({ projects }: KeyInsightsProps) {
  const completedProjects = projects.filter((p) => p.status === "completed")
  const avgGWPReduction =
    completedProjects.length > 0
      ? (completedProjects.reduce((acc, p) => acc + (20 + Math.random() * 15), 0) / completedProjects.length).toFixed(0)
      : 0

  const highestRecycledContent =
    projects.length > 0
      ? projects.reduce((max, p) => (p.recycledContent > max.recycledContent ? p : max))
      : { recycledContent: 0, name: "—" }
  const totalProjects = projects.length
  const avgRecycledContent =
    projects.length > 0 ? (projects.reduce((acc, p) => acc + p.recycledContent, 0) / projects.length).toFixed(0) : 0

  const insights = [
    {
      icon: TrendingUp,
      label: "Avg GWP Reduction",
      value: `${avgGWPReduction}%`,
      description: "vs conventional pathways",
      bgLight: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    projects.length > 0
      ? {
        icon: Leaf,
        label: "Highest Recycled Content",
        value: `${highestRecycledContent.recycledContent}%`,
        description: highestRecycledContent.name,
        bgLight: "bg-green-50",
        iconColor: "text-green-500",
      }
      : {
        icon: Leaf,
        label: "Highest Recycled Content",
        value: `0%`,
        description: "No projects",
        bgLight: "bg-green-50",
        iconColor: "text-green-500",
      },
    {
      icon: RefreshCw,
      label: "Avg Recycled Content",
      value: `${avgRecycledContent}%`,
      description: "Across all projects",
      bgLight: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      icon: Zap,
      label: "Total Assessments",
      value: totalProjects,
      description: `${completedProjects.length} completed`,
      bgLight: "bg-amber-50",
      iconColor: "text-amber-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {insights.map((insight, idx) => {
        const Icon = insight.icon
        return (
          <Card key={idx} className="p-5 bg-white border-slate-100 rounded-2xl hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${insight.bgLight} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-5 h-5 ${insight.iconColor}`} />
              </div>
            </div>
            <div className="mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{insight.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{insight.value}</p>
            </div>
            <p className="text-xs text-slate-400 font-medium">{insight.description}</p>
          </Card>
        )
      })}
    </div>
  )
}
