"use client"

import { useState, useEffect } from "react"
import { METALS_DATA, Metal, Ore, ProcessingRoute } from "@/lib/metals-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Leaf, Factory, Truck, Recycle, Zap, Globe, TrendingUp, AlertCircle, Bot } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function LifeCycleExplorer() {
  const [selectedMetalId, setSelectedMetalId] = useState<string>(METALS_DATA[0].id)
  const [selectedOreId, setSelectedOreId] = useState<string>(METALS_DATA[0].ores[0]?.id || "")
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")
  const [showPredictions, setShowPredictions] = useState(false)

  const selectedMetal = METALS_DATA.find(m => m.id === selectedMetalId)
  const selectedOre = selectedMetal?.ores.find(o => o.id === selectedOreId)
  const selectedRoute = selectedOre?.processingRoutes.find(r => r.id === selectedRouteId) || selectedOre?.processingRoutes[0]

  useEffect(() => {
    if (selectedMetal && selectedMetal.ores.length > 0) {
      setSelectedOreId(selectedMetal.ores[0].id)
    } else {
      setSelectedOreId("")
    }
  }, [selectedMetalId])

  useEffect(() => {
    if (selectedOre && selectedOre.processingRoutes.length > 0) {
      setSelectedRouteId(selectedOre.processingRoutes[0].id)
    } else {
      setSelectedRouteId("")
    }
  }, [selectedOreId])

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Life Cycle Explorer</h1>
          <p className="text-slate-500">Visualize complete metal value chains from ore to recycling</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <Switch id="prediction-mode" checked={showPredictions} onCheckedChange={setShowPredictions} />
            <Label htmlFor="prediction-mode" className="cursor-pointer flex items-center gap-2">
              {showPredictions ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <Database className="w-4 h-4 text-slate-400" />}
              <span className={showPredictions ? "text-emerald-700 font-medium" : "text-slate-600"}>
                {showPredictions ? "AI Prediction Mode" : "Observed Data"}
              </span>
            </Label>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase">Metal</label>
            <Select value={selectedMetalId} onValueChange={setSelectedMetalId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Metal" />
              </SelectTrigger>
              <SelectContent>
                {METALS_DATA.map(metal => (
                  <SelectItem key={metal.id} value={metal.id}>{metal.name} ({metal.symbol})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase">Ore Type</label>
            <Select value={selectedOreId} onValueChange={setSelectedOreId} disabled={!selectedMetal?.ores.length}>
              <SelectTrigger>
                <SelectValue placeholder="Select Ore" />
              </SelectTrigger>
              <SelectContent>
                {selectedMetal?.ores.map(ore => (
                  <SelectItem key={ore.id} value={ore.id}>{ore.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase">Processing Route</label>
            <Select value={selectedRouteId} onValueChange={setSelectedRouteId} disabled={!selectedOre?.processingRoutes.length}>
              <SelectTrigger>
                <SelectValue placeholder="Select Route" />
              </SelectTrigger>
              <SelectContent>
                {selectedOre?.processingRoutes.map(route => (
                  <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase">Region</label>
            <Select defaultValue="global">
              <SelectTrigger>
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Average</SelectItem>
                <SelectItem value="eu">Europe</SelectItem>
                <SelectItem value="na">North America</SelectItem>
                <SelectItem value="cn">China</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Flow */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRoute ? (
            <div className="relative space-y-8 pl-8 border-l-2 border-slate-200 ml-4">
              {selectedRoute.stages.map((stage, index) => (
                <div key={stage.id} className="relative">
                  {/* Node Dot */}
                  <div className={`absolute -left-[41px] top-6 w-6 h-6 rounded-full border-4 border-white shadow-sm z-10 ${
                    stage.type === 'extraction' ? 'bg-amber-500' :
                    stage.type === 'beneficiation' ? 'bg-blue-500' :
                    stage.type === 'smelting' ? 'bg-red-500' :
                    stage.type === 'refining' ? 'bg-purple-500' :
                    'bg-emerald-500'
                  }`} />
                  
                  <Card className="overflow-hidden transition-all hover:shadow-md border-slate-200">
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 capitalize">
                              {stage.type}
                            </Badge>
                            {showPredictions && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> AI Forecast
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800">{stage.name}</h3>
                          <p className="text-sm text-slate-500">{stage.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 uppercase font-medium mb-1">Circularity Income</div>
                          <div className="text-lg font-bold text-emerald-600">{stage.circularityPotential}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">Inputs</span>
                          <div className="flex flex-wrap gap-1">
                            {stage.inputs.map(i => (
                              <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200">
                                {i}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">Outputs & Byproducts</span>
                          <div className="flex flex-wrap gap-1">
                            {stage.outputs.map(o => (
                              <Badge key={o} variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100">
                                {o}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mt-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span>Energy: <span className="font-medium text-slate-700">{stage.energy}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span>Emissions: <span className="font-medium text-slate-700">{stage.emissions}</span></span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
              <Factory className="w-12 h-12 mb-3 opacity-20" />
              <p>Select a valid processing route to view the life cycle flow.</p>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Ore Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-500" />
                Ore Characteristics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-slate-500 block">Mineralogy</span>
                <span className="font-medium text-slate-800">{selectedOre?.mineralogy || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Typical Grade</span>
                <span className="font-medium text-slate-800">{selectedOre?.gradeRange || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Key Regions</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedOre?.regions.map(r => (
                    <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Insights */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-400">
                <Bot className="w-4 h-4" />
                Agent Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-1 text-xs font-medium text-emerald-300">
                  <AlertCircle className="w-3 h-3" /> LCA Agent
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {selectedRoute?.name.includes("Bayer") 
                    ? "High caustic soda consumption identified in refining stage. Consider membrane filtration to recover NaOH."
                    : "Standard pathway selected. Energy intensity is within global average range."}
                </p>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-1 text-xs font-medium text-blue-300">
                  <TrendingUp className="w-3 h-3" /> Prediction Agent
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {showPredictions 
                    ? "Scrap availability expected to increase by 15% in 2026 due to automotive EOL wave."
                    : "Current market prices favor primary production, but secondary premiums are rising."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Database(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}
