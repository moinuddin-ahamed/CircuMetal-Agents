"use client"

import { useLCA } from "@/lib/lca-context"
import Sidebar from "@/components/layout/sidebar"
import TopBar from "@/components/layout/top-bar"
import Dashboard from "@/components/pages/dashboard"
import NewAssessmentWizard from "@/components/pages/new-assessment-wizard"
import ScenarioEditor from "@/components/pages/scenario-editor"
import ResultsView from "@/components/pages/results-view"
import ComparisonView from "@/components/pages/comparison-view"
import AIPredictionLog from "@/components/pages/ai-prediction-log"
import ProjectsPage from "@/components/pages/projects-page"
import ProjectDetailPage from "@/components/pages/project-detail-page"
import SettingsPage from "@/components/pages/settings-page"
import InventoryInputPage from "@/components/pages/inventory-input-page"
import RunResultsPage from "@/components/pages/run-results-page"
import ScenarioBuilder from "@/components/pages/scenario-builder-page"
import InventoryManagementPage from "@/components/pages/inventory-management-page"
import ProjectManagementPage from "@/components/pages/project-management-page"
import AgentsInterface from "@/components/pages/agents-interface"
import ReportsPage from "@/components/pages/reports-page"
import LifeCycleExplorer from "@/components/pages/life-cycle-explorer"
import OreLibrary from "@/components/pages/ore-library"
import TradingFloor from "@/components/pages/trading-floor"
import ComplianceCredits from "@/components/pages/compliance-credits"
import InventoryLogistics from "@/components/pages/inventory-logistics"
import VisualizationPage from "@/components/pages/visualization-page"
import SankeyPage from "@/components/pages/sankey-page"
import { useState } from "react"

export default function DashboardLayout() {
  const { projects, currentProject, currentScenario, setCurrentProject, currentView, setCurrentView } = useLCA()
  
  // State for inventory and run workflows
  const [currentInventoryId, setCurrentInventoryId] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const handleNavigate = (view: any) => {
    // Clear current project when navigating to main dashboard or projects list
    if (view === 'dashboard' || view === 'projects') {
      setCurrentProject(null)
    }
    setCurrentView(view)
  }

  const renderView = () => {
    switch (currentView) {
      case "new-assessment":
        return <NewAssessmentWizard project={currentProject || undefined} onComplete={() => setCurrentView("dashboard")} />
      
      case "projects":
        return (
          <ProjectsPage 
            projects={projects} 
            onSelectProject={(p) => {
              setCurrentProject(p)
              setCurrentView("project-detail")
            }}
            onNavigate={handleNavigate}
          />
        )

      case "reports":
        return <ReportsPage onBack={() => handleNavigate("dashboard")} />
      
      case "inventory":
        return <InventoryLogistics onNavigate={handleNavigate} />

      case "new-inventory":
        return (
          <InventoryInputPage
            projectId={currentProject?.id || selectedProjectId || undefined}
            onComplete={(inventoryId) => {
              setCurrentInventoryId(inventoryId)
              // Navigate to scenario builder with the inventory
              setCurrentView("scenario" as any)
            }}
            onBack={() => handleNavigate("dashboard")}
          />
        )
      
      case "inventory-management":
        return (
          <InventoryManagementPage
            projectId={selectedProjectId || undefined}
            onCreateNew={() => setCurrentView("inventory")}
            onEdit={(inventoryId) => {
              setEditingInventoryId(inventoryId)
              // For now, go to the create page (could implement edit mode)
              setCurrentView("inventory")
            }}
            onViewDetails={(inventoryId) => {
              setCurrentInventoryId(inventoryId)
              setCurrentView("scenario" as any)
            }}
            onBack={() => handleNavigate("dashboard")}
          />
        )
      
      case "project-management":
        return (
          <ProjectManagementPage
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId)
              setCurrentView("project-detail")
            }}
            onCreateInventory={(projectId) => {
              setSelectedProjectId(projectId)
              setCurrentView("inventory")
            }}
            onViewRuns={(projectId) => {
              setSelectedProjectId(projectId)
              setCurrentView("reports")
            }}
            onBack={() => handleNavigate("dashboard")}
          />
        )
      
      case "agents":
        return (
          <AgentsInterface
            onBack={() => handleNavigate("dashboard")}
          />
        )
      
      case "lca-reports":
        return (
          <ReportsPage
            onBack={() => handleNavigate("dashboard")}
          />
        )
      
      case "scenario":
        // If we have an inventory, show the scenario builder
        if (currentInventoryId) {
          return (
            <ScenarioBuilder
              inventoryId={currentInventoryId}
              projectId={currentProject?.id || selectedProjectId || undefined}
              onRunStarted={(runId) => {
                setCurrentRunId(runId)
                setCurrentView("run-results")
              }}
              onBack={() => setCurrentView("inventory")}
            />
          )
        }
        return <ScenarioEditor onNavigate={handleNavigate} />
      
      case "run-results":
        return currentRunId ? (
          <RunResultsPage
            runId={currentRunId}
            onBack={() => {
              setCurrentRunId(null)
              handleNavigate("dashboard")
            }}
          />
        ) : (
          <Dashboard projects={projects} onNavigate={handleNavigate} onSelectProject={setCurrentProject} />
        )
      
      case "project-detail":
        return currentProject ? (
          <ProjectDetailPage
            project={currentProject}
            onNavigate={handleNavigate}
            onSelectScenario={() => {}}
            onCreateScenario={() => setCurrentView("new-assessment")}
          />
        ) : (
          <Dashboard projects={projects} onNavigate={handleNavigate} onSelectProject={setCurrentProject} />
        )
      
      case "results":
        return <ResultsView onNavigate={handleNavigate} />
      
      case "comparison":
        return <ComparisonView onNavigate={handleNavigate} />
      
      case "reports":
        return <AIPredictionLog />
      
      case "settings":
        return <SettingsPage />
      
      case "help":
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Help & Documentation</h1>
            <p className="text-muted-foreground">Documentation coming soon...</p>
          </div>
        )

      case "explorer":
        return <LifeCycleExplorer />
      
      case "library":
        return <OreLibrary />
      
      case "trading":
        return <TradingFloor />
      
      case "compliance":
        return <ComplianceCredits />
      
      case "visualization":
        return <VisualizationPage />
      
      case "sankey":
        return <SankeyPage />
      
      default:
        return <Dashboard projects={projects} onNavigate={handleNavigate} onSelectProject={setCurrentProject} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{renderView()}</main>
      </div>
    </div>
  )
}
