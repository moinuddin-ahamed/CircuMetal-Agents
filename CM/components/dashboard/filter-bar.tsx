"use client"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"

interface FilterBarProps {
  filters: {
    metalType: string
    region: string
    status: string
    timeRange: string
  }
  onFilterChange: (filters: any) => void
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const handleRemoveFilter = (filterKey: string) => {
    onFilterChange({
      ...filters,
      [filterKey]: "",
    })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "")

  return (
    <Card className="p-5 bg-card border-border">
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">Filter Projects</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Metal Type</label>
            <select
              value={filters.metalType}
              onChange={(e) => onFilterChange({ ...filters, metalType: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All metals</option>
              <option value="al">Aluminium</option>
              <option value="cu">Copper</option>
              <option value="ni">Nickel</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Region</label>
            <select
              value={filters.region}
              onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All regions</option>
              <option value="eu">Europe</option>
              <option value="asia">Asia-Pacific</option>
              <option value="na">North America</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Time Range</label>
            <select
              value={filters.timeRange}
              onChange={(e) => onFilterChange({ ...filters, timeRange: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
            {Object.entries(filters).map(([key, value]) =>
              value ? (
                <div
                  key={key}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/15 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <span>{value}</span>
                  <button
                    onClick={() => handleRemoveFilter(key)}
                    className="hover:text-primary/80 transition-colors"
                    aria-label={`Remove ${key} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
