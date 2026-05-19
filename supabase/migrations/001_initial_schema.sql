-- ============================================================
-- FG CRM - Schema Inicial
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz default now() not null
);

-- ============================================================
-- TENANT USERS (link entre auth.users e tenants)
-- ============================================================
create table public.tenant_users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  unique(tenant_id, user_id)
);

-- ============================================================
-- COMPANIES
-- ============================================================
create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  cnpj text,
  segment text,
  city text,
  state text,
  phone text,
  email text,
  website text,
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- CONTACTS
-- ============================================================
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  position text,
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- LEADS
-- ============================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null default 'outro' check (source in ('site', 'whatsapp', 'indicacao', 'ligacao', 'email', 'outro')),
  status text not null default 'novo' check (status in ('novo', 'contatado', 'qualificado', 'desqualificado')),
  name text not null,
  email text,
  phone text,
  company_name text,
  message text,
  assigned_to uuid references public.tenant_users(id) on delete set null,
  converted_to_deal_id uuid,
  created_at timestamptz default now() not null
);

-- ============================================================
-- PIPELINE STAGES
-- ============================================================
create table public.pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  color text not null default '#6366f1',
  created_at timestamptz default now() not null
);

-- ============================================================
-- DEALS
-- ============================================================
create table public.deals (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  assigned_to uuid references public.tenant_users(id) on delete set null,
  value numeric(12,2),
  product_category text check (product_category in ('tubos', 'eletrodutos', 'conexoes', 'valvulas', 'outro')),
  expected_close_date date,
  notes text,
  custom_fields jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- FK circular: leads.converted_to_deal_id → deals
alter table public.leads
  add constraint leads_converted_to_deal_id_fkey
  foreign key (converted_to_deal_id) references public.deals(id) on delete set null;

-- ============================================================
-- ACTIVITIES
-- ============================================================
create table public.activities (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  type text not null check (type in ('nota', 'ligacao', 'reuniao', 'email', 'whatsapp')),
  title text not null,
  body text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.tenant_users(id) on delete restrict,
  created_at timestamptz default now() not null
);

-- ============================================================
-- FORM TOKENS (webhook para formulário do site)
-- ============================================================
create table public.form_tokens (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  token uuid unique not null default uuid_generate_v4(),
  name text not null,
  field_mappings jsonb not null default '{
    "name": "name",
    "email": "email",
    "phone": "phone",
    "company": "company_name",
    "message": "message"
  }'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_tenant_users_tenant_id on public.tenant_users(tenant_id);
create index idx_tenant_users_user_id on public.tenant_users(user_id);
create index idx_companies_tenant_id on public.companies(tenant_id);
create index idx_contacts_tenant_id on public.contacts(tenant_id);
create index idx_contacts_company_id on public.contacts(company_id);
create index idx_leads_tenant_id on public.leads(tenant_id);
create index idx_leads_status on public.leads(tenant_id, status);
create index idx_pipeline_stages_tenant_id on public.pipeline_stages(tenant_id);
create index idx_deals_tenant_id on public.deals(tenant_id);
create index idx_deals_stage_id on public.deals(stage_id);
create index idx_activities_tenant_id on public.activities(tenant_id);
create index idx_activities_deal_id on public.activities(deal_id);
create index idx_form_tokens_token on public.form_tokens(token);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;
alter table public.form_tokens enable row level security;

-- Helper: retorna o tenant_id do usuário logado
create or replace function public.my_tenant_id()
returns uuid
language sql stable
as $$
  select tenant_id from public.tenant_users where user_id = auth.uid() limit 1;
$$;

-- Tenants: só pode ver o próprio
create policy "tenant_select" on public.tenants
  for select using (id = public.my_tenant_id());

-- tenant_users
create policy "tu_select" on public.tenant_users
  for select using (tenant_id = public.my_tenant_id());
create policy "tu_insert" on public.tenant_users
  for insert with check (tenant_id = public.my_tenant_id());
create policy "tu_update" on public.tenant_users
  for update using (tenant_id = public.my_tenant_id());

-- Macro para as demais tabelas
create policy "companies_all" on public.companies
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "contacts_all" on public.contacts
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "leads_all" on public.leads
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "pipeline_stages_all" on public.pipeline_stages
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "deals_all" on public.deals
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "activities_all" on public.activities
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "form_tokens_all" on public.form_tokens
  using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

-- form_tokens: acesso público para INSERT via webhook (sem auth)
create policy "form_tokens_public_read" on public.form_tokens
  for select using (active = true);

create policy "leads_public_insert" on public.leads
  for insert with check (true);

-- ============================================================
-- DADOS INICIAIS: stages padrão (inseridos via função trigger)
-- ============================================================
create or replace function public.create_default_stages()
returns trigger language plpgsql security definer as $$
begin
  insert into public.pipeline_stages (tenant_id, name, position, color) values
    (new.id, 'Novo Lead',          0, '#94a3b8'),
    (new.id, 'Contatado',          1, '#3b82f6'),
    (new.id, 'Orçamento Enviado',  2, '#f59e0b'),
    (new.id, 'Em Negociação',      3, '#8b5cf6'),
    (new.id, 'Pedido Fechado',     4, '#22c55e'),
    (new.id, 'Perdido',            5, '#ef4444');
  return new;
end;
$$;

create trigger on_tenant_created
  after insert on public.tenants
  for each row execute procedure public.create_default_stages();
