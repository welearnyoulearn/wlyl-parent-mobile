import { printToFileAsync } from 'expo-print'
import { shareAsync } from 'expo-sharing'
import { inr, num, type Payment } from './api'
import type { Strings } from './i18n'

// Fee receipt PDF for a confirmed payment, same fields as the web's printParentReceipt
// (app/parent/page.tsx) plus school, student and class. There is no receipt API.

// Category names and transaction refs are stored text going into raw HTML.
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const longDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export type ReceiptInfo = { school: string | null; student: string; className: string }

// A multi-bill payment shares one receipt number: list every confirmed allocation under it with one total.
export function receiptHtml(pmt: Payment, payments: Payment[], info: ReceiptInfo, t: Strings, now = new Date()) {
  const same = payments.filter(p => p.receipt_number === pmt.receipt_number && p.payment_status === 'completed')
  const rows = same.length > 0 ? same : [pmt]
  const total = rows.reduce((s, p) => s + num(p.amount), 0)
  const r = t.receipt
  const field = (label: string, value: string) => `<div><div class="lbl">${esc(label)}</div><div class="val">${esc(value)}</div></div>`
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:Arial,sans-serif;padding:32px;color:#222;max-width:680px;margin:0 auto}
  .hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:20px}
  .school{font-size:20px;font-weight:bold}
  .rtitle{font-size:14px;font-weight:bold;margin-top:6px;letter-spacing:1px}
  .rno{font-size:12px;color:#555;margin-top:4px}
  .note{font-size:11px;color:#888;margin-top:2px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .lbl{font-size:11px;color:#888;margin-bottom:2px}
  .val{font-size:13px;font-weight:500}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:12px;border:1px solid #ddd}
  td{padding:8px 10px;font-size:13px;border:1px solid #ddd}
  .tot td{font-weight:bold;background:#f9fafb}
  .ftr{margin-top:24px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
</style></head><body>
<div class="hdr">
  <div class="school">${esc(info.school ?? r.title)}</div>
  <div class="rtitle">${esc(r.title)} · ${esc(r.subtitle)}</div>
  <div class="rno">${esc(r.receiptNo)}: <strong>${esc(pmt.receipt_number)}</strong></div>
  ${rows.length > 1 ? `<div class="note">${esc(r.covers(rows.length))}</div>` : ''}
</div>
<div class="grid2">${field(r.student, info.student)}${field(r.className, info.className)}</div>
<table>
  <thead><tr><th>${esc(r.category)}</th><th>${esc(r.period)}</th><th>${esc(r.amountPaid)}</th></tr></thead>
  <tbody>${rows.map(p => `<tr><td>${esc(p.category_name)}</td><td>${esc(p.period_label)}</td><td>${esc(inr(p.amount))}</td></tr>`).join('')}</tbody>
  <tfoot><tr class="tot"><td colspan="2" style="text-align:right">${esc(r.totalPaid)}:</td><td>${esc(inr(total))}</td></tr></tfoot>
</table>
<div class="grid2">
  ${field(r.mode, t.payMode[pmt.payment_mode] ?? pmt.payment_mode)}
  ${field(r.date, longDate(pmt.paid_date))}
  ${pmt.transaction_ref ? field(r.ref, pmt.transaction_ref) : ''}
</div>
<div class="ftr">${esc(r.footer(now.toLocaleString('en-IN')))}</div>
</body></html>`
}

// Renders the receipt to a PDF and opens the share sheet (save to Files/Drive, WhatsApp, print...).
export async function shareReceipt(html: string, receiptNumber: string) {
  const { uri } = await printToFileAsync({ html })
  await shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: receiptNumber })
}
