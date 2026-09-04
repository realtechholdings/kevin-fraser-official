const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim, lowercase, and reject placeholders / obviously invalid addresses. */
export function normalizeCheckoutEmail(value: unknown): string {
  const email = String(value || '').trim().toLowerCase()
  if (!email || email === 'pending@checkout') return ''
  if (email.length > 254 || !EMAIL_RE.test(email)) return ''
  return email
}
