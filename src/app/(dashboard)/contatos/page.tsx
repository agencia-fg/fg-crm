import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { ContactForm } from '@/components/contacts/contact-form'
import { Phone, Mail, Building2 } from 'lucide-react'

export default async function ContatosPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const [contactsRes, companiesRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('*, company:company_id(id, name)')
      .eq('tenant_id', tenant!.id)
      .order('name'),
    supabase
      .from('companies')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .order('name'),
  ])

  const contacts = contactsRes.data ?? []
  const companies = companiesRes.data ?? []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} contato{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <ContactForm tenantId={tenant!.id} companies={companies as any} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  Nenhum contato cadastrado ainda.
                </td>
              </tr>
            )}
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 text-xs font-semibold">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{contact.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{contact.position ?? '—'}</td>
                <td className="px-4 py-3">
                  {(contact as any).company ? (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>{(contact as any).company.name}</span>
                    </div>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />{contact.phone}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />{contact.email}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
