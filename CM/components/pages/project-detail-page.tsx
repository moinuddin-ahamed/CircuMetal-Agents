"use client"

import { useState } from "react"
import { Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Project, Scenario } from "@/lib/lca-context"

interface ProjectDetailPageProps {
  project: Project
  onNavigate: (view: any) => void
  onSelectScenario: (scenario: Scenario) => void
  onCreateScenario?: () => void
}

export default function ProjectDetailPage({
  project,
  onNavigate,
  onSelectScenario,
  onCreateScenario,
}: ProjectDetailPageProps) {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const hasScenarios = project.scenarios && project.scenarios.length > 0

  return (
    <div className="p-8 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate("projects")} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground mt-2">
              {project.metal} • {project.region}
            </p>
          </div>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
          <p className="text-lg font-semibold text-foreground capitalize">{project.status}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Metal Type</p>
          <p className="text-lg font-semibold text-foreground">{project.metal}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Region</p>
          <p className="text-lg font-semibold text-foreground">{project.region}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
          <p className="text-lg font-semibold text-foreground">{project.createdAt.toLocaleDateString()}</p>
        </Card>
      </div>

      {/* Scenarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Scenarios</h2>
          <Button onClick={onCreateScenario} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            Create Scenario
          </Button>
        </div>

        {!hasScenarios ? (
          <Card className="p-8 bg-card border-border border-dashed text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No scenarios yet</h3>
            <p className="text-muted-foreground mb-4">Create a scenario to start analysing this project.</p>
            <Button onClick={onCreateScenario} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Create Scenario
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Scenario List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Scenarios ({project.scenarios.length})</p>
              {project.scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  onClick={() => {
                    setSelectedScenario(scenario)
                    onSelectScenario(scenario)
                  }}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedScenario?.id === scenario.id
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{scenario.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{scenario.isBaseline ? "Baseline" : "Circular"}</p>
                </Card>
              ))}
            </div>

            {/* Scenario Detail */}
            <div className="lg:col-span-3">
              {selectedScenario ? (
                <Card className="p-6 bg-card border-border">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="process-flow">Process Flow</TabsTrigger>
                      <TabsTrigger value="results">Results</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Scenario Name</p>
                        <p className="text-sm text-foreground">{selectedScenario.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Type</p>
                        <p className="text-sm text-foreground">
                          {selectedScenario.isBaseline ? "Baseline" : "Circular"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Status</p>
                        <p className="text-sm text-foreground capitalize">{selectedScenario.status}</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="process-flow" className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">Process flow editor coming soon</p>
                    </TabsContent>

                    <TabsContent value="results" className="space-y-4 mt-4">
                      {selectedScenario.results ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">GWP</p>
                            <p className="text-lg font-semibold text-foreground">
                              {selectedScenario.results.gwp.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Energy</p>
                            <p className="text-lg font-semibold text-foreground">
                              {selectedScenario.results.energy.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Recycled Content</p>
                            <p className="text-lg font-semibold text-foreground">
                              {selectedScenario.results.recycledContent.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Recovery Rate</p>
                            <p className="text-lg font-semibold text-foreground">
                              {selectedScenario.results.recoveryRate.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No results available yet</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              ) : (
                <Card className="p-8 bg-card border-border text-center">
                  <p className="text-muted-foreground">Select a scenario from the left to view details.</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
