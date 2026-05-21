export type UserRole = 'admin' | 'vendedor'
export type LeadStatus = 'novo' | 'contatado' | 'qualificado' | 'desqualificado'
export type LeadSource = 'site' | 'whatsapp' | 'indicacao' | 'ligacao' | 'email' | 'outro'
export type ActivityType = 'nota' | 'ligacao' | 'reuniao' | 'email' | 'whatsapp'
export type Plan = 'trial' | 'starter' | 'pro'
export type ProductCategory = 'tubos' | 'eletrodutos' | 'conexoes' | 'valvulas' | 'outro'

export interface Tenant {
  id: string
  slug: string
  name: string
  plan: Plan
  logo_url: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: UserRole
  name: string
  email: string
  avatar_url: string | null
  created_at: string
}

export type BillingType = 'unico' | 'mensal' | 'recorrente'
export type ProductStatus = 'ativo' | 'inativo'

export interface Company {
  id: string
  tenant_id: string
  name: string
  fantasy_name: string | null
  cnpj: string | null
  ie: string | null
  im: string | null
  zip_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  email_financial: string | null
  website: string | null
  segment: string | null
  status: string | null
  notes: string | null
  created_at: string
}

export interface Product {
  id: string
  tenant_id: string
  name: string
  category: string | null
  sku: string | null
  description: string | null
  unit_price: number
  billing_type: BillingType
  status: ProductStatus
  created_at: string
}

export interface DealProduct {
  id: string
  tenant_id: string
  deal_id: string
  product_id: string | null
  name: string
  unit_price: number
  quantity: number
  discount_pct: number
  total: number
  created_at: string
  product?: Product
}

export interface Contact {
  id: string
  tenant_id: string
  company_id: string | null
  name: string
  email: string | null
  phone: string | null
  position: string | null
  notes: string | null
  created_at: string
  company?: Company
}

export interface Lead {
  id: string
  tenant_id: string
  source: LeadSource
  status: LeadStatus
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  message: string | null
  assigned_to: string | null
  converted_to_deal_id: string | null
  created_at: string
  assignee?: TenantUser
}

export interface PipelineStage {
  id: string
  tenant_id: string
  name: string
  position: number
  color: string
  created_at: string
}

export interface Deal {
  id: string
  tenant_id: string
  title: string
  contact_id: string | null
  company_id: string | null
  stage_id: string
  assigned_to: string | null
  value: number | null
  product_category: ProductCategory | null
  expected_close_date: string | null
  notes: string | null
  custom_fields: Record<string, string> | null
  created_at: string
  contact?: Contact
  company?: Company
  stage?: PipelineStage
  assignee?: TenantUser
  activities?: Activity[]
}

export interface Activity {
  id: string
  tenant_id: string
  deal_id: string | null
  contact_id: string | null
  type: ActivityType
  title: string
  body: string | null
  scheduled_at: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  author?: TenantUser
}

export interface FormToken {
  id: string
  tenant_id: string
  token: string
  name: string
  field_mappings: Record<string, string>
  active: boolean
  created_at: string
}
