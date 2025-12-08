"use client"

import { useState, useMemo } from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLCA, type Project } from "@/lib/lca-context"
import WizardStep1 from "@/components/wizard/step-1-basic-info"
import WizardStep2 from "@/components/wizard/step-2-route-selection"
import WizardStep3 from "@/components/wizard/step-3-scenario-setup"

interface NewAssessmentWizardProps {
  onComplete: () => void
  project?: Project | null
}

export default function NewAssessmentWizard({ onComplete, project }: NewAssessmentWizardProps) {
  // If project is provided, start at step 2 (Route Selection)
  const [step, setStep] = useState(project ? 2 : 1)
  const { addProject, addScenario } = useLCA()
  const [formData, setFormData] = useState({
    projectName: project?.name || "",
    metalType: project?.metal || "",
    productType: "",
    region: project?.region || "",
    functionalUnit: project?.functionalUnit || "1",
    route: "",
    scenarioName: "",
    isBaseline: !project, // Only baseline if new project
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const steps = [
    { number: 1, title: "Basic Info", description: "Project details" },
    { number: 2, title: "Route Selection", description: "Choose pathway" },
    { number: 3, title: "Scenario Setup", description: "Initial configuration" },
  ]

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.projectName) errors.projectName = "Project name is required"
      if (!formData.metalType) errors.metalType = "Metal type is required"
      if (!formData.region) errors.region = "Region is required"
      if (!formData.functionalUnit || isNaN(Number(formData.functionalUnit)))
        errors.functionalUnit = "Valid functional unit is required"
    }

    if (currentStep === 2) {
      if (!formData.route) errors.route = "Production route must be selected"
    }

    return Object.keys(errors).length === 0
  }

  const isStepValid = useMemo(() => validateStep(step), [step, formData])

  const handleValidateStep = () => {
    const errors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.projectName) errors.projectName = "Project name is required"
      if (!formData.metalType) errors.metalType = "Metal type is required"
      if (!formData.region) errors.region = "Region is required"
      if (!formData.functionalUnit || isNaN(Number(formData.functionalUnit)))
        errors.functionalUnit = "Valid functional unit is required"
    }

    if (step === 2) {
      if (!formData.route) errors.route = "Production route must be selected"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const createScenario = (projectId: string | number) => {
    const scenarioData = {
      project_id: projectId,
      name: formData.scenarioName || 'Scenario 1',
      route_type: formData.route,
      is_baseline: formData.isBaseline,
      description: `${formData.metalType} - ${formData.productType}`,
    }

    fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioData),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || 'Failed to create scenario')
          })
        }
        return res.json()
      })
      .then(() => {
        onComplete()
      })
      .catch((err) => {
        console.error('Error creating scenario:', err)
        alert('Failed to create scenario: ' + err.message)
      })
  }

  const handleNext = () => {
    if (!handleValidateStep()) return

    if (step < 3) {
      setStep(step + 1)
    } else {
      // If we have an existing project, skip creation and just add scenario
      if (project) {
        createScenario(project.id)
        return
      }

      // Validate all required fields before creating
      if (!formData.projectName) {
        alert('Project name is required')
        return
      }
      if (!formData.metalType) {
        alert('Metal type is required')
        console.error('metalType is empty:', formData)
        return
      }
      if (!formData.region) {
        alert('Region is required')
        console.error('region is empty:', formData)
        return
      }
      if (!formData.route) {
        alert('Production route is required')
        return
      }

      // Create project via API
      const projectData = {
        name: formData.projectName,
        description: formData.projectName,
        metal_type: formData.metalType,
        region: formData.region,
        functional_unit: formData.functionalUnit || '1',
        status: 'draft',
      }

      console.log('Creating project with data:', projectData)
      console.log('formData state:', formData)

      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })
        .then((res) => {
          console.log('Response status:', res.status)
          if (!res.ok) {
            return res.json().then((err) => {
              console.error('API error response:', err)
              throw new Error(err.error || 'Failed to create project')
            })
          }
          return res.json()
        })
        .then((data) => {
          console.log('Project created:', data)
          createScenario(data.project.id)
        })
        .catch((err) => {
          console.error('Error creating assessment:', err)
          alert('Failed to create assessment: ' + err.message)
        })
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="h-full bg-gradient-to-br from-white via-emerald-50/20 to-white p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">New Assessment</h1>
          <p className="text-slate-500 mt-1 font-medium">Create a new LCA project in 3 steps</p>
        </div>

        {/* Progress */}
        <div className="mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center gap-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${step >= s.number ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30" : "bg-slate-100 text-slate-400"
                    }`}
                >
                  {s.number}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-1 rounded-full transition-colors duration-300 ${step > s.number ? "bg-emerald-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-12">
            {steps.map((s) => (
              <div key={s.number}>
                <p className="font-semibold text-slate-700 text-sm">{s.title}</p>
                <p className="text-xs text-slate-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 bg-white border-slate-100 mb-8 rounded-2xl shadow-sm animate-scale-in" style={{ animationDelay: '200ms' }}>
          {step === 1 && <WizardStep1 formData={formData} setFormData={setFormData} />}
          {step === 2 && <WizardStep2 formData={formData} setFormData={setFormData} />}
          {step === 3 && <WizardStep3 formData={formData} setFormData={setFormData} />}
        </Card>

        {/* Actions */}
        <div className="flex justify-between gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={step === 1}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 bg-white rounded-xl disabled:opacity-50 transition-all"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid}
            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02]"
          >
            {step === 3 ? "Create Assessment" : "Continue"}
            {step !== 3 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
