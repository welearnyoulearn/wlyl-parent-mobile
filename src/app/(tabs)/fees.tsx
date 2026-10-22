import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { CheckCircle2, Receipt, Square, SquareCheck } from 'lucide-react-native'
import { PaySheet } from '@/components/pay-sheet'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, inr, num, type AcademicYear, type Fees, type FeeRow, type Payment } from '@/lib/api'
import { receiptHtml, shareReceipt } from '@/lib/receipt'
import { Screen, Loading, Panel, Section, Row, Divider, Chip, Alert, Empty, Button, useChildColor } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

const STATUS: Record<string, { tone: 'green' | 'red' | 'amber' | 'muted' | 'blue'; label: (t: Strings) => string }> = {
  paid: { tone: 'green', label: t => t.fees.statusPaid },
  overdue: { tone: 'red', label: t => t.fees.statusOverdue },
  partial: { tone: 'amber', label: t => t.fees.statusPartial },
  pending: { tone: 'muted', label: t => t.fees.statusDue },
  waived: { tone: 'blue', label: t => t.fees.statusWaived },
  completed: { tone: 'green', label: t => t.fees.statusReceived },
  pending_verification: { tone: 'blue', label: t => t.fees.statusAwaitingVerification },
  rejected: { tone: 'red', label: t => t.fees.statusRejected },
  cancelled: { tone: 'muted', label: t => t.fees.statusCancelled },
}

// Same rule as the web's Pay button: the server marks overdue only once the bill's academic year has ended.
const payable = (r: FeeRow) => ['pending', 'partial', 'overdue'].includes(r.status) && num(r.balance) > 0
const sum = (rows: FeeRow[]) => rows.reduce((s, r) => s + num(r.balance), 0)

export default function FeesScreen() {
  const { student, year, has, me } = useSession()
  const t = useT()
  const color = useChildColor()
  // null = the school's current year; that path is shared (and cached) with Home's fee tile.
  const [picked, setPicked] = useState<string | null>(null)
  const shownYear = picked ?? year
  const path = student ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}${picked ? `&academic_year=${encodeURIComponent(picked)}` : ''}` : null
  const { data, error, loading, refreshing, refresh } = useApi<Fees>(path)
  const years = useApi<AcademicYear[]>(student ? `/api/academic-years?school_id=${student.school_id}` : null)

  const [tab, setTab] = useState<'dues' | 'payments' | 'all'>('dues')
  const [paying, setPaying] = useState<FeeRow[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [receiptError, setReceiptError] = useState('')

  function pickYear(label: string) {
    setPicked(label === year ? null : label)
    setSelected(new Set())
  }
  const yearPicker = (years.data?.length ?? 0) > 1 && (
    <View className="gap-1.5">
      <Text className="px-1 text-xs text-muted-foreground">{t.fees.yearLabel}</Text>
      <View className="flex-row flex-wrap gap-2">
        {years.data!.map(y => {
          const on = y.label === shownYear
          return (
            <Pressable key={y.id} onPress={() => pickYear(y.label)} testID={`fees-year-${y.label}`}
              accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${t.fees.yearLabel} ${y.label}`}
              style={on ? { backgroundColor: color, borderColor: color } : undefined}
              className={`rounded-full border px-3 py-1 ${on ? '' : 'border-border bg-card'}`}>
              <Text className={`text-xs font-medium ${on ? 'text-primary-foreground' : 'text-foreground'}`}>{y.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )

  if (error) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {yearPicker}
        <Alert>{error === 'Forbidden' || error.includes('403') ? t.fees.notEnabled : error}</Alert>
      </Screen>
    )
  }
  if (loading || !data || !student) {
    return (
      <Screen>
        {yearPicker}
        <Loading />
      </Screen>
    )
  }

  const s = data.summary
  const paidPct = s.total_due > 0 ? Math.round(((s.total_paid + s.total_waived) / s.total_due) * 100) : 100
  const dues = data.ledger.filter(r => r.status !== 'paid' && r.status !== 'waived')
  const online = has('online-payments')
  const pending = online ? data.ledger.filter(payable) : []
  const chosen = pending.filter(r => selected.has(r.id))
  const prior = data.prior_dues
  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev)
    if (!next.delete(id)) next.add(id)
    return next
  })
  const ledgerProps = { online, selected, onToggle: toggle, onPay: (r: FeeRow) => setPaying([r]) }

  async function download(p: Payment) {
    if (!student) return
    setReceiptError('')
    try {
      const html = receiptHtml(p, data!.payments, { school: me?.school_name ?? null, student: student.name, className: `${student.grade}-${student.section}` }, t)
      await shareReceipt(html, p.receipt_number)
    } catch (e) {
      setReceiptError(e instanceof Error ? e.message : t.fees.receiptError)
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="fees-screen">
      {paying && <PaySheet rows={paying} student={student} onClose={() => { setPaying(null); setSelected(new Set()) }} onPaid={refresh} />}
      {yearPicker}
      <Panel className={`p-4 ${s.total_outstanding > 0 ? 'bg-amber-50/50' : ''}`}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xs text-muted-foreground" accessibilityRole="header">{t.fees.outstandingHeader(shownYear ?? t.fees.thisYear)}</Text>
            <Text className="text-3xl font-bold text-foreground" testID="fees-outstanding">{inr(s.total_outstanding)}</Text>
          </View>
          {s.overdue_count > 0 ? <Chip tone="red">{t.fees.overdueChip(s.overdue_count)}</Chip> : s.total_outstanding === 0 ? <Chip tone="green">{t.allClear}</Chip> : null}
        </View>
        {num(s.carried_outstanding) > 0 && <Text className="text-[11px] text-amber-700" testID="fees-carried">{t.fees.carriedIncl(inr(s.carried_outstanding))}</Text>}
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <View className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
        </View>
        <Text className="mt-1.5 text-[11px] text-muted-foreground">{t.fees.paidSummary(inr(s.total_paid), s.total_waived > 0 ? t.fees.concessionSuffix(inr(s.total_waived)) : '', inr(s.total_due))}</Text>
        {pending.length > 0 && <View className="mt-3"><Button label={t.fees.payByUpi(inr(sum(pending)))} onPress={() => setPaying(pending)} testID="pay-now-btn" /></View>}
        {!online && s.total_outstanding > 0 && <Text className="mt-3 text-xs text-sky-700" testID="fees-pay-at-office">{t.fees.payAtOffice}</Text>}
      </Panel>

      {prior && num(prior.total) > 0 && (
        <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3" testID="fees-prior-dues">
          <Text className="text-sm font-semibold text-amber-900">{t.fees.priorDuesTitle(inr(prior.total))}</Text>
          <Text className="mt-0.5 text-xs text-amber-800">{t.fees.priorDuesHint}</Text>
          {[...new Set(prior.items.map(i => i.academic_year))].map(y => (
            <Text key={y} className="mt-1 text-xs text-amber-900">
              {y === 'passout' ? t.fees.passoutDues : y}: {inr(prior.items.filter(i => i.academic_year === y).reduce((s, i) => s + num(i.balance), 0))}
            </Text>
          ))}
        </View>
      )}

      {chosen.length > 0 && (
        <View className="gap-3 rounded-2xl bg-sky-50 p-4" testID="fees-selection-bar">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-sky-900">{t.fees.selectedSummary(chosen.length, inr(sum(chosen)))}</Text>
            <Pressable onPress={() => setSelected(new Set())} hitSlop={8} testID="fees-selection-clear" accessibilityRole="button">
              <Text className="text-xs font-medium text-sky-700">{t.fees.clear}</Text>
            </Pressable>
          </View>
          <Button label={t.fees.payAmount(inr(sum(chosen)))} onPress={() => setPaying(chosen)} testID="fees-pay-selected-btn" />
        </View>
      )}

      <View className="flex-row rounded-xl bg-muted p-1">
        {(['dues', 'payments', 'all'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} testID={`fees-tab-${k}`} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} className={`flex-1 items-center justify-center rounded-lg py-1.5 ${tab === k ? 'bg-card shadow-sm' : ''}`}>
             <Text className={`text-sm font-medium ${tab === k ? 'text-foreground' : 'text-muted-foreground'}`}>
               {k === 'dues' ? t.fees.tabDues : k === 'payments' ? t.fees.tabPayments : t.fees.tabAll}
             </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'dues' && (
        <View className="pt-2">
          {dues.length === 0 ? <Empty icon={CheckCircle2} title={t.fees.nothingDueTitle} hint={t.fees.nothingDueHint} /> : <Ledger rows={dues} {...ledgerProps} />}
        </View>
      )}

      {tab === 'payments' && (
        <View className="gap-4 pt-2">
          {receiptError ? <Alert>{receiptError}</Alert> : null}
          {data.payments.length === 0 ? <Empty icon={Receipt} title={t.fees.noPaymentsYet} /> : (
            <Panel className="overflow-hidden">
              {data.payments.map((p, i) => {
                const cancelled = p.payment_status === 'cancelled'
                return (
                  <View key={p.id}>
                    {i > 0 && <Divider />}
                    <View className={`px-4 py-3 ${p.payment_status === 'rejected' ? 'bg-rose-50/60' : cancelled ? 'bg-muted/60' : ''}`} testID={`payment-${p.id}`}>
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="flex-shrink text-sm font-medium text-foreground">{p.category_name} · {p.period_label}</Text>
                        <Text className={`flex-shrink-0 text-sm font-semibold ${cancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{inr(p.amount)}</Text>
                      </View>
                      <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                        <Text className="text-[11px] text-muted-foreground">{day(p.paid_date)}</Text>
                        <Text className="text-[11px] text-muted-foreground">·</Text>
                        <Text className="text-[11px] text-muted-foreground">{t.payMode[p.payment_mode] ?? p.payment_mode}</Text>
                        {p.transaction_ref && <Text selectable className="text-[11px] font-mono text-muted-foreground">· {p.transaction_ref}</Text>}
                        <Text className="text-[11px] text-muted-foreground">·</Text>
                        <Text className="text-[11px] font-mono text-muted-foreground">{p.receipt_number}</Text>
                        <View className="ml-auto">
                          <Chip tone={STATUS[p.payment_status]?.tone ?? 'muted'}>{STATUS[p.payment_status]?.label(t) ?? p.payment_status}</Chip>
                        </View>
                      </View>
                      {p.payment_status === 'rejected' && p.rejection_reason && <Text className="mt-1 text-xs font-medium text-rose-600">{t.fees.rejectedReason(p.rejection_reason)}</Text>}
                      {cancelled && <Text className="mt-1 text-xs text-muted-foreground">{t.fees.cancelledNote}</Text>}
                      {p.payment_status === 'completed' && (
                        <Pressable onPress={() => download(p)} hitSlop={8} className="mt-1.5 self-start" testID={`payment-receipt-${p.id}`}
                          accessibilityRole="button" accessibilityLabel={`${t.fees.downloadReceipt} ${p.receipt_number}`}>
                          <Text className="text-xs font-medium text-primary">{t.fees.downloadReceipt}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )
              })}
            </Panel>
          )}
          {data.waivers.length > 0 && (
            <Section title={t.fees.concessionsTitle}>
              <Panel className="overflow-hidden">
                {data.waivers.map((w, i) => (
                   <View key={w.id}>
                     {i > 0 && <Divider />}
                     <Row>
                       <View className="flex-1">
                         <Text className="text-sm text-foreground">{w.reason}</Text>
                         <Text className="text-[11px] text-muted-foreground">{w.category_name} · {w.period_label}</Text>
                       </View>
                       <Text className="text-sm font-semibold text-emerald-700">− {inr(w.waiver_amount)}</Text>
                     </Row>
                   </View>
                ))}
              </Panel>
            </Section>
          )}
        </View>
      )}

      {tab === 'all' && (
        <View className="pt-2">
          {data.ledger.length === 0 ? <Empty icon={Receipt} title={t.fees.noFeesSetup} /> : <Ledger rows={data.ledger} {...ledgerProps} />}
        </View>
      )}
    </Screen>
  )
}

function Ledger({ rows, online, selected, onToggle, onPay }: {
  rows: FeeRow[]; online: boolean; selected: Set<number>; onToggle: (id: number) => void; onPay: (r: FeeRow) => void
}) {
  const t = useT()
  const color = useChildColor()
  return (
    <Panel className="overflow-hidden">
      {rows.map((r, i) => {
        const canPay = online && payable(r)
        const on = selected.has(r.id)
        return (
          <View key={r.id}>
            {i > 0 && <Divider />}
            <View className={`px-4 py-3 ${on ? 'bg-sky-50/60' : ''}`} testID={`fee-row-${r.id}`}>
              <View className="flex-row items-start justify-between gap-2">
                {canPay && (
                  <Pressable onPress={() => onToggle(r.id)} hitSlop={10} testID={`fee-select-${r.id}`}
                    accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={t.fees.selectRow(`${r.category_name} ${r.period_label}`)}>
                    {on ? <SquareCheck size={20} color={color} /> : <Square size={20} color="#9ca3af" />}
                  </Pressable>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">{r.category_name}</Text>
                  <Text className="text-[11px] text-muted-foreground">{r.period_label}{r.due_date ? t.fees.dueSuffix(day(r.due_date)) : ''}</Text>
                  {r.source_academic_year && <View className="mt-1"><Chip tone="amber">{t.fees.carriedFrom(r.source_academic_year)}</Chip></View>}
                </View>
                <Chip tone={STATUS[r.status]?.tone ?? 'muted'}>{STATUS[r.status]?.label(t) ?? r.status}</Chip>
              </View>
              <View className="mt-2 flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-xs text-muted-foreground">{t.fees.ledgerPaidSummary(inr(r.amount_paid), num(r.waiver_amount) > 0 ? t.fees.ledgerConcessionSuffix(inr(r.waiver_amount)) : '', inr(r.amount_due))}</Text>
                {num(r.balance) > 0 && <Text textBreakStrategy="simple" className="shrink-0 text-xs font-semibold text-amber-700">{t.fees.toPay(inr(r.balance))}</Text>}
                {canPay && selected.size === 0 && (
                  <Pressable onPress={() => onPay(r)} testID={`fee-pay-${r.id}`} accessibilityRole="button" accessibilityLabel={`${t.fees.pay} ${r.category_name} ${r.period_label}`}
                    style={{ backgroundColor: color }} className="shrink-0 rounded-lg px-3 py-1 active:opacity-90">
                    <Text className="text-xs font-semibold text-primary-foreground">{t.fees.pay}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )
      })}
    </Panel>
  )
}
