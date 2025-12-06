"use client"

import { Card } from "@/components/ui/card"

interface ProcessStageCardProps {
  stage: any
  isSelected: boolean
  onClick: () => void
}

export default function ProcessStageCard({ stage, isSelected, onClick }: ProcessStageCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all border-2 ${
        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{stage.icon}</span>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{stage.name}</h3>
          <p className="text-xs text-muted-foreground">Data completeness</p>
        </div>
        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${stage.dataComplete}%` }} />
        </div>
      </div>
    </Card>
  )
}
