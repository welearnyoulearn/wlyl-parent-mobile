// One colour per child so parents can tell whose data is on screen (#10).
// White text passes WCAG AA (≥ 4.5:1) on every shade.
export const CHILD_COLORS = ['#0d7d76', '#6d28d9', '#c2410c', '#1d4ed8', '#be123c', '#047857']

// By the child's position in the parent's list (stable order); teal when unknown.
export function childColor(children: { id: number }[], childId: number | null | undefined): string {
  const i = children.findIndex(c => c.id === childId)
  return CHILD_COLORS[Math.max(i, 0) % CHILD_COLORS.length]
}
