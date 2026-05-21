'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Search, Loader2 } from 'lucide-react'

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface CompanyFormProps {
  tenantId: string
}

const emptyForm = {
  name: '', fantasy_name: '', cnpj: '', ie: '', im: '',
  zip_code: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', country: 'Brasil',
  phone: '', whatsapp: '', email: '', email_financial: '', website: '',
  segment: '', status: 'ativo', notes: '',
}

function cleanCnpj(v: string) { return v.replace(/\D/g, '') }
function cleanCep(v: string) { return v.replace(/\D/g, '') }
function maskCnpj(v: string) {
  const d = cleanCnpj(v).slice(0, 14)
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d*)$/, '$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d*)$/, '$1.$2.$3/$4')
    .replace(/^(\d{2})(\d{3})(\d*)$/, '$1.$2.$3')
    .replace(/^(\d{2})(\d*)$/, '$1.$2')
}
function maskCep(v: string) {
  const d = cleanCep(v).slice(0, 8)
  return d.replace(/^(\d{5})(\d*)$/, '$1-$2')
}

export function CompanyForm({ tenantId }: CompanyFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState(emptyForm)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function buscarCnpj() {
    const digits = cleanCnpj(form.cnpj)
    if (digits.length !== 14) { toast.error('CNPJ deve ter 14 dígitos'); return }
    setCnpjLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) { toast.error('CNPJ não encontrado'); return }
      const data = await res.json()
      setForm(prev => ({
        ...prev,
        name: data.razao_social ?? prev.name,
        fantasy_name: data.nome_fantasia ?? prev.fantasy_name,
        street: data.logradouro ?? prev.street,
        number: data.numero ?? prev.number,
        complement: data.complemento ?? prev.complement,
        neighborhood: data.bairro ?? prev.neighborhood,
        city: data.municipio ?? prev.city,
        state: data.uf ?? prev.state,
        zip_code: data.cep ? maskCep(data.cep.replace(/\D/g, '')) : prev.zip_code,
        email: data.email ?? prev.email,
        phone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\s/, ' ') : prev.phone,
      }))
      toast.success('Dados preenchidos pela Receita Federal!')
    } catch {
      toast.error('Erro ao consultar CNPJ')
    } finally {
      setCnpjLoading(false)
    }
  }

  async function buscarCep() {
    const digits = cleanCep(form.zip_code)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`)
      if (!res.ok) return
      const data = await res.json()
      setForm(prev => ({
        ...prev,
        street: data.street ?? prev.street,
        neighborhood: data.neighborhood ?? prev.neighborhood,
        city: data.city ?? prev.city,
        state: data.state ?? prev.state,
      }))
    } catch {} finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('companies').insert({
      tenant_id: tenantId,
      name: form.name,
      fantasy_name: form.fantasy_name || null,
      cnpj: form.cnpj || null,
      ie: form.ie || null,
      im: form.im || null,
      zip_code: form.zip_code || null,
      street: form.street || null,
      number: form.number || null,
      complement: form.complement || null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      email_financial: form.email_financial || null,
      website: form.website || null,
      segment: form.segment || null,
      status: form.status,
      notes: form.notes || null,
    })
    if (error) { toast.error('Erro ao criar empresa'); setLoading(false); return }
    toast.success('Empresa criada!')
    setOpen(false)
    setForm(emptyForm)
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Nova Empresa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-1">

            {/* CNPJ com busca automática */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados Fiscais</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>CNPJ</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.cnpj}
                      onChange={e => set('cnpj', maskCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={buscarCnpj} disabled={cnpjLoading} className="shrink-0">
                      {cnpjLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span className="ml-1.5 hidden sm:inline">Buscar</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">Digite o CNPJ e clique em Buscar para preencher automaticamente</p>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Razão Social *</Label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.fantasy_name} onChange={e => set('fantasy_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Inscrição Estadual</Label>
                  <Input value={form.ie} onChange={e => set('ie', e.target.value)} placeholder="Isento ou número" />
                </div>
                <div className="space-y-1.5">
                  <Label>Inscrição Municipal</Label>
                  <Input value={form.im} onChange={e => set('im', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Endereço</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      value={form.zip_code}
                      onChange={e => set('zip_code', maskCep(e.target.value))}
                      onBlur={buscarCep}
                      placeholder="00000-000"
                    />
                    {cepLoading && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input value={form.number} onChange={e => set('number', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Rua / Logradouro</Label>
                  <Input value={form.street} onChange={e => set('street', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Complemento</Label>
                  <Input value={form.complement} onChange={e => set('complement', e.target.value)} placeholder="Sala, andar..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                  >
                    <option value="">Selecionar</option>
                    {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contato</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 3000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail Comercial</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail Financeiro</Label>
                  <Input type="email" value={form.email_financial} onChange={e => set('email_financial', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Site</Label>
                  <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* Comercial */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Comercial</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Segmento</Label>
                  <Input value={form.segment} onChange={e => set('segment', e.target.value)} placeholder="Construtora, Indústria..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="prospect">Prospect</option>
                    <option value="cliente">Cliente</option>
                    <option value="ex-cliente">Ex-cliente</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar Empresa'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
