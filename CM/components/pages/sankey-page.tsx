"use client"

import { useState, useEffect } from "react"
import { useLCA } from "@/lib/lca-context"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle } from "lucide-react"

export default function SankeyPage() {
  const { projects, currentProject, setCurrentProject } = useLCA()
  const [visualizations, setVisualizations] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string>("")

  useEffect(() => {
    // Fetch visualizations when project changes, or fetch all if no project selected
    fetchVisualizations(currentProject?.id || null)
  }, [currentProject])

  useEffect(() => {
    if (selectedId && visualizations.length > 0) {
      const viz = visualizations.find(v => v.id === selectedId)
      if (viz) {
        setHtmlContent(viz.html_content)
      }
    }
  }, [selectedId, visualizations])

  const fetchVisualizations = async (projectId: string | null) => {
    setLoading(true)
    try {
      // Build URL with optional project_id filter
      let url = `/api/visualizations?diagram_type=sankey&limit=20`
      if (projectId) {
        url += `&project_id=${projectId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (data.visualizations && data.visualizations.length > 0) {
        setVisualizations(data.visualizations)
        setSelectedId(data.visualizations[0].id)
      } else {
        setVisualizations([])
        setHtmlContent("")
      }
    } catch (error) {
      console.error("Failed to fetch visualizations", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full p-8 space-y-6 overflow-auto bg-slate-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Sankey Diagrams</h1>
          <p className="text-slate-500 mt-1">
            {currentProject 
              ? `Material and energy flow visualization for ${currentProject.name}` 
              : visualizations.length > 0 
                ? "Showing all available Sankey diagrams" 
                : "Select a project or run an analysis to generate Sankey diagrams"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Project Selector */}
          <Select 
            value={currentProject?.id || ""} 
            onValueChange={(val) => {
              const proj = projects.find(p => p.id === val)
              if (proj) setCurrentProject(proj)
            }}
          >
            <SelectTrigger className="w-[250px] bg-white">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Diagram Selector (only if visualizations exist) */}
          {visualizations.length > 0 && (
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[250px] bg-white">
                <SelectValue placeholder="Select diagram" />
              </SelectTrigger>
              <SelectContent>
                {visualizations.map((viz) => (
                  <SelectItem key={viz.id} value={viz.id}>
                    {viz.metal_name || "Unknown"} - {new Date(viz.timestamp).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : htmlContent ? (
        <Card className="overflow-hidden bg-white shadow-sm border-slate-200 h-[calc(100vh-200px)]">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title="Sankey Visualization"
          />
        </Card>
      ) : visualizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-2xl border border-dashed border-slate-200">
          <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">No Sankey diagrams available</p>
          <p className="text-sm text-slate-400 mt-1">Run an analysis to generate visualizations.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">Select a diagram from the dropdown above.</p>
        </div>
      )}
    </div>
  )
}
