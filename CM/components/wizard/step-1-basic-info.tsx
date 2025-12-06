"use client"

import { Input } from "@/components/ui/input"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"

interface Step1Props {
  formData: any
  setFormData: (data: any) => void
}

export default function WizardStep1({ formData, setFormData }: Step1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    if (field === "projectName" && !value) {
      newErrors.projectName = "Project name is required"
    } else {
      delete newErrors.projectName
    }

    if (field === "metalType" && !value) {
      newErrors.metalType = "Metal type must be selected"
    } else {
      delete newErrors.metalType
    }

    if (field === "region" && !value) {
      newErrors.region = "Region must be selected"
    } else {
      delete newErrors.region
    }

    if (field === "functionalUnit" && (!value || isNaN(Number(value)))) {
      newErrors.functionalUnit = "Functional unit must be a valid number"
    } else {
      delete newErrors.functionalUnit
    }

    setErrors(newErrors)
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    validateField(field, value)
  }

  const tooltips = {
    functionalUnit:
      "Defines the basis for comparison (e.g., 1 tonne of aluminium profile). All LCA results are expressed per functional unit.",
    metalType:
      "Select the primary metal for this assessment. The system will use metal-specific emission factors and process parameters.",
    region:
      "Choose the geographic region where production occurs. This affects energy grid mix, logistics, and local emission factors.",
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Project Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Project Name</label>
          <Input
            placeholder="e.g., Aluminium Profile Q4 2024"
            value={formData.projectName}
            onChange={(e) => handleChange("projectName", e.target.value)}
            className={`bg-input text-foreground border-border ${errors.projectName ? "border-red-500 border-2" : ""}`}
          />
          {errors.projectName && <p className="text-xs text-red-500 mt-1">{errors.projectName}</p>}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-foreground">Metal Type</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>{tooltips.metalType}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <select
            value={formData.metalType}
            onChange={(e) => handleChange("metalType", e.target.value)}
            className={`w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg ${
              errors.metalType ? "border-red-500 border-2" : ""
            }`}
          >
            <option value="">Select metal...</option>
            <option value="Aluminium">Aluminium</option>
            <option value="Copper">Copper</option>
            <option value="Nickel">Nickel</option>
            <option value="Other">Other</option>
          </select>
          {errors.metalType && <p className="text-xs text-red-500 mt-1">{errors.metalType}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Product Type</label>
          <select
            value={formData.productType}
            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
            className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg"
          >
            <option value="">Select product...</option>
            <option value="cable">Cable</option>
            <option value="extrusion">Extrusion</option>
            <option value="sheet">Sheet</option>
            <option value="component">Component</option>
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-foreground">Region</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>{tooltips.region}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <select
            value={formData.region}
            onChange={(e) => handleChange("region", e.target.value)}
            className={`w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg ${
              errors.region ? "border-red-500 border-2" : ""
            }`}
          >
            <option value="">Select region...</option>
            <option value="Europe">Europe</option>
            <option value="Asia-Pacific">Asia-Pacific</option>
            <option value="North America">North America</option>
            <option value="Other">Other</option>
          </select>
          {errors.region && <p className="text-xs text-red-500 mt-1">{errors.region}</p>}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-foreground">Functional Unit</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>{tooltips.functionalUnit}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="1"
              value={formData.functionalUnit}
              onChange={(e) => handleChange("functionalUnit", e.target.value)}
              className={`bg-input text-foreground border-border flex-1 ${
                errors.functionalUnit ? "border-red-500 border-2" : ""
              }`}
            />
            <select className="px-3 py-2 bg-input text-foreground border border-border rounded-lg">
              <option>tonne</option>
              <option>kg</option>
              <option>unit</option>
            </select>
          </div>
          {errors.functionalUnit && <p className="text-xs text-red-500 mt-1">{errors.functionalUnit}</p>}
        </div>
      </div>
    </div>
  )
}
