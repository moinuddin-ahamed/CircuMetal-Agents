"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ParameterForm({ parameter, onSaved }: any) {
    const [value, setValue] = useState(parameter.value ?? '')
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/parameters/${parameter.parameter_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value }),
            })

            if (!res.ok) {
                const e = await res.json()
                alert(e.error || 'Failed')
            } else {
                onSaved && onSaved()
            }
        } catch (err) {
            console.error(err)
            alert('Save failed')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">{parameter.parameter_name}</label>
                <Input value={String(value)} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
                <Button onClick={save} disabled={saving}>
                    Save
                </Button>
            </div>
        </div>
    )
}
