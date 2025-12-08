"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Recycle, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface CircularityGaugeProps {
  mci: number  // Material Circularity Indicator 0-1
  recycledInput: number  // 0-100%
  recoveryRate: number   // 0-100%
  utilityFactor?: number // 0.1-10 (product utility vs industry average)
  title?: string
  benchmark?: number
  animated?: boolean
}

export default function CircularityGauge({
  mci,
  recycledInput,
  recoveryRate,
  utilityFactor = 1,
  title = "Material Circularity Indicator",
  benchmark = 0.5,
  animated = true,
}: CircularityGaugeProps) {
  const [displayMCI, setDisplayMCI] = useState(animated ? 0 : mci)
  
  // Animate the gauge on mount
  useEffect(() => {
    if (!animated) {
      setDisplayMCI(mci)
      return
    }
    
    const duration = 1500
    const start = Date.now()
    const startValue = displayMCI
    
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayMCI(startValue + (mci - startValue) * eased)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [mci, animated])
  
  // Calculate gauge angle (180 degree arc)
  const angle = displayMCI * 180
  
  // Color based on MCI value
  const getColor = (value: number) => {
    if (value >= 0.7) return { main: "oklch(0.65 0.2 145)", light: "oklch(0.85 0.12 145)" }
    if (value >= 0.5) return { main: "oklch(0.65 0.18 85)", light: "oklch(0.85 0.1 85)" }
    if (value >= 0.3) return { main: "oklch(0.65 0.18 65)", light: "oklch(0.85 0.1 65)" }
    return { main: "oklch(0.6 0.2 25)", light: "oklch(0.85 0.12 25)" }
  }
  
  const colors = getColor(mci)
  
  // Rating label
  const getRating = (value: number) => {
    if (value >= 0.8) return { label: "Excellent", description: "Highly circular system" }
    if (value >= 0.6) return { label: "Good", description: "Above average circularity" }
    if (value >= 0.4) return { label: "Moderate", description: "Room for improvement" }
    if (value >= 0.2) return { label: "Low", description: "Significant linear flows" }
    return { label: "Very Low", description: "Mostly linear system" }
  }
  
  const rating = getRating(mci)
  
  // Trend indicator
  const TrendIcon = mci > benchmark ? TrendingUp : mci < benchmark ? TrendingDown : Minus
  const trendColor = mci > benchmark ? "text-emerald-500" : mci < benchmark ? "text-red-500" : "text-slate-400"
  
  return (
    <Card className="p-6 bg-gradient-to-br from-white to-slate-50/50 border-slate-200/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Recycle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">Ellen MacArthur Foundation methodology</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {mci > benchmark ? "Above" : mci < benchmark ? "Below" : "At"} benchmark
          </span>
        </div>
      </div>
      
      {/* Gauge */}
      <div className="relative flex flex-col items-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-[280px]">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="oklch(0.9 0 0)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={colors.main}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(displayMCI * 251.2).toFixed(1)} 251.2`}
            style={{ transition: animated ? "none" : "stroke-dasharray 1s ease-out" }}
          />
          
          {/* Benchmark marker */}
          <g transform={`rotate(${benchmark * 180 - 180}, 100, 100)`}>
            <line
              x1="100"
              y1="20"
              x2="100"
              y2="32"
              stroke="oklch(0.4 0 0)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          
          {/* Needle */}
          <g transform={`rotate(${angle - 180}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="oklch(0.3 0 0)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill="oklch(0.3 0 0)" />
            <circle cx="100" cy="100" r="4" fill="white" />
          </g>
          
          {/* Scale labels */}
          <text x="15" y="108" fontSize="10" fill="oklch(0.5 0 0)">0</text>
          <text x="95" y="18" fontSize="10" fill="oklch(0.5 0 0)">0.5</text>
          <text x="178" y="108" fontSize="10" fill="oklch(0.5 0 0)">1.0</text>
        </svg>
        
        {/* Center display */}
        <div className="absolute bottom-0 text-center">
          <div className="text-4xl font-bold text-slate-800">
            {displayMCI.toFixed(2)}
          </div>
          <div 
            className="text-sm font-semibold px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: colors.light, color: colors.main }}
          >
            {rating.label}
          </div>
        </div>
      </div>
      
      {/* Sub-metrics */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <div className="text-2xl font-bold text-slate-800">{recycledInput.toFixed(0)}%</div>
          <div className="text-xs text-slate-500 mt-1">Recycled Input</div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${recycledInput}%` }}
            />
          </div>
        </div>
        
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <div className="text-2xl font-bold text-slate-800">{recoveryRate.toFixed(0)}%</div>
          <div className="text-xs text-slate-500 mt-1">Recovery Rate</div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${recoveryRate}%` }}
            />
          </div>
        </div>
        
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <div className="text-2xl font-bold text-slate-800">{utilityFactor.toFixed(1)}x</div>
          <div className="text-xs text-slate-500 mt-1">Utility Factor</div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(utilityFactor * 10, 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-center text-sm text-slate-500 mt-4">
        {rating.description}
      </p>
    </Card>
  )
}

// Demo component for testing
export function SampleCircularityGauge() {
  return (
    <div className="p-8 space-y-6">
      <CircularityGauge
        mci={0.72}
        recycledInput={85}
        recoveryRate={78}
        utilityFactor={1.2}
        benchmark={0.5}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <CircularityGauge
          mci={0.45}
          recycledInput={30}
          recoveryRate={65}
          title="Baseline Scenario"
          animated={false}
        />
        <CircularityGauge
          mci={0.82}
          recycledInput={90}
          recoveryRate={88}
          title="Improved Scenario"
          animated={false}
        />
      </div>
    </div>
  )
}
