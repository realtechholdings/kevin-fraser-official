import type { Metadata } from 'next'
import LegalDocument, { LegalSection } from '@/components/legal/LegalDocument'

export const metadata: Metadata = {
  title: 'Refund Policy | Kevin Fraser Official',
  description: 'Refund and returns policy for Kevin Fraser Official.',
}

export default function RefundPolicyPage() {
  return (
    <LegalDocument title="Refund Policy" subtitle="Returns, tickets, and refunds">
      <LegalSection title="Returns">
        <p>Our policy lasts 7 days from purchase.</p>
        <p>Items must be unused, in original condition, and original packaging.</p>
        <p>Non-returnable items include:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Gift cards</li>
          <li>Downloadable software</li>
          <li>Health and personal care items</li>
          <li>Event tickets</li>
        </ul>
      </LegalSection>

      <LegalSection title="Event Tickets">
        <p>
          Event tickets are non-refundable but may be transferred. The original ticket holder must
          notify{' '}
          <a
            href="mailto:bookings@creamkulture.com"
            className="underline hover:text-[var(--foreground)]"
          >
            bookings@creamkulture.com
          </a>{' '}
          with updated details.
        </p>
      </LegalSection>

      <LegalSection title="Event Postponement & Cancellation">
        <ul className="list-disc space-y-1 pl-5">
          <li>Postponed events allow ticket rollover or refund if within 48 hours</li>
          <li>Cancelled events qualify for a full refund</li>
        </ul>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>
          Approved refunds are processed to the original payment method within 7 days.
        </p>
      </LegalSection>

      <LegalSection title="Late or Missing Refunds">
        <p>
          If your refund has not been received, contact{' '}
          <a
            href="mailto:letsplay@creamkulture.com"
            className="underline hover:text-[var(--foreground)]"
          >
            letsplay@creamkulture.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Sale Items">
        <p>Sale items, Early Bird, and First Release tickets are non-refundable.</p>
      </LegalSection>

      <LegalSection title="Exchanges">
        <p>Exchanges are only available for defective or damaged items.</p>
      </LegalSection>

      <LegalSection title="Gifts">
        <p>
          Gift refunds are issued to the original purchaser unless marked as a gift.
        </p>
      </LegalSection>

      <LegalSection title="Contact Information">
        <p>
          Questions about the Refund Policy should be sent to{' '}
          <a
            href="mailto:letsplay@creamkulture.com"
            className="underline hover:text-[var(--foreground)]"
          >
            letsplay@creamkulture.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
