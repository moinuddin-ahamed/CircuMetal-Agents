"use client"

import React, { useEffect, useState } from 'react'
import ParameterForm from './parameter-form'
import { Button } from '@/components/ui/button'

export default function ScenarioDetail({ scenarioId }: { scenarioId: number }) {
    const [loading, setLoading] = useState(false)
    const [scenario, setScenario] = useState<any>(null)
    const [stages, setStages] = useState<any[]>([])
    const [parameters, setParameters] = useState<Record<number, any[]>>({})
    const [results, setResults] = useState<any | null>(null)

    async function load() {
        setLoading(true)
        try {
            const res = await fetch(`/api/scenarios/${scenarioId}`)
            if (!res.ok) {
                const e = await res.json()
                throw new Error(e.error || 'Failed')
            }
            const data = await res.json()
            setScenario(data.scenario)
            setStages(data.stages || [])
            const grouped: Record<number, any[]> = {}
                ; (data.parameters || []).forEach((p: any) => {
                    if (!grouped[p.stage_id]) grouped[p.stage_id] = []
                    grouped[p.stage_id].push(p)
                })
            setParameters(grouped)
        } catch (err) {
            console.error(err)
            alert('Failed to load scenario')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [scenarioId])

    const handleSaved = () => {
        load()
    }

    const autoFill = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/predictions/auto-fill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Auto-fill failed')
            alert(`Auto-filled ${data.updated} parameters`)
            load()
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Auto-fill failed')
        } finally {
            setLoading(false)
        }
    }

    const compute = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/scenarios/${scenarioId}/compute`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Compute failed')
            setResults(data.result)
            alert('Computation finished')
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Computation failed')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div>Loading...</div>
    if (!scenario) return <div>No scenario loaded</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{scenario.name}</h1>
                    <p className="text-sm text-muted-foreground">Route: {scenario.route_type} — Status: {scenario.status}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={autoFill}>Auto-fill missing (AI)</Button>
                    <Button onClick={compute}>Compute LCA</Button>
                </div>
            </div>

            <div className="space-y-4">
                {stages.map((s) => (
                    <div key={s.stage_id} className="p-4 border rounded-md">
                        <h3 className="font-medium">{s.stage_order}. {s.name}</h3>
                        <div className="mt-3 space-y-2">
                            {(parameters[s.stage_id] || []).map((p: any) => (
                                <ParameterForm key={p.parameter_id} parameter={p} onSaved={handleSaved} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {results && (
                <div className="p-4 border rounded-md">
                    <h2 className="font-semibold">Computation Results (raw)</h2>
                    <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(results, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}
