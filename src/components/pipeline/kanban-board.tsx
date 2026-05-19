'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { Deal, PipelineStage } from '@/types'
import { KanbanColumn } from './kanban-column'
import { DealCard } from './deal-card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface KanbanBoardProps {
  stages: PipelineStage[]
  deals: Deal[]
  tenantId: string
}

export function KanbanBoard({ stages, deals: initialDeals, tenantId }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const dealId = active.id as string
    const overId = over.id as string

    // over pode ser um stage id ou um deal id
    const targetStage = stages.find(s => s.id === overId)
    const targetDeal = deals.find(d => d.id === overId)
    const newStageId = targetStage?.id ?? targetDeal?.stage_id

    if (!newStageId) return

    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.stage_id === newStageId) return

    // Otimistic update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: newStageId } : d))

    const { error } = await supabase
      .from('deals')
      .update({ stage_id: newStageId })
      .eq('id', dealId)

    if (error) {
      toast.error('Erro ao mover negócio')
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: deal.stage_id } : d))
    }
  }

  const dealsByStage = (stageId: string) => deals.filter(d => d.stage_id === stageId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
        {stages.map(stage => (
          <SortableContext
            key={stage.id}
            items={dealsByStage(stage.id).map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              stage={stage}
              deals={dealsByStage(stage.id)}
              tenantId={tenantId}
            />
          </SortableContext>
        ))}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} isDragging />}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
