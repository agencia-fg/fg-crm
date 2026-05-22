'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, UserPlus, AlertTriangle, AlertCircle, Trash2, Crown, User } from 'lucide-react'
import { TenantUser, Plan } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PLAN_LIMITS: Record<Plan, number> = {
  trial: 3,
  starter: 3,
  pro: 10,
}

const roleConfig = {
  admin: { label: 'Admin', icon: Crown, className: 'bg-indigo-100 text-indigo-700' },
  vendedor: { label: 'Vendedor', icon: User, className: 'bg-gray-100 text-gray-600' },
}

interface UsersSectionProps {
  initialUsers: TenantUser[]
  currentUserId: string
  tenantId: string
  tenantSlug: string
  plan: Plan
  isAdmin: boolean
}

export function UsersSection({
  initialUsers,
  currentUserId,
  tenantId,
  tenantSlug,
  plan,
  isAdmin,
}: UsersSectionProps) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'vendedor' })

  const limit = PLAN_LIMITS[plan] ?? 3
  const atLimit = users.length >= limit

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)

    const res = await fetch('/api/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, name: form.name, role: form.role, tenantId, tenantSlug, plan }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Erro ao convidar usuário')
      setInviteLoading(false)
      return
    }

    // Adiciona optimistically à lista (sem user_id real, mas com placeholder)
    const newUser: TenantUser = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: crypto.randomUUID(),
      role: form.role as 'admin' | 'vendedor',
      name: form.name,
      email: form.email,
      avatar_url: null,
      created_at: new Date().toISOString(),
    }
    setUsers(prev => [...prev, newUser])
    toast.success(`Convite enviado para ${form.email}! O usuário precisa verificar o e-mail para ativar o acesso.`)
    setForm({ name: '', email: '', role: 'vendedor' })
    setInviteOpen(false)
    setInviteLoading(false)
  }

  async function handleRemove(user: TenantUser) {
    if (!confirm(`Remover o acesso de ${user.name}?\n\nO usuário perderá o acesso imediatamente. Você pode reconvidar depois.`)) return
    setRemoving(user.user_id)

    const res = await fetch('/api/remove-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.user_id, tenantId }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Erro ao remover usuário')
      setRemoving(null)
      return
    }

    setUsers(prev => prev.filter(u => u.user_id !== user.user_id))
    toast.success(`Acesso de ${user.name} removido`)
    setRemoving(null)
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Usuários
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className={atLimit ? 'text-amber-600 font-medium' : ''}>
              {users.length}/{limit} usuários
            </span>
            {' '}utilizados no plano <strong>{plan}</strong>
          </p>
        </div>

        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} disabled={atLimit}>
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
        )}
      </div>

      {/* Alerta de limite */}
      {atLimit && isAdmin && (
        <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Limite atingido.</strong> O plano <strong>{plan}</strong> permite até{' '}
            <strong>{limit} usuários</strong>. Entre em contato para fazer upgrade e adicionar mais acessos.
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Desde</th>
              {isAdmin && <th className="w-12" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => {
              const cfg = roleConfig[user.role] ?? roleConfig.vendedor
              const Icon = cfg.icon
              const isMe = user.user_id === currentUserId

              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {user.name}
                        {isMe && <span className="ml-2 text-xs text-gray-400 font-normal">(você)</span>}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(user.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </td>
                  {isAdmin && (
                    <td className="px-2 py-3">
                      {!isMe && (
                        <button
                          onClick={() => handleRemove(user)}
                          disabled={removing === user.user_id}
                          className="p-1.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Remover acesso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isAdmin && (
        <p className="mt-4 text-xs text-gray-400 text-center">
          Apenas administradores podem convidar ou remover usuários.
        </p>
      )}

      {/* Dialog de convite */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            O usuário receberá um e-mail com link para criar a senha e acessar o sistema.
          </p>

          <div className="bg-indigo-50 text-indigo-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Plano <strong>{plan}</strong>: {users.length}/{limit} usuários.
              {users.length >= limit - 1 && users.length < limit && ' Último acesso disponível!'}
            </span>
          </div>

          <form onSubmit={handleInvite} className="space-y-4 mt-1">
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
                  <SelectItem value="vendedor">
                    <div>
                      <p>Vendedor</p>
                      <p className="text-xs text-gray-400">Acesso padrão ao CRM</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div>
                      <p>Admin</p>
                      <p className="text-xs text-gray-400">Acesso total + gerencia usuários</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
