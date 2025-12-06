"use client"

import { useState } from "react"
import { 
  FileText, ArrowLeft, RefreshCw, Calendar, Clock,
  ChevronRight, Download, Eye, Loader2, Search,
  Recycle, Zap, Droplets, BarChart3, CheckCircle,
  AlertCircle, Filter, SortAsc, SortDesc, FolderOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"

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
    setIsDialogOpen(true)
  }

  const getMCIColor = (mci: number) => {
    if (mci >= 0.8) return "text-green-600 bg-green-100"
    if (mci >= 0.5) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              LCA Reports
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage all generated Life Cycle Assessment reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm py-1 px-3">
              {reports.length} Reports
            </Badge>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="p-4 bg-card border-border mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by material, process, or run ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <div className="flex items-center gap-2">
                    <SortDesc className="w-4 h-4" />
                    Newest First
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
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
                key={report.id} 
                className="p-5 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => openReportDetail(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {report.run_id}
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
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(report.created_at)}
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

                      {/* Energy */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Energy</p>
                          <p className="text-sm font-semibold">
                            {report.lca_results?.energy_demand?.value || "N/A"} {report.lca_results?.energy_demand?.unit || ""}
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

                      {/* Location */}
                      <div className="flex items-center gap-2 ml-auto">
                        <Badge variant="secondary">
                          {report.location || "Unknown"}
                        </Badge>
                        <Badge variant="secondary">
                          {report.input_amount || "1 ton"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground ml-4" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Report Detail Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                Report Details
                {selectedReport && (
                  <Badge variant="outline" className="font-mono text-xs ml-2">
                    {selectedReport.run_id}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedReport && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
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

                  {/* LCA Results */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">LCA Results</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4 bg-orange-50 border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-5 h-5 text-orange-600" />
                          <p className="text-sm font-medium text-orange-800">Global Warming Potential</p>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">
                          {selectedReport.lca_results?.gwp_100?.value}
                        </p>
                        <p className="text-sm text-orange-700">
                          {selectedReport.lca_results?.gwp_100?.unit}
                        </p>
                      </Card>
                      <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                          <p className="text-sm font-medium text-blue-800">Energy Demand</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          {selectedReport.lca_results?.energy_demand?.value}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedReport.lca_results?.energy_demand?.unit}
                        </p>
                      </Card>
                      <Card className="p-4 bg-cyan-50 border-cyan-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets className="w-5 h-5 text-cyan-600" />
                          <p className="text-sm font-medium text-cyan-800">Water Consumption</p>
                        </div>
                        <p className="text-2xl font-bold text-cyan-900">
                          {selectedReport.lca_results?.water_consumption?.value}
                        </p>
                        <p className="text-sm text-cyan-700">
                          {selectedReport.lca_results?.water_consumption?.unit}
                        </p>
                      </Card>
                    </div>
                  </div>

                  {/* Circularity Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Circularity Metrics</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <Card className="p-4 bg-green-50 border-green-200 text-center">
                        <Recycle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-900">
                          {selectedReport.circularity_results?.mci?.toFixed(2)}
                        </p>
                        <p className="text-xs text-green-700">MCI Score</p>
                      </Card>
                      <Card className="p-4 bg-muted/50 text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {selectedReport.circularity_results?.recycled_content}%
                        </p>
                        <p className="text-xs text-muted-foreground">Recycled Content</p>
                      </Card>
                      <Card className="p-4 bg-muted/50 text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {selectedReport.circularity_results?.eol_recycling_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground">EOL Recycling Rate</p>
                      </Card>
                      <Card className="p-4 bg-muted/50 text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {selectedReport.circularity_results?.resource_efficiency}%
                        </p>
                        <p className="text-xs text-muted-foreground">Resource Efficiency</p>
                      </Card>
                    </div>
                  </div>

                  {/* Scenarios */}
                  {selectedReport.scenarios && selectedReport.scenarios.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Scenarios</h3>
                      <div className="space-y-2">
                        {selectedReport.scenarios.map((scenario, idx) => (
                          <Card key={idx} className="p-3 bg-muted/50">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-foreground">{scenario.scenario_name}</p>
                                <p className="text-sm text-muted-foreground">{scenario.description}</p>
                              </div>
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {scenario.predicted_impact_reduction}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compliance */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Compliance Status</h3>
                    <Card className={`p-4 ${selectedReport.compliance?.compliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                        {selectedReport.compliance?.compliant ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-800">Compliant</p>
                              <p className="text-sm text-green-700">
                                This process meets all regulatory requirements
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <div>
                              <p className="font-semibold text-red-800">Non-Compliant</p>
                              <p className="text-sm text-red-700">
                                Review flagged issues for compliance
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Full Report Link */}
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full gap-2">
                      <Eye className="w-4 h-4" />
                      View Full Markdown Report
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
