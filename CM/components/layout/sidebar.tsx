"use client"

import { LayoutDashboard, Plus, FileText, Folder, Settings, HelpCircle, Package, Bot, Database, BarChart3, ClipboardList } from "lucide-react"

interface SidebarProps {
  currentView: string
  onNavigate: (view: any) => void
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "separator1", label: "" },
    { id: "project-management", label: "Projects", icon: Folder },
    { id: "inventory-management", label: "Inventories", icon: Database },
    { id: "lca-reports", label: "LCA Reports", icon: ClipboardList },
    { id: "separator2", label: "" },
    { id: "inventory", label: "New Inventory", icon: Package },
    { id: "new-assessment", label: "New Assessment", icon: Plus },
    { id: "separator3", label: "" },
    { id: "agents", label: "AI Agents", icon: Bot },
    { id: "reports", label: "Analysis Logs", icon: BarChart3 },
    { id: "separator4", label: "" },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help & Docs", icon: HelpCircle },
  ]

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sidebar-primary to-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground text-sm font-bold">◉</span>
          </div>
          <div>
            <span className="font-bold text-sidebar-foreground text-base">CircuMet</span>
            <p className="text-xs text-sidebar-foreground/60">LCA Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          if (item.id.startsWith("separator")) {
            return <div key={item.id} className="h-px bg-sidebar-border my-4" />
          }
          const Icon = item.icon as any
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
                }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {Icon && <Icon className="w-4 h-4" strokeWidth={2} />}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Organization */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs font-medium text-sidebar-foreground/70 mb-3">Organization</div>
        <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent/20 transition-colors">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent" />
          <div className="text-sm text-left">
            <div className="font-medium text-sidebar-foreground">Acme Corp</div>
            <div className="text-xs text-sidebar-foreground/60">Premium</div>
          </div>
        </button>
      </div>
    </div>
  )
}
