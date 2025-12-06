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
      label: "Avg GWP Reduction (Circular)",
      value: `${avgGWPReduction}%`,
      description: "vs conventional pathways",
      color: "text-accent",
    },
    projects.length > 0
      ? {
        icon: Leaf,
        label: "Highest Recycled Content",
        value: `${highestRecycledContent.recycledContent}%`,
        description: highestRecycledContent.name,
        color: "text-emerald-500",
      }
      : {
        icon: Leaf,
        label: "Highest Recycled Content",
        value: `0%`,
        description: "No projects",
        color: "text-emerald-500",
      },
    {
      icon: RefreshCw,
      label: "Avg Recycled Content",
      value: `${avgRecycledContent}%`,
      description: "Across all projects",
      color: "text-blue-500",
    },
    {
      icon: Zap,
      label: "Total Assessments",
      value: totalProjects,
      description: `${completedProjects.length} completed`,
      color: "text-orange-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {insights.map((insight, idx) => {
        const Icon = insight.icon
        return (
          <Card key={idx} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between mb-3">
              <Icon className={`w-5 h-5 ${insight.color}`} />
            </div>
            <div className="mb-2">
              <p className="text-xs text-muted-foreground font-medium">{insight.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{insight.value}</p>
            </div>
            <p className="text-xs text-muted-foreground">{insight.description}</p>
          </Card>
        )
      })}
    </div>
  )
}
