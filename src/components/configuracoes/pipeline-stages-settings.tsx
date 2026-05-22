'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Kanban, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { PipelineStage } from '@/types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#6b7280',
]

interface PipelineStagesSettingsProps {
  tenantId: string
  initialStages: PipelineStage[]
  isAdmin: boolean
}

export function PipelineStagesSettings({ tenantId, initialStages, isAdmin }: PipelineStagesSettingsProps) {
  const [stages, setStages] = useState(initialStages)
  const [editStage, setEditStage] = useState<PipelineStage | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#6366f1' })
  const supabase = createClient()

  function openEdit(stage: PipelineStage) {
    setForm({ name: stage.name, color: stage.color })
    setEditStage(stage)
  }

  function openAdd() {
    setForm({ name: '', color: '#6366f1' })
    setAddOpen(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editStage) return
    setLoading(true)

    const { error } = await supabase
      .from('pipeline_stages')
      .update({ name: form.name, color: form.color })
      .eq('id', editStage.id)

    if (error) {
      toast.error('Erro ao salvar etapa')
    } else {
      setStages(prev => prev.map(s => s.id === editStage.id ? { ...s, name: form.name, color: form.color } : s))
      toast.success('Etapa atualizada!')
      setEditStage(null)
    }
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const nextPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 1

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({ tenant_id: tenantId, name: form.name, color: form.color, position: nextPosition })
      .select()
      .single()

    if (error || !data) {
      toast.error('Erro ao criar etapa')
    } else {
      setStages(prev => [...prev, data as PipelineStage])
      toast.success('Etapa criada!')
      setAddOpen(false)
      setForm({ name: '', color: '#6366f1' })
    }
    setLoading(false)
  }

  async function handleDelete(stage: PipelineStage) {
    if (!confirm(`Remover a etapa "${stage.name}"? Os negócios nessa etapa precisarão ser movidos.`)) return

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', stage.id)

    if (error) {
      toast.error('Erro ao remover: ' + error.message)
    } else {
      setStages(prev => prev.filter(s => s.id !== stage.id))
      toast.success('Etapa removida')
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Kanban className="w-4 h-4 text-gray-400" />
          Etapas do Pipeline
        </h2>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova etapa
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50/50 group">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <span className="flex-1 text-sm text-gray-800 font-medium">{stage.name}</span>
            <span className="text-xs text-gray-400">Posição {i + 1}</span>
            {isAdmin && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(stage)}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(stage)}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {stages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            Nenhuma etapa cadastrada. Crie a primeira etapa do seu pipeline.
          </p>
        )}
      </div>

      {/* Dialog Editar */}
      <Dialog open={!!editStage} onOpenChange={o => !o && setEditStage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 mt-1">
            <StageForm form={form} setForm={setForm} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditStage(null)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-1">
            <StageForm form={form} setForm={setForm} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={loading}>{loading ? 'Criando...' : 'Criar Etapa'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function StageForm({
  form,
  setForm,
}: {
  form: { name: string; color: string }
  setForm: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Nome da etapa *</Label>
        <Input
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Ex: Proposta Enviada"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setForm(p => ({ ...p, color }))}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor: form.color === color ? '#1f2937' : 'transparent',
                transform: form.color === color ? 'scale(1.15)' : 'scale(1)',
              }}
              title={color}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: form.color }} />
          <Input
            value={form.color}
            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            placeholder="#6366f1"
            className="font-mono text-xs h-7 w-28"
          />
        </div>
      </div>
    </>
  )
}
