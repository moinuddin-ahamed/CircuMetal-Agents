"use client"

import { useState, useEffect, useMemo } from "react"
import { METALS_DATA, Metal, Ore, ProcessingRoute, Stage, CircularLoop } from "@/lib/metals-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowRight, Leaf, Factory, Truck, Recycle, Zap, Globe, TrendingUp, AlertCircle, Bot, 
  MapPin, Building2, Clock, Droplets, Trash2, RotateCcw, ChevronRight, ArrowUpRight, 
  Sparkles, Activity, Target, Package
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

// Stage type color mappings for consistent theming
const STAGE_COLORS = {
  extraction: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  beneficiation: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  smelting: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  refining: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  manufacturing: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  use: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  eol: { bg: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  recycling: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
}

// Stage type icons
const STAGE_ICONS = {
  extraction: Package,
  beneficiation: Activity,
  smelting: Factory,
  refining: Sparkles,
  manufacturing: Building2,
  use: Target,
  eol: Trash2,
  recycling: Recycle
}

export default function LifeCycleExplorer() {
  const [selectedMetalId, setSelectedMetalId] = useState<string>(METALS_DATA[0].id)
  const [selectedOreId, setSelectedOreId] = useState<string>(METALS_DATA[0].ores[0]?.id || "")
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")
  const [showPredictions, setShowPredictions] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'metrics' | 'circular'>('timeline')
  
  // Custom Input State
  const [customMetal, setCustomMetal] = useState("")
  const [customOre, setCustomOre] = useState("")
  const [customGrade, setCustomGrade] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRoute, setGeneratedRoute] = useState<ProcessingRoute | null>(null)

  const selectedMetal = METALS_DATA.find(m => m.id === selectedMetalId)
  const selectedOre = selectedMetal?.ores?.find(o => o.id === selectedOreId)
  // Use generated route if available, otherwise fallback to static data
  const selectedRoute = generatedRoute || (selectedOre?.processingRoutes?.find(r => r.id === selectedRouteId) || selectedOre?.processingRoutes?.[0])
  const selectedStage = selectedRoute?.stages?.find(s => s.id === selectedStageId)

  const handleGenerate = async () => {
    if (!customMetal || !customOre || !customGrade) return
    
    setIsGenerating(true)
    setGeneratedRoute(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/life-cycle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metal: customMetal,
          ore_name: customOre,
          ore_grade: customGrade
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate')
      
      const data = await response.json()
      console.log("Generated route data:", data)
      console.log("Data keys:", Object.keys(data))
      console.log("Stages count:", data.stages?.length)
      console.log("First stage:", data.stages?.[0])
      
      // Check if response is an error response from agent
      if (data.status === "failure" || !data.stages) {
        console.error("Agent returned error:", data.log || "Unknown error")
        alert(`Generation failed: ${data.log || "No stages returned"}`)
        return
      }
      
      console.log("Setting generatedRoute with", data.stages.length, "stages")
      setGeneratedRoute(data as ProcessingRoute)
      if (data.stages && data.stages.length > 0) {
        setSelectedStageId(data.stages[0].id)
        console.log("Set selectedStageId to:", data.stages[0].id)
      }
      console.log("Generation complete, generatedRoute should be set")
    } catch (error) {
      console.error("Generation failed:", error)
      alert(`Generation failed: ${error}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate total metrics for the route
  const routeMetrics = useMemo(() => {
    if (!selectedRoute || !selectedRoute.stages) return null
    const stages = selectedRoute.stages
    const totalCarbon = stages.reduce((sum, s) => sum + (s.metrics?.carbonEmissions || 0), 0)
    const totalEnergy = stages.reduce((sum, s) => sum + (s.metrics?.energyConsumption || 0), 0)
    const totalWater = stages.reduce((sum, s) => sum + (s.metrics?.waterUsage || 0), 0)
    const totalWaste = stages.reduce((sum, s) => sum + (s.metrics?.wasteGenerated || 0), 0)
    const circularLoops = stages.flatMap(s => (s.circularLoops || []).map(loop => ({ ...loop, fromStage: s.id, fromStageName: s.name })))
    const carbonSaved = circularLoops.reduce((sum, loop) => sum + loop.carbonSavings, 0)
    
    return { totalCarbon, totalEnergy, totalWater, totalWaste, circularLoops, carbonSaved, 
      circularityScore: selectedRoute.circularityScore || 0 }
  }, [selectedRoute])

  useEffect(() => {
    if (selectedMetal && selectedMetal.ores && selectedMetal.ores.length > 0) {
      setSelectedOreId(selectedMetal.ores[0].id)
    } else {
      setSelectedOreId("")
    }
  }, [selectedMetalId])

  useEffect(() => {
    if (selectedOre && selectedOre.processingRoutes && selectedOre.processingRoutes.length > 0) {
      setSelectedRouteId(selectedOre.processingRoutes[0].id)
    } else {
      setSelectedRouteId("")
    }
  }, [selectedOreId])

  useEffect(() => {
    if (selectedRoute && selectedRoute.stages && selectedRoute.stages.length > 0 && !selectedStageId) {
      setSelectedStageId(selectedRoute.stages[0].id)
    }
  }, [selectedRoute])

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-white via-emerald-50/30 to-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Life Cycle Explorer</h1>
          <p className="text-slate-500">Complete metal value chain from extraction to recycling</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100 shadow-sm">
            <Switch id="prediction-mode" checked={showPredictions} onCheckedChange={setShowPredictions} />
            <Label htmlFor="prediction-mode" className="cursor-pointer flex items-center gap-2">
              {showPredictions ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <Database className="w-4 h-4 text-slate-400" />}
              <span className={showPredictions ? "text-emerald-700 font-medium" : "text-slate-600"}>
                {showPredictions ? "AI Predictions" : "Observed Data"}
              </span>
            </Label>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <Card className="border-emerald-100 shadow-sm bg-white">
        <CardContent className="p-4">
          <Tabs defaultValue="preset" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="preset">Preset Data</TabsTrigger>
              <TabsTrigger value="custom">Custom Generation (AI)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preset" className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Metal</label>
                <Select value={selectedMetalId} onValueChange={setSelectedMetalId}>
                  <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                    <SelectValue placeholder="Select Metal" />
                  </SelectTrigger>
                  <SelectContent>
                    {METALS_DATA.filter(m => m.ores && m.ores.length > 0 && m.ores.some(o => o.processingRoutes && o.processingRoutes.length > 0)).map(metal => (
                      <SelectItem key={metal.id} value={metal.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                            {metal.symbol}
                          </span>
                          {metal.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Ore Type</label>
                <Select value={selectedOreId} onValueChange={setSelectedOreId} disabled={!selectedMetal?.ores?.length}>
                  <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                    <SelectValue placeholder="Select Ore" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedMetal?.ores?.filter(o => o.processingRoutes && o.processingRoutes.length > 0).map(ore => (
                      <SelectItem key={ore.id} value={ore.id}>{ore.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Processing Route</label>
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId} disabled={!selectedOre?.processingRoutes?.length}>
                  <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                    <SelectValue placeholder="Select Route" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOre?.processingRoutes?.map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">View Mode</label>
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeline">Timeline View</SelectItem>
                    <SelectItem value="metrics">Metrics View</SelectItem>
                    <SelectItem value="circular">Circular Flows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Metal Name</label>
                <Input 
                  placeholder="e.g. Lithium" 
                  value={customMetal} 
                  onChange={(e) => setCustomMetal(e.target.value)}
                  className="border-emerald-200 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Ore Name</label>
                <Input 
                  placeholder="e.g. Spodumene" 
                  value={customOre} 
                  onChange={(e) => setCustomOre(e.target.value)}
                  className="border-emerald-200 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Ore Grade</label>
                <Input 
                  placeholder="e.g. 1.2% Li2O" 
                  value={customGrade} 
                  onChange={(e) => setCustomGrade(e.target.value)}
                  className="border-emerald-200 focus:ring-emerald-500"
                />
              </div>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !customMetal || !customOre || !customGrade}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Generate Lifecycle
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Route Summary Stats */}
      {routeMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="border-emerald-100 bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{selectedRoute?.stages.length || 0}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Stages</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{(routeMetrics.totalCarbon / 1000).toFixed(1)}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">t CO₂e/t</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{(routeMetrics.totalEnergy / 1000).toFixed(0)}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">GJ/t Energy</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{routeMetrics.totalWater.toFixed(1)}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">m³/t Water</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{routeMetrics.circularLoops.length}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Circular Loops</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{routeMetrics.circularityScore}%</div>
              <div className="text-xs text-emerald-600 uppercase tracking-wide">Circularity</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lifecycle Flow - Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRoute ? (
            <Card className="border-emerald-100 bg-white overflow-hidden">
              <CardHeader className="pb-2 border-b border-emerald-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Recycle className="w-5 h-5 text-emerald-600" />
                    Complete Life Cycle
                    {generatedRoute && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs ml-2">
                        <Bot className="w-3 h-3 mr-1" /> AI Generated
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    {Object.entries(STAGE_COLORS).map(([type, colors]) => (
                      <div key={type} className={`w-3 h-3 rounded-full ${colors.bg}`} title={type} />
                    ))}
                  </div>
                </div>
                {generatedRoute && (
                  <CardDescription className="text-purple-600 mt-1">
                    {selectedRoute.name} • {selectedRoute.stages?.length || 0} stages
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="relative space-y-4 pl-8 border-l-2 border-emerald-200 ml-4">
                    {selectedRoute.stages?.map((stage, index) => {
                      const colors = STAGE_COLORS[stage.type] || STAGE_COLORS.extraction
                      const StageIcon = STAGE_ICONS[stage.type] || Package
                      const isSelected = stage.id === selectedStageId
                      const hasCircularLoops = stage.circularLoops && stage.circularLoops.length > 0
                      
                      return (
                        <div key={stage.id} className="relative">
                          {/* Node */}
                          <div className={`absolute -left-[41px] top-4 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${colors.bg}`}>
                            <StageIcon className="w-4 h-4 text-white" />
                          </div>
                          
                          {/* Circular Loop Arrow */}
                          {hasCircularLoops && (
                            <div className="absolute -left-16 top-8 text-emerald-500">
                              <RotateCcw className="w-5 h-5" />
                            </div>
                          )}
                          
                          {/* Stage Card */}
                          <Card 
                            className={`overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                              isSelected ? 'ring-2 ring-emerald-500 shadow-lg' : 'border-slate-200 hover:border-emerald-300'
                            }`}
                            onClick={() => setSelectedStageId(stage.id)}
                          >
                            <div className={`h-1 w-full ${colors.bg}`} />
                            <CardContent className="p-4">
                              {/* Header */}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge className={`${colors.light} ${colors.text} ${colors.border} border capitalize text-xs`}>
                                      {stage.type.replace('eol', 'End of Life')}
                                    </Badge>
                                    {stage.facility && (
                                      <Badge variant="outline" className="text-xs bg-white">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {stage.facility.location}
                                      </Badge>
                                    )}
                                    {showPredictions && (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                        <TrendingUp className="w-3 h-3 mr-1" /> AI Enhanced
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="text-base font-semibold text-slate-800">{stage.name}</h3>
                                  <p className="text-sm text-slate-500 line-clamp-2">{stage.description}</p>
                                </div>
                                <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'rotate-90 text-emerald-600' : 'text-slate-300'}`} />
                              </div>

                              {/* Metrics Row */}
                              {stage.metrics && (
                                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
                                  <div className="text-center p-2 rounded-lg bg-red-50">
                                    <div className="text-xs text-red-600 font-medium">{stage.metrics.carbonEmissions.toLocaleString()}</div>
                                    <div className="text-[10px] text-red-500">kg CO₂e</div>
                                  </div>
                                  <div className="text-center p-2 rounded-lg bg-amber-50">
                                    <div className="text-xs text-amber-600 font-medium">{(stage.metrics.energyConsumption/1000).toFixed(1)}</div>
                                    <div className="text-[10px] text-amber-500">GJ</div>
                                  </div>
                                  <div className="text-center p-2 rounded-lg bg-blue-50">
                                    <div className="text-xs text-blue-600 font-medium">{stage.metrics.waterUsage}</div>
                                    <div className="text-[10px] text-blue-500">m³</div>
                                  </div>
                                  <div className="text-center p-2 rounded-lg bg-slate-50">
                                    <div className="text-xs text-slate-600 font-medium">{stage.metrics.wasteGenerated}</div>
                                    <div className="text-[10px] text-slate-500">kg waste</div>
                                  </div>
                                </div>
                              )}

                              {/* Circular Loops */}
                              {hasCircularLoops && (
                                <div className="mt-3 pt-3 border-t border-emerald-100">
                                  <div className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3" /> Circular Flows
                                  </div>
                                  <div className="space-y-1">
                                    {stage.circularLoops?.map((loop, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs bg-emerald-50 p-2 rounded-lg">
                                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                        <span className="text-slate-600">{loop.materialFlow}</span>
                                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] ml-auto">
                                          {loop.recoveryRate}% recovery
                                        </Badge>
                                        <Badge className="bg-green-100 text-green-700 text-[10px]">
                                          -{loop.carbonSavings} kg CO₂
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Transport Info */}
                              {stage.transportMode && selectedRoute.stages && index < selectedRoute.stages.length - 1 && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                  <Truck className="w-3 h-3" />
                                  <span>{stage.transportMode} to next stage</span>
                                  {stage.transportDistance && (
                                    <span className="text-slate-400">• {stage.transportDistance} km</span>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-100 bg-white">
              <CardContent className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Factory className="w-12 h-12 mb-3 opacity-20" />
                <p>Select a metal with complete processing routes to view the life cycle.</p>
                <p className="text-sm mt-2">Try: Aluminium, Copper, or Steel</p>
              </CardContent>
            </Card>
          )}

          {/* Byproduct Management Section */}
          {selectedRoute && selectedRoute.stages?.some(s => s.byproductFlows && s.byproductFlows.length > 0) && (
            <Card className="border-emerald-100 bg-white">
              <CardHeader className="pb-2 border-b border-emerald-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-amber-600" />
                    Byproduct & Waste Management
                  </CardTitle>
                </div>
                <CardDescription>
                  Management strategies for process residues and byproducts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-6">
                  {selectedRoute.stages
                    ?.filter(s => s.byproductFlows && s.byproductFlows.length > 0)
                    .map(stage => (
                      <div key={stage.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${(STAGE_COLORS[stage.type] || STAGE_COLORS.extraction).bg} text-white border-none`}>
                            {stage.name}
                          </Badge>
                          <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {stage.byproductFlows?.map((flow, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-slate-800">{flow.name}</h4>
                                <Badge variant="outline" className={`
                                  ${flow.managementMethod === 'Valorization' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                  ${flow.managementMethod === 'Recycling' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                  ${flow.managementMethod === 'Storage' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                  ${flow.managementMethod === 'Disposal' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                `}>
                                  {flow.managementMethod}
                                </Badge>
                              </div>
                              
                              <p className="text-xs text-slate-500 mb-3">{flow.description}</p>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 bg-white rounded border border-slate-100">
                                  <span className="text-slate-400 block mb-0.5">Volume</span>
                                  <span className="font-medium text-slate-700">{flow.volume} kg/t</span>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-100">
                                  <span className="text-slate-400 block mb-0.5">Destination</span>
                                  <span className="font-medium text-slate-700">{flow.destination || 'N/A'}</span>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-100">
                                  <span className="text-slate-400 block mb-0.5">Env. Risk</span>
                                  <span className={`font-medium ${
                                    flow.environmentalRisk === 'High' ? 'text-red-600' : 
                                    flow.environmentalRisk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {flow.environmentalRisk}
                                  </span>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-100">
                                  <span className="text-slate-400 block mb-0.5">Economic</span>
                                  <span className={`font-medium ${
                                    flow.economicValue === 'Revenue' ? 'text-emerald-600' : 
                                    flow.economicValue === 'Cost' ? 'text-red-600' : 'text-slate-600'
                                  }`}>
                                    {flow.economicValue}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stage Details */}
          {selectedStage && (
            <Card className="border-emerald-100 bg-white">
              <CardHeader className="pb-2 border-b border-emerald-50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {(() => { 
                    const Icon = STAGE_ICONS[selectedStage.type] || Package; 
                    const colors = STAGE_COLORS[selectedStage.type] || STAGE_COLORS.extraction;
                    return <Icon className={`w-4 h-4 ${colors.text}`} /> 
                  })()}
                  Stage Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-sm">
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">Stage Name</span>
                  <span className="font-semibold text-slate-800">{selectedStage.name}</span>
                </div>
                
                {selectedStage.facility && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
                      <Building2 className="w-4 h-4" />
                      Facility Information
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div><span className="text-slate-500">Name:</span> {selectedStage.facility.name}</div>
                      <div><span className="text-slate-500">Location:</span> {selectedStage.facility.location}</div>
                      <div><span className="text-slate-500">Country:</span> {selectedStage.facility.country}</div>
                    </div>
                  </div>
                )}

                {selectedStage.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Duration:</span>
                    <span className="font-medium text-slate-700">{selectedStage.duration}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide block mb-2">Inputs</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedStage.inputs?.map(i => (
                      <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                        {i}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide block mb-2">Outputs</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedStage.outputs?.map(o => (
                      <Badge key={o} className="text-xs bg-amber-50 text-amber-700 border border-amber-200">
                        {o}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Circularity Potential</div>
                  <div className="font-medium text-emerald-700">{selectedStage.circularityPotential}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ore Characteristics */}
          {selectedOre && (
          <Card className="border-emerald-100 bg-white">
            <CardHeader className="pb-2 border-b border-emerald-50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Ore Characteristics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">Mineralogy</span>
                <span className="font-medium text-slate-800">{selectedOre?.mineralogy || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">Grade Range</span>
                <span className="font-medium text-slate-800">{selectedOre?.gradeRange || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">Key Regions</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedOre?.regions?.map(r => (
                    <Badge key={r} variant="outline" className="text-xs border-emerald-200 text-emerald-700">{r}</Badge>
                  ))}
                </div>
              </div>
              {selectedOre?.byproducts && selectedOre.byproducts.length > 0 && (
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">Byproducts</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedOre.byproducts?.map(b => (
                      <Badge key={b} className="text-xs bg-purple-50 text-purple-700 border border-purple-200">{b}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Agent Insights */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-400">
                <Bot className="w-4 h-4" />
                AI Agent Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-1 text-xs font-medium text-emerald-300">
                  <Leaf className="w-3 h-3" /> Circularity Agent
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {routeMetrics && routeMetrics.circularLoops.length > 0
                    ? `Identified ${routeMetrics.circularLoops.length} circular flows saving ${routeMetrics.carbonSaved.toLocaleString()} kg CO₂e/t through material recovery.`
                    : "Analyzing potential circular economy opportunities for this route."}
                </p>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-1 text-xs font-medium text-blue-300">
                  <Activity className="w-3 h-3" /> LCA Agent
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {selectedStage?.type === 'smelting'
                    ? "Smelting stage identified as highest carbon intensity. Consider renewable energy or DRI alternatives."
                    : selectedStage?.type === 'recycling'
                    ? "Secondary production pathway shows 75-95% lower carbon footprint vs primary."
                    : "Monitoring all stages for optimization opportunities."}
                </p>
              </div>

              {showPredictions && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 mb-1 text-xs font-medium text-amber-300">
                    <TrendingUp className="w-3 h-3" /> Forecast Agent
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Scrap availability projected to increase 15% by 2026 due to automotive EOL wave. Secondary production premiums expected to narrow.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Database(props: React.SVGProps<SVGSVGElement>) {
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
