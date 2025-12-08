"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, MapPin, Calendar, AlertCircle } from "lucide-react"

interface InventoryLogisticsProps {
  onNavigate?: (view: string) => void
}

export default function InventoryLogistics({ onNavigate }: InventoryLogisticsProps) {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Logistics</h1>
          <p className="text-slate-500">Track material stocks, shipments, and supply chain movements</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onNavigate?.("new-inventory")}
        >
          <Package className="w-4 h-4 mr-2" /> Add Inventory
        </Button>
      </div>

      <Tabs defaultValue="logistics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory">Inventory Levels</TabsTrigger>
          <TabsTrigger value="logistics">Logistics & Shipments</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="logistics" className="space-y-6">
          {/* Active Shipments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">In Transit</p>
                    <h3 className="text-2xl font-bold text-blue-900">12</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Delivered (This Month)</p>
                    <h3 className="text-2xl font-bold text-emerald-900">45</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Delayed</p>
                    <h3 className="text-2xl font-bold text-amber-900">2</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shipment List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "SH-2024-001", origin: "Port Hedland, AU", dest: "Shanghai, CN", cargo: "Iron Ore Fines", status: "In Transit", eta: "2 days" },
                  { id: "SH-2024-002", origin: "Rotterdam, NL", dest: "Hamburg, DE", cargo: "Aluminium Scrap", status: "Customs", eta: "1 day" },
                  { id: "SH-2024-003", origin: "Antofagasta, CL", dest: "Tokyo, JP", cargo: "Copper Cathodes", status: "In Transit", eta: "14 days" },
                ].map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{shipment.id}</h4>
                        <p className="text-sm text-slate-500">{shipment.cargo}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{shipment.origin}</span>
                        <span className="text-slate-300">→</span>
                        <span>{shipment.dest}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>ETA: {shipment.eta}</span>
                      </div>
                      <Badge variant={shipment.status === 'In Transit' ? 'default' : 'secondary'} className={shipment.status === 'In Transit' ? 'bg-blue-500' : ''}>
                        {shipment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Inventory management module loading...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
