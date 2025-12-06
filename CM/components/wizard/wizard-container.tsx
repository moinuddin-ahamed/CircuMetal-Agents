"use client"

import React from 'react'
import WizardStep1 from './step-1-basic-info'
import WizardStep2 from './step-2-route-selection'
import WizardStep3 from './step-3-scenario-setup'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function WizardContainer({ projectId }: { projectId?: number }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<any>({
        projectName: '',
        metalType: '',
        productType: '',
        region: '',
        functionalUnit: '1',
        routeType: 'primary',
        isBaseline: false,
        name: '',
    })

    const next = () => setStep((s) => Math.min(3, s + 1))
    const prev = () => setStep((s) => Math.max(1, s - 1))

    const submit = async () => {
        // Create project if needed - for now assume projectId provided
        const payload = {
            project_id: projectId || 1,
            name: formData.name || formData.projectName || 'New Scenario',
            route_type: formData.routeType,
            is_baseline: formData.isBaseline,
            description: `Project ${formData.projectName} - scenario ${formData.name}`,
        }

        const res = await fetch('/api/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const err = await res.json()
            alert(err.error || 'Failed to create scenario')
            return
        }

        const data = await res.json()
        // redirect or show created scenario
        window.location.href = `/projects/${payload.project_id}/scenarios/${data.scenario.scenario_id}`
    }

    return (
        <div className="space-y-6">
            {step === 1 && <WizardStep1 formData={formData} setFormData={setFormData} />}
            {step === 2 && <WizardStep2 formData={formData} setFormData={setFormData} />}
            {step === 3 && <WizardStep3 formData={formData} setFormData={setFormData} />}

            <div className="flex items-center justify-between">
                <div>
                    {step > 1 && (
                        <Button variant="ghost" onClick={prev} className="mr-2">
                            Back
                        </Button>
                    )}
                </div>

                <div>
                    {step < 3 && (
                        <Button onClick={next}>
                            Next
                        </Button>
                    )}
                    {step === 3 && (
                        <Button className="ml-2" onClick={submit}>
                            Create Scenario
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
