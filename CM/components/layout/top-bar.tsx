"use client"

import { Search, Bell, HelpCircle, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLCA } from "@/lib/lca-context"
import { useCallback } from "react"

export default function TopBar() {
  const { setIsAuthenticated, setCurrentProject, setCurrentScenario, setCurrentView, setProjects } = useLCA() as any

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch { }
    setIsAuthenticated(false)
    setProjects([])
    setCurrentProject(null)
    setCurrentScenario(null)
    setCurrentView('dashboard')
  }, [setIsAuthenticated, setProjects, setCurrentProject, setCurrentScenario, setCurrentView])

  return (
    <div className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Search */}
      <div className="flex items-center gap-3 max-w-md flex-1">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 flex-1 max-w-sm transition-all duration-200 focus-within:border-emerald-300 focus-within:bg-white focus-within:shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, metals..."
            className="bg-transparent text-slate-700 placeholder-slate-400 text-sm outline-none flex-1 font-medium"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
        >
          <Bell className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-slate-200 mx-2" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
        >
          <User className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200" 
          aria-label="Logout" 
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
