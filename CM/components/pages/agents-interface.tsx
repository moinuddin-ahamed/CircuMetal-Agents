"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Bot, RefreshCw, Terminal, 
  Activity, Clock, CheckCircle, XCircle,
  AlertTriangle, ChevronRight,
  Database, FileText, BarChart3,
  Shield, Recycle, Send, ArrowLeft, Loader2,
  MessageSquare, Settings, Info, Play, FolderOpen,
  Brain, Eye, Target, Download, FileDown, Sparkles
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
        return <code key={i} className="px-1.5 py-0.5 bg-green-50 rounded-md text-xs font-mono text-green-800 border border-green-100">{part.slice(1, -1)}</code>
      }
      
      // Handle bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/)
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${i}-${j}`} className="font-semibold text-green-900">{bp.slice(2, -2)}</strong>
        }
        return <span key={`${i}-${j}`}>{bp}</span>
      })
    })
  }

  // Render markdown content with proper paragraph grouping
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null
    
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentParagraph: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLang = ''
    
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
    
    lines.forEach((line, i) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <div key={elements.length} className="relative group mb-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <pre className="relative bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto shadow-sm">
                <code>{codeBlockContent.join('\n')}</code>
              </pre>
            </div>
          )
          codeBlockContent = []
          inCodeBlock = false
        } else {
          // Start code block
          flushParagraph()
          inCodeBlock = true
          codeBlockLang = line.slice(3)
        }
        return
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }
      
      // Headers
      if (line.startsWith('### ')) {
        flushParagraph()
        elements.push(<h4 key={elements.length} className="font-semibold text-green-900 text-sm mt-4 mb-2 flex items-center gap-2"><span className="w-1 h-4 bg-green-400 rounded-full"></span>{line.slice(4)}</h4>)
        return
      }
      if (line.startsWith('## ')) {
        flushParagraph()
        elements.push(<h3 key={elements.length} className="font-semibold text-green-900 text-base mt-5 mb-2">{line.slice(3)}</h3>)
        return
      }
      if (line.startsWith('# ')) {
        flushParagraph()
        elements.push(<h2 key={elements.length} className="font-bold text-green-900 text-lg mt-6 mb-3 pb-2 border-b border-green-100">{line.slice(2)}</h2>)
        return
      }
      
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        flushParagraph()
        elements.push(
          <div key={elements.length} className="flex gap-3 ml-1 mb-2 group">
            <span className="text-green-400 mt-1.5 group-hover:text-green-500 transition-colors">•</span>
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
          <div key={elements.length} className="flex gap-3 ml-1 mb-2">
            <span className="text-green-600 font-medium min-w-[1.25rem] bg-green-50 rounded px-1 text-center h-fit text-xs py-0.5 mt-0.5">{numMatch[1]}.</span>
            <span className="text-slate-700 flex-1">{formatInlineMarkdown(numMatch[2])}</span>
          </div>
        )
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

  const getStatusIcon = (status: Agent["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-green-600" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-2 h-2 rounded-full bg-slate-300" />
    }
  }

  const getLogIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      case "success":
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
      default:
        return <Info className="w-3.5 h-3.5 text-blue-500" />
    }
  }

  const isSystemOnline = !healthError && (healthData?.status === "ok" || healthData?.status === "healthy")
  const activeAgentsCount = agents.filter(a => a.status === "running").length
  const completedAgentsCount = agents.filter(a => a.status === "completed").length

  return (
    <div className="h-full bg-gradient-to-br from-white via-green-50/30 to-white p-6 font-sans flex flex-col overflow-auto">
      <div className="w-full flex flex-col min-h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-green-100/50">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-slate-500 hover:text-green-700 hover:bg-green-50 -ml-2 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Agents Orchestrator</h1>
                <p className="text-slate-500 text-sm mt-0.5">Multi-agent LCA analysis & circularity system</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-green-100 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${isSystemOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-slate-600">
                {healthLoading ? "Connecting..." : isSystemOnline ? "System Online" : "System Offline"}
              </span>
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetchHealth()} 
              className="bg-white border-green-100 text-slate-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => setShowProjectDialog(true)} 
              disabled={isOrchestrationRunning || !isSystemOnline}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 px-6 h-11 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isOrchestrationRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {isOrchestrationRunning && (
          <div className="mb-8 p-6 rounded-2xl bg-white border border-green-100 shadow-lg shadow-green-900/5 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">
                    Analysis in Progress
                  </span>
                  <span className="text-xs text-slate-500">
                    {currentAgent || "Initializing..."}
                  </span>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{orchestrationProgress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${orchestrationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download Report Section */}
        {latestReport && !isOrchestrationRunning && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-full shadow-sm">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-emerald-900">Analysis Complete</p>
                  <p className="text-sm text-emerald-700">Your comprehensive report is ready for download</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => downloadReport(latestReport, 'md')}
                  className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Markdown
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadReport(latestReport, 'json')}
                  className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadReport(latestReport, 'txt')}
                  className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Text
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Agents", value: agents.length, icon: Bot, color: "text-purple-500", bg: "bg-purple-50" },
            { label: "Active Now", value: activeAgentsCount, icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Completed", value: completedAgentsCount, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "System Logs", value: logs.length, icon: Terminal, color: "text-slate-500", bg: "bg-slate-50" },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: '500px' }}>
          {/* Agents List */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col" style={{ minHeight: '400px' }}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-green-600" />
                  Agent Swarm ({agents.length})
                </h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {agents.map((agent) => {
                    const Icon = agent.icon
                    const isActive = agent.status === "running"
                    const isCompleted = agent.status === "completed"
                    
                    return (
                      <div
                        key={agent.name}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                          isActive 
                            ? 'bg-blue-50/50 border-blue-100 shadow-sm scale-[1.02]' 
                            : isCompleted 
                            ? 'bg-emerald-50/50 border-emerald-100' 
                            : 'bg-white border-slate-100 hover:border-green-200 hover:shadow-md hover:scale-[1.01]'
                        }`}
                        onClick={() => toggleAgentExpand(agent.name)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                            isActive ? 'bg-blue-100 text-blue-600' :
                            isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-500 group-hover:bg-green-50 group-hover:text-green-600'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-semibold ${isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-700' : 'text-slate-900'}`}>
                                {agent.name}
                              </p>
                              {getStatusIcon(agent.status)}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{agent.description}</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${
                            expandedAgents.has(agent.name) ? 'rotate-90 text-green-500' : ''
                          }`} />
                        </div>
                        
                        {expandedAgents.has(agent.name) && (
                          <div className="mt-3 pt-3 border-t border-slate-100/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500">Estimated runtime: ~{agent.averageTime}s</span>
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
          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col" style={{ minHeight: '400px' }}>
              <Tabs defaultValue="chat" className="w-full h-full flex flex-col">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-200/50 p-1 rounded-xl">
                    <TabsTrigger 
                      value="chat" 
                      className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all duration-300"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Assistant
                    </TabsTrigger>
                    <TabsTrigger 
                      value="logs" 
                      className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all duration-300"
                    >
                      <Terminal className="w-4 h-4 mr-2" />
                      System Logs
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reports" 
                      className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all duration-300"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Reports
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Logs Tab */}
                <TabsContent value="logs" className="m-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-3">
                      {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Terminal className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">System Idle</p>
                          <p className="text-xs mt-1">Start an analysis to view real-time logs</p>
                        </div>
                      ) : (
                        logs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-sm ${
                              log.level === "error" ? "bg-red-50/50 border-red-100" : 
                              log.level === "warning" ? "bg-amber-50/50 border-amber-100" : 
                              log.level === "success" ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{getLogIcon(log.level)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="bg-white/50 text-[10px] px-1.5 py-0 h-5">
                                    {log.agent}
                                  </Badge>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed font-mono text-[13px]">{log.message}</p>
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
                <TabsContent value="chat" className="m-0 flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      {chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm rotate-3 transition-transform hover:rotate-0 duration-500">
                            <Bot className="w-10 h-10 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">How can I help you?</h3>
                          <p className="text-slate-500 text-sm text-center max-w-xs mb-8">
                            I can analyze LCA data, explain circularity metrics, or help you interpret results.
                          </p>
                          
                          {/* Suggested Questions */}
                          <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                            {[
                              "What is Life Cycle Assessment?",
                              "Explain Material Circularity",
                              "How does the system work?",
                              "Analyze environmental impact"
                            ].map((question, i) => (
                              <button
                                key={question}
                                onClick={() => {
                                  setChatMessage(question)
                                  setTimeout(() => handleSendChat(), 100)
                                }}
                                className="text-left px-4 py-3 rounded-xl border border-slate-100 bg-white hover:border-green-200 hover:bg-green-50/50 hover:shadow-sm transition-all duration-300 text-sm text-slate-600 group"
                              >
                                <span className="block text-xs text-green-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">Suggestion</span>
                                {question}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                          >
                            <div
                              className={`max-w-[85%] p-5 rounded-2xl shadow-sm ${
                                msg.role === "user"
                                  ? "bg-slate-900 text-white rounded-tr-none"
                                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                              }`}
                            >
                              {msg.role === "agent" && (
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                  <div className="p-1 bg-green-100 rounded-lg">
                                    <Bot className="w-3 h-3 text-green-600" />
                                  </div>
                                  <p className="text-xs font-bold text-slate-700">{msg.agent}</p>
                                  {msg.isStreaming && (
                                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                      GENERATING
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="text-sm leading-relaxed">
                                {msg.role === "agent" ? (
                                  <div className="markdown-content">
                                    {renderMarkdown(msg.message)}
                                    {msg.isStreaming && (
                                      <span className="inline-block w-1.5 h-4 bg-green-500 animate-pulse ml-0.5 align-middle rounded-full" />
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
                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                          <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-3">
                            <div className="flex gap-1.5">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs font-medium text-slate-400">Thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex gap-3">
                      <div className="flex-1 relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-200 to-emerald-200 rounded-xl opacity-0 group-hover:opacity-50 transition duration-500 blur"></div>
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Ask anything about the analysis..."
                          onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                          disabled={isChatLoading}
                          className="relative w-full pr-4 py-6 border-slate-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 rounded-xl bg-white shadow-sm text-base"
                        />
                      </div>
                      <Button 
                        onClick={handleSendChat}
                        disabled={!chatMessage.trim() || isChatLoading}
                        className="h-auto px-6 bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-all duration-300 hover:scale-105"
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-green-500" />
                      Powered by Gemini 2.5 Flash
                    </p>
                  </div>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="m-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-4">
                      {!reportsData?.reports?.length ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <FileText className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No Reports Available</p>
                          <p className="text-xs mt-1">Completed analyses will appear here</p>
                        </div>
                      ) : (
                        reportsData.reports.map((report: Report) => (
                          <div
                            key={report.id}
                            className="p-5 rounded-xl bg-white border border-slate-100 hover:border-green-200 hover:shadow-md transition-all duration-300 group"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-100 transition-colors">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    Analysis Report
                                  </p>
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    ID: {report.run_id.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReport(report, 'md')}
                                  className="text-slate-400 hover:text-green-600 hover:bg-green-50"
                                >
                                  <FileDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReport(report, 'json')}
                                  className="text-slate-400 hover:text-green-600 hover:bg-green-50"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Completed
                              </span>
                            </div>

                            {report.key_takeaways && report.key_takeaways.length > 0 && (
                              <div className="pt-3 border-t border-slate-50">
                                <p className="text-xs font-medium text-slate-700 mb-2">Key Findings:</p>
                                <ul className="space-y-1.5">
                                  {report.key_takeaways.slice(0, 2).map((takeaway, i) => (
                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                      <span className="w-1 h-1 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                      <span className="line-clamp-1">{takeaway}</span>
                                    </li>
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
        <DialogContent className="bg-white max-w-md border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-slate-50 p-6 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <FolderOpen className="w-5 h-5 text-green-600" />
                Select Project
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Choose a project configuration to start the analysis
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full h-12 rounded-xl border-slate-200 focus:ring-green-100 focus:border-green-400">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                {projectsLoading ? (
                  <div className="p-4 text-center text-slate-500 text-sm">Loading projects...</div>
                ) : projectsData?.projects?.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">No projects found</div>
                ) : (
                  projectsData?.projects?.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id} className="py-3 focus:bg-green-50 focus:text-green-900 cursor-pointer">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{project.material || 'No material specified'}</p>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {selectedProjectId && getSelectedProject() && (
              <div className="mt-4 p-4 rounded-xl bg-green-50/50 border border-green-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-slate-900">{getSelectedProject()?.name}</p>
                  {getSelectedProject()?.material && (
                    <Badge variant="secondary" className="bg-white text-green-700 border border-green-100 shadow-sm">
                      {getSelectedProject()?.material}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{getSelectedProject()?.description}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowProjectDialog(false)} className="hover:bg-slate-200/50 text-slate-600">
              Cancel
            </Button>
            <Button 
              onClick={handleStartOrchestration}
              disabled={!selectedProjectId}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 px-6 rounded-lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
