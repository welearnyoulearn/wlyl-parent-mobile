// School notices (/api/announcements): language, greeting templates, filters, and the
// parent's seen/acknowledged marks. Ported from the web's components/announcements.
import { create } from 'zustand'
import { api, type Announcement } from '@/lib/api'
import { accountGeneration } from '@/lib/request-cache'
import type { Lang } from '@/stores/session'

export type NoticeFilter = 'all' | 'unread' | 'pinned' | 'action' | 'past'

// The platform's announcement templates (lib/announcementTemplates.ts): emoji, card colour,
// text colour, and whether it is a greeting card that pops up once for everyone.
export const TEMPLATES: Record<string, { emoji: string; bg: string; fg: string; greeting: boolean }> = {
  pongal: { emoji: '🍯', bg: '#f97316', fg: '#fff', greeting: true },
  sankranti: { emoji: '🪁', bg: '#6366f1', fg: '#fff', greeting: true },
  ugadi: { emoji: '🌿', bg: '#65a30d', fg: '#fff', greeting: true },
  dasara: { emoji: '🏹', bg: '#ea580c', fg: '#fff', greeting: true },
  diwali: { emoji: '🪔', bg: '#7c2d12', fg: '#fff', greeting: true },
  holi: { emoji: '🎨', bg: '#a855f7', fg: '#fff', greeting: true },
  ganesh: { emoji: '🐘', bg: '#e11d48', fg: '#fff', greeting: true },
  eid: { emoji: '🌙', bg: '#0f766e', fg: '#fff', greeting: true },
  christmas: { emoji: '🎄', bg: '#166534', fg: '#fff', greeting: true },
  'new-year': { emoji: '🎆', bg: '#4338ca', fg: '#fff', greeting: true },
  'republic-day': { emoji: '🇮🇳', bg: '#f8fafc', fg: '#1f2937', greeting: true },
  'independence-day': { emoji: '🇮🇳', bg: '#f8fafc', fg: '#1f2937', greeting: true },
  'teachers-day': { emoji: '📚', bg: '#4f46e5', fg: '#fff', greeting: true },
  'childrens-day': { emoji: '🎈', bg: '#fb923c', fg: '#fff', greeting: true },
  holiday: { emoji: '🏖️', bg: '#06b6d4', fg: '#fff', greeting: false },
  'summer-vacation': { emoji: '🌴', bg: '#fb7185', fg: '#fff', greeting: true },
  'emergency-closure': { emoji: '🚨', bg: '#dc2626', fg: '#fff', greeting: false },
  'welcome-back': { emoji: '🎒', bg: '#8b5cf6', fg: '#fff', greeting: true },
  ptm: { emoji: '🤝', bg: '#0ea5e9', fg: '#fff', greeting: false },
  'exam-schedule': { emoji: '📝', bg: '#3b82f6', fg: '#fff', greeting: false },
  'result-day': { emoji: '🏆', bg: '#f59e0b', fg: '#fff', greeting: true },
  'fee-reminder': { emoji: '💳', bg: '#334155', fg: '#fff', greeting: false },
  'sports-day': { emoji: '🏅', bg: '#0ea5e9', fg: '#fff', greeting: false },
  'annual-day': { emoji: '🎭', bg: '#db2777', fg: '#fff', greeting: false },
}

export const template = (n: Announcement) => (n.template_key ? TEMPLATES[n.template_key] : undefined)

// The school's translation in the app language when it gave one, else the original.
export function localised(n: Announcement, lang: Lang | undefined) {
  const tr = lang && lang !== 'en' ? n.translations?.[lang] : undefined
  return { title: tr?.title?.trim() || n.title, content: tr?.content?.trim() || n.content }
}

export const needsAck = (n: Announcement) => n.requires_ack && !n.acked

// Unseen greeting cards, urgent notices and notices waiting for "I have read this" open by themselves.
export const needsPopup = (n: Announcement) => !n.seen && (n.priority === 'urgent' || needsAck(n) || !!template(n)?.greeting)

export function filterNotices(list: Announcement[], filter: NoticeFilter, query: string, lang: Lang | undefined) {
  const q = query.trim().toLowerCase()
  return list.filter(n => {
    if (filter === 'unread' && n.seen) return false
    if (filter === 'pinned' && !n.pinned) return false
    if (filter === 'action' && !needsAck(n)) return false
    if (!q) return true
    const l = localised(n, lang)
    return `${l.title} ${l.content}`.toLowerCase().includes(q)
  })
}

// Marks made in this session, so every screen agrees before the list is fetched again.
// Keyed by account so a different parent signing in never inherits them.
type Marks = { seen: Record<string, true>; acked: Record<string, true> }
export const useNoticeMarks = create<Marks>(() => ({ seen: {}, acked: {} }))
const key = (id: number) => `${accountGeneration()}:${id}`
const mark = (kind: keyof Marks, id: number) => useNoticeMarks.setState(s => ({ [kind]: { ...s[kind], [key(id)]: true } }))

export function withMarks(list: Announcement[], marks: Marks): Announcement[] {
  return list.map(n => ({ ...n, seen: n.seen || !!marks.seen[key(n.id)], acked: n.acked || !!marks.acked[key(n.id)] }))
}

// Opening a notice records "seen" once; a failure only means it shows as NEW again later.
export function markSeen(n: Announcement) {
  if (n.seen) return
  mark('seen', n.id)
  void api(`/api/announcements/${n.id}/read`, { method: 'POST', body: '{}' }).catch(() => null)
}

export async function acknowledge(id: number) {
  await api(`/api/announcements/${id}/ack`, { method: 'POST', body: '{}' })
  mark('seen', id)
  mark('acked', id)
}
