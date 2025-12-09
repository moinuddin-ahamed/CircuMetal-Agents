"use client"

import { useState } from "react"
import { Search, Plus, Folder, MoreVertical, Edit, Trash2, Loader2, Calendar, MapPin, Layers, Recycle, Sparkles, ChevronRight, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Project } from "@/lib/lca-context"
import { METALS_DATA } from "@/lib/metals-data"

interface ProjectsPageProps {
  projects: Project[] // Keeping this for compatibility but will use fetched data
  onSelectProject: (project: Project) => void
  onNavigate: (view: any) => void
}

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

// Group metals by category
const metalsByCategory = METALS_DATA.reduce((acc, metal) => {
  if (!acc[metal.category]) acc[metal.category] = []
  acc[metal.category].push(metal)
  return acc
}, {} as Record<string, typeof METALS_DATA>)

const REGIONS = [
  "India",
  "Europe",
  "North America",
  "China",
  "Australia",
  "South America",
  "Africa",
  "Southeast Asia",
  "Middle East",
  "Global Average"
]

export default function ProjectsPage({ projects: initialProjects, onSelectProject, onNavigate }: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    metal: "Aluminium",
    ore: "",
    processingRoute: "",
    region: "India",
    status: "in-progress"
  })

  const queryClient = useQueryClient()

  // Get selected metal details
  const selectedMetal = METALS_DATA.find(m => m.name === formData.metal)
  const selectedOre = selectedMetal?.ores.find(o => o.id === formData.ore)
  const selectedRoute = selectedOre?.processingRoutes.find(r => r.id === formData.processingRoute)

  // Fetch projects
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      return response.json()
    }
  })

  const projects = projectsData?.projects || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newProject: any) => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      })
      if (!response.ok) throw new Error("Failed to create project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch(`${API_URL}/api/projects/${project.id || project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      })
      if (!response.ok) throw new Error("Failed to update project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const handleSubmit = () => {
    if (editingProject) {
      updateMutation.mutate({ 
        ...formData, 
        id: editingProject.id || editingProject._id,
        ore: formData.ore,
        processingRoute: formData.processingRoute
      })
    } else {
      createMutation.mutate({
        ...formData,
        created_at: new Date().toISOString(),
        scenarios: [],
        ore: formData.ore,
        processingRoute: formData.processingRoute
      })
    }
  }

  const handleEdit = (project: any) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || "",
      metal: project.metal || "Aluminium",
      ore: project.ore || "",
      processingRoute: project.processingRoute || "",
      region: project.region || "India",
      status: project.status || "in-progress"
    })
    setWizardStep(1)
    setIsDialogOpen(true)
  }

  const handleDelete = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate(projectId)
    }
  }

  const resetForm = () => {
    setEditingProject(null)
    setWizardStep(1)
    setFormData({
      name: "",
      description: "",
      metal: "Aluminium",
      ore: "",
      processingRoute: "",
      region: "India",
      status: "in-progress"
    })
  }

  const canProceedStep1 = formData.name.trim().length > 0
  const canProceedStep2 = formData.metal.length > 0
  const canSubmit = canProceedStep1 && canProceedStep2 && formData.region.length > 0

  const filteredProjects = projects.filter((project: any) => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get circularity score for display
  const getProjectCircularity = (project: any) => {
    const metal = METALS_DATA.find(m => m.name.toLowerCase() === project.metal?.toLowerCase())
    const ore = metal?.ores?.[0]
    const route = ore?.processingRoutes?.[0]
    return route?.circularityScore || 0
  }

  return (
    <div className="h-full p-8 space-y-6 overflow-auto bg-gradient-to-br from-white via-emerald-50/20 to-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Folder className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h1>
            <p className="text-slate-500 mt-1 font-medium">Manage your metal LCA projects</p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true) }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-emerald-100 focus:border-emerald-300"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center border-emerald-100 border-dashed bg-white">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Recycle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No projects yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Create your first metal LCA project to start analyzing life cycles and sustainability metrics.
          </p>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project: any) => {
            const circularity = getProjectCircularity(project)
            return (
              <Card key={project.id || project._id} className="hover:shadow-lg transition-all duration-300 group border-emerald-100 bg-white overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {project.status}
                      </Badge>
                      {circularity > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <Recycle className="w-3 h-3 mr-1" />
                          {circularity}% circular
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelectProject(project)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(project.id || project._id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description || "No description"}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">{project.metal}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">{project.region}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-emerald-50">
                  <Button 
                    variant="ghost" 
                    className="w-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    onClick={() => onSelectProject(project)}
                  >
                    Open Project
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog - Multi-step Wizard */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editingProject ? (
                "Edit Project"
              ) : (
                <>
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {wizardStep}
                  </span>
                  {wizardStep === 1 ? "Project Details" : wizardStep === 2 ? "Select Metal & Ore" : "Review & Create"}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingProject 
                ? "Update your project details." 
                : wizardStep === 1 
                ? "Enter basic information about your LCA project."
                : wizardStep === 2
                ? "Choose the metal type, ore, and processing route for analysis."
                : "Review your project configuration before creating."}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          {!editingProject && (
            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step < wizardStep ? 'bg-emerald-500 text-white' :
                    step === wizardStep ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {step < wizardStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-0.5 mx-1 ${step < wizardStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Basic Details */}
          {(wizardStep === 1 || editingProject) && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Project Name *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Aluminium Production India 2024"
                  className="border-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the scope and objectives of this LCA project..."
                  className="border-emerald-200 focus:border-emerald-400 min-h-[100px]"
                />
              </div>
              {editingProject && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Metal Type</Label>
                      <Select value={formData.metal} onValueChange={(v) => setFormData({...formData, metal: v, ore: '', processingRoute: ''})}>
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(metalsByCategory).map(([category, metals]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase">{category}</div>
                              {metals.map(metal => (
                                <SelectItem key={metal.id} value={metal.name}>
                                  <span className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{metal.symbol}</span>
                                    {metal.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Region</Label>
                      <Select value={formData.region} onValueChange={(v) => setFormData({...formData, region: v})}>
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Metal & Ore Selection */}
          {wizardStep === 2 && !editingProject && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Metal Type *</Label>
                  <Select value={formData.metal} onValueChange={(v) => setFormData({...formData, metal: v, ore: '', processingRoute: ''})}>
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue placeholder="Select metal" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(metalsByCategory).map(([category, metals]) => (
                        <div key={category}>
                          <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase">{category}</div>
                          {metals.filter(m => m.ores.length > 0).map(metal => (
                            <SelectItem key={metal.id} value={metal.name}>
                              <span className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{metal.symbol}</span>
                                {metal.name}
                                {metal.ores.some(o => o.processingRoutes.length > 0) && (
                                  <Badge className="text-[10px] bg-emerald-50 text-emerald-600 ml-auto">Full LCA</Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Region *</Label>
                  <Select value={formData.region} onValueChange={(v) => setFormData({...formData, region: v})}>
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedMetal && selectedMetal.ores.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-700">Ore Type</Label>
                  <Select value={formData.ore} onValueChange={(v) => setFormData({...formData, ore: v, processingRoute: ''})}>
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue placeholder="Select ore type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetal.ores.map(ore => (
                        <SelectItem key={ore.id} value={ore.id}>
                          <span className="flex flex-col">
                            <span>{ore.name}</span>
                            <span className="text-xs text-slate-400">{ore.gradeRange}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedOre && selectedOre.processingRoutes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-700">Processing Route</Label>
                  <Select value={formData.processingRoute} onValueChange={(v) => setFormData({...formData, processingRoute: v})}>
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue placeholder="Select processing route (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOre.processingRoutes.map(route => (
                        <SelectItem key={route.id} value={route.id}>
                          <span className="flex items-center gap-2">
                            <span>{route.name}</span>
                            {route.circularityScore && (
                              <Badge className="text-[10px] bg-emerald-50 text-emerald-600">{route.circularityScore}% circular</Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedMetal && (
                <Card className="p-4 bg-emerald-50 border-emerald-100">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-emerald-800">{selectedMetal.name} ({selectedMetal.symbol})</p>
                      <p className="text-sm text-emerald-600">Category: {selectedMetal.category}</p>
                      {selectedOre && (
                        <p className="text-sm text-emerald-600 mt-1">
                          Ore: {selectedOre.name} • {selectedOre.gradeRange}
                        </p>
                      )}
                      {selectedRoute && (
                        <p className="text-sm text-emerald-600">
                          Route: {selectedRoute.name} • {selectedRoute.stages.length} stages
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {wizardStep === 3 && !editingProject && (
            <div className="space-y-4 py-4">
              <Card className="p-6 bg-white border-emerald-100">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500" />
                  Project Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Project Name</p>
                    <p className="font-medium text-slate-800">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Region</p>
                    <p className="font-medium text-slate-800">{formData.region}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Metal</p>
                    <p className="font-medium text-slate-800">{formData.metal}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ore Type</p>
                    <p className="font-medium text-slate-800">{selectedOre?.name || "Default"}</p>
                  </div>
                  {formData.description && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Description</p>
                      <p className="font-medium text-slate-800">{formData.description}</p>
                    </div>
                  )}
                </div>
              </Card>

              {selectedRoute && (
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-emerald-800">Life Cycle Preview</h4>
                    <Badge className="bg-emerald-100 text-emerald-700">{selectedRoute.stages.length} Stages</Badge>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {selectedRoute.stages.slice(0, 6).map((stage, i) => (
                      <div key={stage.id} className="flex items-center">
                        <div className="px-3 py-1.5 bg-white rounded-lg border border-emerald-200 text-xs text-slate-700 whitespace-nowrap">
                          {stage.name.split(' ').slice(0, 2).join(' ')}
                        </div>
                        {i < Math.min(selectedRoute.stages.length - 1, 5) && (
                          <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {selectedRoute.stages.length > 6 && (
                      <span className="text-xs text-emerald-600">+{selectedRoute.stages.length - 6} more</span>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!editingProject && wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep(s => s - 1)} className="border-emerald-200">
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-emerald-200">
              Cancel
            </Button>
            {editingProject ? (
              <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            ) : wizardStep < 3 ? (
              <Button 
                onClick={() => setWizardStep(s => s + 1)} 
                disabled={wizardStep === 1 ? !canProceedStep1 : !canProceedStep2}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createMutation.isPending || !canSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Sparkles className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
