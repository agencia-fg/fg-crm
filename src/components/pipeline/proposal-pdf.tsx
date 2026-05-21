'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

interface ProposalItem {
  name: string
  quantity: number
  unit_price: number
  discount_pct: number
  total: number
}

interface ProposalData {
  dealTitle: string
  dealNotes: string | null
  companyName: string | null
  companyFantasy: string | null
  companyCnpj: string | null
  companyAddress: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  assigneeName: string | null
  items: ProposalItem[]
  discountPct: number
  taxPct: number
  tenantName: string
  tenantLogoUrl: string | null
  expectedCloseDate: string | null
}

interface ProposalPdfButtonProps {
  data: ProposalData
}

export function ProposalPdfButton({ data }: ProposalPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { ProposalDocument } = await import('./proposal-document')
      const blob = await pdf(<ProposalDocument data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proposta-${data.dealTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      {loading ? 'Gerando PDF...' : 'Gerar Proposta PDF'}
    </Button>
  )
}
