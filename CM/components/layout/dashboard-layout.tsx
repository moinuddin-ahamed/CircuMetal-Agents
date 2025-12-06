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
import { useState } from "react"

export default function DashboardLayout() {
  const { projects, currentProject, currentScenario, setCurrentProject, currentView, setCurrentView } = useLCA()
  
  // State for inventory and run workflows
  const [currentInventoryId, setCurrentInventoryId] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const renderView = () => {
    switch (currentView) {
      case "new-assessment":
        return <NewAssessmentWizard onComplete={() => setCurrentView("dashboard")} />
      
      case "inventory":
        return (
          <InventoryInputPage
            projectId={currentProject?.id || selectedProjectId || undefined}
            onComplete={(inventoryId) => {
              setCurrentInventoryId(inventoryId)
              // Navigate to scenario builder with the inventory
              setCurrentView("scenario" as any)
            }}
            onBack={() => setCurrentView("dashboard")}
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
            onBack={() => setCurrentView("dashboard")}
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
            onBack={() => setCurrentView("dashboard")}
          />
        )
      
      case "agents":
        return (
          <AgentsInterface
            onBack={() => setCurrentView("dashboard")}
          />
        )
      
      case "lca-reports":
        return (
          <ReportsPage
            onBack={() => setCurrentView("dashboard")}
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
        return <ScenarioEditor onNavigate={setCurrentView} />
      
      case "run-results":
        return currentRunId ? (
          <RunResultsPage
            runId={currentRunId}
            onBack={() => {
              setCurrentRunId(null)
              setCurrentView("dashboard")
            }}
          />
        ) : (
          <Dashboard projects={projects} onNavigate={setCurrentView} onSelectProject={setCurrentProject} />
        )
      
      case "projects":
        return <ProjectsPage projects={projects} onSelectProject={setCurrentProject} onNavigate={setCurrentView} />
      
      case "project-detail":
        return currentProject ? (
          <ProjectDetailPage
            project={currentProject}
            onNavigate={setCurrentView}
            onSelectScenario={() => {}}
            onCreateScenario={() => setCurrentView("new-assessment")}
          />
        ) : (
          <Dashboard projects={projects} onNavigate={setCurrentView} onSelectProject={setCurrentProject} />
        )
      
      case "results":
        return <ResultsView onNavigate={setCurrentView} />
      
      case "comparison":
        return <ComparisonView onNavigate={setCurrentView} />
      
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
      
      default:
        return <Dashboard projects={projects} onNavigate={setCurrentView} onSelectProject={setCurrentProject} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{renderView()}</main>
      </div>
    </div>
  )
}
