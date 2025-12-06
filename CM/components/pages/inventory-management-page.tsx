"use client"

import { useState, useEffect } from "react"
import { 
  Plus, Trash2, Edit, Search, Package, 
  ArrowLeft, Loader2, Eye, MoreVertical, 
  RefreshCw, AlertCircle, CheckCircle, Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"

interface InventoryManagementPageProps {
  projectId?: string
  onCreateNew: () => void
  onEdit: (inventoryId: string) => void
  onViewDetails: (inventoryId: string) => void
  onBack: () => void
}

interface InventoryRecord {
  id: string
  name: string
  description?: string
  project_id?: string
  inventory?: {
    process_name?: string
    material?: string
    inputs?: Array<{ name: string; amount: number; unit: string }>
  }
  created_at: string
  updated_at: string
}

export default function InventoryManagementPage({
  projectId,
  onCreateNew,
  onEdit,
  onViewDetails,
  onBack,
}: InventoryManagementPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedInventory, setSelectedInventory] = useState<InventoryRecord | null>(null)
  const queryClient = useQueryClient()

  // Fetch inventories
  const { 
    data: inventoriesData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["inventories", projectId],
    queryFn: async () => {
      if (projectId) {
        return apiClient.getProjectInventories(projectId)
      }
      // Fetch all inventories - use recent runs endpoint as workaround
      // In production, you'd have an /api/inventories endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'}/api/inventories`)
      if (!response.ok) throw new Error("Failed to fetch inventories")
      return response.json()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (inventoryId: string) => apiClient.deleteInventory(inventoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] })
      setDeleteDialogOpen(false)
      setSelectedInventory(null)
    },
  })

  const inventories: InventoryRecord[] = inventoriesData?.inventories || []
  
  // Filter inventories based on search
  const filteredInventories = inventories.filter(inv => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.inventory?.material?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteClick = (inventory: InventoryRecord) => {
    setSelectedInventory(inventory)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedInventory) {
      deleteMutation.mutate(selectedInventory.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              Inventory Management
            </h1>
            <p className="text-muted-foreground mt-2">
              View, edit, and manage all material inventories
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              New Inventory
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 bg-card border-border mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search inventories by name, material, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredInventories.length} inventories
            </Badge>
          </div>
        </Card>

        {/* Inventories Table */}
        <Card className="bg-card border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading inventories...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-destructive">
              <AlertCircle className="w-12 h-12 mb-3" />
              <p className="font-medium">Failed to load inventories</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure the backend server is running
              </p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredInventories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No inventories found</p>
              <p className="text-muted-foreground mt-1">
                {searchQuery 
                  ? "Try adjusting your search criteria"
                  : "Create your first inventory to get started"
                }
              </p>
              {!searchQuery && (
                <Button onClick={onCreateNew} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Inventory
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Material</TableHead>
                  <TableHead className="text-muted-foreground">Items</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                  <TableHead className="text-muted-foreground">Updated</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.map((inventory) => (
                  <TableRow 
                    key={inventory.id} 
                    className="border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => onViewDetails(inventory.id)}
                  >
                    <TableCell className="font-medium text-foreground">
                      <div>
                        <p>{inventory.name}</p>
                        {inventory.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {inventory.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {inventory.inventory?.material || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inventory.inventory?.inputs?.length || 0} items
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(inventory.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(inventory.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            onViewDetails(inventory.id)
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            onEdit(inventory.id)
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(inventory)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Inventory</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedInventory?.name}&quot;? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
