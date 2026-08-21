'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Plus, RotateCcw, Trash2 } from 'lucide-react'
import {
  DEFAULT_CONNECT_SETTINGS,
  type ConnectSettings,
  type ConnectSocial,
} from '@/lib/settings/defaults'
import FileDropZone from '@/components/admin/FileDropZone'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

function emptySocial(): ConnectSocial {
  return { id: '', label: '', handle: '', href: '', blurb: '' }
}

async function uploadConnectVideo(file: File) {
  const contentType = file.type || 'video/mp4'
  const presignRes = await fetch('/api/admin/connect/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType }),
  })
  const presign = await presignRes.json()
  if (!presignRes.ok) throw new Error(presign.error || 'Failed to get upload URL')

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!putRes.ok) throw new Error('Video upload failed')

  return {
    key: presign.key as string,
    publicUrl: (presign.publicUrl as string) || '',
  }
}

export default function ConnectAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [connect, setConnect] = useState<ConnectSettings>(DEFAULT_CONNECT_SETTINGS)
  const [inquiryText, setInquiryText] = useState(
    DEFAULT_CONNECT_SETTINGS.inquiryTypes.join('\n'),
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [desktopFileName, setDesktopFileName] = useState('')
  const [mobileFileName, setMobileFileName] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load Connect settings')
      const next = data.settings?.connect || DEFAULT_CONNECT_SETTINGS
      setConnect(next)
      setInquiryText((next.inquiryTypes || []).join('\n'))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load Connect settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateField<K extends keyof ConnectSettings>(key: K, value: ConnectSettings[K]) {
    setConnect((prev) => ({ ...prev, [key]: value }))
  }

  function updateSocial(index: number, patch: Partial<ConnectSocial>) {
    setConnect((prev) => ({
      ...prev,
      socials: prev.socials.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function addSocial() {
    setConnect((prev) => ({ ...prev, socials: [...prev.socials, emptySocial()] }))
  }

  function removeSocial(index: number) {
    setConnect((prev) => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== index),
    }))
  }

  function resetDefaults() {
    if (!confirm('Reset Connect page copy, enquiry types, and socials to defaults?')) return
    setConnect({
      ...DEFAULT_CONNECT_SETTINGS,
      inquiryTypes: [...DEFAULT_CONNECT_SETTINGS.inquiryTypes],
      socials: DEFAULT_CONNECT_SETTINGS.socials.map((s) => ({ ...s })),
    })
    setInquiryText(DEFAULT_CONNECT_SETTINGS.inquiryTypes.join('\n'))
    setDesktopFileName('')
    setMobileFileName('')
  }

  async function onDesktopVideo(file: File | null) {
    if (!file) return
    setBusy(true)
    onError('')
    try {
      const uploaded = await uploadConnectVideo(file)
      setConnect((prev) => ({
        ...prev,
        introVideoKey: uploaded.key,
        introVideoUrl: uploaded.publicUrl || '/api/settings/connect/intro',
      }))
      setDesktopFileName(file.name)
      onMessage('Desktop intro video uploaded. Save Connect to keep it.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Video upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function onMobileVideo(file: File | null) {
    if (!file) return
    setBusy(true)
    onError('')
    try {
      const uploaded = await uploadConnectVideo(file)
      setConnect((prev) => ({
        ...prev,
        introVideoMobileKey: uploaded.key,
        introVideoMobileUrl: uploaded.publicUrl || '/api/settings/connect/intro-mobile',
      }))
      setMobileFileName(file.name)
      onMessage('Mobile intro video uploaded. Save Connect to keep it.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Video upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const inquiryTypes = inquiryText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      const payload: ConnectSettings = {
        ...connect,
        inquiryTypes,
        socials: connect.socials.map((s) => ({ ...s })),
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connect: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      const next = data.settings.connect as ConnectSettings
      setConnect(next)
      setInquiryText((next.inquiryTypes || []).join('\n'))
      onMessage('Connect page settings saved.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Connect</h2>
          <p className="mt-1 text-sm text-white/40">
            Edit intro video, page copy, social links, and enquiry types.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/worlds/connect"
            target="_blank"
            rel="noopener noreferrer"
            className={btnGhost}
          >
            View page
            <ExternalLink className="ml-1.5 inline h-3.5 w-3.5" />
          </a>
          <button type="button" disabled={busy} onClick={resetDefaults} className={btnSecondary}>
            <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
            Reset defaults
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save Connect'}
          </button>
        </div>
      </div>

      <section className="admin-card space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Intro video</h3>
        <p className="text-xs text-white/40">
          Full-screen video before the Connect page. Leave blank to use the built-in defaults.
        </p>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={connect.introEnabled !== false}
            onChange={(e) => updateField('introEnabled', e.target.checked)}
            disabled={busy}
          />
          Play intro video
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <FileDropZone
            label="Desktop video"
            accept="video/*"
            disabled={busy}
            fileName={desktopFileName || (connect.introVideoKey ? 'Uploaded' : undefined)}
            hint={connect.introVideoUrl || 'Fallback: /connect-intro.mp4'}
            onFile={(file) => void onDesktopVideo(file)}
          />
          <FileDropZone
            label="Mobile video"
            accept="video/*"
            disabled={busy}
            fileName={mobileFileName || (connect.introVideoMobileKey ? 'Uploaded' : undefined)}
            hint={
              connect.introVideoMobileUrl ||
              'Optional — falls back to desktop, then /connect-intro-mobile.mp4'
            }
            onFile={(file) => void onMobileVideo(file)}
          />
        </div>
        {connect.introVideoKey || connect.introVideoMobileKey ? (
          <button
            type="button"
            className={btnGhost}
            disabled={busy}
            onClick={() => {
              setConnect((prev) => ({
                ...prev,
                introVideoKey: '',
                introVideoUrl: '',
                introVideoMobileKey: '',
                introVideoMobileUrl: '',
              }))
              setDesktopFileName('')
              setMobileFileName('')
            }}
          >
            Clear custom videos (use site defaults)
          </button>
        ) : null}
      </section>

      <section className="admin-card space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Page hero</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input
              className={inputClass}
              value={connect.eyebrow}
              onChange={(e) => updateField('eyebrow', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Headline</label>
            <input
              className={inputClass}
              value={connect.headline}
              onChange={(e) => updateField('headline', e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Intro</label>
          <textarea
            className={`${inputClass} min-h-[5rem]`}
            value={connect.intro}
            onChange={(e) => updateField('intro', e.target.value)}
          />
        </div>
      </section>

      <section className="admin-card space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Socials section</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Heading</label>
            <input
              className={inputClass}
              value={connect.socialsHeading}
              onChange={(e) => updateField('socialsHeading', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Intro</label>
            <input
              className={inputClass}
              value={connect.socialsIntro}
              onChange={(e) => updateField('socialsIntro', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          {connect.socials.map((social, index) => (
            <div
              key={`${social.id || 'social'}-${index}`}
              className="space-y-3 rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Social {index + 1}
                </p>
                <button
                  type="button"
                  disabled={busy || connect.socials.length <= 1}
                  onClick={() => removeSocial(index)}
                  className={btnGhost}
                >
                  <Trash2 className="mr-1.5 inline h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>ID (facebook, instagram, …)</label>
                  <input
                    className={inputClass}
                    value={social.id}
                    onChange={(e) => updateSocial(index, { id: e.target.value })}
                    placeholder="facebook"
                  />
                </div>
                <div>
                  <label className={labelClass}>Label</label>
                  <input
                    className={inputClass}
                    value={social.label}
                    onChange={(e) => updateSocial(index, { label: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Handle</label>
                  <input
                    className={inputClass}
                    value={social.handle}
                    onChange={(e) => updateSocial(index, { handle: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>URL</label>
                  <input
                    className={inputClass}
                    value={social.href}
                    onChange={(e) => updateSocial(index, { href: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Blurb</label>
                <input
                  className={inputClass}
                  value={social.blurb}
                  onChange={(e) => updateSocial(index, { blurb: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <button type="button" disabled={busy} onClick={addSocial} className={btnSecondary}>
          <Plus className="mr-1.5 inline h-3.5 w-3.5" />
          Add social
        </button>
      </section>

      <section className="admin-card space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Enquiry form</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Form heading</label>
            <input
              className={inputClass}
              value={connect.formHeading}
              onChange={(e) => updateField('formHeading', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Form intro</label>
            <input
              className={inputClass}
              value={connect.formIntro}
              onChange={(e) => updateField('formIntro', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Success heading</label>
            <input
              className={inputClass}
              value={connect.successHeading}
              onChange={(e) => updateField('successHeading', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Success body</label>
            <input
              className={inputClass}
              value={connect.successBody}
              onChange={(e) => updateField('successBody', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Enquiry types (one per line)</label>
          <textarea
            className={`${inputClass} min-h-[8rem] font-mono text-xs leading-relaxed`}
            value={inquiryText}
            onChange={(e) => setInquiryText(e.target.value)}
            required
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving…' : 'Save Connect'}
        </button>
      </div>
    </form>
  )
}
