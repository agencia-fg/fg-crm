'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { UserPlus, AlertCircle } from 'lucide-react'
import { Plan } from '@/types'

const PLAN_LIMITS: Record<Plan, number> = {
  trial: 3,
  starter: 3,
  pro: 10,
}

interface InviteUserFormProps {
  tenantId: string
  tenantSlug: string
  plan: Plan
  currentCount: number
  onInvited: (user: { id: string; name: string; email: string; role: string }) => void
}

export function InviteUserForm({ tenantId, tenantSlug, plan, currentCount, onInvited }: InviteUserFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'vendedor' })

  const limit = PLAN_LIMITS[plan] ?? 3
  const atLimit = currentCount >= limit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        name: form.name,
        role: form.role,
        tenantId,
        tenantSlug,
        plan,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Erro ao convidar usuário')
      setLoading(false)
      return
    }

    toast.success(`Convite enviado para ${form.email}!`)
    onInvited({ id: crypto.randomUUID(), name: form.name, email: form.email, role: form.role })
    setForm({ name: '', email: '', role: 'vendedor' })
    setOpen(false)
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={atLimit}>
        <UserPlus className="w-4 h-4 mr-2" />
        Convidar Usuário
      </Button>

      {atLimit && (
        <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3" />
          Limite de {limit} usuários atingido no plano {plan}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            O usuário receberá um e-mail com o link de acesso.
          </p>

          <div className="bg-indigo-50 text-indigo-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Plano <strong>{plan}</strong>: {currentCount}/{limit} usuários utilizados.
              {currentCount >= limit - 1 && currentCount < limit && ' Último acesso disponível.'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="joao@empresa.com.br"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v ?? 'vendedor' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor — acesso padrão</SelectItem>
                  <SelectItem value="admin">Admin — acesso total + gerencia usuários</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
