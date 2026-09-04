import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { CheckCircle2 } from 'lucide-react'
import MetaPurchasePixel from '@/components/analytics/MetaPurchasePixel'
import UpgradeOffersCard from '@/components/stage/UpgradeOffersCard'
import { signUpgradeToken } from '@/lib/tickets/upgradeToken'
import { listUpgradeTargets, serializeUpgradeTarget } from '@/lib/tickets/upgrades'

export const metadata: Metadata = {
  title: 'Tickets Confirmed | Kevin Fraser Official',
}

type Props = {
  searchParams: Promise<{ session_id?: string; upgraded?: string }>
}

async function requestHost() {
  const h = await headers()
  return (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim()
}

async function verify(sessionId?: string, host?: string) {
  if (!sessionId) return null
  try {
    const { getStripe, stripeRequestOptions } = await import('@/lib/stripe')
    const dbConnect = (await import('@/lib/db')).default
    const Order = (await import('@/lib/models/Order')).default
    const { fulfillPaidOrder } = await import('@/lib/tickets/fulfillPaidOrder')
    const { notifyPaidOrderEmails } = await import('@/lib/tickets/notifyPaidOrder')

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      undefined,
      stripeRequestOptions()
    )
    await dbConnect()
    const order = await Order.findOne({ stripeSessionId: sessionId })

    if (session.payment_status === 'paid' && order) {
      await fulfillPaidOrder(order, session)
      await notifyPaidOrderEmails(order, { host })
    }

    const showId =
      session.metadata?.showId || (order?.show ? String(order.show) : null)

    const isUpgrade = Boolean(order?.upgradedFrom)
    let upgradeToken = ''
    let upgradeOffers: ReturnType<typeof serializeUpgradeTarget>[] = []
    if (order && order.status === 'paid' && !isUpgrade) {
      const listed = await listUpgradeTargets(order, { publicOnly: true })
      if (!listed.blocked && listed.targets.length) {
        upgradeToken = signUpgradeToken(String(order._id), order.email)
        upgradeOffers = listed.targets.map(serializeUpgradeTarget)
      }
    }

    return {
      paid: session.payment_status === 'paid',
      email: session.customer_details?.email || session.customer_email || order?.email || null,
      quantity: order?.quantity || Number(session.metadata?.quantity || 1),
      amountTotal: session.amount_total ?? order?.amountTotal ?? null,
      currency: session.currency || order?.currency || null,
      showId,
      contentName: order?.tierName || session.metadata?.tierName || null,
      emailSent: Boolean(order?.confirmationEmailSentAt),
      tableNames: order?.tableNames || [],
      isUpgrade,
      orderId: order ? String(order._id) : '',
      upgradeToken,
      upgradeOffers,
    }
  } catch {
    return null
  }
}

export default async function StageSuccessPage({ searchParams }: Props) {
  const params = await searchParams
  const sessionId = params.session_id || ''
  const host = await requestHost()
  const result = sessionId ? await verify(sessionId, host) : null
  const upgradedOnly = params.upgraded === '1' && !sessionId
  const isUpgrade = Boolean(result?.isUpgrade || upgradedOnly)
  const paid = Boolean(result?.paid || upgradedOnly)

  return (
    <div
      className="flex min-h-screen items-center justify-center overflow-y-auto bg-[var(--background)] px-6 py-16"
    >
      {result?.paid && sessionId ? (
        <MetaPurchasePixel
          sessionId={sessionId}
          paid
          amountTotal={result.amountTotal}
          currency={result.currency}
          showId={result.showId}
          quantity={result.quantity}
          contentName={result.contentName}
          email={result.email}
        />
      ) : null}
      <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-8 py-12 text-center">
        <CheckCircle2 className="mx-auto mb-5" size={48} style={{ color: 'var(--accent)' }} />
        <h1
          className="text-4xl uppercase text-[var(--foreground)]"
          style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
        >
          {isUpgrade ? 'Upgraded' : paid ? "You're in" : 'Payment received'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground-muted)]">
          {isUpgrade
            ? result?.email
              ? `New tickets were emailed to ${result.email}. Your previous tickets will not scan at the door.`
              : 'Your tickets were upgraded. Previous PDFs will not scan at the door.'
            : result?.email
              ? result.emailSent
                ? `Your tickets were emailed to ${result.email}.`
                : `Confirmation heading to ${result.email}.`
              : 'Your Stripe checkout completed. Check your email for the receipt.'}
          {!isUpgrade && result?.quantity
            ? ` ${result.quantity} ticket${result.quantity > 1 ? 's' : ''} secured.`
            : ''}
          {result?.tableNames?.length
            ? ` ${result.tableNames.join(', ')}.`
            : ''}
        </p>
        {result?.upgradeToken && result.orderId && result.upgradeOffers.length ? (
          <UpgradeOffersCard
            orderId={result.orderId}
            token={result.upgradeToken}
            currentTier={result.contentName || 'tickets'}
            quantity={result.quantity}
            offers={result.upgradeOffers}
          />
        ) : null}
        <Link
          href="/worlds/stage"
          className="mt-8 inline-flex rounded-full px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          Back to shows
        </Link>
      </div>
    </div>
  )
}
