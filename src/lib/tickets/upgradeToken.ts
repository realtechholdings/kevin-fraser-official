import { createHmac, timingSafeEqual } from 'crypto'
import { appUrl } from '@/lib/stripe'

function secret() {
  return process.env.UPGRADE_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY || 'kf-upgrade-dev'
}

export function signUpgradeToken(orderId: string, email: string) {
  const payload = `${orderId}:${String(email || '').trim().toLowerCase()}`
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function verifyUpgradeToken(orderId: string, email: string, token: string) {
  const expected = signUpgradeToken(orderId, email)
  const got = String(token || '')
  const a = Buffer.from(expected)
  const b = Buffer.from(got)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function publicSiteUrl(host?: string | null) {
  const raw = String(host || '')
    .split(',')[0]
    .trim()
  if (raw) {
    const hostname = raw.replace(/^https?:\/\//, '').split('/')[0]
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      return `http://${hostname}`
    }
    if (hostname) return `https://${hostname}`
  }
  return appUrl()
}

export function upgradeManageUrl(orderId: string, email: string, host?: string | null) {
  const token = signUpgradeToken(orderId, email)
  const base = publicSiteUrl(host)
  return `${base}/worlds/stage/upgrade?order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`
}
