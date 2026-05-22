'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Deal } from '@/types'
import { cn } from '@/lib/utils'
import { Building2, User, Calendar, DollarSign, ExternalLink, Trophy, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface DealCardProps {
  deal: Deal
  isDragging?: boolean
}

export function DealCard({ deal, isDragging }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 select-none',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg ring-2 ring-indigo-300'
      )}
    >
      {/* Área de drag — ocupa a maior parte do card */}
      <div {...listeners} className="p-3 pb-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-gray-900 text-sm leading-tight">{deal.title}</p>
          {deal.status === 'ganho' && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
              <Trophy className="w-2.5 h-2.5" />Ganho
            </span>
          )}
          {deal.status === 'perdido' && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
              <XCircle className="w-2.5 h-2.5" />Perdido
            </span>
          )}
        </div>

        <div className="space-y-1 mt-2">
          {deal.company?.name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{deal.company.name}</span>
            </div>
          )}
          {deal.value && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <DollarSign className="w-3 h-3 shrink-0" />
              <span>{Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          )}
          {deal.expected_close_date && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{format(new Date(deal.expected_close_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
          {deal.assignee && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{deal.assignee.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer com botão de abrir — fora da área de drag */}
      <div className="px-3 pb-2.5 flex justify-end">
        <Link
          href={`/pipeline/${deal.id}`}
          onPointerDown={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Abrir
        </Link>
      </div>
    </div>
  )
}
