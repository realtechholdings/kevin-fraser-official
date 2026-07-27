import type { Metadata } from 'next'
import LegalDocument, { LegalSection } from '@/components/legal/LegalDocument'

export const metadata: Metadata = {
  title: 'Privacy Statement | Kevin Fraser Official',
  description: 'Privacy Statement for Kevin Fraser Official.',
}

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Statement" subtitle="How we collect and use personal information">
      <LegalSection title="Section 1 – What Do We Do With Your Information?">
        <p>
          When you purchase something from our store, as part of the buying and selling process, we
          collect the personal information you give us such as your name, address, and email
          address.
        </p>
        <p>
          When you browse our store, we also automatically receive your computer’s internet protocol
          (IP) address in order to provide us with information that helps us learn about your
          browser and operating system.
        </p>
        <p>
          Email marketing (if applicable): With your permission, we may send you emails about our
          store, new products, and other updates.
        </p>
      </LegalSection>

      <LegalSection title="Section 2 – Consent">
        <p className="font-medium text-[var(--foreground)]">How do you get my consent?</p>
        <p>
          When you provide us with personal information to complete a transaction, verify your
          credit card, place an order, arrange for a delivery, or return a purchase, we imply that
          you consent to our collecting it and using it for that specific reason only.
        </p>
        <p>
          If we ask for your personal information for a secondary reason, like marketing, we will
          either ask you directly for your expressed consent or provide you with an opportunity to
          say no.
        </p>
        <p className="font-medium text-[var(--foreground)]">How do I withdraw my consent?</p>
        <p>
          If after you opt-in, you change your mind, you may withdraw your consent for us to contact
          you, for the continued collection, use, or disclosure of your information, at any time, by
          contacting us at{' '}
          <a
            href="mailto:letsplay@creamkulture.com"
            className="underline hover:text-[var(--foreground)]"
          >
            letsplay@creamkulture.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Section 3 – Disclosure">
        <p>
          We may disclose your personal information if we are required by law to do so or if you
          violate our{' '}
          <a href="/terms" className="underline hover:text-[var(--foreground)]">
            Terms of Service
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Section 4 – Third-Party Services">
        <p>
          In general, the third-party providers used by us will only collect, use, and disclose your
          information to the extent necessary to allow them to perform the services they provide to
          us.
        </p>
        <p>
          However, certain third-party service providers, such as payment gateways and other payment
          transaction processors, have their own privacy policies in respect to the information we
          are required to provide to them for your purchase-related transactions.
        </p>
        <p>
          For these providers, we recommend that you read their privacy policies so you can
          understand the manner in which your personal information will be handled by these
          providers.
        </p>
        <p>
          In particular, remember that certain providers may be located in, or have facilities that
          are located in, a different jurisdiction than either you or us. If you elect to proceed
          with a transaction that involves the services of a third-party service provider, then your
          information may become subject to the laws of the jurisdiction(s) in which that service
          provider or its facilities are located.
        </p>
        <p>
          Once you leave our store’s website or are redirected to a third-party website or
          application, you are no longer governed by this Privacy Policy or our website’s Terms of
          Service.
        </p>
        <p className="font-medium text-[var(--foreground)]">Links</p>
        <p>
          When you click on links on our store, they may direct you away from our site. We are not
          responsible for the privacy practices of other sites and encourage you to read their
          privacy statements.
        </p>
      </LegalSection>

      <LegalSection title="Section 5 – Security">
        <p>
          To protect your personal information, we take reasonable precautions and follow industry
          best practices to make sure it is not inappropriately lost, misused, accessed, disclosed,
          altered, or destroyed.
        </p>
        <p>
          If you provide us with your payment information, the information is encrypted using secure
          socket layer technology (SSL) and stored with AES-256 encryption. Although no method of
          transmission over the Internet or electronic storage is 100% secure, we follow applicable
          security standards and implement additional generally accepted industry practices.
        </p>
      </LegalSection>

      <LegalSection title="Section 6 – Cookies">
        <p>
          Here is a list of cookies that we use. We’ve listed them here so that you can choose if
          you want to opt out of cookies or not:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-[var(--foreground)]">_session_id</strong>: unique token,
            sessional. Stores information about your session (referrer, landing page, etc).
          </li>
          <li>
            <strong className="text-[var(--foreground)]">_visit</strong>: no data held. Persistent
            for a limited period from the last visit. Used by internal analytics to record the
            number of visits.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">_uniq</strong>: no data held. Expires
            midnight (relative to the visitor) of the next day. Counts the number of visits to the
            store by a single customer.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">cart</strong>: unique token, persistent for
            2 weeks. Stores information about the contents of your cart.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">_secure_session_id</strong>: unique token,
            sessional.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">storefront_digest</strong>: unique token,
            indefinite. If the store has a password, this is used to determine if the current
            visitor has access.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Section 7 – Age of Consent">
        <p>
          By using this site, you represent that you are at least the age of majority in your state
          or province of residence, or that you are the age of majority in your state or province of
          residence and you have given us your consent to allow any of your minor dependents to use
          this site.
        </p>
      </LegalSection>

      <LegalSection title="Section 8 – Changes to This Privacy Policy">
        <p>
          We reserve the right to modify this privacy policy at any time, so please review it
          frequently. Changes and clarifications will take effect immediately upon their posting on
          the website.
        </p>
        <p>
          If we make material changes to this policy, we will notify you here that it has been
          updated, so that you are aware of what information we collect, how we use it, and under
          what circumstances, if any, we use and/or disclose it.
        </p>
        <p>
          If our store is acquired or merged with another company, your information may be
          transferred to the new owners so that we may continue to sell products to you.
        </p>
      </LegalSection>

      <LegalSection title="Section 9 – Protection of Personal Information Act (POPIA)">
        <p>
          We are committed to protecting your personal information in accordance with the Protection
          of Personal Information Act 4 of 2013 (POPIA).
        </p>
        <p>
          We collect, process, store, and use personal information lawfully and in a reasonable
          manner that does not infringe your privacy. Personal information is collected for a
          specific, explicitly defined, and lawful purpose related to our services and business
          operations.
        </p>
        <p>
          Appropriate, reasonable technical and organisational measures are implemented to safeguard
          personal information against loss, damage, unauthorised destruction, unlawful access, or
          processing.
        </p>
        <p>
          You have the right to access your personal information, request correction or deletion of
          your information, object to the processing of your information, and lodge a complaint with
          the Information Regulator of South Africa.
        </p>
      </LegalSection>

      <LegalSection title="Questions and Contact Information">
        <p>
          If you would like to access, correct, amend, or delete any personal information we have
          about you, register a complaint, or simply want more information, please contact our
          Privacy Compliance Officer at{' '}
          <a
            href="mailto:letsplay@creamkulture.com"
            className="underline hover:text-[var(--foreground)]"
          >
            letsplay@creamkulture.com
          </a>{' '}
          or by mail at:
        </p>
        <p>
          Kevin Fraser Official
          <br />
          [Re: Privacy Compliance Officer]
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
