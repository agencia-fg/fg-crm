'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { XCircle, Plus, Trash2, GripVertical } from 'lucide-react'
import { LossReason } from '@/types'

interface LossReasonsSettingsProps {
  tenantId: string
  initialReasons: LossReason[]
  isAdmin: boolean
}

export function LossReasonsSettings({ tenantId, initialReasons, isAdmin }: LossReasonsSettingsProps) {
  const [reasons, setReasons] = useState(initialReasons)
  const [newReason, setNewReason] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newReason.trim()) return
    setLoading(true)

    const nextPosition = reasons.length > 0 ? Math.max(...reasons.map(r => r.position)) + 1 : 1

    const { data, error } = await supabase
      .from('loss_reasons')
      .insert({ tenant_id: tenantId, reason: newReason.trim(), position: nextPosition })
      .select()
      .single()

    if (error || !data) {
      toast.error('Erro ao adicionar motivo')
    } else {
      setReasons(prev => [...prev, data as LossReason])
      setNewReason('')
      toast.success('Motivo adicionado!')
    }
    setLoading(false)
  }

  async function handleDelete(reason: LossReason) {
    const { error } = await supabase.from('loss_reasons').delete().eq('id', reason.id)
    if (error) {
      toast.error('Erro ao remover')
    } else {
      setReasons(prev => prev.filter(r => r.id !== reason.id))
      toast.success('Motivo removido')
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <XCircle className="w-4 h-4 text-gray-400" />
        Motivos de Perda
      </h2>
      <p className="text-xs text-gray-400 mb-5">
        Aparecem como opções ao marcar um negócio como perdido. Cada cliente define os seus.
      </p>

      <div className="space-y-2 mb-4">
        {reasons.map((reason, i) => (
          <div key={reason.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 group">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <span className="flex-1 text-sm text-gray-800">{reason.reason}</span>
            {isAdmin && (
              <button
                onClick={() => handleDelete(reason)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {reasons.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Nenhum motivo cadastrado. Ao marcar como perdido, o usuário digitará livremente.
          </p>
        )}
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newReason}
            onChange={e => setNewReason(e.target.value)}
            placeholder="Ex: Preço acima do orçamento"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={loading || !newReason.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar
          </Button>
        </form>
      )}
    </section>
  )
}
