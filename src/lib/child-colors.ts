// One colour per child, used only on the child cards in the header (#10), so parents can
// tell whose data is on screen. No rose: the header behind the cards is rose.
// `solid` with white text and `solid` on `tint` both pass WCAG AA (≥ 4.5:1).
export type ChildColor = { solid: string; tint: string }
export const CHILD_COLORS: ChildColor[] = [
  { solid: '#6d28d9', tint: '#ede9fe' }, // violet
  { solid: '#c2410c', tint: '#ffedd5' }, // orange
  { solid: '#0369a1', tint: '#e0f2fe' }, // sky
  { solid: '#0f766e', tint: '#ccfbf1' }, // teal
  { solid: '#4338ca', tint: '#e0e7ff' }, // indigo
  { solid: '#a16207', tint: '#fef9c3' }, // amber
]

// By the child's position in the parent's list (stable order); the first colour when unknown.
export function childColor(children: { id: number }[], childId: number | null | undefined): ChildColor {
  const i = children.findIndex(c => c.id === childId)
  return CHILD_COLORS[Math.max(i, 0) % CHILD_COLORS.length]
}
