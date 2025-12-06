"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"

interface SankeyNode {
  id: string
  name: string
  category?: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
  label?: string
}

interface SankeyDiagramProps {
  nodes: SankeyNode[]
  links: SankeyLink[]
  width?: number
  height?: number
  title?: string
}

// Sankey layout calculation
function calculateSankeyLayout(
  nodes: SankeyNode[],
  links: SankeyLink[],
  width: number,
  height: number
) {
  const nodeWidth = 20
  const nodePadding = 10
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Calculate node positions by category/column
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, x: 0, y: 0, dy: 0 }]))

  // Determine columns based on link relationships
  const columns: Map<string, number> = new Map()
  const visited = new Set<string>()

  // Find source nodes (nodes with no incoming links)
  const hasIncoming = new Set(links.map((l) => l.target))
  const sourceNodes = nodes.filter((n) => !hasIncoming.has(n.id))

  // BFS to assign columns
  let currentColumn = 0
  let queue = sourceNodes.map((n) => n.id)

  while (queue.length > 0) {
    const nextQueue: string[] = []
    for (const nodeId of queue) {
      if (!visited.has(nodeId)) {
        visited.add(nodeId)
        columns.set(nodeId, currentColumn)

        // Find connected nodes
        const connected = links
          .filter((l) => l.source === nodeId)
          .map((l) => l.target)
          .filter((t) => !visited.has(t))
        nextQueue.push(...connected)
      }
    }
    queue = nextQueue
    currentColumn++
  }

  // Calculate x positions based on columns
  const maxColumn = Math.max(...Array.from(columns.values()), 0)
  const columnWidth = maxColumn > 0 ? innerWidth / maxColumn : innerWidth

  for (const [nodeId, col] of columns) {
    const node = nodeMap.get(nodeId)
    if (node) {
      node.x = margin.left + col * columnWidth
    }
  }

  // Calculate node values (sum of incoming or outgoing links)
  const nodeValues: Map<string, number> = new Map()
  for (const node of nodes) {
    const incoming = links
      .filter((l) => l.target === node.id)
      .reduce((sum, l) => sum + l.value, 0)
    const outgoing = links
      .filter((l) => l.source === node.id)
      .reduce((sum, l) => sum + l.value, 0)
    nodeValues.set(node.id, Math.max(incoming, outgoing) || 1)
  }

  // Calculate y positions
  const columnNodes: Map<number, string[]> = new Map()
  for (const [nodeId, col] of columns) {
    if (!columnNodes.has(col)) {
      columnNodes.set(col, [])
    }
    columnNodes.get(col)!.push(nodeId)
  }

  for (const [col, nodeIds] of columnNodes) {
    const totalValue = nodeIds.reduce(
      (sum, id) => sum + (nodeValues.get(id) || 1),
      0
    )
    const scale = (innerHeight - (nodeIds.length - 1) * nodePadding) / totalValue

    let y = margin.top
    for (const nodeId of nodeIds) {
      const node = nodeMap.get(nodeId)
      if (node) {
        node.y = y
        node.dy = (nodeValues.get(nodeId) || 1) * scale
        y += node.dy + nodePadding
      }
    }
  }

  // Calculate link paths
  const layoutLinks = links.map((link) => {
    const source = nodeMap.get(link.source)
    const target = nodeMap.get(link.target)

    if (!source || !target) {
      return null
    }

    const sourceValue = nodeValues.get(link.source) || 1
    const targetValue = nodeValues.get(link.target) || 1
    const linkHeight = Math.min(
      (link.value / sourceValue) * source.dy,
      (link.value / targetValue) * target.dy
    )

    return {
      ...link,
      sourceX: source.x + nodeWidth,
      sourceY: source.y + source.dy / 2,
      targetX: target.x,
      targetY: target.y + target.dy / 2,
      width: linkHeight,
    }
  }).filter(Boolean)

  return {
    nodes: Array.from(nodeMap.values()),
    links: layoutLinks,
    nodeWidth,
    margin,
  }
}

// Color palette for different categories
const CATEGORY_COLORS: Record<string, string> = {
  input: "oklch(0.5 0.15 200)",
  process: "oklch(0.5 0.15 165)",
  output: "oklch(0.5 0.15 100)",
  waste: "oklch(0.5 0.15 30)",
  energy: "oklch(0.5 0.15 280)",
  default: "oklch(0.5 0.1 0)",
}

export default function SankeyDiagram({
  nodes,
  links,
  width = 800,
  height = 400,
  title = "Material Flow",
}: SankeyDiagramProps) {
  const [layout, setLayout] = useState<ReturnType<typeof calculateSankeyLayout> | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)

  useEffect(() => {
    if (nodes.length > 0 && links.length > 0) {
      setLayout(calculateSankeyLayout(nodes, links, width, height))
    }
  }, [nodes, links, width, height])

  if (!layout || nodes.length === 0) {
    return (
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold text-foreground mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No flow data available
        </div>
      </Card>
    )
  }

  const getNodeColor = (node: { category?: string }) => {
    return CATEGORY_COLORS[node.category || "default"] || CATEGORY_COLORS.default
  }

  const generateLinkPath = (link: (typeof layout.links)[0]) => {
    if (!link) return ""

    const { sourceX, sourceY, targetX, targetY } = link as {
      sourceX: number
      sourceY: number
      targetX: number
      targetY: number
    }

    const midX = (sourceX + targetX) / 2

    return `
      M ${sourceX} ${sourceY}
      C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}
    `
  }

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <svg width={width} height={height} className="overflow-visible">
        {/* Links */}
        <g>
          {layout.links.map((link, idx) => (
            <path
              key={idx}
              d={generateLinkPath(link)}
              fill="none"
              stroke={hoveredLink === idx ? "oklch(0.6 0.15 165)" : "oklch(0.4 0.05 0)"}
              strokeWidth={(link as any)?.width || 2}
              strokeOpacity={hoveredLink === idx ? 0.9 : 0.5}
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoveredLink(idx)}
              onMouseLeave={() => setHoveredLink(null)}
            />
          ))}
        </g>

        {/* Nodes */}
        <g>
          {layout.nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={layout.nodeWidth}
                height={node.dy}
                fill={getNodeColor(node)}
                rx={4}
                className="transition-all cursor-pointer"
                opacity={hoveredNode === node.id ? 1 : 0.8}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              />
              <text
                x={node.x + layout.nodeWidth + 6}
                y={node.y + node.dy / 2}
                dy="0.35em"
                fontSize={11}
                fill="oklch(0.85 0 0)"
                className="pointer-events-none"
              >
                {node.name}
              </text>
            </g>
          ))}
        </g>

        {/* Tooltip */}
        {hoveredLink !== null && layout.links[hoveredLink] && (
          <g>
            <rect
              x={(layout.links[hoveredLink] as any).sourceX + 50}
              y={(layout.links[hoveredLink] as any).sourceY - 20}
              width={120}
              height={30}
              fill="oklch(0.16 0 0)"
              stroke="oklch(0.25 0 0)"
              rx={4}
            />
            <text
              x={(layout.links[hoveredLink] as any).sourceX + 110}
              y={(layout.links[hoveredLink] as any).sourceY - 5}
              fontSize={11}
              fill="oklch(0.9 0 0)"
              textAnchor="middle"
            >
              {(layout.links[hoveredLink] as any).value.toFixed(1)} kg
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs">
        {Object.entries(CATEGORY_COLORS)
          .filter(([key]) => key !== "default")
          .map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground capitalize">{category}</span>
            </div>
          ))}
      </div>
    </Card>
  )
}

// Helper component for displaying Sankey with sample data
export function SampleSankeyDiagram() {
  const sampleNodes: SankeyNode[] = [
    { id: "ore", name: "Iron Ore", category: "input" },
    { id: "scrap", name: "Steel Scrap", category: "input" },
    { id: "energy", name: "Electricity", category: "energy" },
    { id: "smelting", name: "Smelting", category: "process" },
    { id: "refining", name: "Refining", category: "process" },
    { id: "steel", name: "Steel Output", category: "output" },
    { id: "slag", name: "Slag", category: "waste" },
    { id: "emissions", name: "CO2 Emissions", category: "waste" },
  ]

  const sampleLinks: SankeyLink[] = [
    { source: "ore", target: "smelting", value: 1500 },
    { source: "scrap", target: "smelting", value: 500 },
    { source: "energy", target: "smelting", value: 200 },
    { source: "smelting", target: "refining", value: 1800 },
    { source: "smelting", target: "slag", value: 300 },
    { source: "smelting", target: "emissions", value: 100 },
    { source: "refining", target: "steel", value: 1700 },
    { source: "refining", target: "emissions", value: 100 },
  ]

  return (
    <SankeyDiagram
      nodes={sampleNodes}
      links={sampleLinks}
      title="Material Flow Diagram"
    />
  )
}
