"use client"

import { useState } from "react"
import { METALS_DATA } from "@/lib/metals-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Filter, ArrowRight, Layers, MapPin, Beaker } from "lucide-react"

export default function OreLibrary() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Flatten ores for display
  const allOres = METALS_DATA.flatMap(metal => 
    metal.ores.map(ore => ({
      ...ore,
      metalName: metal.name,
      metalCategory: metal.category,
      metalSymbol: metal.symbol
    }))
  )

  const filteredOres = allOres.filter(ore => {
    const matchesSearch = 
      ore.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ore.metalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ore.mineralogy.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory ? ore.metalCategory === selectedCategory : true
    
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(METALS_DATA.map(m => m.category)))

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Multi Metal Ore Library</h1>
          <p className="text-slate-500">Comprehensive database of ores, mineralogy, and processing characteristics</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search ores, metals, or minerals..." 
            className="pl-9 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <Button 
            variant={selectedCategory === null ? "default" : "outline"} 
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button 
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredOres.map((ore) => (
          <Card key={`${ore.metalName}-${ore.id}`} className="group hover:shadow-md transition-all duration-200 border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <Badge variant="secondary" className="mb-2 bg-slate-100 text-slate-600 hover:bg-slate-200">
                  {ore.metalName} ({ore.metalSymbol})
                </Badge>
                <Badge variant="outline" className="text-xs border-slate-200 text-slate-400">
                  {ore.metalCategory}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                {ore.name}
              </CardTitle>
              <CardDescription className="line-clamp-1">
                {ore.mineralogy}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Grade</span>
                  <span className="font-medium text-slate-700">{ore.gradeRange}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Regions</span>
                  <span className="font-medium text-slate-700 truncate block" title={ore.regions.join(", ")}>
                    {ore.regions[0]}{ore.regions.length > 1 ? ` +${ore.regions.length - 1}` : ""}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Byproducts</span>
                <div className="flex flex-wrap gap-1">
                  {ore.byproducts.length > 0 ? (
                    ore.byproducts.slice(0, 3).map(bp => (
                      <Badge key={bp} variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-200 text-amber-700 bg-amber-50">
                        {bp}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-xs">None listed</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" className="w-full justify-between text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 group-hover:translate-x-1 transition-all">
                View Processing Routes
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
