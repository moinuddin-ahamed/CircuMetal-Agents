"use client"

import { useState, useMemo } from "react"
import { Plus, ArrowLeft, Recycle, Factory, MapPin, Zap, Droplets, Trash2, Building2, ChevronRight, RotateCcw, Leaf, Package, Activity, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import type { Project, Scenario } from "@/lib/lca-context"
import { METALS_DATA, Stage } from "@/lib/metals-data"

interface ProjectDetailPageProps {
  project: Project
  onNavigate: (view: any) => void
  onSelectScenario: (scenario: Scenario) => void
  onCreateScenario?: () => void
}

// Stage type color mappings
const STAGE_COLORS: Record<string, { bg: string; light: string; text: string; border: string }> = {
  extraction: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  beneficiation: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  smelting: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  refining: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  manufacturing: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  use: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  eol: { bg: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  recycling: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
}

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  extraction: Package,
  beneficiation: Activity,
  smelting: Factory,
  refining: Sparkles,
  manufacturing: Building2,
  use: Target,
  eol: Trash2,
  recycling: Recycle
}

export default function ProjectDetailPage({
  project,
  onNavigate,
  onSelectScenario,
  onCreateScenario,
}: ProjectDetailPageProps) {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [activeTab, setActiveTab] = useState<string>("scenarios")
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)

  // Find the metal data for this project
  const projectMetal = useMemo(() => {
    const metalName = project?.metal?.toLowerCase() || ''
    return METALS_DATA.find(m => 
      m.name.toLowerCase() === metalName || 
      m.id === metalName ||
      m.symbol.toLowerCase() === metalName
    )
  }, [project])

  const selectedOre = projectMetal?.ores?.[0]
  const selectedRoute = selectedOre?.processingRoutes?.[0]

  // Calculate lifecycle metrics
  const lifecycleMetrics = useMemo(() => {
    if (!selectedRoute) return null
    const stages = selectedRoute.stages
    const totalCarbon = stages.reduce((sum, s) => sum + (s.metrics?.carbonEmissions || 0), 0)
    const totalEnergy = stages.reduce((sum, s) => sum + (s.metrics?.energyConsumption || 0), 0)
    const totalWater = stages.reduce((sum, s) => sum + (s.metrics?.waterUsage || 0), 0)
    const circularLoops = stages.flatMap(s => (s.circularLoops || []))
    const carbonSaved = circularLoops.reduce((sum, loop) => sum + loop.carbonSavings, 0)
    
    return { 
      totalCarbon, 
      totalEnergy, 
      totalWater, 
      circularLoopsCount: circularLoops.length,
      carbonSaved,
      circularityScore: selectedRoute.circularityScore || 0,
      stageCount: stages.length
    }
  }, [selectedRoute])

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const hasScenarios = project.scenarios && project.scenarios.length > 0

  return (
    <div className="h-full bg-gradient-to-br from-white via-emerald-50/30 to-white p-8 space-y-6 overflow-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate("projects")} className="p-2 hover:bg-emerald-50 rounded-lg transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-800">{project.name}</h1>
              {projectMetal && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm px-3 py-1">
                  {projectMetal.symbol} • {projectMetal.name}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 mt-1">
              {project.region} • {project.status}
            </p>
          </div>
        </div>
        <Button onClick={onCreateScenario} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 gap-2">
          <Plus className="w-4 h-4" />
          New Scenario
        </Button>
      </div>

      {/* Project Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Metal</p>
          <p className="text-lg font-bold text-slate-800">{project.metal}</p>
        </Card>
        <Card className="p-4 bg-white border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Region</p>
          <p className="text-lg font-bold text-slate-800">{project.region}</p>
        </Card>
        <Card className="p-4 bg-white border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Scenarios</p>
          <p className="text-lg font-bold text-slate-800">{project.scenarios?.length || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
          <p className="text-lg font-bold text-slate-800 capitalize">{project.status}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm hover:shadow-md transition-all">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Circularity</p>
          <p className="text-lg font-bold text-emerald-700">{lifecycleMetrics?.circularityScore || 0}%</p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-emerald-100">
          <TabsTrigger value="scenarios" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <Recycle className="w-4 h-4 mr-2" />
            Life Cycle
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Carbon Metrics
          </TabsTrigger>
        </TabsList>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="mt-6">
          {!hasScenarios ? (
            <Card className="p-8 bg-white border-emerald-200 border-dashed text-center">
              <Recycle className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No scenarios yet</h3>
              <p className="text-slate-500 mb-4">Create a scenario to start analysing this project.</p>
              <Button onClick={onCreateScenario} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Scenario
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Scenario List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                  Scenarios ({project.scenarios.length})
                </p>
                {project.scenarios.map((scenario) => (
                  <Card
                    key={scenario.id}
                    onClick={() => {
                      setSelectedScenario(scenario)
                      onSelectScenario(scenario)
                    }}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedScenario?.id === scenario.id
                        ? "bg-emerald-50 border-emerald-500 shadow-md"
                        : "bg-white border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">{scenario.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{scenario.isBaseline ? "Baseline" : "Circular"}</p>
                  </Card>
                ))}
              </div>

              {/* Scenario Detail */}
              <div className="lg:col-span-3">
                {selectedScenario ? (
                  <Card className="p-6 bg-white border-emerald-100">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-50">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="process-flow">Process Flow</TabsTrigger>
                        <TabsTrigger value="results">Results</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Scenario Name</p>
                            <p className="text-sm text-slate-800 font-medium">{selectedScenario.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Type</p>
                            <Badge className={selectedScenario.isBaseline ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"}>
                              {selectedScenario.isBaseline ? "Baseline" : "Circular"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Status</p>
                            <p className="text-sm text-slate-800 capitalize">{selectedScenario.status}</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="process-flow" className="space-y-4 mt-4">
                        <p className="text-sm text-slate-500">Process flow editor - connect to Life Cycle tab for detailed view</p>
                        <Button variant="outline" onClick={() => setActiveTab('lifecycle')} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          <Recycle className="w-4 h-4 mr-2" />
                          View Full Life Cycle
                        </Button>
                      </TabsContent>

                      <TabsContent value="results" className="space-y-4 mt-4">
                        {selectedScenario.results ? (
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 bg-red-50 border-red-100">
                              <p className="text-xs font-semibold text-red-600 mb-1">GWP (kg CO₂e)</p>
                              <p className="text-2xl font-bold text-red-700">{selectedScenario.results.gwp.toFixed(2)}</p>
                            </Card>
                            <Card className="p-4 bg-amber-50 border-amber-100">
                              <p className="text-xs font-semibold text-amber-600 mb-1">Energy (MJ)</p>
                              <p className="text-2xl font-bold text-amber-700">{selectedScenario.results.energy.toFixed(2)}</p>
                            </Card>
                            <Card className="p-4 bg-emerald-50 border-emerald-100">
                              <p className="text-xs font-semibold text-emerald-600 mb-1">Recycled Content</p>
                              <p className="text-2xl font-bold text-emerald-700">{selectedScenario.results.recycledContent.toFixed(1)}%</p>
                            </Card>
                            <Card className="p-4 bg-blue-50 border-blue-100">
                              <p className="text-xs font-semibold text-blue-600 mb-1">Recovery Rate</p>
                              <p className="text-2xl font-bold text-blue-700">{selectedScenario.results.recoveryRate.toFixed(1)}%</p>
                            </Card>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No results available yet. Run the analysis to generate results.</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </Card>
                ) : (
                  <Card className="p-8 bg-white border-emerald-100 text-center">
                    <p className="text-slate-500">Select a scenario from the left to view details.</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Life Cycle Tab */}
        <TabsContent value="lifecycle" className="mt-6">
          {selectedRoute ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lifecycle Flow */}
              <div className="lg:col-span-2">
                <Card className="border-emerald-100 bg-white overflow-hidden">
                  <CardHeader className="pb-2 border-b border-emerald-50">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Recycle className="w-5 h-5 text-emerald-600" />
                      {project.metal} Life Cycle • {selectedRoute.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="relative space-y-4 pl-8 border-l-2 border-emerald-200 ml-4">
                        {selectedRoute.stages.map((stage, index) => {
                          const colors = STAGE_COLORS[stage.type] || STAGE_COLORS.extraction
                          const StageIcon = STAGE_ICONS[stage.type] || Factory
                          const isSelected = selectedStage?.id === stage.id
                          
                          return (
                            <div key={stage.id} className="relative">
                              {/* Node */}
                              <div className={`absolute -left-[41px] top-4 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${colors.bg}`}>
                                <StageIcon className="w-4 h-4 text-white" />
                              </div>
                              
                              {/* Circular Loop Indicator */}
                              {stage.circularLoops && stage.circularLoops.length > 0 && (
                                <div className="absolute -left-16 top-8 text-emerald-500">
                                  <RotateCcw className="w-5 h-5" />
                                </div>
                              )}
                              
                              {/* Stage Card */}
                              <Card 
                                className={`overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                                  isSelected ? 'ring-2 ring-emerald-500 shadow-lg' : 'border-slate-200 hover:border-emerald-300'
                                }`}
                                onClick={() => setSelectedStage(isSelected ? null : stage)}
                              >
                                <div className={`h-1 w-full ${colors.bg}`} />
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
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
                                      </div>
                                      <h3 className="text-base font-semibold text-slate-800">{stage.name}</h3>
                                      <p className="text-sm text-slate-500 line-clamp-1">{stage.description}</p>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'rotate-90 text-emerald-600' : 'text-slate-300'}`} />
                                  </div>

                                  {/* Metrics Row */}
                                  {stage.metrics && (
                                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
                                      <div className="text-center p-1.5 rounded bg-red-50">
                                        <div className="text-xs text-red-600 font-medium">{stage.metrics.carbonEmissions.toLocaleString()}</div>
                                        <div className="text-[10px] text-red-500">kg CO₂</div>
                                      </div>
                                      <div className="text-center p-1.5 rounded bg-amber-50">
                                        <div className="text-xs text-amber-600 font-medium">{(stage.metrics.energyConsumption/1000).toFixed(1)}</div>
                                        <div className="text-[10px] text-amber-500">GJ</div>
                                      </div>
                                      <div className="text-center p-1.5 rounded bg-blue-50">
                                        <div className="text-xs text-blue-600 font-medium">{stage.metrics.waterUsage}</div>
                                        <div className="text-[10px] text-blue-500">m³</div>
                                      </div>
                                      <div className="text-center p-1.5 rounded bg-slate-50">
                                        <div className="text-xs text-slate-600 font-medium">{stage.metrics.wasteGenerated}</div>
                                        <div className="text-[10px] text-slate-500">kg waste</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Expanded Details */}
                                  {isSelected && (
                                    <div className="mt-4 pt-4 border-t border-emerald-100 space-y-3">
                                      {stage.facility && (
                                        <div className="p-3 bg-emerald-50 rounded-lg">
                                          <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm mb-1">
                                            <Building2 className="w-4 h-4" />
                                            {stage.facility.name}
                                          </div>
                                          <div className="text-xs text-slate-600">
                                            {stage.facility.location}, {stage.facility.country}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div>
                                        <span className="text-xs text-slate-500 block mb-1">Inputs</span>
                                        <div className="flex flex-wrap gap-1">
                                          {stage.inputs.map(i => (
                                            <Badge key={i} variant="secondary" className="text-xs bg-slate-100">{i}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <span className="text-xs text-slate-500 block mb-1">Outputs</span>
                                        <div className="flex flex-wrap gap-1">
                                          {stage.outputs.map(o => (
                                            <Badge key={o} className="text-xs bg-amber-50 text-amber-700">{o}</Badge>
                                          ))}
                                        </div>
                                      </div>

                                      {stage.circularLoops && stage.circularLoops.length > 0 && (
                                        <div>
                                          <span className="text-xs text-emerald-600 font-medium block mb-1">Circular Flows</span>
                                          {stage.circularLoops.map((loop, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs bg-emerald-50 p-2 rounded mb-1">
                                              <RotateCcw className="w-3 h-3 text-emerald-600" />
                                              <span className="text-slate-600 flex-1">{loop.materialFlow}</span>
                                              <Badge className="bg-green-100 text-green-700 text-[10px]">
                                                -{loop.carbonSavings} kg CO₂
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
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
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Ore Info */}
                <Card className="border-emerald-100 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-600" />
                      Ore: {selectedOre?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs block">Mineralogy</span>
                      <span className="font-medium text-slate-800">{selectedOre?.mineralogy}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Grade Range</span>
                      <span className="font-medium text-slate-800">{selectedOre?.gradeRange}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Regions</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedOre?.regions.map(r => (
                          <Badge key={r} variant="outline" className="text-xs border-emerald-200">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Route Metrics */}
                {lifecycleMetrics && (
                  <Card className="border-emerald-100 bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">Route Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Total Carbon</span>
                        <span className="font-bold text-red-600">{(lifecycleMetrics.totalCarbon/1000).toFixed(1)} t CO₂e</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Total Energy</span>
                        <span className="font-bold text-amber-600">{(lifecycleMetrics.totalEnergy/1000).toFixed(0)} GJ</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Water Usage</span>
                        <span className="font-bold text-blue-600">{lifecycleMetrics.totalWater.toFixed(1)} m³</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Circular Loops</span>
                        <span className="font-bold text-emerald-600">{lifecycleMetrics.circularLoopsCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Carbon Saved</span>
                        <span className="font-bold text-green-600">{lifecycleMetrics.carbonSaved.toLocaleString()} kg</span>
                      </div>
                      <div className="pt-3 border-t border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-emerald-700 font-medium">Circularity Score</span>
                          <span className="font-bold text-emerald-700">{lifecycleMetrics.circularityScore}%</span>
                        </div>
                        <Progress value={lifecycleMetrics.circularityScore} className="h-2 bg-emerald-100" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card className="p-8 bg-white border-emerald-100 text-center">
              <Factory className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Life Cycle Data</h3>
              <p className="text-slate-500">Life cycle data not available for {project.metal}. Try Aluminium, Copper, or Steel.</p>
            </Card>
          )}
        </TabsContent>

        {/* Carbon Metrics Tab */}
        <TabsContent value="metrics" className="mt-6">
          {lifecycleMetrics && selectedRoute ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Carbon Breakdown by Stage */}
              <Card className="lg:col-span-2 border-emerald-100 bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Carbon Emissions by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedRoute.stages.filter(s => s.metrics?.carbonEmissions).map(stage => {
                      const percentage = ((stage.metrics?.carbonEmissions || 0) / lifecycleMetrics.totalCarbon) * 100
                      const colors = STAGE_COLORS[stage.type] || STAGE_COLORS.extraction
                      return (
                        <div key={stage.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{stage.name}</span>
                            <span className="font-medium text-slate-800">{stage.metrics?.carbonEmissions.toLocaleString()} kg CO₂e</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors.bg} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 text-right">{percentage.toFixed(1)}% of total</div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader>
                  <CardTitle className="text-lg text-emerald-800">Sustainability Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-emerald-100">
                    <div className="text-3xl font-bold text-red-600">{(lifecycleMetrics.totalCarbon/1000).toFixed(2)}</div>
                    <div className="text-sm text-slate-600">tonnes CO₂e per tonne {project.metal}</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-emerald-100">
                    <div className="text-3xl font-bold text-green-600">{lifecycleMetrics.carbonSaved.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">kg CO₂e saved via circular loops</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-100 rounded-lg">
                    <div className="text-3xl font-bold text-emerald-700">{lifecycleMetrics.circularityScore}%</div>
                    <div className="text-sm text-emerald-600">Circularity Score</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 bg-white border-emerald-100 text-center">
              <p className="text-slate-500">Carbon metrics not available for this project.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
