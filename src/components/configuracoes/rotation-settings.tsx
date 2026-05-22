'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Plus, Trash2, GripVertical, Pause, Play, ChevronRight } from 'lucide-react'
import { RotationQueueEntry, TenantUser } from '@/types'

interface RotationSettingsProps {
  tenantId: string
  initialEnabled: boolean
  initialQueue: (RotationQueueEntry & { tenant_user: TenantUser })[]
  initialLastUserId: string | null
  vendedores: TenantUser[]   // todos os vendedores do tenant (para adicionar à fila)
}

export function RotationSettings({
  tenantId,
  initialEnabled,
  initialQueue,
  initialLastUserId,
  vendedores,
}: RotationSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [queue, setQueue] = useState(initialQueue)
  const [lastUserId, setLastUserId] = useState(initialLastUserId)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Vendedores ainda não na fila
  const available = vendedores.filter(v => !queue.find(q => q.tenant_user_id === v.id))

  // Próximo na fila (preview)
  const activeQueue = queue.filter(q => q.active)
  const lastIdx = activeQueue.findIndex(q => q.tenant_user_id === lastUserId)
  const nextEntry = activeQueue.length > 0 ? activeQueue[(lastIdx + 1) % activeQueue.length] : null

  async function toggleEnabled() {
    const newVal = !enabled
    setEnabled(newVal)
    const { error } = await supabase.from('tenants').update({ rotation_enabled: newVal }).eq('id', tenantId)
    if (error) { toast.error('Erro ao salvar'); setEnabled(!newVal) }
    else toast.success(newVal ? 'Rodízio ativado!' : 'Rodízio desativado')
  }

  async function toggleActive(entry: RotationQueueEntry & { tenant_user: TenantUser }) {
    const newVal = !entry.active
    const { error } = await supabase.from('rotation_queue').update({ active: newVal }).eq('id', entry.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    setQueue(prev => prev.map(q => q.id === entry.id ? { ...q, active: newVal } : q))
    toast.success(newVal ? `${entry.tenant_user.name} reativado` : `${entry.tenant_user.name} pausado`)
  }

  async function removeFromQueue(entry: RotationQueueEntry & { tenant_user: TenantUser }) {
    if (!confirm(`Remover ${entry.tenant_user.name} do rodízio?`)) return
    const { error } = await supabase.from('rotation_queue').delete().eq('id', entry.id)
    if (error) { toast.error('Erro ao remover'); return }
    // Reposiciona os demais
    const remaining = queue.filter(q => q.id !== entry.id)
    const reordered = remaining.map((q, i) => ({ ...q, position: i + 1 }))
    setQueue(reordered)
    // Atualiza positions no banco
    await Promise.all(reordered.map(q => supabase.from('rotation_queue').update({ position: q.position }).eq('id', q.id)))
    toast.success(`${entry.tenant_user.name} removido do rodízio`)
  }

  async function addToQueue(user: TenantUser) {
    setLoading(true)
    const nextPos = queue.length > 0 ? Math.max(...queue.map(q => q.position)) + 1 : 1
    const { data, error } = await supabase
      .from('rotation_queue')
      .insert({ tenant_id: tenantId, tenant_user_id: user.id, position: nextPos, active: true })
      .select('*, tenant_user:tenant_user_id(*)')
      .single()

    if (error || !data) { toast.error('Erro ao adicionar'); setLoading(false); return }
    setQueue(prev => [...prev, data as any])
    toast.success(`${user.name} adicionado ao rodízio`)
    setLoading(false)
  }

  async function moveUp(index: number) {
    if (index === 0) return
    const newQueue = [...queue]
    ;[newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]]
    const updated = newQueue.map((q, i) => ({ ...q, position: i + 1 }))
    setQueue(updated)
    await Promise.all(updated.map(q => supabase.from('rotation_queue').update({ position: q.position }).eq('id', q.id)))
  }

  async function moveDown(index: number) {
    if (index === queue.length - 1) return
    const newQueue = [...queue]
    ;[newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]]
    const updated = newQueue.map((q, i) => ({ ...q, position: i + 1 }))
    setQueue(updated)
    await Promise.all(updated.map(q => supabase.from('rotation_queue').update({ position: q.position }).eq('id', q.id)))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gray-400" />
          Rodízio de Vendedores
        </h2>
        <button
          onClick={toggleEnabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Quando ativo, leads vindos do formulário do site são atribuídos automaticamente ao próximo vendedor na fila.
        Leads manuais sempre requerem atribuição explícita.
      </p>

      {/* Status atual */}
      {enabled && activeQueue.length > 0 && (
        <div className="mb-4 flex items-center gap-3 text-xs bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-600">
            Último recebeu:{' '}
            <strong>{queue.find(q => q.tenant_user_id === lastUserId)?.tenant_user?.name ?? '—'}</strong>
          </span>
          {nextEntry && (
            <>
              <ChevronRight className="w-3 h-3 text-indigo-300" />
              <span className="text-indigo-600">
                Próximo: <strong>{nextEntry.tenant_user?.name}</strong>
              </span>
            </>
          )}
        </div>
      )}

      {/* Fila */}
      <div className="space-y-2 mb-4">
        {queue.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Nenhum vendedor na fila. Adicione abaixo.
          </p>
        )}
        {queue.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-lg border group transition-all ${
              !entry.active ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
            } ${entry.tenant_user_id === nextEntry?.tenant_user_id && enabled ? 'ring-1 ring-indigo-300 border-indigo-200' : ''}`}
          >
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-indigo-600 text-[9px] font-bold">
                {entry.tenant_user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800">
              {entry.tenant_user?.name}
              {entry.tenant_user_id === nextEntry?.tenant_user_id && enabled && (
                <span className="ml-2 text-[10px] text-indigo-500 font-normal">← próximo</span>
              )}
            </span>
            {!entry.active && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">pausado</span>}

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveUp(index)} disabled={index === 0} className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors text-[10px] font-bold">▲</button>
              <button onClick={() => moveDown(index)} disabled={index === queue.length - 1} className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors text-[10px] font-bold">▼</button>
              <button
                onClick={() => toggleActive(entry)}
                className="p-1.5 rounded text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                title={entry.active ? 'Pausar' : 'Reativar'}
              >
                {entry.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={() => removeFromQueue(entry)}
                className="p-1.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="Remover da fila"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar vendedor à fila */}
      {available.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-2">Adicionar à fila:</p>
          <div className="flex flex-wrap gap-2">
            {available.map(v => (
              <button
                key={v.id}
                onClick={() => addToQueue(v)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {available.length === 0 && queue.length > 0 && (
        <p className="text-xs text-gray-400 text-center pt-2">Todos os vendedores já estão na fila.</p>
      )}
    </section>
  )
}
