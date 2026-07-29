export const KEVIN11_CATEGORIES = ['comedy', 'merch', 'other'] as const

export type Kevin11Category = (typeof KEVIN11_CATEGORIES)[number]

export const KEVIN11_CATEGORY_LABELS: Record<Kevin11Category, string> = {
  comedy: 'Comedy',
  merch: 'Merch',
  other: 'Other',
}

export const KEVIN11_OVERLAY_SLOTS = ['none', 'left', 'right'] as const

export type Kevin11OverlaySlot = (typeof KEVIN11_OVERLAY_SLOTS)[number]
