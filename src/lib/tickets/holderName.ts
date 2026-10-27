import { getStripe, stripeRequestOptions } from '@/lib/stripe'

/** A door-list name. Emails and payment ids are not names. */
export function usableHolderName(value: unknown) {
  const name = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 120) return ''
  if (name.includes('@')) return ''
  if (/^(cs|pi|ch|manual|upgrade|transfer)_/i.test(name)) return ''
  return name
}

type NameOrder = {
  holderName?: string | null
  stripeSessionId?: string | null
  save?: () => Promise<unknown>
}

function stripeStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return 0
  return Number((error as { statusCode?: number }).statusCode) || 0
}

/**
 * Copy the Stripe checkout name onto orders that were paid before we stored it.
 * Stops early if Stripe rejects the key, so a local test key cannot stall a list.
 */
export async function backfillHolderNames(
  orders: NameOrder[],
  opts?: { deadlineMs?: number; concurrency?: number },
) {
  const deadline = Date.now() + (opts?.deadlineMs ?? 8000)
  const missing = orders.filter(
    (order) =>
      !usableHolderName(order.holderName) && String(order.stripeSessionId || '').startsWith('cs_'),
  )
  if (!missing.length || !process.env.STRIPE_SECRET_KEY) return { updated: 0, skipped: missing.length }

  const stripe = getStripe()
  const requestOptions = stripeRequestOptions()
  let cursor = 0
  let updated = 0
  let authFailures = 0
  const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 6, missing.length))

  async function worker() {
    while (cursor < missing.length && Date.now() < deadline && authFailures < 3) {
      const index = cursor
      cursor += 1
      const order = missing[index]
      if (!order) return
      const sessionId = String(order.stripeSessionId || '')
      try {
        let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>> | null = null
        for (let attempt = 0; attempt < 3 && !session; attempt += 1) {
          try {
            session = await stripe.checkout.sessions.retrieve(sessionId, {}, requestOptions)
          } catch (error) {
            const status = stripeStatus(error)
            if (status === 401 || status === 403) {
              authFailures += 1
              return
            }
            if (status === 429 && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
              continue
            }
            throw error
          }
        }
        if (!session) continue
        const name = usableHolderName(
          session.customer_details?.name || session.metadata?.holderName || session.metadata?.name,
        )
        if (!name || !order.save) continue
        order.holderName = name
        await order.save()
        updated += 1
      } catch {
        // One unreadable checkout should not blank the rest of the list.
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return { updated, skipped: missing.length - updated }
}
