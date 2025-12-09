"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { TransportLeg, LogisticsData } from "@/lib/metals-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Truck, Train, Ship, ArrowRight, MapPin, Route, Loader2, 
  Navigation, Clock, Fuel, AlertCircle, Maximize2, Minimize2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Transport mode icons and colors
const TRANSPORT_MODES: Record<string, { icon: typeof Truck; color: string; label: string }> = {
  truck: { icon: Truck, color: '#ef4444', label: 'Road Transport' },
  rail: { icon: Train, color: '#3b82f6', label: 'Rail Transport' },
  ship: { icon: Ship, color: '#06b6d4', label: 'Sea Transport' },
  pipeline: { icon: Route, color: '#8b5cf6', label: 'Pipeline' },
  conveyor: { icon: ArrowRight, color: '#f59e0b', label: 'Conveyor' }
}

interface LogisticsMapProps {
  logistics: LogisticsData | undefined
  routeName?: string
}

// Google Maps types (using any to avoid type dependency issues)
interface GoogleMapsWindow extends Window {
  google?: {
    maps: any
  }
}

export default function LogisticsMap({ logistics, routeName }: LogisticsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLeg, setSelectedLeg] = useState<TransportLeg | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [optimizedRoutes, setOptimizedRoutes] = useState<any>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Helper to access google maps from window
  const getGoogleMaps = () => (window as any).google?.maps

  // Load Google Maps script
  useEffect(() => {
    if (getGoogleMaps()) {
      setIsLoading(false)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError("Google Maps API key not configured")
      setIsLoading(false)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoading(false)
    }
    script.onerror = () => {
      setError("Failed to load Google Maps")
      setIsLoading(false)
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [])

  // Initialize map when loaded
  useEffect(() => {
    const googleMaps = getGoogleMaps()
    if (isLoading || error || !mapRef.current || !googleMaps || !logistics) return

    // Clear previous markers and polylines
    markersRef.current.forEach(m => m.setMap(null))
    polylinesRef.current.forEach(p => p.setMap(null))
    markersRef.current = []
    polylinesRef.current = []

    // Create map centered on India
    const map = new googleMaps.Map(mapRef.current, {
      zoom: 5,
      center: { lat: 20.5937, lng: 78.9629 }, // Center of India
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
      ]
    })
    mapInstanceRef.current = map

    // Create info window
    infoWindowRef.current = new googleMaps.InfoWindow()

    // Collect all unique locations
    const locations = new Map<string, { name: string; coords: { lat: number; lng: number }; stageId: string }>()
    const bounds = new googleMaps.LatLngBounds()

    logistics.transportLegs.forEach(leg => {
      const fromKey = `${leg.fromLocation.coordinates.lat},${leg.fromLocation.coordinates.lng}`
      const toKey = `${leg.toLocation.coordinates.lat},${leg.toLocation.coordinates.lng}`
      
      if (!locations.has(fromKey)) {
        locations.set(fromKey, {
          name: leg.fromLocation.name,
          coords: leg.fromLocation.coordinates,
          stageId: leg.fromStage
        })
      }
      if (!locations.has(toKey)) {
        locations.set(toKey, {
          name: leg.toLocation.name,
          coords: leg.toLocation.coordinates,
          stageId: leg.toStage
        })
      }
    })

    // Add markers for each location
    let markerIndex = 1
    locations.forEach((loc, key) => {
      const marker = new googleMaps.Marker({
        position: loc.coords,
        map,
        title: loc.name,
        label: {
          text: String(markerIndex),
          color: 'white',
          fontWeight: 'bold'
        },
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        }
      })

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(`
          <div style="padding: 8px; min-width: 150px;">
            <strong style="color: #059669;">${loc.name}</strong>
            <br/>
            <small style="color: #666;">Stage: ${loc.stageId}</small>
          </div>
        `)
        infoWindowRef.current?.open(map, marker)
      })

      markersRef.current.push(marker)
      bounds.extend(loc.coords)
      markerIndex++
    })

    // Draw transport routes
    logistics.transportLegs.forEach((leg, index) => {
      const modeConfig = TRANSPORT_MODES[leg.mode] || TRANSPORT_MODES.truck
      
      const polyline = new googleMaps.Polyline({
        path: [leg.fromLocation.coordinates, leg.toLocation.coordinates],
        geodesic: true,
        strokeColor: modeConfig.color,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [{
          icon: {
            path: googleMaps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: modeConfig.color
          },
          offset: '50%'
        }]
      })

      polyline.setMap(map)

      polyline.addListener('click', () => {
        setSelectedLeg(leg)
        const midLat = (leg.fromLocation.coordinates.lat + leg.toLocation.coordinates.lat) / 2
        const midLng = (leg.fromLocation.coordinates.lng + leg.toLocation.coordinates.lng) / 2
        
        infoWindowRef.current?.setContent(`
          <div style="padding: 12px; min-width: 200px;">
            <strong style="color: ${modeConfig.color};">${leg.material}</strong>
            <hr style="margin: 8px 0; border-color: #eee;"/>
            <div style="display: grid; gap: 4px; font-size: 12px;">
              <div><strong>From:</strong> ${leg.fromLocation.name}</div>
              <div><strong>To:</strong> ${leg.toLocation.name}</div>
              <div><strong>Mode:</strong> ${modeConfig.label}</div>
              <div><strong>Distance:</strong> ${leg.distance} km</div>
              <div><strong>Duration:</strong> ${leg.duration}</div>
              <div><strong>Emissions:</strong> ${leg.emissions} kg CO₂e/t</div>
            </div>
          </div>
        `)
        infoWindowRef.current?.setPosition({ lat: midLat, lng: midLng })
        infoWindowRef.current?.open(map)
      })

      polylinesRef.current.push(polyline)
    })

    // Fit bounds to show all markers
    if (locations.size > 0) {
      map.fitBounds(bounds, 50)
    }

  }, [isLoading, error, logistics])

  // Request route optimization from backend
  const handleOptimizeRoutes = async () => {
    if (!logistics) return
    
    setIsOptimizing(true)
    try {
      const response = await fetch('http://localhost:8000/api/logistics/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transportLegs: logistics.transportLegs
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setOptimizedRoutes(data)
        // Update map with optimized routes if available
      }
    } catch (err) {
      console.error('Route optimization failed:', err)
    } finally {
      setIsOptimizing(false)
    }
  }

  if (!logistics || logistics.transportLegs.length === 0) {
    return (
      <Card className="border-emerald-100 bg-white">
        <CardContent className="flex flex-col items-center justify-center h-48 text-slate-400">
          <MapPin className="w-12 h-12 mb-3 opacity-20" />
          <p>No logistics data available for this route.</p>
          <p className="text-sm mt-2">Generate a lifecycle with the AI agent to see transport logistics.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-emerald-100 bg-white overflow-hidden transition-all ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="pb-2 border-b border-emerald-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-600" />
            Transport Logistics
            {routeName && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs ml-2">
                {routeName}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOptimizeRoutes}
              disabled={isOptimizing}
              className="text-xs"
            >
              {isOptimizing ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Optimizing...</>
              ) : (
                <><Navigation className="w-3 h-3 mr-1" /> Optimize Routes</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          {logistics.transportLegs.length} transport legs • {logistics.totalDistance.toLocaleString()} km total • {logistics.totalTransportEmissions} kg CO₂e
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="map" className="flex-1">Map View</TabsTrigger>
            <TabsTrigger value="list" className="flex-1">Route Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="m-0">
            {/* Map Container */}
            <div className={`relative ${isExpanded ? 'h-[calc(100vh-200px)]' : 'h-[400px]'}`}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="ml-2 text-slate-600">Loading map...</span>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p>{error}</p>
                  <p className="text-sm mt-1">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local</p>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full" />
            </div>
            
            {/* Legend */}
            <div className="p-3 bg-slate-50 border-t flex flex-wrap gap-4 justify-center">
              {Object.entries(TRANSPORT_MODES).map(([mode, config]) => {
                const Icon = config.icon
                return (
                  <div key={mode} className="flex items-center gap-1 text-xs text-slate-600">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                    <Icon className="w-3 h-3" style={{ color: config.color }} />
                    <span>{config.label}</span>
                  </div>
                )
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="list" className="m-0">
            <div className={`overflow-auto ${isExpanded ? 'max-h-[calc(100vh-200px)]' : 'max-h-[400px]'}`}>
              <div className="divide-y divide-slate-100">
                {logistics.transportLegs.map((leg, index) => {
                  const modeConfig = TRANSPORT_MODES[leg.mode] || TRANSPORT_MODES.truck
                  const Icon = modeConfig.icon
                  
                  return (
                    <div 
                      key={leg.id} 
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedLeg?.id === leg.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedLeg(leg)}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${modeConfig.color}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: modeConfig.color }} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-800 truncate">{leg.material}</span>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: modeConfig.color, color: modeConfig.color }}
                            >
                              {modeConfig.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center text-sm text-slate-500 gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{leg.fromLocation.name}</span>
                            <ArrowRight className="w-3 h-3 mx-1 flex-shrink-0" />
                            <span className="truncate">{leg.toLocation.name}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Route className="w-3 h-3" />
                              {leg.distance} km
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {leg.duration}
                            </div>
                            <div className="flex items-center gap-1">
                              <Fuel className="w-3 h-3" />
                              {leg.emissions} kg CO₂e/t
                            </div>
                            {leg.vehicleType && (
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {leg.vehicleType}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-slate-400 flex-shrink-0">
                          Leg {index + 1}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Summary Footer */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-emerald-50 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-700">{logistics.totalDistance.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Distance (km)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-700">{logistics.transportLegs.length}</div>
            <div className="text-xs text-slate-500">Transport Legs</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">{logistics.totalTransportEmissions}</div>
            <div className="text-xs text-slate-500">Transport CO₂e (kg/t)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
