import type { Metadata } from 'next'
import LegalDocument, { LegalSection } from '@/components/legal/LegalDocument'

export const metadata: Metadata = {
  title: 'Terms of Service | Kevin Fraser Official',
  description: 'Terms of Service for Kevin Fraser Official.',
}

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" subtitle="Operated by Kevin Fraser Official">
      <LegalSection title="Overview">
        <p>
          This website is operated by Kevin Fraser Official. Throughout the site, the terms “we”,
          “us”, and “our” refer to Kevin Fraser Official. Kevin Fraser Official offers this website,
          including all information, tools, and services available from this site to you, the user,
          conditioned upon your acceptance of all terms, conditions, policies, and notices stated
          here.
        </p>
        <p>
          By visiting our site and/or purchasing something from us, you engage in our “Service” and
          agree to be bound by the following terms and conditions (“Terms of Service”, “Terms”),
          including any additional terms, conditions, and policies referenced herein and/or available
          by hyperlink. These Terms of Service apply to all users of the site, including without
          limitation users who are browsers, vendors, customers, merchants, and/or contributors of
          content.
        </p>
        <p>
          Please read these Terms of Service carefully before accessing or using our website. By
          accessing or using any part of the site, you agree to be bound by these Terms of Service.
          If you do not agree to all the terms and conditions of this agreement, then you may not
          access the website or use any services.
        </p>
        <p>
          Any new features or tools which are added to the current store shall also be subject to
          the Terms of Service. You can review the most current version of the Terms of Service at
          any time on this page. We reserve the right to update, change, or replace any part of
          these Terms of Service by posting updates and/or changes to our website. Your continued
          use of or access to the website following the posting of any changes constitutes
          acceptance of those changes.
        </p>
      </LegalSection>

      <LegalSection title="Section 1 – Online Store Terms">
        <p>
          By agreeing to these Terms of Service, you represent that you are at least the age of
          majority in your state or province of residence, or that you are the age of majority in
          your state or province of residence and you have given us your consent to allow any of
          your minor dependents to use this site.
        </p>
        <p>
          You may not use our products for any illegal or unauthorized purpose nor may you, in the
          use of the Service, violate any laws in your jurisdiction.
        </p>
        <p>
          You must not transmit any worms, viruses, or any code of a destructive nature.
        </p>
        <p>
          A breach or violation of any of the Terms will result in an immediate termination of your
          Services.
        </p>
      </LegalSection>

      <LegalSection title="Section 2 – General Conditions">
        <p>We reserve the right to refuse service to anyone for any reason at any time.</p>
        <p>
          You understand that your content (not including payment information) may be transferred
          unencrypted and involve transmissions over various networks and changes to conform and
          adapt to technical requirements of connecting networks or devices. Payment information is
          always encrypted during transfer over networks.
        </p>
        <p>
          You agree not to reproduce, duplicate, copy, sell, resell, or exploit any portion of the
          Service without express written permission by us.
        </p>
      </LegalSection>

      <LegalSection title="Section 3 – Accuracy, Completeness and Timeliness of Information">
        <p>
          We are not responsible if information made available on this site is not accurate,
          complete, or current. The material on this site is provided for general information only
          and should not be relied upon as the sole basis for making decisions.
        </p>
        <p>
          This site may contain historical information which is provided for reference only. We
          reserve the right to modify the contents of this site at any time without obligation to
          update.
        </p>
      </LegalSection>

      <LegalSection title="Section 4 – Modifications to the Service and Prices">
        <p>Prices for our products are subject to change without notice.</p>
        <p>
          We reserve the right to modify or discontinue the Service at any time without notice.
        </p>
        <p>
          We shall not be liable to you or to any third party for any modification, price change,
          suspension, or discontinuance of the Service.
        </p>
      </LegalSection>

      <LegalSection title="Section 5 – Products or Services (If Applicable)">
        <p>
          Certain products or services may be available exclusively online and may have limited
          quantities.
        </p>
        <p>
          We reserve the right to limit sales by person, geographic region, or jurisdiction.
        </p>
        <p>
          All product descriptions and pricing are subject to change at any time without notice.
        </p>
      </LegalSection>

      <LegalSection title="Section 6 – Accuracy of Billing and Account Information">
        <p>We reserve the right to refuse or cancel any order.</p>
        <p>
          You agree to provide current, complete, and accurate purchase and account information and
          to promptly update such information as needed.
        </p>
        <p>
          For more detail, please review our{' '}
          <a href="/refund-policy" className="underline hover:text-[var(--foreground)]">
            Refund Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Section 7 – Optional Tools">
        <p>
          We may provide access to third-party tools “as is” and “as available” without warranties.
        </p>
        <p>
          We shall have no liability arising from your use of optional third-party tools.
        </p>
      </LegalSection>

      <LegalSection title="Section 8 – Third-Party Links">
        <p>
          Third-party links may direct you to websites not affiliated with us. We are not responsible
          for third-party content or transactions.
        </p>
      </LegalSection>

      <LegalSection title="Section 9 – User Comments, Feedback and Other Submissions">
        <p>
          You agree that we may use any submissions you provide without restriction or compensation.
        </p>
        <p>
          You are solely responsible for the accuracy and legality of any comments submitted.
        </p>
      </LegalSection>

      <LegalSection title="Section 10 – Personal Information">
        <p>
          Your submission of personal information through the site is governed by our{' '}
          <a href="/privacy" className="underline hover:text-[var(--foreground)]">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Section 11 – Errors, Inaccuracies and Omissions">
        <p>
          We reserve the right to correct any errors or inaccuracies and to cancel orders if any
          information is inaccurate at any time without notice.
        </p>
      </LegalSection>

      <LegalSection title="Section 12 – Prohibited Uses">
        <p>
          You are prohibited from using the site or its content for unlawful purposes, to violate
          intellectual property rights, to distribute malicious code, or to interfere with the
          security features of the site.
        </p>
      </LegalSection>

      <LegalSection title="Section 13 – Disclaimer of Warranties; Limitation of Liability">
        <p>
          All services and products are provided “as is” and “as available” without warranties of
          any kind.
        </p>
        <p>
          In no case shall Kevin Fraser Official be liable for any direct or indirect damages
          arising from the use of the Service to the maximum extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="Section 14 – Indemnification">
        <p>
          You agree to indemnify and hold harmless Kevin Fraser Official against any claims arising
          from your breach of these Terms.
        </p>
      </LegalSection>

      <LegalSection title="Section 15 – Severability">
        <p>
          If any provision is found unenforceable, the remaining provisions shall remain in effect.
        </p>
      </LegalSection>

      <LegalSection title="Section 16 – Termination">
        <p>These Terms remain effective unless terminated by either party.</p>
      </LegalSection>

      <LegalSection title="Section 17 – Entire Agreement">
        <p>
          These Terms constitute the entire agreement between you and us and supersede any prior
          agreements.
        </p>
      </LegalSection>

      <LegalSection title="Section 18 – Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of South
          Africa.
        </p>
      </LegalSection>

      <LegalSection title="Section 19 – Changes to Terms of Service">
        <p>
          We reserve the right to update or modify these Terms at any time. Continued use of the
          Service constitutes acceptance of changes.
        </p>
      </LegalSection>

      <LegalSection title="Section 20 – Protection of Personal Information Act (POPIA)">
        <p>
          We process personal information in accordance with the Protection of Personal Information
          Act 4 of 2013 (POPIA).
        </p>
        <p>
          We take reasonable technical and organisational measures to safeguard personal information
          and respect your rights to access, correction, objection, and deletion of personal data.
        </p>
      </LegalSection>

      <LegalSection title="Section 21 – Contact Information">
        <p>
          Questions about the Terms of Service should be sent to{' '}
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
