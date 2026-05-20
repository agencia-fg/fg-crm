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

export interface Company {
  id: string
  tenant_id: string
  name: string
  cnpj: string | null
  segment: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  website: string | null
  notes: string | null
  created_at: string
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
