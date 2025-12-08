"use client"

import { useState } from "react"
import { Plus, Trash2, Upload, FileSpreadsheet, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateInventory, InventoryItem, InventoryData } from "@/lib/api"

interface InventoryInputPageProps {
  projectId?: string
  onComplete: (inventoryId: string) => void
  onBack: () => void
}

const MATERIAL_CATEGORIES = [
  { value: "metal", label: "Metal" },
  { value: "alloy", label: "Alloy" },
  { value: "scrap", label: "Scrap Metal" },
  { value: "ore", label: "Ore" },
  { value: "concentrate", label: "Concentrate" },
  { value: "energy", label: "Energy" },
  { value: "chemical", label: "Chemical" },
  { value: "water", label: "Water" },
  { value: "other", label: "Other" },
]

const UNITS = [
  { value: "kg", label: "kg" },
  { value: "tonne", label: "tonne" },
  { value: "g", label: "g" },
  { value: "kWh", label: "kWh" },
  { value: "MJ", label: "MJ" },
  { value: "m3", label: "m³" },
  { value: "L", label: "L" },
]

const SOURCE_TYPES = [
  { value: "primary", label: "Primary (Virgin)" },
  { value: "secondary", label: "Secondary (Recycled)" },
  { value: "recycled", label: "Post-consumer Recycled" },
]

const INITIAL_ITEM: InventoryItem = {
  name: "",
  category: "metal",
  quantity: 0,
  unit: "kg",
  source: "primary",
  recycled_content: 0,
  origin: "",
}

export default function InventoryInputPage({ projectId, onComplete, onBack }: InventoryInputPageProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<InventoryItem[]>([{ ...INITIAL_ITEM }])
  
  const createInventory = useCreateInventory()

  const addItem = () => {
    setItems([...items, { ...INITIAL_ITEM }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InventoryItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSubmit = async () => {
    // Validate
    if (!name.trim()) {
      alert("Please enter an inventory name")
      return
    }

    const validItems = items.filter(item => item.name.trim() && item.quantity > 0)
    if (validItems.length === 0) {
      alert("Please add at least one valid item with a name and quantity")
      return
    }

    const inventoryData: InventoryData = {
      name: name.trim(),
      project_id: projectId,
      description: description.trim() || undefined,
      items: validItems,
      metadata: {
        created_via: "web_form",
      },
    }

    try {
      const result = await createInventory.mutateAsync(inventoryData)
      onComplete(result.inventory_id)
    } catch (error) {
      console.error("Failed to create inventory:", error)
      alert("Failed to create inventory. Please try again.")
    }
  }

  return (
    <div className="h-full bg-gradient-to-br from-white via-green-50/30 to-white p-8 overflow-auto">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-slate-500 hover:text-green-700 hover:bg-green-50 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-600/20">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">New Inventory</h1>
                <p className="text-slate-500 mt-1">
                  Enter material inputs for LCA analysis
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-300">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Import CSV
            </Button>
            <Button variant="outline" className="gap-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-300">
              <Upload className="w-4 h-4 text-green-600" />
              Upload Excel
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-green-100/50 shadow-lg rounded-2xl mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">Inventory Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Aluminum Slab Production Q1 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-green-100 focus:border-green-400 focus:ring-green-400/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of this inventory"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-green-100 focus:border-green-400 focus:ring-green-400/20"
              />
            </div>
          </div>
        </Card>

        {/* Material Items */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-green-100/50 shadow-lg rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Material Inputs</h2>
            <Button onClick={addItem} size="sm" className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all duration-300">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-background rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item {index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Material Name *</Label>
                    <Input
                      placeholder="e.g., Aluminum Ingot"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={item.category}
                      onValueChange={(v) => updateItem(index, "category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <Select
                      value={item.source || "primary"}
                      onValueChange={(v) => updateItem(index, "source", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.map((src) => (
                          <SelectItem key={src.value} value={src.value}>
                            {src.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateItem(index, "unit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recycled Content (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={item.recycled_content || ""}
                      onChange={(e) => updateItem(index, "recycled_content", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Origin/Region</Label>
                    <Input
                      placeholder="e.g., Europe"
                      value={item.origin || ""}
                      onChange={(e) => updateItem(index, "origin", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-6 bg-primary/5 border border-primary/20 mb-6">
          <h2 className="font-semibold text-foreground mb-3">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Items</p>
              <p className="text-lg font-semibold text-foreground">
                {items.filter(i => i.name.trim()).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Primary Sources</p>
              <p className="text-lg font-semibold text-foreground">
                {items.filter(i => i.source === "primary").length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Recycled Sources</p>
              <p className="text-lg font-semibold text-foreground">
                {items.filter(i => i.source !== "primary").length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg. Recycled Content</p>
              <p className="text-lg font-semibold text-foreground">
                {items.length > 0
                  ? Math.round(items.reduce((sum, i) => sum + (i.recycled_content || 0), 0) / items.length)
                  : 0}%
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createInventory.isPending}
            className="gap-2"
          >
            {createInventory.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Create Inventory
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
