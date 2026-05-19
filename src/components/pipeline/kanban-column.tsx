'use client'

import { useDroppable } from '@dnd-kit/core'
import { Deal, PipelineStage } from '@/types'
import { DealCard } from './deal-card'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  stage: PipelineStage
  deals: Deal[]
  tenantId: string
}

export function KanbanColumn({ stage, deals, tenantId }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-semibold text-gray-800 text-sm">{stage.name}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-xs text-gray-500">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 space-y-2 min-h-[120px] transition-colors',
          isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gray-100'
        )}
      >
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  )
}
