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
    // Optionally: window.location.reload()
  }, [setIsAuthenticated, setProjects, setCurrentProject, setCurrentScenario, setCurrentView])

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects, metals..."
          className="bg-transparent text-foreground placeholder-muted-foreground text-sm outline-none flex-1"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <User className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Logout" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
