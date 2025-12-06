"use client"

import { TrendingDown, Database, Leaf, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"

interface SummaryMetricsProps {
  projects: Array<{ gwp: number; recycledContent: number }>
}

export default function SummaryMetrics({ projects }: SummaryMetricsProps) {
  const avgGWP = (projects.reduce((sum, p) => sum + p.gwp, 0) / projects.length).toFixed(1)
  const avgRecycled = Math.round(projects.reduce((sum, p) => sum + p.recycledContent, 0) / projects.length)

  const metrics = [
    {
      label: "Total Projects",
      value: projects.length.toString(),
      icon: Database,
      color: "from-primary/20 to-primary/5",
    },
    { label: "Avg GWP", value: `${avgGWP} kg CO₂e`, icon: Leaf, color: "from-destructive/20 to-destructive/5" },
    {
      label: "Avg Recycled Content",
      value: `${avgRecycled}%`,
      icon: TrendingDown,
      color: "from-accent/20 to-accent/5",
    },
    { label: "Metals Analyzed", value: "Al, Cu, Ni", icon: Zap, color: "from-primary/20 to-primary/5" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card
            key={metric.label}
            className="p-6 bg-gradient-to-br bg-card border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center`}
              >
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
