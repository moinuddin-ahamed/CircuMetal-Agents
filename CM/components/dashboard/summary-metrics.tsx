"use client"

import { TrendingDown, Database, Leaf, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"

interface SummaryMetricsProps {
  projects: Array<{ gwp: number; recycledContent: number }>
}

export default function SummaryMetrics({ projects }: SummaryMetricsProps) {
  const avgGWP = projects.length > 0 ? (projects.reduce((sum, p) => sum + p.gwp, 0) / projects.length).toFixed(1) : "0"
  const avgRecycled = projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.recycledContent, 0) / projects.length) : 0

  const metrics = [
    {
      label: "Total Projects",
      value: projects.length.toString(),
      icon: Database,
      gradient: "from-emerald-500 to-green-500",
      bgLight: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    { 
      label: "Avg GWP", 
      value: `${avgGWP} kg`, 
      icon: Leaf, 
      gradient: "from-rose-500 to-pink-500",
      bgLight: "bg-rose-50",
      iconColor: "text-rose-600",
    },
    {
      label: "Avg Recycled Content",
      value: `${avgRecycled}%`,
      icon: TrendingDown,
      gradient: "from-blue-500 to-cyan-500",
      bgLight: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    { 
      label: "Metals Analyzed", 
      value: "Al, Cu, Ni", 
      icon: Zap, 
      gradient: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card
            key={metric.label}
            className="p-5 bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 rounded-2xl group hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{metric.label}</p>
                <p className="text-2xl font-bold text-slate-800">{metric.value}</p>
              </div>
              <div
                className={`w-11 h-11 rounded-xl ${metric.bgLight} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className={`w-5 h-5 ${metric.iconColor}`} />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
