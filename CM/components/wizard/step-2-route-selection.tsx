"use client"

import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Step2Props {
  formData: any
  setFormData: (data: any) => void
}

export default function WizardStep2({ formData, setFormData }: Step2Props) {
  const [selectedRoute, setSelectedRoute] = useState(formData.route)

  const routes = [
    {
      id: "primary",
      title: "Primary Route",
      description: "Ore extraction → Refining → Smelting → Fabrication",
      icon: "⛏️",
      details: "Higher energy intensity, more emissions. Suitable for initial production from raw materials.",
    },
    {
      id: "secondary",
      title: "Secondary Route",
      description: "Recycled scrap → Remelting → Fabrication",
      icon: "♻️",
      details: "Depends on scrap availability. Significantly reduces GHG emissions and energy consumption.",
    },
    {
      id: "hybrid",
      title: "Hybrid Route",
      description: "Mix of primary & secondary with optimized blend",
      icon: "🔄",
      details: "Balanced recovery model combining both approaches for optimal sustainability performance.",
    },
  ]

  const handleSelectRoute = (routeId: string) => {
    setSelectedRoute(routeId)
    setFormData({ ...formData, route: routeId })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Select Production Route</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {routes.map((route) => (
          <div key={route.id}>
            <Card
              onClick={() => handleSelectRoute(route.id)}
              className={`p-6 cursor-pointer transition-all border-2 ${
                selectedRoute === route.id
                  ? "border-primary bg-primary/5 scale-105"
                  : "border-border hover:border-primary/50 hover:scale-102"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{route.icon}</span>
                {selectedRoute === route.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{route.title}</h3>
              <p className="text-sm text-muted-foreground">{route.description}</p>
            </Card>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full mt-2 text-xs text-muted-foreground hover:text-primary">
                  Learn more
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{route.title}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{route.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-foreground">{route.details}</p>
                  <div className="bg-secondary/50 p-4 rounded-lg border border-border">
                    <p className="text-xs font-medium text-foreground mb-2">Key Considerations:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {route.id === "primary" && (
                        <>
                          <li>- Requires mining and extraction operations</li>
                          <li>- Higher energy consumption</li>
                          <li>- Lower recycled content</li>
                        </>
                      )}
                      {route.id === "secondary" && (
                        <>
                          <li>- Requires scrap material availability</li>
                          <li>- 50-90% less energy than primary</li>
                          <li>- Higher recycled content percentages</li>
                        </>
                      )}
                      {route.id === "hybrid" && (
                        <>
                          <li>- Flexible mix ratios</li>
                          <li>- Optimizes both cost and sustainability</li>
                          <li>- Adapts to material availability</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>
    </div>
  )
}
