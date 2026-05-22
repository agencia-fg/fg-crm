'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trophy, XCircle, RotateCcw, ChevronDown } from 'lucide-react'
import { DealStatus, LossReason } from '@/types'

interface DealStatusActionsProps {
  dealId: string
  initialStatus: DealStatus
  initialLostReason: string | null
  lossReasons: LossReason[]
}

export function DealStatusActions({
  dealId,
  initialStatus,
  initialLostReason,
  lossReasons,
}: DealStatusActionsProps) {
  const [status, setStatus] = useState<DealStatus>(initialStatus)
  const [lostReason, setLostReason] = useState(initialLostReason ?? '')
  const [lostOpen, setLostOpen] = useState(false)
  const [customReason, setCustomReason] = useState('')
  const [selectedReasonId, setSelectedReasonId] = useState<string>('custom')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function markAs(newStatus: DealStatus, reason?: string) {
    setLoading(true)
    const { error } = await supabase
      .from('deals')
      .update({ status: newStatus, lost_reason: reason ?? null })
      .eq('id', dealId)

    if (error) {
      toast.error('Erro ao atualizar status')
      setLoading(false)
      return
    }

    setStatus(newStatus)
    setLostReason(reason ?? '')
    toast.success(newStatus === 'ganho' ? '🏆 Negócio marcado como Ganho!' : newStatus === 'perdido' ? 'Negócio marcado como Perdido.' : 'Negócio reaberto.')
    setLostOpen(false)
    router.refresh()
    setLoading(false)
  }

  function handleLostSubmit(e: React.FormEvent) {
    e.preventDefault()
    const reason = selectedReasonId === 'custom'
      ? customReason.trim()
      : lossReasons.find(r => r.id === selectedReasonId)?.reason ?? ''
    markAs('perdido', reason || undefined)
  }

  // Banner de status fechado
  if (status === 'ganho') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-2 rounded-lg">
          <Trophy className="w-4 h-4" />
          Negócio Ganho
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => markAs('aberto')}
          disabled={loading}
          className="text-gray-500 border-gray-200 hover:bg-gray-50"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reabrir
        </Button>
      </div>
    )
  }

  if (status === 'perdido') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2 rounded-lg">
          <XCircle className="w-4 h-4" />
          Negócio Perdido
          {lostReason && <span className="text-red-500 font-normal">— {lostReason}</span>}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => markAs('aberto')}
          disabled={loading}
          className="text-gray-500 border-gray-200 hover:bg-gray-50"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reabrir
        </Button>
      </div>
    )
  }

  // Status aberto — mostra botões de ação
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => markAs('ganho')}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white border-0"
        >
          <Trophy className="w-3.5 h-3.5 mr-1.5" />
          Marcar como Ganho
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setSelectedReasonId(lossReasons.length > 0 ? lossReasons[0].id : 'custom'); setCustomReason(''); setLostOpen(true) }}
          disabled={loading}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          Marcar como Perdido
        </Button>
      </div>

      {/* Dialog de perda */}
      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Motivo da Perda</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">Registrar o motivo ajuda a melhorar as próximas negociações.</p>

          <form onSubmit={handleLostSubmit} className="space-y-4 mt-1">
            {lossReasons.length > 0 && (
              <div className="space-y-1.5">
                <Label>Motivo</Label>
                <div className="space-y-1.5">
                  {lossReasons.map(r => (
                    <label key={r.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="reason"
                        value={r.id}
                        checked={selectedReasonId === r.id}
                        onChange={() => setSelectedReasonId(r.id)}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{r.reason}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="reason"
                      value="custom"
                      checked={selectedReasonId === 'custom'}
                      onChange={() => setSelectedReasonId('custom')}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-500">Outro motivo...</span>
                  </label>
                </div>
              </div>
            )}

            {(selectedReasonId === 'custom' || lossReasons.length === 0) && (
              <div className="space-y-1.5">
                <Label>{lossReasons.length > 0 ? 'Descreva o motivo' : 'Motivo'}</Label>
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Ex: Preço acima do orçamento do cliente"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            )}

            <p className="text-xs text-gray-400">Deixe em branco para não registrar motivo.</p>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setLostOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white border-0">
                {loading ? 'Salvando...' : 'Confirmar Perda'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
