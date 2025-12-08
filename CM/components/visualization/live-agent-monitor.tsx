"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, Wifi, WifiOff, RefreshCw,
  Bot, Database, Brain, BarChart3, Recycle, Shield, Eye, FileText, Target,
  CheckCircle, XCircle, Clock, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

interface AgentLogEntry {
  id: string
  timestamp: string
  agent: string
  event: "started" | "completed" | "error" | "log"
  message: string
  data?: Record<string, unknown>
  duration?: number
}

interface AgentStatus {
  name: string
  status: "idle" | "running" | "completed" | "error"
  startTime?: string
  duration?: number
}

interface LiveAgentMonitorProps {
  runId: string
  onComplete?: (result: Record<string, unknown>) => void
  onError?: (error: string) => void
  autoConnect?: boolean
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  data: Database,
  estimation: Brain,
  lca: BarChart3,
  circularity: Recycle,
  compliance: Shield,
  visualization: Eye,
  explain: FileText,
  scenario: Target,
  critique: Activity,
}

export default function LiveAgentMonitor({
  runId,
  onComplete,
  onError,
  autoConnect = true,
}: LiveAgentMonitorProps) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [logs, setLogs] = useState<AgentLogEntry[]>([])
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map())
  const [overallProgress, setOverallProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  
  // Scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setConnecting(true)
    setError(null)
    
    const wsUrl = `${API_URL.replace('http', 'ws')}/api/dashboard/ws/${runId}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        setConnected(true)
        setConnecting(false)
        reconnectAttempts.current = 0
        
        setLogs(prev => [...prev, {
          id: `connect-${Date.now()}`,
          timestamp: new Date().toISOString(),
          agent: "System",
          event: "log",
          message: "Connected to agent orchestration stream"
        }])
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === "agent_update") {
            const { agent, status, message, data: agentData, duration } = data.payload
            
            // Update agent status
            setAgentStatuses(prev => {
              const updated = new Map(prev)
              updated.set(agent, {
                name: agent,
                status: status === "started" ? "running" : status,
                startTime: status === "started" ? new Date().toISOString() : prev.get(agent)?.startTime,
                duration: duration,
              })
              return updated
            })
            
            // Add log entry
            setLogs(prev => [...prev, {
              id: `${agent}-${Date.now()}`,
              timestamp: new Date().toISOString(),
              agent,
              event: status,
              message,
              data: agentData,
              duration,
            }])
          }
          
          if (data.type === "progress") {
            setOverallProgress(data.payload.progress)
          }
          
          if (data.type === "complete") {
            setLogs(prev => [...prev, {
              id: `complete-${Date.now()}`,
              timestamp: new Date().toISOString(),
              agent: "Orchestrator",
              event: "completed",
              message: "All agents completed successfully"
            }])
            onComplete?.(data.payload.result)
          }
          
          if (data.type === "error") {
            setError(data.payload.error)
            onError?.(data.payload.error)
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e)
        }
      }
      
      ws.onclose = () => {
        setConnected(false)
        setConnecting(false)
        wsRef.current = null
        
        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          setTimeout(connect, 2000 * reconnectAttempts.current)
        }
      }
      
      ws.onerror = () => {
        setError("WebSocket connection failed")
        setConnecting(false)
      }
    } catch (e) {
      setError("Failed to create WebSocket connection")
      setConnecting(false)
    }
  }, [runId, onComplete, onError])
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }, [])
  
  useEffect(() => {
    if (autoConnect && runId) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [autoConnect, runId, connect, disconnect])
  
  const getAgentIcon = (agentName: string) => {
    const key = agentName.toLowerCase().replace(" agent", "").replace("_agent", "")
    return AGENT_ICONS[key] || Bot
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-blue-500 animate-pulse"
      case "completed": return "bg-emerald-500"
      case "error": return "bg-red-500"
      default: return "bg-slate-300"
    }
  }
  
  const getEventIcon = (event: AgentLogEntry["event"]) => {
    switch (event) {
      case "started": return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
      case "completed": return <CheckCircle className="w-3 h-3 text-emerald-500" />
      case "error": return <XCircle className="w-3 h-3 text-red-500" />
      default: return <Clock className="w-3 h-3 text-slate-400" />
    }
  }
  
  const completedCount = Array.from(agentStatuses.values()).filter(s => s.status === "completed").length
  const totalAgents = 8
  
  return (
    <Card className="p-6 bg-gradient-to-br from-white to-slate-50/50 border-slate-200/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
            connected ? "bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/20" 
                     : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20"
          }`}>
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Live Agent Monitor</h3>
            <p className="text-xs text-slate-500">Run ID: {runId.slice(0, 8)}...</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "default" : "secondary"} className="gap-1">
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connecting ? "Connecting..." : connected ? "Connected" : "Disconnected"}
          </Badge>
          
          {!connected && !connecting && (
            <Button size="sm" variant="outline" onClick={connect}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Reconnect
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600">Overall Progress</span>
          <span className="text-slate-800 font-medium">{completedCount}/{totalAgents} agents</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
      
      {/* Agent status grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {["Data", "Estimation", "LCA", "Circularity", "Compliance", "Scenario", "Visualization", "Explain"].map(name => {
          const status = agentStatuses.get(name.toLowerCase()) || agentStatuses.get(`${name.toLowerCase()}_agent`)
          const Icon = getAgentIcon(name)
          const statusClass = status ? getStatusColor(status.status) : "bg-slate-200"
          
          return (
            <div 
              key={name}
              className={`p-2 rounded-lg border ${
                status?.status === "running" ? "border-blue-300 bg-blue-50" 
                : status?.status === "completed" ? "border-emerald-300 bg-emerald-50"
                : status?.status === "error" ? "border-red-300 bg-red-50"
                : "border-slate-200 bg-white"
              } transition-all duration-300`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${
                  status?.status === "running" ? "text-blue-500 animate-pulse"
                  : status?.status === "completed" ? "text-emerald-500"
                  : status?.status === "error" ? "text-red-500"
                  : "text-slate-400"
                }`} />
                <span className="text-xs font-medium text-slate-700 truncate">{name}</span>
              </div>
              {status?.duration && (
                <div className="text-[10px] text-slate-500 mt-1">{(status.duration / 1000).toFixed(1)}s</div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Log stream */}
      <div className="border border-slate-200 rounded-lg bg-slate-900 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">Agent Logs</span>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          </div>
        </div>
        
        <ScrollArea className="h-64">
          <div className="p-3 space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">
                Waiting for agent activity...
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 py-1">
                  <span className="text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {getEventIcon(log.event)}
                  <span className={`shrink-0 font-medium ${
                    log.agent === "System" ? "text-slate-400" 
                    : log.agent === "Orchestrator" ? "text-purple-400"
                    : "text-emerald-400"
                  }`}>
                    [{log.agent}]
                  </span>
                  <span className={`${
                    log.event === "error" ? "text-red-400" 
                    : log.event === "completed" ? "text-emerald-300"
                    : "text-slate-300"
                  }`}>
                    {log.message}
                  </span>
                  {log.duration && (
                    <span className="text-slate-500">({(log.duration / 1000).toFixed(2)}s)</span>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </ScrollArea>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </Card>
  )
}

// Demo/preview component
export function SampleLiveAgentMonitor() {
  return (
    <div className="p-8">
      <LiveAgentMonitor 
        runId="demo-run-123"
        autoConnect={false}
      />
    </div>
  )
}
