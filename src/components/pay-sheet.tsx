import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Linking, Modal, Pressable, Text, View } from 'react-native'
import { CheckCircle2, X } from 'lucide-react-native'
import { api, inr, num, type FeeRow } from '@/lib/api'
import { Alert, Button, Field, Loading } from '@/components/ui'
import { useT } from '@/lib/i18n'

type UpiInfo = { upi_id: string; school_name: string }

// Same upi:// link the platform puts in its QR code (/api/fees/upi-qr).
const upiLink = (upi: UpiInfo, amount: number) =>
  `upi://pay?pa=${encodeURIComponent(upi.upi_id)}&pn=${encodeURIComponent(upi.school_name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('School Fee Payment')}`

// Pay fees by UPI (#11): opens the phone's UPI app with the school's UPI ID and
// amount filled in, then records the transaction ID for the school to verify.
export function PaySheet({ rows, student, onClose, onPaid }: {
  rows: FeeRow[]; student: { id: number; school_id: number }; onClose: () => void; onPaid: () => void
}) {
  const t = useT()
  const due = rows.filter(r => num(r.balance) > 0)
  const total = due.reduce((s, r) => s + num(r.balance), 0)
  const [amount, setAmount] = useState(String(total))
  const [upi, setUpi] = useState<UpiInfo | null | undefined>(undefined)
  const [step, setStep] = useState<'amount' | 'confirm' | 'done'>('amount')
  const [ref, setRef] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<UpiInfo>(`/api/fees/upi-qr/info?school_id=${student.school_id}`)
      .then(info => setUpi(info.upi_id ? info : null))
      .catch(() => setUpi(null))
  }, [student.school_id])

  const amt = num(amount)
  const amountOk = amt > 0 && amt <= total
  const refOk = /^[A-Za-z0-9]{6,35}$/.test(ref.trim())

  async function openUpiApp() {
    if (!upi) return
    setError('')
    try {
      await Linking.openURL(upiLink(upi, amt))
      setStep('confirm')
    } catch {
      setError(t.paySheet.noUpiAppError(inr(amt), upi.upi_id, t.paySheet.alreadyPaid))
    }
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await api('/api/parent/fees', {
        method: 'POST',
        body: JSON.stringify({
          school_id: student.school_id, student_id: student.id, ledger_ids: due.map(r => r.id),
          total_amount: amt, transaction_ref: ref.trim(), upi_id: upi?.upi_id,
        }),
      })
      setStep('done')
      onPaid()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.paySheet.recordError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
        <View className="gap-4 rounded-t-3xl bg-background px-5 pb-10 pt-5" testID="pay-sheet">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground" accessibilityRole="header">{t.paySheet.title}</Text>
              <Text className="text-xs text-muted-foreground">{t.paySheet.subtitle}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} testID="pay-close-btn" accessibilityRole="button" accessibilityLabel={t.close}>
              <X size={22} color="#6b7280" />
            </Pressable>
          </View>

          {upi === undefined && <Loading />}
          {upi === null && <Alert>{t.paySheet.noUpi}</Alert>}

          {upi && step === 'amount' && (
            <>
              <Field label={t.paySheet.amountLabel(inr(total))} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} testID="pay-amount-input" />
              <View className="rounded-xl bg-muted px-3 py-2">
                <Text className="text-[11px] text-muted-foreground">{t.paySheet.payingTo(upi.school_name)}</Text>
                <Text selectable className="font-mono text-sm text-foreground" testID="pay-upi-id">{upi.upi_id}</Text>
              </View>
              {error ? <Alert>{error}</Alert> : null}
              <Button label={amountOk ? t.paySheet.payWithApp(inr(amt)) : t.paySheet.enterValidAmount} disabled={!amountOk} onPress={openUpiApp} testID="pay-open-upi-btn" />
              <Button variant="outline" label={t.paySheet.alreadyPaid} disabled={!amountOk} onPress={() => { setError(''); setStep('confirm') }} testID="pay-already-paid-btn" />
            </>
          )}

          {upi && step === 'confirm' && (
            <>
              <Text className="text-center text-2xl font-bold text-foreground">{inr(amt)}</Text>
              <Field label={t.paySheet.utrLabel} placeholder={t.paySheet.utrPlaceholder} value={ref} onChangeText={setRef} testID="pay-ref-input" />
              {error ? <Alert>{error}</Alert> : null}
              <Button label={t.paySheet.submitVerification} loading={busy} disabled={!refOk} onPress={submit} testID="pay-submit-btn" />
              <Button variant="outline" label={t.paySheet.back} onPress={() => { setError(''); setStep('amount') }} testID="pay-back-btn" />
            </>
          )}

          {step === 'done' && (
            <View className="items-center gap-2 py-4">
              <CheckCircle2 size={48} color="#10b981" />
              <Text className="text-base font-semibold text-foreground">{t.paySheet.doneTitle}</Text>
              <Text className="text-center text-sm text-muted-foreground">{t.paySheet.doneHint(t.fees.statusAwaitingVerification)}</Text>
              <View className="mt-2 w-full"><Button variant="outline" label={t.done} onPress={onClose} testID="pay-done-btn" /></View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
