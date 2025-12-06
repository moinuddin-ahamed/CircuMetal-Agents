"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Bot, RefreshCw, Terminal, 
  Activity, Clock, CheckCircle, XCircle,
  AlertTriangle, ChevronRight,
  Database, FileText, BarChart3,
  Shield, Recycle, Send, ArrowLeft, Loader2,
  MessageSquare, Settings, Info, Play, FolderOpen,
  Brain, Eye, Target, Download, FileDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface AgentsInterfaceProps {
  onBack: () => void
}

interface Agent {
  name: string
  description: string
  status: "idle" | "running" | "completed" | "error"
  icon: React.ElementType
  averageTime?: number
}

interface LogEntry {
  id: string
  timestamp: string
  agent: string
  level: "info" | "warning" | "error" | "success"
  message: string
  data?: Record<string, unknown>
}

interface Project {
  id: string
  name: string
  description: string
  material?: string
  status?: string
  created_at?: string
}

interface Report {
  id: string
  run_id: string
  project_id?: string
  created_at: string
  report_markdown?: string
  key_takeaways?: string[]
  explain_agent_output?: string
}

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

const AGENTS: Agent[] = [
  { name: "Data Agent", description: "Collects and validates LCI data", status: "idle", icon: Database, averageTime: 5 },
  { name: "Estimation Agent", description: "AI-powered parameter estimation", status: "idle", icon: Brain, averageTime: 6 },
  { name: "LCA Agent", description: "Life cycle impact assessment", status: "idle", icon: BarChart3, averageTime: 8 },
  { name: "Circularity Agent", description: "Material Circularity Indicator", status: "idle", icon: Recycle, averageTime: 4 },
  { name: "Scenario Agent", description: "What-if analyses", status: "idle", icon: Target, averageTime: 5 },
  { name: "Compliance Agent", description: "EU regulations check", status: "idle", icon: Shield, averageTime: 3 },
  { name: "Visualization Agent", description: "Charts and diagrams", status: "idle", icon: Eye, averageTime: 6 },
  { name: "Explain Agent", description: "Narrative LCA reports", status: "idle", icon: FileText, averageTime: 10 },
]

export default function AgentsInterface({ onBack }: AgentsInterfaceProps) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [chatMessage, setChatMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{role: "user" | "agent"; message: string; agent?: string; isStreaming?: boolean}>>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [isOrchestrationRunning, setIsOrchestrationRunning] = useState(false)
  const [orchestrationProgress, setOrchestrationProgress] = useState(0)
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [latestReport, setLatestReport] = useState<Report | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: healthData, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/health`)
      if (!response.ok) throw new Error("Backend not available")
      return response.json()
    },
    refetchInterval: 10000,
  })

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      return response.json()
    },
  })

  const { data: reportsData } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/reports`)
      if (!response.ok) throw new Error("Failed to fetch reports")
      return response.json()
    },
  })

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  const toggleAgentExpand = (name: string) => {
    const newExpanded = new Set(expandedAgents)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedAgents(newExpanded)
  }

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isChatLoading) return

    const userMessage = chatMessage.trim()
    setChatMessage("")
    setChatHistory(prev => [...prev, { role: "user", message: userMessage }])
    setIsChatLoading(true)
    setStreamingMessage("")
    
    try {
      // Use streaming endpoint for smooth UX
      const response = await fetch(`${API_URL}/api/agents/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      })
      
      if (!response.ok) throw new Error(`Failed to get response: ${response.status}`)
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullMessage = ""
      
      if (reader) {
        // Add streaming message placeholder
        setChatHistory(prev => [...prev, { 
          role: "agent", 
          message: "",
          agent: "CircuMetal AI",
          isStreaming: true
        }])
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.text) {
                  fullMessage += data.text
                  setStreamingMessage(fullMessage)
                  // Update the last message in history
                  setChatHistory(prev => {
                    const updated = [...prev]
                    if (updated.length > 0 && updated[updated.length - 1].isStreaming) {
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        message: fullMessage
                      }
                    }
                    return updated
                  })
                }
                if (data.done) {
                  // Finalize the message
                  setChatHistory(prev => {
                    const updated = [...prev]
                    if (updated.length > 0) {
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        isStreaming: false
                      }
                    }
                    return updated
                  })
                }
                if (data.error) {
                  throw new Error(data.error)
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      setChatHistory(prev => {
        // Remove streaming placeholder if exists
        const filtered = prev.filter(m => !m.isStreaming || m.message)
        return [...filtered, { 
          role: "agent", 
          message: `Connection error. Please try again.`,
          agent: "System"
        }]
      })
    } finally {
      setIsChatLoading(false)
      setStreamingMessage("")
    }
  }

  const getSelectedProject = (): Project | undefined => {
    return projectsData?.projects?.find((p: Project) => p.id === selectedProjectId)
  }

  const handleStartOrchestration = async () => {
    if (isOrchestrationRunning) return
    
    const selectedProject = getSelectedProject()
    
    setShowProjectDialog(false)
    setIsOrchestrationRunning(true)
    setOrchestrationProgress(0)
    setLogs([])
    setLatestReport(null)
    setAgents(prev => prev.map(agent => ({ ...agent, status: "idle" })))
    
    try {
      const requestBody = {
        project_id: selectedProjectId || undefined,
        process_description: selectedProject?.description || "Recycling of aluminium scrap to produce secondary aluminium ingots.",
        input_amount: "1 ton",
        material: selectedProject?.material || "Aluminium Scrap",
        energy_source: "Grid Electricity",
        location: "Europe"
      }
      
      const startResponse = await fetch(`${API_URL}/api/orchestration/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      
      const startData = await startResponse.json()
      if (!startData.success) {
        throw new Error(startData.error || "Failed to start orchestration")
      }
      
      const runId = startData.run_id
      setActiveRunId(runId)
      
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(`${API_URL}/api/orchestration/${runId}/status`)
          const statusData = await statusResponse.json()
          
          setOrchestrationProgress(statusData.progress || 0)
          setCurrentAgent(statusData.current_agent)
          
          if (statusData.current_agent) {
            setAgents(prev => prev.map(agent => {
              const agentNameLower = agent.name.toLowerCase().replace(" agent", "").replace(" ", "")
              const currentLower = statusData.current_agent.toLowerCase().replace("agent", "")
              if (agentNameLower.includes(currentLower) || currentLower.includes(agentNameLower)) {
                return { ...agent, status: "running" }
              }
              const completedLogs = statusData.logs?.filter(
                (l: any) => l.level === "success" && l.agent.toLowerCase().includes(agentNameLower)
              )
              if (completedLogs?.length > 0) {
                return { ...agent, status: "completed" }
              }
              return agent
            }))
          }
          
          if (statusData.logs && statusData.logs.length > 0) {
            const newLogs: LogEntry[] = statusData.logs.map((log: any, idx: number) => ({
              id: `${runId}-${idx}`,
              timestamp: log.timestamp,
              agent: log.agent,
              level: log.level as LogEntry["level"],
              message: log.message,
              data: log.data
            }))
            setLogs(newLogs)
          }
          
          if (statusData.status === "running" || statusData.status === "starting") {
            setTimeout(pollStatus, 1500)
          } else {
            setIsOrchestrationRunning(false)
            setCurrentAgent(null)
            
            if (statusData.status === "completed") {
              setAgents(prev => prev.map(agent => ({ ...agent, status: "completed" })))
              // Fetch the latest report
              fetchLatestReport(runId)
            } else if (statusData.status === "failed") {
              setAgents(prev => prev.map(agent => ({ ...agent, status: "error" })))
            }
          }
        } catch (error) {
          console.error("Polling error:", error)
          setIsOrchestrationRunning(false)
        }
      }
      
      setTimeout(pollStatus, 1000)
      
    } catch (error) {
      console.error("Orchestration error:", error)
      setIsOrchestrationRunning(false)
      setLogs(prev => [...prev, {
        id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agent: "System",
        level: "error",
        message: `Failed to start orchestration: ${error}`,
      }])
    }
  }

  const fetchLatestReport = async (runId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/reports`)
      const data = await response.json()
      const report = data.reports?.find((r: Report) => r.run_id === runId)
      if (report) {
        setLatestReport(report)
      }
    } catch (error) {
      console.error("Failed to fetch report:", error)
    }
  }

  const downloadReport = (report: Report, format: 'md' | 'json' | 'txt') => {
    let content = ''
    let filename = `LCA_Report_${report.run_id.slice(0, 8)}`
    let mimeType = 'text/plain'

    if (format === 'md') {
      content = report.report_markdown || report.explain_agent_output || 'No report content available'
      filename += '.md'
      mimeType = 'text/markdown'
    } else if (format === 'json') {
      content = JSON.stringify(report, null, 2)
      filename += '.json'
      mimeType = 'application/json'
    } else {
      content = report.explain_agent_output || report.report_markdown || 'No report content available'
      filename += '.txt'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Helper function to format inline markdown (bold, italic, code)
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return text
    
    // Split by code backticks first
    const parts = text.split(/(`[^`]+`)/)
    
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-gray-200 rounded text-sm font-mono text-gray-800">{part.slice(1, -1)}</code>
      }
      
      // Handle bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/)
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${i}-${j}`} className="font-semibold">{bp.slice(2, -2)}</strong>
        }
        return <span key={`${i}-${j}`}>{bp}</span>
      })
    })
  }

  const getStatusIcon = (status: Agent["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-300" />
    }
  }

  const getLogIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      case "success":
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      default:
        return <Info className="w-3.5 h-3.5 text-blue-500" />
    }
  }

  const isSystemOnline = !healthError && (healthData?.status === "ok" || healthData?.status === "healthy")
  const activeAgentsCount = agents.filter(a => a.status === "running").length
  const completedAgentsCount = agents.filter(a => a.status === "completed").length

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-gray-500 hover:text-gray-900 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">AI Agents</h1>
            <p className="text-gray-500 text-sm mt-0.5">Multi-agent LCA analysis system</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50">
              <div className={`w-2 h-2 rounded-full ${isSystemOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-600">
                {healthLoading ? "Connecting..." : isSystemOnline ? "Online" : "Offline"}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetchHealth()} 
              className="text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => setShowProjectDialog(true)} 
              disabled={isOrchestrationRunning || !isSystemOnline}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isOrchestrationRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {isOrchestrationRunning && (
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">
                  {currentAgent || "Starting..."}
                </span>
              </div>
              <span className="text-sm text-gray-500">{orchestrationProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${orchestrationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download Report Section */}
        {latestReport && !isOrchestrationRunning && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Analysis Complete</p>
                  <p className="text-xs text-green-700">Report ready for download</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(latestReport, 'md')}
                  className="border-green-200 text-green-700 hover:bg-green-100"
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(latestReport, 'json')}
                  className="border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Download className="w-4 h-4 mr-1" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(latestReport, 'txt')}
                  className="border-green-200 text-green-700 hover:bg-green-100"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Text
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Agents</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{agents.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{activeAgentsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{completedAgentsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Logs</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{logs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Agents List */}
          <div className="col-span-1">
            <div className="rounded-lg border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-medium text-gray-900">Agents</h2>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="p-2">
                  {agents.map((agent) => {
                    const Icon = agent.icon
                    return (
                      <div
                        key={agent.name}
                        className={`p-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                          agent.status === "running" 
                            ? 'bg-blue-50' 
                            : agent.status === "completed" 
                            ? 'bg-green-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleAgentExpand(agent.name)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            agent.status === "running" ? 'bg-blue-100' :
                            agent.status === "completed" ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              agent.status === "running" ? 'text-blue-600' :
                              agent.status === "completed" ? 'text-green-600' : 'text-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                              {getStatusIcon(agent.status)}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedAgents.has(agent.name) ? 'rotate-90' : ''
                          }`} />
                        </div>
                        
                        {expandedAgents.has(agent.name) && (
                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">~{agent.averageTime}s average</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main Panel */}
          <div className="col-span-2">
            <div className="rounded-lg border border-gray-100">
              <Tabs defaultValue="logs" className="w-full">
                <div className="p-3 border-b border-gray-100">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-50 p-1 rounded-lg">
                    <TabsTrigger value="logs" className="rounded text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Terminal className="w-4 h-4 mr-2" />
                      Logs
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="rounded text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="rounded text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Reports
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Logs Tab */}
                <TabsContent value="logs" className="m-0">
                  <ScrollArea className="h-[420px]">
                    <div className="p-4 space-y-2">
                      {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <Terminal className="w-10 h-10 mb-3 opacity-30" />
                          <p className="text-sm">No logs yet</p>
                          <p className="text-xs mt-1">Run an analysis to see agent activity</p>
                        </div>
                      ) : (
                        logs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-3 rounded-lg ${
                              log.level === "error" ? "bg-red-50" : 
                              log.level === "warning" ? "bg-amber-50" : 
                              log.level === "success" ? "bg-green-50" : "bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {getLogIcon(log.level)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium text-gray-700">{log.agent}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">{log.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Chat Tab */}
                <TabsContent value="chat" className="m-0">
                  <div className="flex flex-col h-[420px]">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {chatHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <Bot className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-base font-medium text-gray-600">CircuMetal AI Assistant</p>
                            <p className="text-sm mt-1 text-gray-400">Ask about LCA, circularity, or environmental analysis</p>
                            
                            {/* Suggested Questions */}
                            <div className="mt-6 w-full max-w-md">
                              <p className="text-xs text-gray-400 mb-3 text-center">Suggested questions</p>
                              <div className="space-y-2">
                                {[
                                  "What is Life Cycle Assessment (LCA)?",
                                  "Explain the Material Circularity Indicator (MCI)",
                                  "How does the multi-agent system work?",
                                  "What environmental impacts are calculated?"
                                ].map((question) => (
                                  <button
                                    key={question}
                                    onClick={() => {
                                      setChatMessage(question)
                                      setTimeout(() => handleSendChat(), 100)
                                    }}
                                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                  >
                                    {question}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          chatHistory.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${
                                  msg.role === "user"
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-50 text-gray-800"
                                }`}
                              >
                                {msg.role === "agent" && (
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                                    <Bot className="w-4 h-4 text-gray-500" />
                                    <p className="text-xs font-medium text-gray-600">{msg.agent}</p>
                                    {msg.isStreaming && (
                                      <span className="ml-auto flex items-center gap-1 text-xs text-blue-500">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                        typing
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className={`text-sm leading-relaxed ${msg.role === "agent" ? "prose prose-sm prose-gray max-w-none" : ""}`}>
                                  {msg.role === "agent" ? (
                                    <div className="space-y-2">
                                      {msg.message.split('\n').map((line, i) => {
                                        // Headers
                                        if (line.startsWith('### ')) {
                                          return <h4 key={i} className="font-semibold text-gray-900 mt-3 mb-1">{line.slice(4)}</h4>
                                        }
                                        if (line.startsWith('## ')) {
                                          return <h3 key={i} className="font-semibold text-gray-900 text-base mt-3 mb-1">{line.slice(3)}</h3>
                                        }
                                        if (line.startsWith('# ')) {
                                          return <h2 key={i} className="font-bold text-gray-900 text-lg mt-3 mb-2">{line.slice(2)}</h2>
                                        }
                                        // Bullet points
                                        if (line.startsWith('- ') || line.startsWith('* ')) {
                                          return <div key={i} className="flex gap-2 ml-2"><span className="text-gray-400">•</span><span>{formatInlineMarkdown(line.slice(2))}</span></div>
                                        }
                                        // Numbered lists
                                        if (/^\d+\.\s/.test(line)) {
                                          const match = line.match(/^(\d+)\.\s(.*)/)
                                          if (match) {
                                            return <div key={i} className="flex gap-2 ml-2"><span className="text-gray-500 font-medium">{match[1]}.</span><span>{formatInlineMarkdown(match[2])}</span></div>
                                          }
                                        }
                                        // Code blocks
                                        if (line.startsWith('```')) {
                                          return null // Handle multi-line code blocks separately
                                        }
                                        // Empty lines
                                        if (line.trim() === '') {
                                          return <div key={i} className="h-2" />
                                        }
                                        // Regular text
                                        return <p key={i} className="text-gray-700">{formatInlineMarkdown(line)}</p>
                                      })}
                                      {msg.isStreaming && (
                                        <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
                                      )}
                                    </div>
                                  ) : (
                                    <span>{msg.message}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {isChatLoading && chatHistory.length > 0 && !chatHistory[chatHistory.length - 1]?.isStreaming && (
                          <div className="flex justify-start">
                            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-sm text-gray-500">Thinking...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <Input
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Type your question here..."
                            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                            disabled={isChatLoading}
                            className="w-full pr-4 py-3 border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 rounded-lg bg-white"
                          />
                        </div>
                        <Button 
                          onClick={handleSendChat}
                          disabled={!chatMessage.trim() || isChatLoading}
                          className="bg-gray-900 hover:bg-gray-800 px-4 py-3 h-auto"
                        >
                          {isChatLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">Press Enter to send • Powered by Gemini</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="m-0">
                  <ScrollArea className="h-[420px]">
                    <div className="p-4 space-y-2">
                      {!reportsData?.reports?.length ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <FileText className="w-10 h-10 mb-3 opacity-30" />
                          <p className="text-sm">No reports yet</p>
                          <p className="text-xs mt-1">Run an analysis to generate reports</p>
                        </div>
                      ) : (
                        reportsData.reports.map((report: Report) => (
                          <div
                            key={report.id}
                            className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Report {report.run_id.slice(0, 8)}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReport(report, 'md')}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <FileDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReport(report, 'json')}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {report.key_takeaways && report.key_takeaways.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Key Takeaways:</p>
                                <ul className="text-xs text-gray-600 space-y-0.5">
                                  {report.key_takeaways.slice(0, 2).map((takeaway, i) => (
                                    <li key={i} className="truncate">• {takeaway}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Project Selection Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-500" />
              Select Project
            </DialogTitle>
            <DialogDescription>
              Choose a project to run LCA analysis
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projectsLoading ? (
                  <div className="p-3 text-center text-gray-500 text-sm">Loading...</div>
                ) : projectsData?.projects?.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">No projects found</div>
                ) : (
                  projectsData?.projects?.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.material || 'No material'}</p>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {selectedProjectId && getSelectedProject() && (
              <div className="mt-4 p-3 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-900">{getSelectedProject()?.name}</p>
                <p className="text-xs text-gray-500 mt-1">{getSelectedProject()?.description}</p>
                {getSelectedProject()?.material && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {getSelectedProject()?.material}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartOrchestration}
              disabled={!selectedProjectId}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
