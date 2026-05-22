'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Building2, Save } from 'lucide-react'

interface AccountSettingsProps {
  tenantId: string
  initialName: string
  initialLogoUrl: string
  isAdmin: boolean
}

export function AccountSettings({ tenantId, initialName, initialLogoUrl, isAdmin }: AccountSettingsProps) {
  const [name, setName] = useState(initialName)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('tenants')
      .update({ name, logo_url: logoUrl || null })
      .eq('id', tenantId)

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Configurações salvas! Recarregue a página para ver o logo atualizado.')
    }
    setLoading(false)
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-5">
        <Building2 className="w-4 h-4 text-gray-400" />
        Dados da Conta
      </h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome da empresa</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome da empresa"
            disabled={!isAdmin}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>URL do logo</Label>
          <Input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://empresa.com.br/logo.png"
            disabled={!isAdmin}
          />
          <p className="text-xs text-gray-400">
            Cole a URL de uma imagem. Recomendado: PNG ou SVG com fundo transparente.
          </p>
        </div>

        {logoUrl && (
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg w-fit">
            <img
              src={logoUrl}
              alt="Preview do logo"
              className="h-8 object-contain brightness-0 invert"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-xs text-gray-400">Preview na sidebar</span>
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={loading} size="sm">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}
