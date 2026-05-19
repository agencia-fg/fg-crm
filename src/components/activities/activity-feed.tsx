'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Activity, ActivityType, TenantUser } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MessageSquare, Phone, Users, Mail, MessageCircle, Plus
} from 'lucide-react'

const typeConfig: Record<ActivityType, { label: string; icon: typeof MessageSquare; color: string }> = {
  nota: { label: 'Nota', icon: MessageSquare, color: 'text-gray-500 bg-gray-100' },
  ligacao: { label: 'Ligação', icon: Phone, color: 'text-blue-500 bg-blue-100' },
  reuniao: { label: 'Reunião', icon: Users, color: 'text-purple-500 bg-purple-100' },
  email: { label: 'Email', icon: Mail, color: 'text-orange-500 bg-orange-100' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500 bg-green-100' },
}

interface ActivityFeedProps {
  activities: Activity[]
  tenantId: string
  dealId?: string
  contactId?: string
  currentUser: TenantUser
}

export function ActivityFeed({ activities: initial, tenantId, dealId, contactId, currentUser }: ActivityFeedProps) {
  const [activities, setActivities] = useState(initial)
  const [type, setType] = useState<ActivityType>('nota')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleAdd() {
    if (!body.trim()) return
    setLoading(true)

    const newActivity = {
      tenant_id: tenantId,
      deal_id: dealId ?? null,
      contact_id: contactId ?? null,
      type,
      title: typeConfig[type].label,
      body: body.trim(),
      created_by: currentUser.id,
    }

    const { data, error } = await supabase
      .from('activities')
      .insert(newActivity)
      .select('*')
      .single()

    if (error) { toast.error('Erro ao salvar atividade'); setLoading(false); return }

    setActivities(prev => [{ ...data, author: currentUser }, ...prev])
    setBody('')
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2 mb-3 flex-wrap">
          {(Object.keys(typeConfig) as ActivityType[]).map(t => {
            const { label, icon: Icon } = typeConfig[t]
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  type === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            )
          })}
        </div>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`Registrar ${typeConfig[type].label.toLowerCase()}...`}
          rows={3}
          className="mb-3 resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={loading || !body.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {activities.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">Nenhuma atividade ainda.</p>
        )}
        {activities.map(activity => {
          const { icon: Icon, color } = typeConfig[activity.type] ?? typeConfig.nota
          return (
            <div key={activity.id} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {activity.author?.name ?? 'Usuário'}
                    <span className="font-normal text-gray-400 ml-1">· {typeConfig[activity.type]?.label}</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
