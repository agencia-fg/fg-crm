'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'

interface PipelineStageData {
  name: string
  deals: number
  valor: number
  color: string
}

interface LeadSourceData {
  name: string
  total: number
}

interface MonthlyData {
  mes: string
  receita: number
  leads: number
}

interface DashboardChartsProps {
  pipelineData: PipelineStageData[]
  leadSourceData: LeadSourceData[]
  monthlyData: MonthlyData[]
}

const SOURCE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function CustomTooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'valor' ? fmt(p.value) : `${p.value} negócio${p.value !== 1 ? 's' : ''}`}
        </p>
      ))}
    </div>
  )
}

function CustomTooltipPie({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function PipelineChart({ data }: { data: PipelineStageData[] }) {
  if (!data.length) return <EmptyChart message="Nenhum negócio no pipeline ainda" />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }}
          tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltipBar />} />
        <Bar yAxisId="left" dataKey="deals" name="deals" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="valor" name="valor" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LeadsOrigemChart({ data }: { data: LeadSourceData[] }) {
  if (!data.length) return <EmptyChart message="Nenhum lead cadastrado ainda" />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          dataKey="total" nameKey="name" paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltipPie />} />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span className="text-xs text-gray-600">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  if (!data.length) return <EmptyChart message="Sem dados de receita por mês ainda" />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="receita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => [fmt(Number(v)), 'Receita']} labelStyle={{ fontWeight: 600 }} />
        <Area type="monotone" dataKey="receita" stroke="#6366f1" strokeWidth={2}
          fill="url(#receita)" dot={{ fill: '#6366f1', r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
      {message}
    </div>
  )
}
