import { useState } from 'react'
import { View, Pressable, ScrollView } from 'react-native'
import { CheckCircle2, Download, Receipt, Square, SquareCheck } from 'lucide-react-native'
import { PaySheet } from '@/components/pay-sheet'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, inr, num, type AcademicYear, type Fees, type FeeRow, type Payment } from '@/lib/api'
import { receiptHtml, shareReceipt } from '@/lib/receipt'
import { Screen, Panel, Section, Row, Divider, Chip, Alert, Empty, Button, Bar, ErrorState, ScreenSkeleton, Segmented, Text, haptic, useColors } from '@/components/ui'
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
  const c = useColors()
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
    <View className="gap-2">
      <Text className="px-1 text-[13px] text-muted-foreground">{t.fees.yearLabel}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2 px-5">
        {years.data!.map(y => {
          const on = y.label === shownYear
          return (
            <Pressable key={y.id} onPress={() => { if (!on) haptic.select(); pickYear(y.label) }} testID={`fees-year-${y.label}`}
              accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${t.fees.yearLabel} ${y.label}`}
              className={`min-h-9 justify-center rounded-lg border px-3.5 ${on ? 'border-primary bg-primary-soft' : 'border-border bg-card active:bg-muted'}`}>
              <Text className={`text-sm font-semibold ${on ? 'text-primary' : 'text-foreground'}`}>{y.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )

  if (error) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {yearPicker}
        {error === 'Forbidden' || error.includes('403')
          ? <Alert tone="info">{t.fees.notEnabled}</Alert>
          : <ErrorState message={error} onRetry={refresh} busy={refreshing} />}
      </Screen>
    )
  }
  if (loading || !data || !student) {
    return (
      <Screen>
        {yearPicker}
        <ScreenSkeleton />
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
      {/* The balance, set as type: one figure, what's been paid, and the one action. */}
      <Panel className="gap-3 p-4" testID="fees-hero">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="flex-1 text-[13px] text-muted-foreground" accessibilityRole="header">{t.fees.outstandingHeader(shownYear ?? t.fees.thisYear)}</Text>
          {s.overdue_count > 0
            ? <Text className="text-[13px] font-semibold text-danger">{t.fees.overdueChip(s.overdue_count)}</Text>
            : s.total_outstanding === 0 ? <Text className="text-[13px] font-semibold text-success">{t.allClear}</Text> : null}
        </View>
        <View className="gap-0.5">
          <Text className={`text-[34px] font-bold leading-10 tracking-tight ${s.overdue_count > 0 ? 'text-danger' : 'text-foreground'}`} testID="fees-outstanding" numberOfLines={1} adjustsFontSizeToFit>{inr(s.total_outstanding)}</Text>
          {num(s.carried_outstanding) > 0 && <Text className="text-[13px] text-warning" testID="fees-carried">{t.fees.carriedIncl(inr(s.carried_outstanding))}</Text>}
        </View>
        <Bar pct={paidPct} className="bg-success-graphic" label={t.fees.paidSummary(inr(s.total_paid), '', inr(s.total_due))} />
        <Text className="text-[13px] text-muted-foreground">{t.fees.paidSummary(inr(s.total_paid), s.total_waived > 0 ? t.fees.concessionSuffix(inr(s.total_waived)) : '', inr(s.total_due))}</Text>
        {!online && s.total_outstanding > 0 && <Text className="text-[13px] leading-5 text-foreground" testID="fees-pay-at-office">{t.fees.payAtOffice}</Text>}
        {pending.length > 0 && <View className="mt-1"><Button label={t.fees.payByUpi(inr(sum(pending)))} onPress={() => setPaying(pending)} testID="pay-now-btn" /></View>}
      </Panel>

      {prior && num(prior.total) > 0 && (
        <View className="gap-1 rounded-2xl bg-warning-soft px-4 py-3" testID="fees-prior-dues" accessibilityRole="alert">
          <Text className="text-[15px] font-bold text-warning">{t.fees.priorDuesTitle(inr(prior.total))}</Text>
          <Text className="text-xs leading-4 text-warning">{t.fees.priorDuesHint}</Text>
          {[...new Set(prior.items.map(i => i.academic_year))].map(y => (
            <Text key={y} className="text-xs font-semibold text-warning">
              {y === 'passout' ? t.fees.passoutDues : y}: {inr(prior.items.filter(i => i.academic_year === y).reduce((s, i) => s + num(i.balance), 0))}
            </Text>
          ))}
        </View>
      )}

      {chosen.length > 0 && (
        <View className="gap-3 rounded-2xl bg-info-soft p-4" testID="fees-selection-bar">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-bold text-info">{t.fees.selectedSummary(chosen.length, inr(sum(chosen)))}</Text>
            <Pressable onPress={() => setSelected(new Set())} hitSlop={8} testID="fees-selection-clear" accessibilityRole="button">
              <Text className="text-sm font-bold text-info">{t.fees.clear}</Text>
            </Pressable>
          </View>
          <Button label={t.fees.payAmount(inr(sum(chosen)))} onPress={() => setPaying(chosen)} testID="fees-pay-selected-btn" />
        </View>
      )}

      <Segmented value={tab} onChange={setTab} options={[
        { value: 'dues', label: t.fees.tabDues, testID: 'fees-tab-dues', badge: dues.length || undefined },
        { value: 'payments', label: t.fees.tabPayments, testID: 'fees-tab-payments' },
        { value: 'all', label: t.fees.tabAll, testID: 'fees-tab-all' },
      ]} />

      {tab === 'dues' && (
        <View>
          {dues.length === 0 ? <Empty icon={CheckCircle2} title={t.fees.nothingDueTitle} hint={t.fees.nothingDueHint} /> : <Ledger rows={dues} {...ledgerProps} />}
        </View>
      )}

      {tab === 'payments' && (
        <View className="gap-6">
          {receiptError ? <Alert>{receiptError}</Alert> : null}
          {data.payments.length === 0 ? <Empty icon={Receipt} title={t.fees.noPaymentsYet} /> : (
            <Panel className="overflow-hidden">
              {data.payments.map((p, i) => {
                const cancelled = p.payment_status === 'cancelled'
                return (
                  <View key={p.id}>
                    {i > 0 && <Divider />}
                    <View className={`gap-1.5 px-4 py-3.5 ${p.payment_status === 'rejected' ? 'bg-danger-soft' : cancelled ? 'bg-muted' : ''}`} testID={`payment-${p.id}`}>
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="flex-1 text-[15px] font-semibold text-foreground">{p.category_name} · {p.period_label}</Text>
                        <Text className={`shrink-0 text-[15px] font-bold ${cancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{inr(p.amount)}</Text>
                      </View>
                      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                        <Text className="text-xs text-muted-foreground">{day(p.paid_date)}</Text>
                        <Text className="text-xs text-muted-foreground">·</Text>
                        <Text className="text-xs text-muted-foreground">{t.payMode[p.payment_mode] ?? p.payment_mode}</Text>
                        {p.transaction_ref && <Text selectable className="text-xs font-mono text-muted-foreground">· {p.transaction_ref}</Text>}
                        <Text className="text-xs text-muted-foreground">·</Text>
                        <Text selectable className="text-xs font-mono text-muted-foreground">{p.receipt_number}</Text>
                        <View className="ml-auto">
                          <Chip tone={STATUS[p.payment_status]?.tone ?? 'muted'}>{STATUS[p.payment_status]?.label(t) ?? p.payment_status}</Chip>
                        </View>
                      </View>
                      {p.payment_status === 'rejected' && p.rejection_reason && <Text className="mt-1 text-xs font-medium text-danger">{t.fees.rejectedReason(p.rejection_reason)}</Text>}
                      {cancelled && <Text className="mt-1 text-xs text-muted-foreground">{t.fees.cancelledNote}</Text>}
                      {p.payment_status === 'completed' && (
                        <Pressable onPress={() => download(p)} hitSlop={8} className="mt-1 flex-row items-center gap-1.5 self-start py-1 active:opacity-60" testID={`payment-receipt-${p.id}`}
                          accessibilityRole="button" accessibilityLabel={`${t.fees.downloadReceipt} ${p.receipt_number}`}>
                          <Download size={14} color={c.primary} strokeWidth={2.4} />
                          <Text className="text-[13px] font-medium text-primary">{t.fees.downloadReceipt}</Text>
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
                       <Text className="text-sm font-semibold text-success">− {inr(w.waiver_amount)}</Text>
                     </Row>
                   </View>
                ))}
              </Panel>
            </Section>
          )}
        </View>
      )}

      {tab === 'all' && (
        <View>
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
  const c = useColors()
  return (
    <Panel className="overflow-hidden">
      {rows.map((r, i) => {
        const canPay = online && payable(r)
        const on = selected.has(r.id)
        return (
          <View key={r.id}>
            {i > 0 && <Divider />}
            <View className={`gap-2 px-4 py-3.5 ${on ? 'bg-info-soft' : ''}`} testID={`fee-row-${r.id}`}>
              <View className="flex-row items-start justify-between gap-3">
                {canPay && (
                  <Pressable onPress={() => { haptic.select(); onToggle(r.id) }} hitSlop={10} testID={`fee-select-${r.id}`}
                    accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={t.fees.selectRow(`${r.category_name} ${r.period_label}`)}>
                    {on ? <SquareCheck size={22} color={c.primary} /> : <Square size={22} color={c.subtle} />}
                  </Pressable>
                )}
                <View className="flex-1 gap-0.5">
                  <Text className="text-[15px] font-semibold text-foreground">{r.category_name}</Text>
                  <Text className="text-xs text-muted-foreground">{r.period_label}{r.due_date ? t.fees.dueSuffix(day(r.due_date)) : ''}</Text>
                  {r.source_academic_year && <View className="mt-1"><Chip tone="amber">{t.fees.carriedFrom(r.source_academic_year)}</Chip></View>}
                </View>
                <Chip tone={STATUS[r.status]?.tone ?? 'muted'}>{STATUS[r.status]?.label(t) ?? r.status}</Chip>
              </View>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-xs text-muted-foreground">{t.fees.ledgerPaidSummary(inr(r.amount_paid), num(r.waiver_amount) > 0 ? t.fees.ledgerConcessionSuffix(inr(r.waiver_amount)) : '', inr(r.amount_due))}</Text>
                {num(r.balance) > 0 && <Text textBreakStrategy="simple" className="shrink-0 text-sm font-bold text-warning">{t.fees.toPay(inr(r.balance))}</Text>}
                {canPay && selected.size === 0 && (
                  <Pressable onPress={() => onPay(r)} testID={`fee-pay-${r.id}`} accessibilityRole="button" accessibilityLabel={`${t.fees.pay} ${r.category_name} ${r.period_label}`}
                    className="min-h-9 shrink-0 justify-center rounded-lg bg-primary px-4 active:opacity-80">
                    <Text className="text-xs font-bold text-primary-foreground">{t.fees.pay}</Text>
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
