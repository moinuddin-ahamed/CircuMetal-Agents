"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Truck, Leaf } from "lucide-react"

export default function TradingFloor() {
  const listings = [
    { id: 1, type: "Secondary", material: "Aluminium Scrap (Taint/Tabor)", grade: "98%", quantity: "500 MT", price: "$1,850/MT", trend: "up", location: "Rotterdam, NL", seller: "EcoMetal Recyclers", co2: "-92%" },
    { id: 2, type: "Byproduct", material: "Red Mud (Bauxite Residue)", grade: "High Fe", quantity: "10,000 MT", price: "$15/MT", trend: "stable", location: "Guinea", seller: "Global Alumina Co", co2: "N/A" },
    { id: 3, type: "Secondary", material: "Copper Cathode (Off-spec)", grade: "99.5%", quantity: "120 MT", price: "$8,200/MT", trend: "down", location: "Hamburg, DE", seller: "Nordic Smelters", co2: "-45%" },
    { id: 4, type: "Byproduct", material: "Copper Slag (Granulated)", grade: "Abrasive Grade", quantity: "5,000 MT", price: "$45/MT", trend: "up", location: "Chile", seller: "Andes Mining", co2: "Low" },
    { id: 5, type: "Secondary", material: "Lithium Black Mass", grade: "Li 4%, Co 12%", quantity: "50 MT", price: "Market Index", trend: "up", location: "South Korea", seller: "Battery Loop", co2: "-70%" },
  ]

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trading Floor</h1>
          <p className="text-slate-500">Marketplace for secondary metals, byproducts, and residues</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          Create Listing
        </Button>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Aluminium Scrap", price: "$1,850", change: "+2.4%", trend: "up" },
          { label: "Copper Scrap", price: "$7,920", change: "-0.8%", trend: "down" },
          { label: "Black Mass", price: "$3,200", change: "+5.1%", trend: "up" },
          { label: "Steel Scrap (HMS 1)", price: "$380", change: "+1.2%", trend: "up" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase">{item.label}</p>
                <p className="text-xl font-bold text-slate-900">{item.price}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${item.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {item.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {item.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listings */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Active Listings</CardTitle>
            <Tabs defaultValue="all" className="w-[400px]">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="secondary">Secondary</TabsTrigger>
                <TabsTrigger value="byproducts">Byproducts</TabsTrigger>
                <TabsTrigger value="residues">Residues</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {listings.map((listing) => (
              <div key={listing.id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group bg-white">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${listing.type === 'Secondary' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {listing.type === 'Secondary' ? <Recycle className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{listing.material}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{listing.seller}</span>
                      <span>•</span>
                      <span>{listing.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 flex-1 justify-end mt-4 md:mt-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase">Quantity</p>
                    <p className="font-medium text-slate-700">{listing.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase">Price</p>
                    <p className="font-bold text-slate-900">{listing.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase">CO2 Savings</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {listing.co2}
                    </Badge>
                  </div>
                  <Button size="sm" className="bg-slate-900 text-white hover:bg-emerald-600">
                    View Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Recycle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
      <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
      <path d="m14 16-3 3 3 3" />
      <path d="M8.293 13.596 7.196 9.5 3.1 9.5a1.83 1.83 0 0 1-1.582-.885 1.784 1.784 0 0 1-.004-1.784l4.296-7.382a1.83 1.83 0 0 1 1.582-.885h8.232a1.83 1.83 0 0 1 1.582.885l4.296 7.382a1.784 1.784 0 0 1-.004 1.784L19.808 12" />
      <path d="m17 10 3-3-3-3" />
    </svg>
  )
}
