"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ImpactCategory {
  name: string
  value: number
  unit: string
  benchmark?: number
  color?: string
}

interface LifecycleStage {
  stage: string
  gwp: number
  energy: number
  water: number
}

interface ImpactBreakdownProps {
  impactCategories: ImpactCategory[]
  lifecycleBreakdown?: LifecycleStage[]
  title?: string
}

const DEFAULT_COLORS = [
  "oklch(0.5 0.15 165)", // Teal
  "oklch(0.5 0.15 200)", // Blue
  "oklch(0.5 0.15 50)",  // Orange
  "oklch(0.5 0.15 280)", // Purple
  "oklch(0.5 0.15 100)", // Green
  "oklch(0.5 0.15 320)", // Pink
]

export default function ImpactBreakdown({
  impactCategories,
  lifecycleBreakdown,
  title = "Environmental Impact Breakdown",
}: ImpactBreakdownProps) {
  // Prepare data for radial gauge
  const gaugeData = impactCategories.map((cat, idx) => ({
    name: cat.name,
    value: cat.benchmark ? (cat.value / cat.benchmark) * 100 : cat.value,
    fill: cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    unit: cat.unit,
    actual: cat.value,
    benchmark: cat.benchmark,
  }))

  // Prepare data for pie chart
  const pieData = impactCategories.map((cat, idx) => ({
    name: cat.name,
    value: cat.value,
    color: cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Value: {data.actual?.toFixed(2) || data.value?.toFixed(2)} {data.unit}
          </p>
          {data.benchmark && (
            <p className="text-sm text-muted-foreground">
              Benchmark: {data.benchmark.toFixed(2)} {data.unit}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>

      <Tabs defaultValue="bar" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="pie">Distribution</TabsTrigger>
          {lifecycleBreakdown && (
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          )}
        </TabsList>

        {/* Bar Chart View */}
        <TabsContent value="bar">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={impactCategories}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
              <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={12} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="value"
                name="Actual"
                radius={[8, 8, 0, 0]}
              >
                {impactCategories.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  />
                ))}
              </Bar>
              {impactCategories.some((c) => c.benchmark) && (
                <Bar
                  dataKey="benchmark"
                  name="Benchmark"
                  fill="oklch(0.4 0 0)"
                  radius={[8, 8, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>

          {/* Impact Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {impactCategories.map((cat, idx) => (
              <div
                key={cat.name}
                className="p-3 rounded-lg bg-background border border-border"
              >
                <div
                  className="w-2 h-2 rounded-full mb-2"
                  style={{
                    backgroundColor:
                      cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                  }}
                />
                <p className="text-xs text-muted-foreground">{cat.name}</p>
                <p className="text-lg font-semibold text-foreground">
                  {cat.value.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{cat.unit}</p>
                {cat.benchmark && (
                  <p
                    className={`text-xs mt-1 ${
                      cat.value <= cat.benchmark
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {cat.value <= cat.benchmark ? "✓ Within" : "✗ Above"} benchmark
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pie Chart View */}
        <TabsContent value="pie">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-foreground">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.value.toFixed(2)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Lifecycle View */}
        {lifecycleBreakdown && (
          <TabsContent value="lifecycle">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={lifecycleBreakdown}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  stroke="oklch(0.65 0 0)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.16 0 0)",
                    border: "1px solid oklch(0.25 0 0)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="gwp"
                  name="GWP (kg CO₂e)"
                  fill="oklch(0.5 0.15 165)"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="energy"
                  name="Energy (kWh)"
                  fill="oklch(0.5 0.15 50)"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="water"
                  name="Water (m³)"
                  fill="oklch(0.5 0.15 200)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  )
}

// Helper component with sample data
export function SampleImpactBreakdown() {
  const sampleImpacts: ImpactCategory[] = [
    { name: "GWP", value: 8.5, unit: "kg CO₂e", benchmark: 10 },
    { name: "AP", value: 0.15, unit: "kg SO₂e", benchmark: 0.2 },
    { name: "EP", value: 0.08, unit: "kg PO₄e", benchmark: 0.1 },
    { name: "Energy", value: 1200, unit: "MJ" },
    { name: "Water", value: 15, unit: "m³" },
  ]

  const sampleLifecycle: LifecycleStage[] = [
    { stage: "Raw Material Extraction", gwp: 3.2, energy: 450, water: 5 },
    { stage: "Processing", gwp: 2.5, energy: 380, water: 4 },
    { stage: "Manufacturing", gwp: 1.8, energy: 280, water: 3 },
    { stage: "Transport", gwp: 0.6, energy: 60, water: 0.5 },
    { stage: "Use Phase", gwp: 0.2, energy: 20, water: 1.5 },
    { stage: "End of Life", gwp: 0.2, energy: 10, water: 1 },
  ]

  return (
    <ImpactBreakdown
      impactCategories={sampleImpacts}
      lifecycleBreakdown={sampleLifecycle}
    />
  )
}
