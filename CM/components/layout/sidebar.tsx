"use client"

import { LayoutDashboard, Plus, FileText, Folder, Settings, HelpCircle, Package, Bot, Database, BarChart3, ClipboardList, Leaf, Globe, Library, TrendingUp, Truck, ShieldCheck } from "lucide-react"

interface SidebarProps {
  currentView: string
  onNavigate: (view: any) => void
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: Folder },
    { id: "visualization", label: "Visualization", icon: BarChart3 },
    { id: "sankey", label: "Sankey Diagrams", icon: ClipboardList },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "explorer", label: "Life Cycle Explorer", icon: Globe },
    { id: "library", label: "Ore Library", icon: Library },
    { id: "agents", label: "Agents & Predictions", icon: Bot },
    { id: "trading", label: "Trading Floor", icon: TrendingUp },
    { id: "inventory", label: "Inventory & Logistics", icon: Truck },
    { id: "compliance", label: "Compliance & Credits", icon: ShieldCheck },
    { id: "separator1", label: "" },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help & Docs", icon: HelpCircle },
  ]

  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform duration-300 hover:scale-105">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">CircuMetal</span>
            <p className="text-xs text-slate-400 font-medium">LCA Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          if (item.id.startsWith("separator")) {
            return <div key={item.id} className="h-px bg-slate-100 my-4" />
          }
          const Icon = item.icon as any
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{ animationDelay: `${index * 30}ms` }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-fade-in group ${isActive
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/25"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {Icon && <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} strokeWidth={2} />}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-slate-100">
        <div className="px-3 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
          <p className="text-xs font-medium text-emerald-700">Pro Tip</p>
          <p className="text-xs text-emerald-600 mt-1">Use AI Agents for automated LCA analysis</p>
        </div>
      </div>
    </div>
  )
}
