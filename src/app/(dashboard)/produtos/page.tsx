import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { ProductForm } from '@/components/products/product-form'
import { Package, Tag } from 'lucide-react'
import { Product, BillingType } from '@/types'

const billingLabels: Record<BillingType, string> = {
  unico: 'Único',
  mensal: 'Mensal',
  recorrente: 'Recorrente',
}

const billingColors: Record<BillingType, string> = {
  unico: 'bg-gray-100 text-gray-600',
  mensal: 'bg-blue-50 text-blue-700',
  recorrente: 'bg-indigo-50 text-indigo-700',
}

export default async function ProdutosPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const items = (products ?? []) as Product[]

  // Agrupa por categoria
  const byCategory = items.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category ?? 'Sem categoria'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const activeCount = items.filter(p => p.status === 'ativo').length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos & Serviços</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} de {items.length} cadastrado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ProductForm tenantId={tenant!.id} />
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum produto cadastrado ainda.</p>
          <p className="text-sm mt-1">Cadastre produtos para vinculá-los aos seus negócios.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, prods]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{category}</h2>
              <span className="text-xs text-gray-400">({prods.length})</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">SKU</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Cobrança</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Valor Unit.</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prods.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.sku ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${billingColors[p.billing_type]}`}>
                          {billingLabels[p.billing_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {Number(p.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
