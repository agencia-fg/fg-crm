import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { CompanyForm } from '@/components/companies/company-form'
import { Building2, MapPin, Phone, Mail } from 'lucide-react'

export default async function EmpresasPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const [{ data: companies }, { data: users }] = await Promise.all([
    supabase.from('companies').select('*').eq('tenant_id', tenant!.id).order('name'),
    supabase.from('tenant_users').select('id, name').eq('tenant_id', tenant!.id),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 text-sm mt-1">{companies?.length ?? 0} empresa{(companies?.length ?? 0) !== 1 ? 's' : ''} cadastrada{(companies?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <CompanyForm tenantId={tenant!.id} users={users ?? []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(companies ?? []).length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            Nenhuma empresa cadastrada ainda.
          </div>
        )}
        {(companies ?? []).map((company) => (
          <div key={company.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                {company.segment && (
                  <p className="text-xs text-gray-500 truncate">{company.segment}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {(company.city || company.state) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{[company.city, company.state].filter(Boolean).join(' — ')}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
              {company.cnpj && (
                <p className="text-xs text-gray-400 pt-1">{company.cnpj}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
