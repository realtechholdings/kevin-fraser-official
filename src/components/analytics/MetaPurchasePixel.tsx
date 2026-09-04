'use client'

import { useEffect, useRef } from 'react'
import {
  clearPendingCheckout,
  centsToMetaValue,
  identifyMetaUser,
  trackMeta,
} from '@/lib/metaPixel'

type Props = {
  sessionId: string
  paid: boolean
  amountTotal: number | null
  currency: string | null
  showId: string | null
  quantity: number
  contentName?: string | null
  email?: string | null
}

export default function MetaPurchasePixel({
  sessionId,
  paid,
  amountTotal,
  currency,
  showId,
  quantity,
  contentName,
  email,
}: Props) {
  const fired = useRef(false)

  useEffect(() => {
    if (!paid || !sessionId || fired.current) return

    const storageKey = `meta_purchase_${sessionId}`
    try {
      if (sessionStorage.getItem(storageKey)) return
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // still fire once per mount via ref
    }

    fired.current = true
    identifyMetaUser(email)
    trackMeta(
      'Purchase',
      {
        content_ids: showId ? [showId] : undefined,
        content_name: contentName || undefined,
        content_type: 'product',
        value: amountTotal != null ? centsToMetaValue(amountTotal) : undefined,
        currency: currency ? currency.toUpperCase() : undefined,
        num_items: quantity,
      },
      { eventID: sessionId },
    )
    clearPendingCheckout()
  }, [paid, sessionId, amountTotal, currency, showId, quantity, contentName, email])

  return null
}
