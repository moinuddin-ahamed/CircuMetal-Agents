"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, TrendingDown, Minus, Leaf, Zap, Droplets, Trash2 } from "lucide-react"

interface ScenarioData {
  id: string
  name: string
  description?: string
  metrics: {
    gwp: number       // kg CO2e
    energy: number    // kWh
    water: number     // m³
    waste: number     // kg
    mci: number       // 0-1
    recycledInput: number  // 0-100%
    recoveryRate: number   // 0-100%
  }
}

interface ScenarioComparisonProps {
  baseline: ScenarioData
  comparison: ScenarioData
  title?: string
  showPercentage?: boolean
}

export default function ScenarioComparison({
  baseline,
  comparison,
  title = "Scenario Comparison",
  showPercentage = true,
}: ScenarioComparisonProps) {
  
  const calculateChange = (baseVal: number, compVal: number, lowerIsBetter = true) => {
    if (baseVal === 0) return { value: 0, percentage: 0, improved: false }
    const diff = compVal - baseVal
    const percentage = (diff / baseVal) * 100
    const improved = lowerIsBetter ? diff < 0 : diff > 0
    return { value: diff, percentage, improved }
  }
  
  const metrics = [
    {
      key: "gwp",
      label: "GWP",
      unit: "kg CO₂e",
      icon: Leaf,
      lowerIsBetter: true,
      color: "emerald",
    },
    {
      key: "energy",
      label: "Energy",
      unit: "kWh",
      icon: Zap,
      lowerIsBetter: true,
      color: "amber",
    },
    {
      key: "water",
      label: "Water",
      unit: "m³",
      icon: Droplets,
      lowerIsBetter: true,
      color: "blue",
    },
    {
      key: "waste",
      label: "Waste",
      unit: "kg",
      icon: Trash2,
      lowerIsBetter: true,
      color: "orange",
    },
  ]
  
  const circularityMetrics = [
    { key: "mci", label: "MCI Score", lowerIsBetter: false, format: (v: number) => v.toFixed(2) },
    { key: "recycledInput", label: "Recycled Input", lowerIsBetter: false, format: (v: number) => `${v.toFixed(0)}%` },
    { key: "recoveryRate", label: "Recovery Rate", lowerIsBetter: false, format: (v: number) => `${v.toFixed(0)}%` },
  ]
  
  const getChangeIndicator = (improved: boolean, percentage: number) => {
    if (Math.abs(percentage) < 1) {
      return <Minus className="w-4 h-4 text-slate-400" />
    }
    return improved 
      ? <TrendingDown className="w-4 h-4 text-emerald-500" />
      : <TrendingUp className="w-4 h-4 text-red-500" />
  }
  
  return (
    <Card className="p-6 bg-gradient-to-br from-white to-slate-50/50 border-slate-200/50 shadow-lg overflow-hidden">
      <h3 className="font-semibold text-slate-800 mb-6">{title}</h3>
      
      {/* Scenario headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-6">
        <div className="p-4 bg-slate-100 rounded-xl">
          <Badge variant="secondary" className="mb-2">Baseline</Badge>
          <h4 className="font-medium text-slate-800">{baseline.name}</h4>
          {baseline.description && (
            <p className="text-xs text-slate-500 mt-1">{baseline.description}</p>
          )}
        </div>
        
        <div className="flex items-center">
          <ArrowRight className="w-6 h-6 text-slate-400" />
        </div>
        
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Badge className="mb-2 bg-emerald-500">Improved</Badge>
          <h4 className="font-medium text-slate-800">{comparison.name}</h4>
          {comparison.description && (
            <p className="text-xs text-slate-500 mt-1">{comparison.description}</p>
          )}
        </div>
      </div>
      
      {/* Environmental metrics comparison */}
      <div className="space-y-3 mb-6">
        <h5 className="text-sm font-medium text-slate-600">Environmental Impact</h5>
        
        {metrics.map(metric => {
          const baseVal = baseline.metrics[metric.key as keyof typeof baseline.metrics] as number
          const compVal = comparison.metrics[metric.key as keyof typeof comparison.metrics] as number
          const change = calculateChange(baseVal, compVal, metric.lowerIsBetter)
          const Icon = metric.icon
          
          return (
            <div key={metric.key} className="grid grid-cols-[1fr_80px_1fr] gap-4 items-center">
              {/* Baseline value */}
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 text-${metric.color}-500`} />
                  <span className="text-sm text-slate-600">{metric.label}</span>
                </div>
                <span className="font-mono font-medium text-slate-800">
                  {baseVal.toFixed(1)}
                </span>
              </div>
              
              {/* Change indicator */}
              <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${
                change.improved ? "bg-emerald-50" : Math.abs(change.percentage) < 1 ? "bg-slate-50" : "bg-red-50"
              }`}>
                {getChangeIndicator(change.improved, change.percentage)}
                {showPercentage && (
                  <span className={`text-xs font-medium mt-1 ${
                    change.improved ? "text-emerald-600" : Math.abs(change.percentage) < 1 ? "text-slate-500" : "text-red-600"
                  }`}>
                    {change.percentage > 0 ? "+" : ""}{change.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              
              {/* Comparison value */}
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                change.improved ? "bg-emerald-50 border-emerald-200" 
                : Math.abs(change.percentage) < 1 ? "bg-white border-slate-200"
                : "bg-red-50 border-red-200"
              }`}>
                <span className="text-sm text-slate-600">{metric.unit}</span>
                <span className={`font-mono font-medium ${
                  change.improved ? "text-emerald-700" : "text-slate-800"
                }`}>
                  {compVal.toFixed(1)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Circularity metrics */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-slate-600">Circularity Metrics</h5>
        
        <div className="grid grid-cols-3 gap-3">
          {circularityMetrics.map(metric => {
            const baseVal = baseline.metrics[metric.key as keyof typeof baseline.metrics] as number
            const compVal = comparison.metrics[metric.key as keyof typeof comparison.metrics] as number
            const change = calculateChange(baseVal, compVal, metric.lowerIsBetter)
            
            return (
              <div 
                key={metric.key}
                className={`p-4 rounded-xl border ${
                  change.improved ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                }`}
              >
                <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-800">
                      {metric.format(compVal)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      from {metric.format(baseVal)}
                    </span>
                  </div>
                  {Math.abs(change.percentage) >= 1 && (
                    <Badge className={change.improved ? "bg-emerald-500" : "bg-red-500"}>
                      {change.percentage > 0 ? "+" : ""}{change.percentage.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-emerald-800">Impact Summary</span>
        </div>
        <p className="text-sm text-emerald-700">
          {comparison.name} achieves{" "}
          <strong>
            {Math.abs(calculateChange(baseline.metrics.gwp, comparison.metrics.gwp).percentage).toFixed(0)}% reduction
          </strong>{" "}
          in GWP and improves MCI from{" "}
          <strong>{baseline.metrics.mci.toFixed(2)}</strong> to{" "}
          <strong>{comparison.metrics.mci.toFixed(2)}</strong>.
        </p>
      </div>
    </Card>
  )
}

// Demo component
export function SampleScenarioComparison() {
  const baseline: ScenarioData = {
    id: "baseline",
    name: "Current Process",
    description: "Primary aluminium production with standard practices",
    metrics: {
      gwp: 12.5,
      energy: 850,
      water: 25.3,
      waste: 4.2,
      mci: 0.35,
      recycledInput: 15,
      recoveryRate: 60,
    }
  }
  
  const improved: ScenarioData = {
    id: "improved",
    name: "Optimized Process",
    description: "Secondary aluminium with renewable energy",
    metrics: {
      gwp: 4.2,
      energy: 320,
      water: 12.1,
      waste: 1.8,
      mci: 0.72,
      recycledInput: 85,
      recoveryRate: 88,
    }
  }
  
  return (
    <div className="p-8">
      <ScenarioComparison baseline={baseline} comparison={improved} />
    </div>
  )
}
