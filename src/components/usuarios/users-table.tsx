'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Shield, User, Crown } from 'lucide-react'
import { TenantUser } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UsersTableProps {
  users: TenantUser[]
  currentUserId: string
  tenantId: string
  isAdmin: boolean
}

const roleConfig = {
  admin: { label: 'Admin', icon: Crown, className: 'bg-indigo-100 text-indigo-700' },
  vendedor: { label: 'Vendedor', icon: User, className: 'bg-gray-100 text-gray-600' },
}

export function UsersTable({ users: initialUsers, currentUserId, tenantId, isAdmin }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(user: TenantUser) {
    if (!confirm(`Remover o acesso de ${user.name}? Essa ação pode ser revertida convidando novamente.`)) return
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
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.name}
                        {isMe && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                      </p>
                    </div>
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
  )
}
