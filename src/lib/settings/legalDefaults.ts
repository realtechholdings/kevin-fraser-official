export type LegalDocumentSettings = {
  title: string
  subtitle: string
  body: string
}

export type LegalSettings = {
  terms: LegalDocumentSettings
  refundPolicy: LegalDocumentSettings
  privacy: LegalDocumentSettings
}

export const DEFAULT_TERMS_BODY = `## Overview

This website is operated by Kevin Fraser Official. Throughout the site, the terms "we", "us", and "our" refer to Kevin Fraser Official. Kevin Fraser Official offers this website, including all information, tools, and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies, and notices stated here.

By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions ("Terms of Service", "Terms"), including any additional terms, conditions, and policies referenced herein and/or available by hyperlink. These Terms of Service apply to all users of the site, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content.

Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services.

Any new features or tools which are added to the current store shall also be subject to the Terms of Service. You can review the most current version of the Terms of Service at any time on this page. We reserve the right to update, change, or replace any part of these Terms of Service by posting updates and/or changes to our website. Your continued use of or access to the website following the posting of any changes constitutes acceptance of those changes.

## Section 1 – Online Store Terms

By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.

You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction.

You must not transmit any worms, viruses, or any code of a destructive nature.

A breach or violation of any of the Terms will result in an immediate termination of your Services.

## Section 2 – General Conditions

We reserve the right to refuse service to anyone for any reason at any time.

You understand that your content (not including payment information) may be transferred unencrypted and involve transmissions over various networks and changes to conform and adapt to technical requirements of connecting networks or devices. Payment information is always encrypted during transfer over networks.

You agree not to reproduce, duplicate, copy, sell, resell, or exploit any portion of the Service without express written permission by us.

## Section 3 – Accuracy, Completeness and Timeliness of Information

We are not responsible if information made available on this site is not accurate, complete, or current. The material on this site is provided for general information only and should not be relied upon as the sole basis for making decisions.

This site may contain historical information which is provided for reference only. We reserve the right to modify the contents of this site at any time without obligation to update.

## Section 4 – Modifications to the Service and Prices

Prices for our products are subject to change without notice.

We reserve the right to modify or discontinue the Service at any time without notice.

We shall not be liable to you or to any third party for any modification, price change, suspension, or discontinuance of the Service.

## Section 5 – Products or Services (If Applicable)

Certain products or services may be available exclusively online and may have limited quantities.

We reserve the right to limit sales by person, geographic region, or jurisdiction.

All product descriptions and pricing are subject to change at any time without notice.

## Section 6 – Accuracy of Billing and Account Information

We reserve the right to refuse or cancel any order.

You agree to provide current, complete, and accurate purchase and account information and to promptly update such information as needed.

For more detail, please review our [Refund Policy](/refund-policy).

## Section 7 – Optional Tools

We may provide access to third-party tools "as is" and "as available" without warranties.

We shall have no liability arising from your use of optional third-party tools.

## Section 8 – Third-Party Links

Third-party links may direct you to websites not affiliated with us. We are not responsible for third-party content or transactions.

## Section 9 – User Comments, Feedback and Other Submissions

You agree that we may use any submissions you provide without restriction or compensation.

You are solely responsible for the accuracy and legality of any comments submitted.

## Section 10 – Personal Information

Your submission of personal information through the site is governed by our [Privacy Policy](/privacy).

## Section 11 – Errors, Inaccuracies and Omissions

We reserve the right to correct any errors or inaccuracies and to cancel orders if any information is inaccurate at any time without notice.

## Section 12 – Prohibited Uses

You are prohibited from using the site or its content for unlawful purposes, to violate intellectual property rights, to distribute malicious code, or to interfere with the security features of the site.

## Section 13 – Disclaimer of Warranties; Limitation of Liability

All services and products are provided "as is" and "as available" without warranties of any kind.

In no case shall Kevin Fraser Official be liable for any direct or indirect damages arising from the use of the Service to the maximum extent permitted by law.

## Section 14 – Indemnification

You agree to indemnify and hold harmless Kevin Fraser Official against any claims arising from your breach of these Terms.

## Section 15 – Severability

If any provision is found unenforceable, the remaining provisions shall remain in effect.

## Section 16 – Termination

These Terms remain effective unless terminated by either party.

## Section 17 – Entire Agreement

These Terms constitute the entire agreement between you and us and supersede any prior agreements.

## Section 18 – Governing Law

These Terms shall be governed by and construed in accordance with the laws of South Africa.

## Section 19 – Changes to Terms of Service

We reserve the right to update or modify these Terms at any time. Continued use of the Service constitutes acceptance of changes.

## Section 20 – Protection of Personal Information Act (POPIA)

We process personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA).

We take reasonable technical and organisational measures to safeguard personal information and respect your rights to access, correction, objection, and deletion of personal data.

## Section 21 – Contact Information

Questions about the Terms of Service should be sent to [letsplay@creamkulture.com](mailto:letsplay@creamkulture.com).`

export const DEFAULT_REFUND_BODY = `## Returns

Our policy lasts 7 days from purchase.

Items must be unused, in original condition, and original packaging.

Non-returnable items include:

- Gift cards
- Downloadable software
- Health and personal care items
- Event tickets

## Event Tickets

Event tickets are non-refundable but may be transferred. The original ticket holder must notify [bookings@creamkulture.com](mailto:bookings@creamkulture.com) with updated details.

## Event Postponement & Cancellation

- Postponed events allow ticket rollover or refund if within 48 hours
- Cancelled events qualify for a full refund

## Refunds

Approved refunds are processed to the original payment method within 7 days.

## Late or Missing Refunds

If your refund has not been received, contact [letsplay@creamkulture.com](mailto:letsplay@creamkulture.com).

## Sale Items

Sale items, Early Bird, and First Release tickets are non-refundable.

## Exchanges

Exchanges are only available for defective or damaged items.

## Gifts

Gift refunds are issued to the original purchaser unless marked as a gift.

## Contact Information

Questions about the Refund Policy should be sent to [letsplay@creamkulture.com](mailto:letsplay@creamkulture.com).`

export const DEFAULT_PRIVACY_BODY = `## Section 1 – What Do We Do With Your Information?

When you purchase something from our store, as part of the buying and selling process, we collect the personal information you give us such as your name, address, and email address.

When you browse our store, we also automatically receive your computer's internet protocol (IP) address in order to provide us with information that helps us learn about your browser and operating system.

Email marketing (if applicable): With your permission, we may send you emails about our store, new products, and other updates.

## Section 2 – Consent

**How do you get my consent?**

When you provide us with personal information to complete a transaction, verify your credit card, place an order, arrange for a delivery, or return a purchase, we imply that you consent to our collecting it and using it for that specific reason only.

If we ask for your personal information for a secondary reason, like marketing, we will either ask you directly for your expressed consent or provide you with an opportunity to say no.

**How do I withdraw my consent?**

If after you opt-in, you change your mind, you may withdraw your consent for us to contact you, for the continued collection, use, or disclosure of your information, at any time, by contacting us at [letsplay@creamkulture.com](mailto:letsplay@creamkulture.com).

## Section 3 – Disclosure

We may disclose your personal information if we are required by law to do so or if you violate our [Terms of Service](/terms).

## Section 4 – Third-Party Services

In general, the third-party providers used by us will only collect, use, and disclose your information to the extent necessary to allow them to perform the services they provide to us.

However, certain third-party service providers, such as payment gateways and other payment transaction processors, have their own privacy policies in respect to the information we are required to provide to them for your purchase-related transactions.

For these providers, we recommend that you read their privacy policies so you can understand the manner in which your personal information will be handled by these providers.

In particular, remember that certain providers may be located in, or have facilities that are located in, a different jurisdiction than either you or us. If you elect to proceed with a transaction that involves the services of a third-party service provider, then your information may become subject to the laws of the jurisdiction(s) in which that service provider or its facilities are located.

Once you leave our store's website or are redirected to a third-party website or application, you are no longer governed by this Privacy Policy or our website's Terms of Service.

**Links**

When you click on links on our store, they may direct you away from our site. We are not responsible for the privacy practices of other sites and encourage you to read their privacy statements.

## Section 5 – Security

To protect your personal information, we take reasonable precautions and follow industry best practices to make sure it is not inappropriately lost, misused, accessed, disclosed, altered, or destroyed.

If you provide us with your payment information, the information is encrypted using secure socket layer technology (SSL) and stored with AES-256 encryption. Although no method of transmission over the Internet or electronic storage is 100% secure, we follow applicable security standards and implement additional generally accepted industry practices.

## Section 6 – Cookies

Here is a list of cookies that we use. We've listed them here so that you can choose if you want to opt out of cookies or not:

- **_session_id**: unique token, sessional. Stores information about your session (referrer, landing page, etc).
- **_visit**: no data held. Persistent for a limited period from the last visit. Used by internal analytics to record the number of visits.
- **_uniq**: no data held. Expires midnight (relative to the visitor) of the next day. Counts the number of visits to the store by a single customer.
- **cart**: unique token, persistent for 2 weeks. Stores information about the contents of your cart.
- **_secure_session_id**: unique token, sessional.
- **storefront_digest**: unique token, indefinite. If the store has a password, this is used to determine if the current visitor has access.

## Section 7 – Age of Consent

By using this site, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.

## Section 8 – Changes to This Privacy Policy

We reserve the right to modify this privacy policy at any time, so please review it frequently. Changes and clarifications will take effect immediately upon their posting on the website.

If we make material changes to this policy, we will notify you here that it has been updated, so that you are aware of what information we collect, how we use it, and under what circumstances, if any, we use and/or disclose it.

If our store is acquired or merged with another company, your information may be transferred to the new owners so that we may continue to sell products to you.

## Section 9 – Protection of Personal Information Act (POPIA)

We are committed to protecting your personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA).

We collect, process, store, and use personal information lawfully and in a reasonable manner that does not infringe your privacy. Personal information is collected for a specific, explicitly defined, and lawful purpose related to our services and business operations.

Appropriate, reasonable technical and organisational measures are implemented to safeguard personal information against loss, damage, unauthorised destruction, unlawful access, or processing.

You have the right to access your personal information, request correction or deletion of your information, object to the processing of your information, and lodge a complaint with the Information Regulator of South Africa.

## Questions and Contact Information

If you would like to access, correct, amend, or delete any personal information we have about you, register a complaint, or simply want more information, please contact our Privacy Compliance Officer at [letsplay@creamkulture.com](mailto:letsplay@creamkulture.com) or by mail at:

Kevin Fraser Official  
[Re: Privacy Compliance Officer]`

export const DEFAULT_TERMS_DOCUMENT: LegalDocumentSettings = {
  title: 'Terms of Service',
  subtitle: 'Operated by Kevin Fraser Official',
  body: DEFAULT_TERMS_BODY,
}

export const DEFAULT_REFUND_DOCUMENT: LegalDocumentSettings = {
  title: 'Refund Policy',
  subtitle: 'Returns, tickets, and refunds',
  body: DEFAULT_REFUND_BODY,
}

export const DEFAULT_PRIVACY_DOCUMENT: LegalDocumentSettings = {
  title: 'Privacy Statement',
  subtitle: 'How we collect and use personal information',
  body: DEFAULT_PRIVACY_BODY,
}

export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {
  terms: DEFAULT_TERMS_DOCUMENT,
  refundPolicy: DEFAULT_REFUND_DOCUMENT,
  privacy: DEFAULT_PRIVACY_DOCUMENT,
}

export function normalizeLegalDocument(
  value: Partial<LegalDocumentSettings> | null | undefined,
  fallback: LegalDocumentSettings,
): LegalDocumentSettings {
  return {
    title: String(value?.title ?? fallback.title).trim() || fallback.title,
    subtitle: String(value?.subtitle ?? fallback.subtitle).trim(),
    body: String(value?.body ?? fallback.body),
  }
}

export function normalizeLegalSettings(
  value: Partial<LegalSettings> | null | undefined,
): LegalSettings {
  return {
    terms: normalizeLegalDocument(value?.terms, DEFAULT_TERMS_DOCUMENT),
    refundPolicy: normalizeLegalDocument(value?.refundPolicy, DEFAULT_REFUND_DOCUMENT),
    privacy: normalizeLegalDocument(value?.privacy, DEFAULT_PRIVACY_DOCUMENT),
  }
}
