import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const fmt = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1f2937', padding: '40 48', backgroundColor: '#ffffff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { width: 100, height: 32, objectFit: 'contain' },
  logoFallback: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#6366f1' },
  headerRight: { alignItems: 'flex-end' },
  proposalTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  proposalMeta: { fontSize: 8, color: '#6b7280', marginBottom: 1 },

  // Divider
  divider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 20 },
  dividerAccent: { height: 2, backgroundColor: '#6366f1', marginBottom: 20 },

  // 2-col info
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  infoBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: '10 12' },
  infoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoKey: { fontSize: 8, color: '#6b7280', width: 80 },
  infoVal: { fontSize: 8, color: '#111827', fontFamily: 'Helvetica-Bold', flex: 1 },

  // Items table
  tableTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#6366f1', borderRadius: 4, padding: '6 8', marginBottom: 1 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableRowAlt: { flexDirection: 'row', padding: '5 8', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  colDesc: { flex: 3 },
  colQty: { flex: 0.8, textAlign: 'center' },
  colUnit: { flex: 1.2, textAlign: 'right' },
  colDisc: { flex: 0.8, textAlign: 'center' },
  colTotal: { flex: 1.2, textAlign: 'right' },

  // Financial summary
  financialBox: { marginTop: 12, alignItems: 'flex-end' },
  financialRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3, width: 240 },
  financialLabel: { flex: 1, fontSize: 8, color: '#6b7280', textAlign: 'right', paddingRight: 12 },
  financialValue: { width: 80, fontSize: 8, color: '#374151', textAlign: 'right' },
  financialRowTotal: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, backgroundColor: '#eef2ff', borderRadius: 4, padding: '6 10', width: 240 },
  financialLabelTotal: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#4338ca', textAlign: 'right', paddingRight: 12 },
  financialValueTotal: { width: 80, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#4338ca', textAlign: 'right' },

  // Notes
  notesBox: { marginTop: 20, padding: '10 12', backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: '#f59e0b', borderRadius: 2 },
  notesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#92400e', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  notesText: { fontSize: 8, color: '#78350f', lineHeight: 1.5 },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 7, color: '#9ca3af' },

  // Validity
  validityBox: { marginTop: 16, padding: '8 12', backgroundColor: '#f0fdf4', borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  validityText: { fontSize: 8, color: '#166534' },
})

interface ProposalItem {
  name: string; quantity: number; unit_price: number; discount_pct: number; total: number
}
interface ProposalData {
  dealTitle: string; dealNotes: string | null
  companyName: string | null; companyFantasy: string | null
  companyCnpj: string | null; companyAddress: string | null
  contactName: string | null; contactPhone: string | null; contactEmail: string | null
  assigneeName: string | null; items: ProposalItem[]
  discountPct: number; taxPct: number
  tenantName: string; tenantLogoUrl: string | null
  expectedCloseDate: string | null
}

export function ProposalDocument({ data }: { data: ProposalData }) {
  const subtotal = data.items.reduce((s, i) => s + Number(i.total), 0)
  const descontoGlobal = subtotal * (data.discountPct / 100)
  const base = subtotal - descontoGlobal
  const impostos = base * (data.taxPct / 100)
  const total = base + impostos

  const today = new Date().toLocaleDateString('pt-BR')
  const validUntil = new Date(Date.now() + 15 * 86400000).toLocaleDateString('pt-BR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            {data.tenantLogoUrl
              ? <Image src={data.tenantLogoUrl} style={styles.logo} />
              : <Text style={styles.logoFallback}>{data.tenantName}</Text>
            }
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.proposalTitle}>Proposta Comercial</Text>
            <Text style={styles.proposalMeta}>Data: {today}</Text>
            <Text style={styles.proposalMeta}>Validade: {validUntil}</Text>
            {data.assigneeName && (
              <Text style={styles.proposalMeta}>Responsável: {data.assigneeName}</Text>
            )}
          </View>
        </View>

        <View style={styles.dividerAccent} />

        {/* Título da proposta */}
        <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 16 }}>
          {data.dealTitle}
        </Text>

        {/* Info: cliente + contato */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Dados do Cliente</Text>
            {data.companyName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Empresa</Text>
                <Text style={styles.infoVal}>{data.companyFantasy || data.companyName}</Text>
              </View>
            )}
            {data.companyFantasy && data.companyName && data.companyFantasy !== data.companyName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Razão Social</Text>
                <Text style={styles.infoVal}>{data.companyName}</Text>
              </View>
            )}
            {data.companyCnpj && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>CNPJ</Text>
                <Text style={styles.infoVal}>{data.companyCnpj}</Text>
              </View>
            )}
            {data.companyAddress && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Endereço</Text>
                <Text style={styles.infoVal}>{data.companyAddress}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Contato</Text>
            {data.contactName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Nome</Text>
                <Text style={styles.infoVal}>{data.contactName}</Text>
              </View>
            )}
            {data.contactPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Telefone</Text>
                <Text style={styles.infoVal}>{data.contactPhone}</Text>
              </View>
            )}
            {data.contactEmail && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Email</Text>
                <Text style={styles.infoVal}>{data.contactEmail}</Text>
              </View>
            )}
            {data.expectedCloseDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Previsão</Text>
                <Text style={styles.infoVal}>
                  {new Date(data.expectedCloseDate).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabela de itens */}
        {data.items.length > 0 && (
          <View>
            <Text style={styles.tableTitle}>Itens da Proposta</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qtd.</Text>
              <Text style={[styles.tableHeaderText, styles.colUnit]}>Valor Unit.</Text>
              <Text style={[styles.tableHeaderText, styles.colDisc]}>Desc.%</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[{ fontSize: 8, color: '#111827' }, styles.colDesc]}>{item.name}</Text>
                <Text style={[{ fontSize: 8, color: '#374151', textAlign: 'center' }, styles.colQty]}>{item.quantity}</Text>
                <Text style={[{ fontSize: 8, color: '#374151', textAlign: 'right' }, styles.colUnit]}>{fmt(item.unit_price)}</Text>
                <Text style={[{ fontSize: 8, color: '#374151', textAlign: 'center' }, styles.colDisc]}>
                  {item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}
                </Text>
                <Text style={[{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' }, styles.colTotal]}>
                  {fmt(Number(item.total))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Resumo financeiro */}
        <View style={styles.financialBox}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Subtotal</Text>
            <Text style={styles.financialValue}>{fmt(subtotal)}</Text>
          </View>
          {data.discountPct > 0 && (
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: '#ef4444' }]}>Desconto ({data.discountPct}%)</Text>
              <Text style={[styles.financialValue, { color: '#ef4444' }]}>-{fmt(descontoGlobal)}</Text>
            </View>
          )}
          {data.taxPct > 0 && (
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: '#d97706' }]}>Impostos ({data.taxPct}%)</Text>
              <Text style={[styles.financialValue, { color: '#d97706' }]}>+{fmt(impostos)}</Text>
            </View>
          )}
          <View style={styles.financialRowTotal}>
            <Text style={styles.financialLabelTotal}>TOTAL DA PROPOSTA</Text>
            <Text style={styles.financialValueTotal}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Observações */}
        {data.dealNotes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Observações</Text>
            <Text style={styles.notesText}>{data.dealNotes}</Text>
          </View>
        )}

        {/* Validade */}
        <View style={styles.validityBox}>
          <Text style={styles.validityText}>
            Esta proposta é válida até {validUntil}. Para aceitar, entre em contato com {data.assigneeName ?? data.tenantName}.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.tenantName} — Proposta Comercial</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
