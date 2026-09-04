'use client'

import { useEffect, useState } from 'react'
import { Mail, Send, Ticket, PenLine, FileText, ArrowUpRight, Sparkles } from 'lucide-react'
import ImageCropField from '@/components/admin/ImageCropField'
import type { IMAGE_CROP_PRESETS } from '@/lib/admin/imageCrop'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type Settings = {
  signatureName: string
  signatureTagline: string
  signatureLinkUrl: string
  signatureImageUrl: string
  ticketEmailEnabled: boolean
  ticketEmailSubject: string
  ticketEmailBody: string
  upgradeEmailEnabled: boolean
  upgradeEmailSubject: string
  upgradeEmailBody: string
  upgradeOfferEmailEnabled: boolean
  upgradeOfferEmailSubject: string
  upgradeOfferEmailBody: string
  emailConfigured: boolean
  fromAddress: string
}

async function uploadEmailImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', 'email')
  const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Image upload failed')
  if (!data.publicUrl) throw new Error('Upload did not return a public URL.')
  return data.publicUrl as string
}

/** Uploads an image (optionally cropped) and hands back its public URL. */
function InsertImageButton({
  label = 'Insert image',
  disabled,
  preset = 'emailSignature',
  onUploaded,
  onError,
  onBusy,
}: {
  label?: string
  disabled?: boolean
  preset?: keyof typeof IMAGE_CROP_PRESETS
  onUploaded: (url: string) => void
  onError: (msg: string) => void
  onBusy: (busy: boolean) => void
}) {
  return (
    <ImageCropField
      label={label}
      preset={preset}
      disabled={disabled}
      onCropped={async (file) => {
        onBusy(true)
        onError('')
        try {
          onUploaded(await uploadEmailImage(file))
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Image upload failed')
        } finally {
          onBusy(false)
        }
      }}
    />
  )
}

type Template = {
  id: string
  name: string
  subject: string
  body: string
  updatedAt: string
}

type Section = 'ticket' | 'upgrade' | 'upgrade-offer' | 'compose' | 'templates' | 'signature'

const TICKET_PLACEHOLDERS =
  '{{name}} {{email}} {{show}} {{tour}} {{city}} {{venue}} {{address}} {{date}} {{time}} {{doors}} {{tier}} {{table}} {{quantity}} {{total}} {{orderId}} {{upgradeUrl}} {{offers}} {{oldTier}} {{newTier}} {{upgradePrice}}'

/** Append an [image: url] tag on its own line at the end of a body. */
function appendImageTag(body: string, url: string) {
  const tag = `[image: ${url}]`
  return body.trim() ? `${body.replace(/\s+$/, '')}\n\n${tag}\n` : `${tag}\n`
}

export default function CmsAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [section, setSection] = useState<Section>('ticket')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [buyerCount, setBuyerCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const [testEmail, setTestEmail] = useState('')

  const [compose, setCompose] = useState({
    audience: 'custom' as 'custom' | 'buyers',
    to: '',
    subject: '',
    body: '',
    includeSignature: true,
  })

  const [templateForm, setTemplateForm] = useState({ id: '', name: '', subject: '', body: '' })

  async function load() {
    setLoading(true)
    try {
      const [sRes, tRes, rRes] = await Promise.all([
        fetch('/api/admin/cms/settings'),
        fetch('/api/admin/cms/templates'),
        fetch('/api/admin/cms/recipients'),
      ])
      const sData = await sRes.json()
      const tData = await tRes.json()
      const rData = await rRes.json()
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load CMS settings')
      setSettings(sData.settings)
      setTemplates(tRes.ok ? tData.templates || [] : [])
      setBuyerCount(rRes.ok ? rData.count || 0 : 0)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load CMS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveSettings(patch: Partial<Settings>, successMessage: string) {
    setBusy(true)
    onError('')
    try {
      const res = await fetch('/api/admin/cms/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSettings(data.settings)
      onMessage(successMessage)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendTest(kind: 'ticket' | 'upgrade' | 'upgrade-offer' = 'ticket') {
    if (!testEmail.includes('@')) {
      onError('Enter a valid email for the test.')
      return
    }
    setBusy(true)
    onError('')
    try {
      const res = await fetch('/api/admin/cms/test-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, kind }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test send failed')
      const label =
        kind === 'upgrade' ? 'upgrade' : kind === 'upgrade-offer' ? 'upgrade offer' : 'ticket'
      onMessage(`Test ${label} email sent to ${testEmail}.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Test send failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendCompose() {
    setBusy(true)
    onError('')
    try {
      const res = await fetch('/api/admin/cms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.errors?.[0] || data.error || 'Send failed')
      }
      onMessage(`Sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}.`)
      setCompose((c) => ({ ...c, subject: '', body: '' }))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveTemplate() {
    setBusy(true)
    onError('')
    try {
      const res = await fetch('/api/admin/cms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm.id ? templateForm : { ...templateForm, id: undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onMessage(templateForm.id ? 'Template updated.' : 'Template created.')
      setTemplateForm({ id: '', name: '', subject: '', body: '' })
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/cms/templates?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onMessage('Template deleted.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const sections: { id: Section; label: string; icon: typeof Mail }[] = [
    { id: 'ticket', label: 'Ticket email', icon: Ticket },
    { id: 'upgrade', label: 'Upgrade email', icon: ArrowUpRight },
    { id: 'upgrade-offer', label: 'Upgrade offer', icon: Sparkles },
    { id: 'compose', label: 'Compose', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'signature', label: 'Signature', icon: PenLine },
  ]

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">CMS</h2>
          <p className="mt-1 text-sm text-white/40">
            Ticket confirmation, upgrades, broadcasts, and signature
          </p>
        </div>
      </div>

      {settings && !settings.emailConfigured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Email sending is not configured yet — set <code>RESEND_API_KEY</code> in the environment.
          You can still edit templates and settings.
        </div>
      ) : settings ? (
        <p className="text-xs text-white/35">
          Sending as {settings.fromAddress}. Staging (vercel.app) uses kevinfraser@hivemynd.io;
          production (kevinfraserofficial.com) uses tickets@kevinfraserofficial.com.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={section === s.id ? btnPrimary : btnGhost}
          >
            <s.icon className="mr-1.5 inline h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      {section === 'ticket' && settings ? (
        <section className="admin-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Ticket purchase email</h3>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={settings.ticketEmailEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, ticketEmailEnabled: e.target.checked })
                }
              />
              Enabled
            </label>
          </div>
          <p className="text-xs text-white/40">
            Sent automatically after a successful checkout, with the PDF ticket(s) attached —
            one ticket per seat, tier printed on each ticket.
          </p>
          <div>
            <label className={labelClass}>Subject</label>
            <input
              className={inputClass}
              value={settings.ticketEmailSubject}
              onChange={(e) => setSettings({ ...settings, ticketEmailSubject: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              className={`${inputClass} min-h-[180px]`}
              value={settings.ticketEmailBody}
              onChange={(e) => setSettings({ ...settings, ticketEmailBody: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-white/35">Placeholders: {TICKET_PLACEHOLDERS}</p>
            <div className="mt-2">
              <InsertImageButton
                disabled={busy}
                onBusy={setBusy}
                onError={onError}
                onUploaded={(url) =>
                  setSettings((s) =>
                    s ? { ...s, ticketEmailBody: appendImageTag(s.ticketEmailBody, url) } : s,
                  )
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              className={btnPrimary}
              onClick={() =>
                saveSettings(
                  {
                    ticketEmailEnabled: settings.ticketEmailEnabled,
                    ticketEmailSubject: settings.ticketEmailSubject,
                    ticketEmailBody: settings.ticketEmailBody,
                  },
                  'Ticket email saved.',
                )
              }
            >
              Save ticket email
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                className={inputClass}
                style={{ width: '16rem' }}
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button type="button" disabled={busy} className={btnSecondary} onClick={() => sendTest('ticket')}>
                Send test
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {section === 'upgrade' && settings ? (
        <section className="admin-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Upgrade confirmation email</h3>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={settings.upgradeEmailEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, upgradeEmailEnabled: e.target.checked })
                }
              />
              Enabled
            </label>
          </div>
          <p className="text-xs text-white/40">
            Sent when an upgrade completes, with the new PDF tickets attached. Old tickets are
            void — say that clearly.
          </p>
          <div>
            <label className={labelClass}>Subject</label>
            <input
              className={inputClass}
              value={settings.upgradeEmailSubject}
              onChange={(e) => setSettings({ ...settings, upgradeEmailSubject: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              className={`${inputClass} min-h-[180px]`}
              value={settings.upgradeEmailBody}
              onChange={(e) => setSettings({ ...settings, upgradeEmailBody: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-white/35">Placeholders: {TICKET_PLACEHOLDERS}</p>
            <div className="mt-2">
              <InsertImageButton
                disabled={busy}
                onBusy={setBusy}
                onError={onError}
                onUploaded={(url) =>
                  setSettings((s) =>
                    s ? { ...s, upgradeEmailBody: appendImageTag(s.upgradeEmailBody, url) } : s,
                  )
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              className={btnPrimary}
              onClick={() =>
                saveSettings(
                  {
                    upgradeEmailEnabled: settings.upgradeEmailEnabled,
                    upgradeEmailSubject: settings.upgradeEmailSubject,
                    upgradeEmailBody: settings.upgradeEmailBody,
                  },
                  'Upgrade email saved.',
                )
              }
            >
              Save upgrade email
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                className={inputClass}
                style={{ width: '16rem' }}
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                className={btnSecondary}
                onClick={() => sendTest('upgrade')}
              >
                Send test
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {section === 'upgrade-offer' && settings ? (
        <section className="admin-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Post-purchase upgrade offer</h3>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={settings.upgradeOfferEmailEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, upgradeOfferEmailEnabled: e.target.checked })
                }
              />
              Enabled
            </label>
          </div>
          <p className="text-xs text-white/40">
            Optional extra email after checkout when this show has upgrade paths turned on.
            Off by default — the ticket email can already include {'{{upgradeUrl}}'}.
          </p>
          <div>
            <label className={labelClass}>Subject</label>
            <input
              className={inputClass}
              value={settings.upgradeOfferEmailSubject}
              onChange={(e) =>
                setSettings({ ...settings, upgradeOfferEmailSubject: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              className={`${inputClass} min-h-[180px]`}
              value={settings.upgradeOfferEmailBody}
              onChange={(e) =>
                setSettings({ ...settings, upgradeOfferEmailBody: e.target.value })
              }
            />
            <p className="mt-1.5 text-xs text-white/35">Placeholders: {TICKET_PLACEHOLDERS}</p>
            <div className="mt-2">
              <InsertImageButton
                disabled={busy}
                onBusy={setBusy}
                onError={onError}
                onUploaded={(url) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          upgradeOfferEmailBody: appendImageTag(s.upgradeOfferEmailBody, url),
                        }
                      : s,
                  )
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              className={btnPrimary}
              onClick={() =>
                saveSettings(
                  {
                    upgradeOfferEmailEnabled: settings.upgradeOfferEmailEnabled,
                    upgradeOfferEmailSubject: settings.upgradeOfferEmailSubject,
                    upgradeOfferEmailBody: settings.upgradeOfferEmailBody,
                  },
                  'Upgrade offer email saved.',
                )
              }
            >
              Save offer email
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                className={inputClass}
                style={{ width: '16rem' }}
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                className={btnSecondary}
                onClick={() => sendTest('upgrade-offer')}
              >
                Send test
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {section === 'compose' ? (
        <section className="admin-card space-y-4 p-6">
          <h3 className="text-sm font-semibold text-white">Compose</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Audience</label>
              <select
                className={inputClass}
                value={compose.audience}
                onChange={(e) =>
                  setCompose({ ...compose, audience: e.target.value as 'custom' | 'buyers' })
                }
              >
                <option value="custom">Specific addresses</option>
                <option value="buyers">All ticket buyers ({buyerCount})</option>
              </select>
            </div>
            {compose.audience === 'custom' ? (
              <div>
                <label className={labelClass}>To (comma separated)</label>
                <input
                  className={inputClass}
                  value={compose.to}
                  onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                  placeholder="fan@example.com, friend@example.com"
                />
              </div>
            ) : null}
          </div>
          {templates.length ? (
            <div>
              <label className={labelClass}>Start from template</label>
              <select
                className={inputClass}
                value=""
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value)
                  if (t) setCompose((c) => ({ ...c, subject: t.subject, body: t.body }))
                }}
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={labelClass}>Subject</label>
            <input
              className={inputClass}
              value={compose.subject}
              onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              className={`${inputClass} min-h-[160px]`}
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-white/35">
              Placeholders: {'{{name}}'} {'{{email}}'} (personalised per recipient)
            </p>
            <div className="mt-2">
              <InsertImageButton
                disabled={busy}
                onBusy={setBusy}
                onError={onError}
                onUploaded={(url) =>
                  setCompose((c) => ({ ...c, body: appendImageTag(c.body, url) }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={compose.includeSignature}
                onChange={(e) => setCompose({ ...compose, includeSignature: e.target.checked })}
              />
              Include signature
            </label>
            <button
              type="button"
              disabled={busy || !compose.subject || !compose.body}
              className={btnPrimary}
              onClick={sendCompose}
            >
              <Send className="mr-1.5 inline h-4 w-4" />
              Send
            </button>
            <button
              type="button"
              disabled={busy || !compose.subject || !compose.body}
              className={btnGhost}
              onClick={() => {
                setTemplateForm({
                  id: '',
                  name: compose.subject,
                  subject: compose.subject,
                  body: compose.body,
                })
                setSection('templates')
              }}
            >
              Save as template
            </button>
          </div>
        </section>
      ) : null}

      {section === 'templates' ? (
        <div className="space-y-4">
          <section className="admin-card space-y-4 p-6">
            <h3 className="text-sm font-semibold text-white">
              {templateForm.id ? 'Edit template' : 'New template'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Subject</label>
                <input
                  className={inputClass}
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Body</label>
              <textarea
                className={`${inputClass} min-h-[140px]`}
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
              />
              <div className="mt-2">
                <InsertImageButton
                  disabled={busy}
                  onBusy={setBusy}
                  onError={onError}
                  onUploaded={(url) =>
                    setTemplateForm((f) => ({ ...f, body: appendImageTag(f.body, url) }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !templateForm.name || !templateForm.subject || !templateForm.body}
                className={btnPrimary}
                onClick={saveTemplate}
              >
                {templateForm.id ? 'Save changes' : 'Create template'}
              </button>
              {templateForm.id ? (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setTemplateForm({ id: '', name: '', subject: '', body: '' })}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </section>

          <section className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">Saved templates</h3>
              <span className="text-xs text-white/40">{templates.length}</span>
            </div>
            {templates.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-white/40">No templates yet.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{t.name}</p>
                      <p className="mt-0.5 truncate text-xs text-white/40">{t.subject}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      className={btnSecondary}
                      onClick={() => setTemplateForm(t)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={btnDanger}
                      onClick={() => deleteTemplate(t.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {section === 'signature' && settings ? (
        <section className="admin-card space-y-4 p-6">
          <h3 className="text-sm font-semibold text-white">Signature</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={settings.signatureName}
                onChange={(e) => setSettings({ ...settings, signatureName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Tagline</label>
              <input
                className={inputClass}
                value={settings.signatureTagline}
                onChange={(e) => setSettings({ ...settings, signatureTagline: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Link URL</label>
              <input
                className={inputClass}
                value={settings.signatureLinkUrl}
                onChange={(e) => setSettings({ ...settings, signatureLinkUrl: e.target.value })}
                placeholder="https://kevinfraser.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Signature image (headshot or logo)</label>
              <div className="flex items-center gap-4">
                {settings.signatureImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.signatureImageUrl}
                    alt="Signature"
                    className="h-16 w-16 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/15 text-xs text-white/30">
                    None
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <InsertImageButton
                    label={settings.signatureImageUrl ? 'Replace image' : 'Upload image'}
                    disabled={busy}
                    onBusy={setBusy}
                    onError={onError}
                    onUploaded={(url) => setSettings((s) => (s ? { ...s, signatureImageUrl: url } : s))}
                  />
                  {settings.signatureImageUrl ? (
                    <button
                      type="button"
                      disabled={busy}
                      className={btnGhost}
                      onClick={() => setSettings({ ...settings, signatureImageUrl: '' })}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-white/35">
                Shown as a small round image above the signature in every email. Save to apply.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            className={btnPrimary}
            onClick={() =>
              saveSettings(
                {
                  signatureName: settings.signatureName,
                  signatureTagline: settings.signatureTagline,
                  signatureLinkUrl: settings.signatureLinkUrl,
                  signatureImageUrl: settings.signatureImageUrl,
                },
                'Signature saved.',
              )
            }
          >
            Save signature
          </button>
        </section>
      ) : null}
    </div>
  )
}
