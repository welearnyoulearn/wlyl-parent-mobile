import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { CheckCircle2, Receipt } from 'lucide-react-native'
import { PaySheet } from '@/components/pay-sheet'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, inr, num, PAY_MODE, type Fees, type FeeRow } from '@/lib/api'
import { Screen, Loading, Panel, Section, Row, Divider, Chip, Alert, Empty, Button } from '@/components/ui'

const STATUS: Record<string, { tone: 'green' | 'red' | 'amber' | 'muted' | 'blue'; label: string }> = {
  paid: { tone: 'green', label: 'Paid' },
  overdue: { tone: 'red', label: 'Overdue' },
  partial: { tone: 'amber', label: 'Partly paid' },
  pending: { tone: 'muted', label: 'Due' },
  waived: { tone: 'blue', label: 'Waived' },
  completed: { tone: 'green', label: 'Received' },
  pending_verification: { tone: 'amber', label: 'Awaiting verification' },
  rejected: { tone: 'red', label: 'Rejected' },
}

const today = () => new Date().toISOString().slice(0, 10)
const shownStatus = (r: FeeRow) => (num(r.balance) > 0 && r.due_date && r.due_date.slice(0, 10) < today() && r.status !== 'waived') ? 'overdue' : r.status

export default function FeesScreen() {
  const { student, year, has } = useSession()
  const path = student ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}` : null
  const { data, error, loading, refreshing, refresh } = useApi<Fees>(path)

  const [tab, setTab] = useState<'dues' | 'payments' | 'all'>('dues')
  const [paying, setPaying] = useState(false)

  if (error) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Alert>{error === 'Forbidden' || error.includes('403') ? 'Fee details are not enabled for your school yet.' : error}</Alert>
      </Screen>
    )
  }
  if (loading || !data || !student) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const s = data.summary
  const paidPct = s.total_due > 0 ? Math.round(((s.total_paid + s.total_waived) / s.total_due) * 100) : 100
  const dues = data.ledger.filter(r => r.status !== 'paid' && r.status !== 'waived')
  const overdue = dues.filter(r => shownStatus(r) === 'overdue').length
  const canPay = has('online-payments') && s.total_outstanding > 0

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="fees-screen">
      {paying && <PaySheet rows={data.ledger} student={student} onClose={() => setPaying(false)} onPaid={refresh} />}
      <Panel className={`p-4 ${s.total_outstanding > 0 ? 'bg-amber-50/50' : ''}`}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xs text-muted-foreground" accessibilityRole="header">Outstanding · {year ?? 'this year'}</Text>
            <Text className="text-3xl font-bold text-foreground" testID="fees-outstanding">{inr(s.total_outstanding)}</Text>
          </View>
          {overdue > 0 ? <Chip tone="red">{overdue} overdue</Chip> : s.total_outstanding === 0 ? <Chip tone="green">All clear</Chip> : null}
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <View className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
        </View>
        <Text className="mt-1.5 text-[11px] text-muted-foreground">Paid {inr(s.total_paid)}{s.total_waived > 0 ? ` + ${inr(s.total_waived)} concession` : ''} of {inr(s.total_due)}</Text>
        {canPay && <View className="mt-3"><Button label={`Pay ${inr(s.total_outstanding)} by UPI`} onPress={() => setPaying(true)} testID="pay-now-btn" /></View>}
        {!has('online-payments') && s.total_outstanding > 0 && <Text className="mt-3 text-xs text-muted-foreground">Pay at the school office. Receipts will show here.</Text>}
      </Panel>

      <View className="flex-row rounded-xl bg-muted p-1">
        {(['dues', 'payments', 'all'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} testID={`fees-tab-${t}`} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} className={`flex-1 items-center justify-center rounded-lg py-1.5 ${tab === t ? 'bg-card shadow-sm' : ''}`}>
             <Text className={`text-sm font-medium ${tab === t ? 'text-foreground' : 'text-muted-foreground'}`}>
               {t === 'dues' ? 'Dues' : t === 'payments' ? 'Payments' : 'All items'}
             </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'dues' && (
        <View className="pt-2">
          {dues.length === 0 ? <Empty icon={CheckCircle2} title="Nothing due" hint="All fee items for this year are settled." /> : <Ledger rows={dues} />}
        </View>
      )}

      {tab === 'payments' && (
        <View className="gap-4 pt-2">
          {data.payments.length === 0 ? <Empty icon={Receipt} title="No payments yet" /> : (
            <Panel className="overflow-hidden">
              {data.payments.map((p, i) => (
                <View key={p.id}>
                  {i > 0 && <Divider />}
                  <View className="px-4 py-3" testID={`payment-${p.id}`}>
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-shrink text-sm font-medium text-foreground">{p.category_name} · {p.period_label}</Text>
                      <Text className="flex-shrink-0 text-sm font-semibold text-foreground">{inr(p.amount)}</Text>
                    </View>
                    <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                      <Text className="text-[11px] text-muted-foreground">{day(p.paid_date)}</Text>
                      <Text className="text-[11px] text-muted-foreground">·</Text>
                      <Text className="text-[11px] text-muted-foreground">{PAY_MODE[p.payment_mode] ?? p.payment_mode}</Text>
                      <Text className="text-[11px] text-muted-foreground">·</Text>
                      <Text className="text-[11px] font-mono text-muted-foreground">{p.receipt_number}</Text>
                      <View className="ml-auto">
                        <Chip tone={STATUS[p.payment_status]?.tone ?? 'muted'}>{STATUS[p.payment_status]?.label ?? p.payment_status}</Chip>
                      </View>
                    </View>
                    {p.rejection_reason && <Text className="mt-1 text-xs text-rose-600">{p.rejection_reason}</Text>}
                  </View>
                </View>
              ))}
            </Panel>
          )}
          {data.waivers.length > 0 && (
            <Section title="Concessions">
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
          {data.ledger.length === 0 ? <Empty icon={Receipt} title="No fees set up for this year" /> : <Ledger rows={data.ledger} />}
        </View>
      )}
    </Screen>
  )
}

function Ledger({ rows }: { rows: FeeRow[] }) {
  return (
    <Panel className="overflow-hidden">
      {rows.map((r, i) => (
        <View key={r.id}>
          {i > 0 && <Divider />}
          <View className="px-4 py-3" testID={`fee-row-${r.id}`}>
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{r.category_name}</Text>
                <Text className="text-[11px] text-muted-foreground">{r.period_label}{r.due_date ? ` · due ${day(r.due_date)}` : ''}</Text>
              </View>
              <Chip tone={STATUS[shownStatus(r)]?.tone ?? 'muted'}>{STATUS[shownStatus(r)]?.label ?? r.status}</Chip>
            </View>
            <View className="mt-2 flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-xs text-muted-foreground">{inr(r.amount_paid)} paid{num(r.waiver_amount) > 0 ? ` · ${inr(r.waiver_amount)} concession` : ''} of {inr(r.amount_due)}</Text>
              {num(r.balance) > 0 && <Text textBreakStrategy="simple" className="shrink-0 text-xs font-semibold text-amber-700">{inr(r.balance)} to pay</Text>}
            </View>
          </View>
        </View>
      ))}
    </Panel>
  )
}
