import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { Pin, X } from 'lucide-react-native'
import { day, type Announcement } from '@/lib/api'
import { acknowledge, localised, markSeen, needsAck, template, useNoticeMarks, withMarks } from '@/lib/notices'
import { useApi } from '@/lib/use-api'
import { useSession } from '@/stores/session'
import { Alert, Button, Chip, Row, Text, useColors } from '@/components/ui'
import { useT } from '@/lib/i18n'

const fullDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// Notices from `path` with this session's seen/ack marks applied. A 403 (FEATURE_DISABLED)
// means the school has notices switched off: `hidden`, and no error shown.
export function useNotices(path: string | null) {
  const res = useApi<Announcement[]>(path)
  const marks = useNoticeMarks()
  const hidden = res.status === 403
  return { ...res, hidden, error: hidden ? null : res.error, items: Array.isArray(res.data) ? withMarks(res.data, marks) : null }
}

// One notice in a list: a dot until it's seen, the title, and one line of meta where the
// status words (urgent, action needed, new, pinned) are coloured text rather than badges.
// Festive templates keep their emoji, because that is the content.
export function NoticeRow({ notice: n, onPress }: { notice: Announcement; onPress: () => void }) {
  const { lang } = useSession()
  const t = useT()
  const tpl = template(n)
  const { title } = localised(n, lang)
  const flags: { text: string; cls: string }[] = [
    ...(n.priority === 'urgent' ? [{ text: t.urgent, cls: 'text-danger' }] : []),
    ...(needsAck(n) ? [{ text: t.notices.filters.action, cls: 'text-warning' }] : []),
    ...(!n.seen ? [{ text: t.notices.isNew, cls: 'text-primary' }] : []),
    ...(n.pinned ? [{ text: t.notices.pinned, cls: 'text-muted-foreground' }] : []),
  ]
  return (
    <Row onPress={onPress} testID={`notice-row-${n.id}`} className="items-start">
      <View className="w-2 items-center pt-2">{!n.seen && <View className="size-2 rounded-full bg-primary" />}</View>
      <View className="flex-1 gap-0.5">
        <Text className={`text-[15px] leading-5 text-foreground ${n.seen ? '' : 'font-semibold'}`} numberOfLines={2}>{tpl?.greeting ? `${tpl.emoji} ` : ''}{title}</Text>
        <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
          {flags.map(f => <Text key={f.text} className={`font-semibold ${f.cls}`}>{f.text}  ·  </Text>)}
          {n.created_by_name ? `${n.created_by_name} · ` : ''}{day(n.published_at ?? n.created_at)}
        </Text>
      </View>
    </Row>
  )
}

// The opened notice: a greeting card for festive templates, otherwise a sheet with the full text.
// Opening it records "seen"; notices that ask for it get an "I have read this" button.
export function NoticeModal({ notice: n, onClose }: { notice: Announcement; onClose: () => void }) {
  const { lang } = useSession()
  const t = useT()
  const c = useColors()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tpl = template(n)
  const { title, content } = localised(n, lang)
  const card = tpl && (tpl.greeting || n.card_data) ? tpl : null

  useEffect(() => { markSeen(n) }, [n.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onAck() {
    setBusy(true)
    setError('')
    try {
      await acknowledge(n.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.notices.ackError)
    } finally {
      setBusy(false)
    }
  }

  const ack = n.requires_ack && (n.acked
    ? <Text testID="notice-acked" className="py-2 text-center text-sm font-semibold text-success">{t.acknowledged}</Text>
    : (
      <View className="gap-2">
        {error ? <Alert>{error}</Alert> : <Text className="text-center text-xs text-warning">{t.notices.needsAck}</Text>}
        <Button label={t.notices.ack} onPress={() => void onAck()} loading={busy} testID="notice-ack" />
      </View>
    ))

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-center bg-black/55 p-4">
        <View testID="notice-modal" accessibilityViewIsModal className="max-h-[90%] overflow-hidden rounded-2xl bg-background">
          <ScrollView contentContainerClassName="gap-4 p-5">
            {card ? (
              <View testID="notice-greeting" style={{ backgroundColor: card.bg }} className="items-center gap-3 rounded-2xl px-5 py-8">
                <Text className="text-6xl">{card.emoji}</Text>
                <Text accessibilityRole="header" style={{ color: card.fg }} className="text-center text-2xl font-extrabold">{n.card_data?.headline || title}</Text>
                <Text style={{ color: card.fg }} className="text-center text-sm leading-relaxed">{content}</Text>
                {n.created_by_name && <Text style={{ color: card.fg }} className="text-xs opacity-80">— {n.created_by_name}</Text>}
              </View>
            ) : (
              <>
                <View className="flex-row items-start gap-2">
                  <View className="flex-1 flex-row flex-wrap gap-1.5">
                    <Chip>{t.notices.type[n.announcement_type] ?? n.announcement_type}</Chip>
                    {n.priority === 'urgent' ? <Chip tone="red">{t.urgent}</Chip> : n.priority === 'high' ? <Chip tone="amber">{t.home.important}</Chip> : null}
                    {n.pinned && <Pin size={14} color={c.primary} accessibilityLabel={t.notices.pinned} />}
                  </View>
                  <Pressable onPress={onClose} hitSlop={12} testID="notice-close-x" accessibilityRole="button" accessibilityLabel={t.close}>
                    <X size={22} color={c.mutedForeground} />
                  </Pressable>
                </View>
                <Text accessibilityRole="header" className="text-lg font-extrabold leading-snug text-foreground">{tpl ? `${tpl.emoji} ` : ''}{title}</Text>
                <Text testID="notice-body" selectable className="text-sm leading-relaxed text-foreground/90">{content}</Text>
                <View className="gap-0.5 border-t border-border pt-2">
                  <Text className="text-xs text-muted-foreground">{t.notices.postedBy(n.created_by_name ?? '—', fullDay(n.published_at ?? n.created_at))}</Text>
                  {n.expires_at && <Text className="text-xs text-muted-foreground">{t.notices.validUntil(fullDay(n.expires_at))}</Text>}
                </View>
              </>
            )}
            {ack}
            <Button label={card ? t.notices.thanks : t.close} onPress={onClose} variant="outline" testID="notice-close" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
