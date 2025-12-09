"use client"

import React, { useState } from "react"
import { 
  FileText, ArrowLeft, RefreshCw, Calendar, Clock,
  ChevronRight, Download, Eye, Loader2, Search,
  Recycle, Zap, Droplets, BarChart3, CheckCircle,
  AlertCircle, Filter, SortAsc, SortDesc, FolderOpen,
  Trash2, Edit, Plus, Save, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ReportsPageProps {
  onBack: () => void
}

interface Report {
  id: string
  run_id: string
  project_id?: string  // Linked project
  title: string
  material: string
  process_description: string
  input_amount: string
  location: string
  report_markdown: string
  summary: string
  lca_results: {
    gwp_100: { value: number; unit: string }
    energy_demand: { value: number; unit: string }
    water_consumption: { value: number; unit: string }
  }
  circularity_results: {
    mci: number
    recycled_content: number
    eol_recycling_rate: number
    resource_efficiency: number
  }
  scenarios: Array<{
    scenario_name: string
    description: string
    predicted_impact_reduction: string
  }>
  compliance: {
    compliant: boolean
    flags: string[]
  }
  created_at: string
  updated_at: string
}

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

export default function ReportsPage({ onBack }: ReportsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<Report>>({})

  const queryClient = useQueryClient()

  // Fetch reports from API
  const { data: reportsData, isLoading, error, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/reports`)
      if (!response.ok) throw new Error("Failed to fetch reports")
      return response.json()
    },
  })

  // Fetch projects to map IDs to names
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      return response.json()
    },
  })

  // Create a map of project IDs to names
  const projectsMap = new Map<string, string>()
  projectsData?.projects?.forEach((p: { id: string; name: string }) => {
    projectsMap.set(p.id, p.name)
  })

  // Helper to get project name by ID
  const getProjectName = (projectId?: string): string | null => {
    if (!projectId) return null
    return projectsMap.get(projectId) || null
  }

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete report")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      setIsDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (report: Partial<Report>) => {
      const response = await fetch(`${API_URL}/api/reports/${report.id || (report as any)._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      })
      if (!response.ok) throw new Error("Failed to update report")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      setIsDialogOpen(false)
      setIsEditMode(false)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (report: Partial<Report>) => {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...report,
            created_at: new Date().toISOString(),
            lca_results: report.lca_results || { gwp_100: { value: 0, unit: "kg CO2e" } },
            circularity_results: report.circularity_results || { mci: 0 },
            compliance: report.compliance || { compliant: true, flags: [] }
        }),
      })
      if (!response.ok) throw new Error("Failed to create report")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      setIsDialogOpen(false)
      setIsEditMode(false)
    },
  })

  const reports: Report[] = reportsData?.reports || []

  // Filter and sort reports
  const filteredReports = reports
    .filter(report => {
      const query = searchQuery.toLowerCase()
      return (
        report.material?.toLowerCase().includes(query) ||
        report.process_description?.toLowerCase().includes(query) ||
        report.run_id?.toLowerCase().includes(query) ||
        report.title?.toLowerCase().includes(query) ||
        getProjectName(report.project_id)?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const openReportDetail = (report: Report) => {
    setSelectedReport(report)
    setFormData(report)
    setIsEditMode(false)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setSelectedReport(null)
    setFormData({
      material: "",
      process_description: "",
      location: "Europe",
      input_amount: "1 ton"
    })
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  const handleDelete = (reportId: string) => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteMutation.mutate(reportId)
    }
  }

  const handleSave = () => {
    if (selectedReport) {
      updateMutation.mutate({ ...formData, id: selectedReport.id || (selectedReport as any)._id })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getMCIColor = (mci: number) => {
    if (mci >= 0.8) return "text-green-600 bg-green-100"
    if (mci >= 0.5) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  // Helper function to format inline markdown (bold, italic, code)
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return text
    
    // Split by code backticks first
    const parts = text.split(/(`[^`]+`)/)
    
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-emerald-50 rounded-md text-xs font-mono text-emerald-800 border border-emerald-100">{part.slice(1, -1)}</code>
      }
      
      // Handle bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/)
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${i}-${j}`} className="font-semibold text-emerald-900">{bp.slice(2, -2)}</strong>
        }
        return <span key={`${i}-${j}`}>{bp}</span>
      })
    })
  }

  // Render markdown content with proper formatting
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return <p className="text-muted-foreground italic">No report content available</p>
    
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentParagraph: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const content = currentParagraph.join(' ')
        elements.push(
          <p key={elements.length} className="text-slate-700 leading-relaxed mb-3">
            {formatInlineMarkdown(content)}
          </p>
        )
        currentParagraph = []
      }
    }
    
    lines.forEach((line) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={elements.length} className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto mb-4">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          )
          codeBlockContent = []
          inCodeBlock = false
        } else {
          flushParagraph()
          inCodeBlock = true
        }
        return
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }
      
      // Headers
      if (line.startsWith('#### ')) {
        flushParagraph()
        elements.push(<h5 key={elements.length} className="font-semibold text-emerald-800 text-sm mt-3 mb-2">{line.slice(5)}</h5>)
        return
      }
      if (line.startsWith('### ')) {
        flushParagraph()
        elements.push(<h4 key={elements.length} className="font-semibold text-emerald-900 text-base mt-4 mb-2 flex items-center gap-2"><span className="w-1 h-4 bg-emerald-400 rounded-full"></span>{line.slice(4)}</h4>)
        return
      }
      if (line.startsWith('## ')) {
        flushParagraph()
        elements.push(<h3 key={elements.length} className="font-semibold text-emerald-900 text-lg mt-5 mb-3 pb-2 border-b border-emerald-100">{line.slice(3)}</h3>)
        return
      }
      if (line.startsWith('# ')) {
        flushParagraph()
        elements.push(<h2 key={elements.length} className="font-bold text-emerald-900 text-xl mt-6 mb-4 pb-2 border-b-2 border-emerald-200">{line.slice(2)}</h2>)
        return
      }
      
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        flushParagraph()
        elements.push(
          <div key={elements.length} className="flex gap-3 ml-2 mb-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span className="text-slate-700 flex-1">{formatInlineMarkdown(line.slice(2))}</span>
          </div>
        )
        return
      }
      
      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s(.*)/)
      if (numMatch) {
        flushParagraph()
        elements.push(
          <div key={elements.length} className="flex gap-3 ml-2 mb-2">
            <span className="text-emerald-600 font-medium min-w-[1.5rem] bg-emerald-50 rounded px-1.5 text-center text-sm">{numMatch[1]}.</span>
            <span className="text-slate-700 flex-1">{formatInlineMarkdown(numMatch[2])}</span>
          </div>
        )
        return
      }
      
      // Horizontal rule
      if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
        flushParagraph()
        elements.push(<hr key={elements.length} className="my-4 border-emerald-100" />)
        return
      }
      
      // Empty line = paragraph break
      if (line.trim() === '') {
        flushParagraph()
        return
      }
      
      // Regular text - accumulate into paragraph
      currentParagraph.push(line)
    })
    
    // Flush remaining paragraph
    flushParagraph()
    
    return <>{elements}</>
  }

  // Get markdown content from report (handles different field names)
  const getReportMarkdown = (report: Report): string => {
    return report.report_markdown || (report as any).content || ''
  }

  return (
    <div className="h-full bg-gradient-to-br from-white via-emerald-50/20 to-white p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">LCA Reports</h1>
                <p className="text-slate-500 mt-0.5 font-medium">
                  View and manage all generated Life Cycle Assessment reports
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              New Report
            </Button>
            <Button variant="outline" onClick={() => refetch()} className="gap-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="p-5 bg-white border-slate-100 mb-6 rounded-2xl shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by material, process, or run ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-slate-50 border-slate-100 rounded-xl focus:border-emerald-300 focus:ring-emerald-100"
              />
            </div>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
              <SelectTrigger className="w-40 h-11 border-slate-100 rounded-xl focus:border-emerald-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100">
                <SelectItem value="newest" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <SortDesc className="w-4 h-4" />
                    Newest First
                  </div>
                </SelectItem>
                <SelectItem value="oldest" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <SortAsc className="w-4 h-4" />
                    Oldest First
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Reports List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        ) : error ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Reports</h3>
              <p className="text-muted-foreground mb-4">
                There was an error connecting to the server.
              </p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? "No Matching Reports" : "No Reports Yet"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try adjusting your search query."
                  : "Run an analysis to generate your first LCA report."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <Card 
                key={report.id || (report as any)._id} 
                className="p-5 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => openReportDetail(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {report.run_id || "MANUAL"}
                      </Badge>
                      {report.project_id && getProjectName(report.project_id) && (
                        <Badge variant="secondary" className="text-xs">
                          <FolderOpen className="w-3 h-3 mr-1" />
                          {getProjectName(report.project_id)}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(report.created_at)}
                      </div>
                      {report.compliance?.compliant && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Compliant
                        </Badge>
                      )}
                    </div>

                    {/* Title and Material */}
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {report.material || "Unknown Material"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                      {report.process_description || "No description"}
                    </p>

                    {/* Metrics Row */}
                    <div className="flex items-center gap-6">
                      {/* GWP */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">GWP</p>
                          <p className="text-sm font-semibold">
                            {report.lca_results?.gwp_100?.value || "N/A"} {report.lca_results?.gwp_100?.unit || ""}
                          </p>
                        </div>
                      </div>

                      {/* MCI */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <Recycle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">MCI</p>
                          <p className={`text-sm font-semibold px-2 py-0.5 rounded ${getMCIColor(report.circularity_results?.mci || 0)}`}>
                            {report.circularity_results?.mci?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(report.id || (report as any)._id) }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Report Detail/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                {isEditMode ? (selectedReport ? "Edit Report" : "New Report") : "Report Details"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pr-4 pb-4">
                  {isEditMode ? (
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Material</Label>
                          <Input 
                            value={formData.material || ""} 
                            onChange={(e) => setFormData({...formData, material: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input 
                            value={formData.location || ""} 
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Process Description</Label>
                        <Textarea 
                          value={formData.process_description || ""} 
                          onChange={(e) => setFormData({...formData, process_description: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Input Amount</Label>
                        <Input 
                          value={formData.input_amount || ""} 
                          onChange={(e) => setFormData({...formData, input_amount: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    selectedReport && (
                      <div className="space-y-6 py-2">
                        {/* Overview */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Overview</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedReport.project_id && getProjectName(selectedReport.project_id) && (
                              <Card className="p-4 bg-primary/5 border-primary/20 col-span-2">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="w-5 h-5 text-primary" />
                                  <div>
                                    <p className="text-sm text-muted-foreground">Linked Project</p>
                                    <p className="font-semibold text-primary">{getProjectName(selectedReport.project_id)}</p>
                                  </div>
                                </div>
                              </Card>
                            )}
                            <Card className="p-4 bg-muted/50">
                              <p className="text-sm text-muted-foreground">Material</p>
                              <p className="font-semibold">{selectedReport.material}</p>
                            </Card>
                            <Card className="p-4 bg-muted/50">
                              <p className="text-sm text-muted-foreground">Input Amount</p>
                              <p className="font-semibold">{selectedReport.input_amount}</p>
                            </Card>
                            <Card className="p-4 bg-muted/50">
                              <p className="text-sm text-muted-foreground">Location</p>
                              <p className="font-semibold">{selectedReport.location}</p>
                            </Card>
                            <Card className="p-4 bg-muted/50">
                              <p className="text-sm text-muted-foreground">Generated</p>
                              <p className="font-semibold">
                                {formatDate(selectedReport.created_at)} at {formatTime(selectedReport.created_at)}
                              </p>
                            </Card>
                          </div>
                        </div>

                        {/* Process Description */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Process Description</h3>
                          <Card className="p-4 bg-muted/50">
                            <p className="text-foreground">{selectedReport.process_description}</p>
                          </Card>
                        </div>

                        {/* LCA Results Summary */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">LCA Results</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <Card className="p-4 bg-orange-50 border-orange-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5 text-orange-600" />
                                <p className="text-sm font-medium text-orange-800">Global Warming Potential</p>
                              </div>
                              <p className="text-2xl font-bold text-orange-900">
                                {selectedReport.lca_results?.gwp_100?.value || 'N/A'}
                              </p>
                              <p className="text-sm text-orange-700">
                                {selectedReport.lca_results?.gwp_100?.unit || ''}
                              </p>
                            </Card>
                            <Card className="p-4 bg-blue-50 border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                <p className="text-sm font-medium text-blue-800">Energy Demand</p>
                              </div>
                              <p className="text-2xl font-bold text-blue-900">
                                {selectedReport.lca_results?.energy_demand?.value || 'N/A'}
                              </p>
                              <p className="text-sm text-blue-700">
                                {selectedReport.lca_results?.energy_demand?.unit || ''}
                              </p>
                            </Card>
                            <Card className="p-4 bg-cyan-50 border-cyan-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Droplets className="w-5 h-5 text-cyan-600" />
                                <p className="text-sm font-medium text-cyan-800">Water Consumption</p>
                              </div>
                              <p className="text-2xl font-bold text-cyan-900">
                                {selectedReport.lca_results?.water_consumption?.value || 'N/A'}
                              </p>
                              <p className="text-sm text-cyan-700">
                                {selectedReport.lca_results?.water_consumption?.unit || ''}
                              </p>
                            </Card>
                          </div>
                        </div>

                        {/* Full Report Content (Markdown) */}
                        {getReportMarkdown(selectedReport) && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold">Full Report</h3>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const content = getReportMarkdown(selectedReport)
                                  const blob = new Blob([content], { type: 'text/markdown' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `report-${selectedReport.id || 'download'}.md`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  URL.revokeObjectURL(url)
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Markdown
                              </Button>
                            </div>
                            <Card className="p-6 bg-white border border-slate-200 shadow-sm">
                              <div className="prose prose-slate prose-sm max-w-none">
                                {renderMarkdown(getReportMarkdown(selectedReport))}
                              </div>
                            </Card>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : <Save className="w-4 h-4 mr-2" />}
                    Save Report
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                  <Button onClick={() => setIsEditMode(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Report
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
