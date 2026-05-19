'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Deal } from '@/types'
import { cn } from '@/lib/utils'
import { Building2, User, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const categoryColors: Record<string, string> = {
  tubos: 'bg-blue-100 text-blue-700',
  eletrodutos: 'bg-purple-100 text-purple-700',
  conexoes: 'bg-orange-100 text-orange-700',
  valvulas: 'bg-teal-100 text-teal-700',
  outro: 'bg-gray-100 text-gray-600',
}

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
      {...listeners}
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing select-none',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg ring-2 ring-indigo-300'
      )}
    >
      <p className="font-medium text-gray-900 text-sm leading-tight mb-2">{deal.title}</p>

      {deal.product_category && (
        <span className={`inline-flex text-xs px-1.5 py-0.5 rounded-full mb-2 ${categoryColors[deal.product_category] ?? categoryColors.outro}`}>
          {deal.product_category}
        </span>
      )}

      <div className="space-y-1">
        {(deal.company?.name || deal.company_id) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{deal.company?.name ?? '—'}</span>
          </div>
        )}
        {deal.value && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <DollarSign className="w-3 h-3" />
            <span>R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(deal.expected_close_date), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        )}
        {deal.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span className="truncate">{deal.assignee.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
