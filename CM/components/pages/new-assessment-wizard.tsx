"use client"

import { useState, useMemo } from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLCA } from "@/lib/lca-context"
import WizardStep1 from "@/components/wizard/step-1-basic-info"
import WizardStep2 from "@/components/wizard/step-2-route-selection"
import WizardStep3 from "@/components/wizard/step-3-scenario-setup"

interface NewAssessmentWizardProps {
  onComplete: () => void
}

export default function NewAssessmentWizard({ onComplete }: NewAssessmentWizardProps) {
  const [step, setStep] = useState(1)
  const { addProject, addScenario } = useLCA()
  const [formData, setFormData] = useState({
    projectName: "",
    metalType: "",
    productType: "",
    region: "",
    functionalUnit: "1",
    route: "",
    scenarioName: "",
    isBaseline: true,
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

  const handleNext = () => {
    if (!handleValidateStep()) return

    if (step < 3) {
      setStep(step + 1)
    } else {
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
          // Create scenario via API
          const scenarioData = {
            project_id: Number(data.project.id),
            name: formData.scenarioName || 'Scenario 1',
            route_type: formData.route,
            is_baseline: formData.isBaseline,
            description: `${formData.metalType} - ${formData.productType}`,
          }

          return fetch('/api/scenarios', {
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
        })
        .then(() => {
          onComplete()
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground">New Assessment</h1>
          <p className="text-muted-foreground mt-2">Create a new LCA project in 3 steps</p>
        </div>

        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center gap-4">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${step >= s.number ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                >
                  {s.number}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-1 transition-colors ${step > s.number ? "bg-primary" : "bg-secondary"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-12">
            {steps.map((s) => (
              <div key={s.number}>
                <p className="font-semibold text-foreground text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 bg-card border-border mb-8">
          {step === 1 && <WizardStep1 formData={formData} setFormData={setFormData} />}
          {step === 2 && <WizardStep2 formData={formData} setFormData={setFormData} />}
          {step === 3 && <WizardStep3 formData={formData} setFormData={setFormData} />}
        </Card>

        {/* Actions */}
        <div className="flex justify-between gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={step === 1}
            className="border-border text-foreground hover:bg-secondary bg-transparent disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 3 ? "Create Assessment" : "Continue"}
            {step !== 3 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
