'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Plus,
  Star,
  Ticket,
  XCircle,
} from 'lucide-react'
import type { PublicShow, PublicTicketTier, PublicTour } from '@/lib/serialize'
import { formatPrice, formatShowDate } from '@/lib/format'
import { toWallInput } from '@/lib/wallDate'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import {
  DEFAULT_THEME_SETTINGS,
  hexToRgba,
  type ThemeSettings,
} from '@/lib/settings/defaults'
import AdminSidebar, { type AdminTab } from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import BonusAdminPanel from '@/components/admin/BonusAdminPanel'
import ShowreelAdminPanel from '@/components/admin/ShowreelAdminPanel'
import StudioAdminPanel from '@/components/admin/StudioAdminPanel'
import ThemeAdminPanel from '@/components/admin/ThemeAdminPanel'
import AIKevAdminPanel from '@/components/admin/AIKevAdminPanel'
import TiersAdminPanel from '@/components/admin/TiersAdminPanel'
import CmsAdminPanel from '@/components/admin/CmsAdminPanel'
import ScannerAdminPanel from '@/components/admin/ScannerAdminPanel'
import SalesAdminPanel from '@/components/admin/SalesAdminPanel'
import Kevin11AdminPanel from '@/components/admin/Kevin11AdminPanel'
import LegalAdminPanel from '@/components/admin/LegalAdminPanel'
import ImageCropField from '@/components/admin/ImageCropField'
import { cn } from '@/lib/utils'

type Tab = AdminTab

type TourForm = {
  title: string
  slug: string
  subtitle: string
  description: string
  coverImage: string
  coverImageKey: string
  bannerImage: string
  bannerImageKey: string
  bannerPosition: 'background' | 'above'
  bannerFocus: string
  featured: boolean
  published: boolean
  startDate: string
  endDate: string
}

type TierConfigForm = {
  slug: string
  name: string
  tourPriceCents: number
  tourCurrency: string
  capacity: string
  overridePrice: boolean
  priceCents: string
  currency: string
  sold: number
  soldOut: boolean
}

type ShowForm = {
  tourId: string
  title: string
  date: string
  showTime: string
  showEndTime: string
  doorsTime: string
  country: string
  city: string
  venue: string
  address: string
  currency: string
  priceCents: string
  capacity: string
  status: string
  ticketsOnSaleAt: string
  featured: boolean
  published: boolean
  externalTicketUrl: string
  artworkImage: string
  artworkImageKey: string
  artworkPosition: string
  venueImage: string
  venueImageKey: string
  description: string
  tierConfigs: TierConfigForm[]
}

const emptyTour: TourForm = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  coverImage: '',
  coverImageKey: '',
  bannerImage: '',
  bannerImageKey: '',
  bannerPosition: 'background',
  bannerFocus: 'center center',
  featured: false,
  published: true,
  startDate: '',
  endDate: '',
}

const emptyShow = (tourId = ''): ShowForm => ({
  tourId,
  title: '',
  date: '',
  showTime: '7:30 PM',
  showEndTime: '',
  doorsTime: '',
  country: 'Australia',
  city: '',
  venue: '',
  address: '',
  currency: 'AUD',
  priceCents: '7500',
  capacity: '400',
  status: 'on_sale',
  ticketsOnSaleAt: '',
  featured: false,
  published: true,
  externalTicketUrl: '',
  artworkImage: '',
  artworkImageKey: '',
  artworkPosition: 'center center',
  venueImage: '',
  venueImageKey: '',
  description: '',
  tierConfigs: [],
})

const IMAGE_FOCUS_POSITIONS = [
  { value: 'center center', label: 'Centre' },
  { value: 'center top', label: 'Top' },
  { value: 'center bottom', label: 'Bottom' },
  { value: 'left center', label: 'Left' },
  { value: 'right center', label: 'Right' },
  { value: 'left top', label: 'Top left' },
  { value: 'right top', label: 'Top right' },
  { value: 'left bottom', label: 'Bottom left' },
  { value: 'right bottom', label: 'Bottom right' },
] as const

async function uploadAdminImage(file: File, folder: 'tours' | 'shows') {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Image upload failed')
  if (!data.key) throw new Error('Upload did not return a storage key.')
  return {
    key: data.key as string,
    publicUrl: (data.publicUrl as string) || '',
  }
}

/** Blend two hex colours (weight = how much of `into` to mix in). */
function mixHex(hex: string, into: string, weight: number) {
  const parse = (h: string) => {
    const raw = h.replace('#', '')
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
    const n = Number.parseInt(full, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const a = parse(hex)
  const b = parse(into)
  if (!a || !b) return hex
  const mixed = a.map((v, i) => Math.round(v * (1 - weight) + b[i] * weight))
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const ADMIN_MODE_KEY = 'admin-color-mode'


const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    on_sale: {
      label: 'On sale',
      className: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle,
    },
    coming_soon: {
      label: 'Coming soon',
      className: 'text-amber-400 bg-amber-400/10',
      icon: Clock,
    },
    sold_out: {
      label: 'Sold out',
      className: 'text-red-400 bg-red-500/10',
      icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'text-white/30 bg-white/5',
      icon: XCircle,
    },
    published: {
      label: 'Published',
      className: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle,
    },
    draft: {
      label: 'Draft',
      className: 'text-white/40 bg-white/5',
      icon: Clock,
    },
  }
  const meta = map[status] || map.draft
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

export default function AdminPortal() {
  const [tours, setTours] = useState<PublicTour[]>([])
  const [shows, setShows] = useState<PublicShow[]>([])
  const [tiers, setTiers] = useState<PublicTicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [tourForm, setTourForm] = useState<TourForm>(emptyTour)
  const [editingTourId, setEditingTourId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<ShowForm>(emptyShow())
  const [editingShowId, setEditingShowId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showFormPanel, setShowFormPanel] = useState(false)
  const [adminMode, setAdminMode] = useState<'dark' | 'light'>('dark')
  const [siteTheme, setSiteTheme] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS)
  const prevTabRef = useRef<Tab>('overview')

  async function loadTheme() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (res.ok && data.theme) setSiteTheme(data.theme)
    } catch {
      // Theme is cosmetic — fall back to defaults silently
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_MODE_KEY)
    if (stored === 'light' || stored === 'dark') setAdminMode(stored)
    void loadTheme()
  }, [])

  // Pick up new colours as soon as the admin leaves the Theme tab
  useEffect(() => {
    if (prevTabRef.current === 'theme' && tab !== 'theme') void loadTheme()
    prevTabRef.current = tab
  }, [tab])

  function toggleAdminMode() {
    setAdminMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(ADMIN_MODE_KEY, next)
      return next
    })
  }

  const accent = adminMode === 'light' ? siteTheme.lightAccent : siteTheme.darkAccent
  const accentContrast =
    adminMode === 'light' ? siteTheme.lightAccentContrast : siteTheme.darkAccentContrast
  const themeVars = {
    '--admin-accent': accent,
    '--admin-accent-contrast': accentContrast,
    '--admin-accent-soft': hexToRgba(accent, adminMode === 'light' ? 0.12 : 0.15),
    '--admin-accent-focus': hexToRgba(accent, 0.5),
    // On dark, plain accent text can be too dim — lift it towards white.
    '--admin-accent-text': adminMode === 'light' ? mixHex(accent, '#000000', 0.1) : mixHex(accent, '#ffffff', 0.35),
  } as React.CSSProperties

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [tRes, sRes, tierRes] = await Promise.all([
        fetch('/api/admin/tours'),
        fetch('/api/admin/shows'),
        fetch('/api/admin/tiers'),
      ])
      const tData = await tRes.json()
      const sData = await sRes.json()
      const tierData = await tierRes.json()
      if (!tRes.ok) throw new Error(tData.error || 'Failed to load tours')
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load shows')
      if (!tierRes.ok) throw new Error(tierData.error || 'Failed to load tiers')
      setTours(tData.tours)
      setShows(sData.shows)
      setTiers(tierData.tiers || [])
      if (!showForm.tourId && tData.tours[0]) {
        setShowForm((prev) => ({ ...prev, tourId: tData.tours[0].id }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tourOptions = useMemo(
    () => tours.map((t) => ({ id: t.id, label: t.title })),
    [tours]
  )

  const upcomingShows = useMemo(
    () => shows.filter((s) => new Date(s.date).getTime() >= Date.now() - 6 * 60 * 60 * 1000),
    [shows]
  )
  const onSaleCount = upcomingShows.filter((s) => s.status === 'on_sale').length
  const featuredTour = tours.find((t) => t.featured)

  // Mirrors resolveTiersForShow: show tiers override tour tiers, which override the show's base price
  function tiersControllingShow(showId: string | null, tourId: string) {
    const showTiers = tiers.filter(
      (t) => t.ownerType === 'show' && t.ownerId === showId && t.published,
    )
    if (showTiers.length) return showTiers
    return tiers.filter((t) => t.ownerType === 'tour' && t.ownerId === tourId && t.published)
  }

  function displayPrice(show: PublicShow) {
    const controlling = tiersControllingShow(show.id, show.tour.id)
    if (controlling.length) {
      const min = Math.min(...controlling.map((t) => t.priceCents))
      const price = formatPrice(min, controlling[0].currency)
      return controlling.length > 1 ? `From ${price}` : price
    }
    return formatPrice(show.priceCents, show.currency)
  }

  /** Build the per-show tier config rows from the tour's tiers + any existing show overrides. */
  function buildTierConfigs(tourId: string, showId: string | null): TierConfigForm[] {
    const tourTiers = tiers
      .filter((t) => t.ownerType === 'tour' && t.ownerId === tourId && t.published)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents)
    const overrides = new Map(
      (showId
        ? tiers.filter((t) => t.ownerType === 'show' && t.ownerId === showId)
        : []
      ).map((t) => [t.slug, t]),
    )
    return tourTiers.map((tt) => {
      const o = overrides.get(tt.slug)
      const overridePrice = o ? !o.inheritPrice : false
      return {
        slug: tt.slug,
        name: tt.name,
        tourPriceCents: tt.priceCents,
        tourCurrency: tt.currency,
        capacity: o ? String(o.capacity) : '0',
        overridePrice,
        priceCents: overridePrice && o ? String(o.priceCents) : String(tt.priceCents),
        currency: overridePrice && o ? o.currency : tt.currency,
        sold: o?.ticketsSold || 0,
        soldOut: Boolean(o?.soldOut),
      }
    })
  }

  function updateTierConfig(slug: string, patch: Partial<TierConfigForm>) {
    setShowForm((prev) => ({
      ...prev,
      tierConfigs: prev.tierConfigs.map((c) => (c.slug === slug ? { ...c, ...patch } : c)),
    }))
  }

  async function saveTour(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        ...tourForm,
        coverImage: tourForm.coverImage.startsWith('blob:') ? '' : tourForm.coverImage,
        bannerImage: tourForm.bannerImage.startsWith('blob:') ? '' : tourForm.bannerImage,
        startDate: tourForm.startDate ? toWallInput(tourForm.startDate) : null,
        endDate: tourForm.endDate ? toWallInput(tourForm.endDate) : null,
      }
      const res = await fetch(
        editingTourId ? `/api/admin/tours/${editingTourId}` : '/api/admin/tours',
        {
          method: editingTourId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMessage(editingTourId ? 'Tour updated.' : 'Tour created.')
      setTourForm(emptyTour)
      setEditingTourId(null)
      setShowFormPanel(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveShow(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        ...showForm,
        date: toWallInput(showForm.date),
        ticketsOnSaleAt: showForm.ticketsOnSaleAt
          ? `${showForm.ticketsOnSaleAt}T00:00`
          : null,
        artworkImage: showForm.artworkImage.startsWith('blob:') ? '' : showForm.artworkImage,
        venueImage: showForm.venueImage.startsWith('blob:') ? '' : showForm.venueImage,
        priceCents: Number(showForm.priceCents) || 0,
        capacity: Number(showForm.capacity) || 0,
        tierConfigs: showForm.tierConfigs.map((c) => ({
          slug: c.slug,
          capacity: Number(c.capacity) || 0,
          overridePrice: c.overridePrice,
          priceCents: Number(c.priceCents) || 0,
          currency: c.currency,
          soldOut: c.soldOut,
        })),
      }
      const res = await fetch(
        editingShowId ? `/api/admin/shows/${editingShowId}` : '/api/admin/shows',
        {
          method: editingShowId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMessage(editingShowId ? 'Show updated.' : 'Show created.')
      setShowForm(emptyShow(showForm.tourId || tours[0]?.id || ''))
      setEditingShowId(null)
      setShowFormPanel(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function editTour(tour: PublicTour) {
    setEditingTourId(tour.id)
    setTourForm({
      title: tour.title,
      slug: tour.slug,
      subtitle: tour.subtitle,
      description: tour.description,
      coverImage: tour.coverImage || '',
      coverImageKey: tour.coverImageKey || '',
      bannerImage: tour.bannerImage || '',
      bannerImageKey: tour.bannerImageKey || '',
      bannerPosition: tour.bannerPosition === 'above' ? 'above' : 'background',
      bannerFocus: tour.bannerFocus || 'center center',
      featured: tour.featured,
      published: tour.published,
      startDate: toWallInput(tour.startDate),
      endDate: toWallInput(tour.endDate),
    })
    setTab('tours')
    setShowFormPanel(true)
  }

  function editShow(show: PublicShow) {
    setEditingShowId(show.id)
    setShowForm({
      tourId: show.tour.id,
      title: show.title,
      date: toWallInput(show.date),
      showTime: show.showTime,
      showEndTime: show.showEndTime || '',
      doorsTime: show.doorsTime || '',
      country: show.country,
      city: show.city,
      venue: show.venue,
      address: show.address,
      currency: show.currency,
      priceCents: String(show.priceCents),
      capacity: String(show.capacity),
      status: show.status,
      ticketsOnSaleAt: show.ticketsOnSaleAt ? toWallInput(show.ticketsOnSaleAt).slice(0, 10) : '',
      featured: show.featured,
      published: show.published,
      externalTicketUrl: show.externalTicketUrl,
      artworkImage: show.artworkImage || '',
      artworkImageKey: show.artworkImageKey || '',
      artworkPosition: show.artworkPosition || 'center center',
      venueImage: show.venueImage || '',
      venueImageKey: show.venueImageKey || '',
      description: show.description || '',
      tierConfigs: buildTierConfigs(show.tour.id, show.id),
    })
    setTab('shows')
    setShowFormPanel(true)
  }

  async function onTourImageChange(kind: 'cover' | 'banner', file: File | null) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const uploaded = await uploadAdminImage(file, 'tours')
      const preview = uploaded.publicUrl || URL.createObjectURL(file)
      if (kind === 'cover') {
        setTourForm((prev) => ({
          ...prev,
          coverImageKey: uploaded.key,
          coverImage: preview,
        }))
      } else {
        setTourForm((prev) => ({
          ...prev,
          bannerImageKey: uploaded.key,
          bannerImage: preview,
        }))
      }
      setMessage(`${kind === 'cover' ? 'Card' : 'Banner'} image uploaded. Save the tour to keep it.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function onShowArtworkChange(file: File | null) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const uploaded = await uploadAdminImage(file, 'shows')
      setShowForm((prev) => ({
        ...prev,
        artworkImageKey: uploaded.key,
        artworkImage: uploaded.publicUrl || URL.createObjectURL(file),
      }))
      setMessage('Show artwork uploaded. Save the show to keep it.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function onShowVenueChange(file: File | null) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const uploaded = await uploadAdminImage(file, 'shows')
      setShowForm((prev) => ({
        ...prev,
        venueImageKey: uploaded.key,
        venueImage: uploaded.publicUrl || URL.createObjectURL(file),
      }))
      setMessage('Venue image uploaded. Save the show to keep it.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFeaturedTour(tour: PublicTour) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !tour.featured }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFeaturedShow(show: PublicShow) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shows/${show.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !show.featured }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleSoldOutShow(show: PublicShow) {
    const nextStatus = show.status === 'sold_out' ? 'on_sale' : 'sold_out'
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/admin/shows/${show.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setMessage(
        nextStatus === 'sold_out'
          ? `${show.city} marked sold out.`
          : `${show.city} put back on sale.`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeTour(id: string) {
    if (!confirm('Delete this tour and all of its shows?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tours/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeShow(id: string) {
    if (!confirm('Delete this show?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shows/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  function openCreate(target: 'tours' | 'shows') {
    setTab(target)
    if (target === 'tours') {
      setEditingTourId(null)
      setTourForm(emptyTour)
    } else {
      setEditingShowId(null)
      const tourId = tours[0]?.id || ''
      setShowForm({ ...emptyShow(tourId), tierConfigs: buildTierConfigs(tourId, null) })
    }
    setShowFormPanel(true)
  }

  function closeForm() {
    setShowFormPanel(false)
    setEditingTourId(null)
    setEditingShowId(null)
    setTourForm(emptyTour)
    setShowForm(emptyShow(tours[0]?.id || ''))
  }

  const headerCopy =
    tab === 'overview'
      ? { title: 'Overview', subtitle: 'Tours, shows, and ticket inventory at a glance' }
      : tab === 'tours'
        ? { title: 'Tours', subtitle: 'Create and feature headline tours' }
        : tab === 'shows'
          ? { title: 'Shows', subtitle: 'Manage upcoming dates and ticket status' }
          : tab === 'tiers'
            ? { title: 'Ticket Tiers', subtitle: 'Pricing tiers for tours and individual shows' }
            : tab === 'sales'
              ? { title: 'Sales', subtitle: 'Purchases, ticket counts, and Stripe payments' }
              : tab === 'cms'
              ? { title: 'CMS', subtitle: 'Ticket emails, broadcasts, templates, and signature' }
              : tab === 'scanner'
              ? { title: 'Ticket Scanner', subtitle: 'Verify ticket QR codes and check guests in' }
              : tab === 'bonus'
              ? { title: 'Showreel', subtitle: 'Page banners, tab heroes, and exclusive bonus clips' }
              : tab === 'studio'
                ? { title: 'The Studio', subtitle: 'Behind the scenes, characters, and creative process' }
                : tab === 'kevin11'
                  ? { title: 'Kevin11', subtitle: 'Comedy overlays, merch, and store content' }
                  : tab === 'legal'
                    ? { title: 'Terms & Policies', subtitle: 'Edit Terms, Refund Policy, and Privacy' }
                    : tab === 'theme'
                      ? { title: 'Theme', subtitle: 'Site accent colours for light and dark mode' }
                      : { title: 'AI Kev', subtitle: 'Avatar, greeting, prompt, and speaking style' }

  return (
    <div className={cn('admin-app', adminMode === 'light' && 'admin-light')} style={themeVars}>
      <AdminSidebar tab={tab} onTabChange={(next) => { setTab(next); setShowFormPanel(false) }} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          title={headerCopy.title}
          subtitle={headerCopy.subtitle}
          mode={adminMode}
          onToggleMode={toggleAdminMode}
        />

        <main className="admin-main flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl">
          <div className="mb-5 flex gap-2 md:hidden">
            {(['overview', 'tours', 'shows', 'tiers', 'sales', 'cms', 'scanner', 'bonus', 'studio', 'kevin11', 'legal', 'theme', 'ai'] as Tab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  setShowFormPanel(false)
                }}
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-medium capitalize',
                  tab === id ? 'admin-nav-item is-active' : 'admin-nav-item'
                )}
                style={{ width: 'auto' }}
              >
                {id === 'bonus'
                  ? 'Showreel'
                  : id === 'studio'
                    ? 'Studio'
                    : id === 'tiers'
                      ? 'Tiers'
                      : id === 'cms'
                        ? 'CMS'
                        : id === 'scanner'
                        ? 'Scanner'
                        : id === 'kevin11'
                        ? 'Kevin11'
                        : id === 'legal'
                          ? 'Policies'
                          : id === 'ai'
                            ? 'AI Kev'
                            : id}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          {tab === 'overview' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Overview</h2>
                  <p className="mt-1 text-sm text-white/40">
                    {featuredTour
                      ? `Featured tour: ${featuredTour.title}`
                      : 'No featured tour yet — create one.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Tours', value: tours.length, icon: Ticket, tone: 'bg-violet-500/10 text-violet-400' },
                  { label: 'Upcoming shows', value: upcomingShows.length, icon: CalendarDays, tone: 'bg-sky-500/10 text-sky-400' },
                  { label: 'On sale', value: onSaleCount, icon: CheckCircle, tone: 'bg-emerald-500/10 text-emerald-400' },
                  { label: 'Featured shows', value: shows.filter((s) => s.featured).length, icon: Star, tone: 'bg-amber-500/10 text-amber-400' },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="admin-card p-5"
                  >
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-white">
                      {loading ? '—' : card.value}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">{card.label}</p>
                  </div>
                ))}
              </div>

              <section className="admin-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                  <h3 className="text-sm font-semibold text-white">Next shows</h3>
                  <button type="button" onClick={() => setTab('shows')} className={btnGhost}>
                    View all
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-3 p-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
                    ))}
                  </div>
                ) : upcomingShows.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-white/40">
                    No upcoming shows. Create a show to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {upcomingShows.slice(0, 6).map((show) => {
                      const d = formatShowDate(show.date)
                      return (
                        <div key={show.id} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {show.city} — {show.venue}
                            </p>
                            <p className="mt-0.5 text-xs text-white/40">
                              {d.day} {d.month} · {show.country} · {displayPrice(show)}
                            </p>
                          </div>
                          <StatusBadge status={show.status} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {tab === 'tours' || tab === 'shows' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {tab === 'tours' ? 'Tours' : 'Shows'}
                  </h2>
                  <p className="mt-1 text-sm text-white/40">
                    {tab === 'tours'
                      ? `${tours.length} tour${tours.length === 1 ? '' : 's'} on the platform`
                      : `${shows.length} show${shows.length === 1 ? '' : 's'} scheduled`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openCreate(tab)}
                    className={btnPrimary}
                  >
                    <Plus className="h-4 w-4" />
                    {tab === 'tours' ? 'New tour' : 'New show'}
                  </button>
                </div>
              </div>

              {showFormPanel ? (
                <section className="admin-card space-y-4 p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">
                      {tab === 'tours'
                        ? editingTourId
                          ? 'Edit tour'
                          : 'Create tour'
                        : editingShowId
                          ? 'Edit show'
                          : 'Create show'}
                    </h3>
                    <button type="button" onClick={closeForm} className="text-sm text-white/40 hover:text-white/70">
                      Close
                    </button>
                  </div>

                  {tab === 'tours' ? (
                    <form onSubmit={saveTour} className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Title</label>
                        <input
                          className={inputClass}
                          value={tourForm.title}
                          onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Slug</label>
                        <input
                          className={inputClass}
                          value={tourForm.slug}
                          onChange={(e) => setTourForm({ ...tourForm, slug: e.target.value })}
                          placeholder="Generated from title if empty"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Subtitle</label>
                        <input
                          className={inputClass}
                          value={tourForm.subtitle}
                          onChange={(e) => setTourForm({ ...tourForm, subtitle: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Description</label>
                        <textarea
                          className={`${inputClass} min-h-[110px]`}
                          value={tourForm.description}
                          onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <ImageCropField
                          label="Card image"
                          preset="tourCover"
                          currentUrl={
                            tourForm.coverImage ||
                            (tourForm.coverImageKey && editingTourId
                              ? `/api/tours/${editingTourId}/cover`
                              : '')
                          }
                          disabled={busy}
                          onCropped={(file) => void onTourImageChange('cover', file)}
                          onRemoveCurrent={() =>
                            setTourForm((f) => ({ ...f, coverImage: '', coverImageKey: '' }))
                          }
                        />
                      </div>
                      <div>
                        <ImageCropField
                          label="Banner image"
                          preset="tourBanner"
                          currentUrl={
                            tourForm.bannerImage ||
                            (tourForm.bannerImageKey && editingTourId
                              ? `/api/tours/${editingTourId}/banner`
                              : '')
                          }
                          disabled={busy}
                          onCropped={(file) => void onTourImageChange('banner', file)}
                          onRemoveCurrent={() =>
                            setTourForm((f) => ({ ...f, bannerImage: '', bannerImageKey: '' }))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Banner layout</label>
                        <select
                          className={inputClass}
                          value={tourForm.bannerPosition}
                          onChange={(e) =>
                            setTourForm({
                              ...tourForm,
                              bannerPosition: e.target.value === 'above' ? 'above' : 'background',
                            })
                          }
                        >
                          <option value="background" className="bg-[#141420]">
                            Background of tour card
                          </option>
                          <option value="above" className="bg-[#141420]">
                            Standalone above tour card
                          </option>
                        </select>
                        <p className="mt-1.5 text-xs text-white/35">
                          Ideal size ~2800×1000 (2.8:1). Mobile crops to 21:9.
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Banner crop / focus</label>
                        <select
                          className={inputClass}
                          value={tourForm.bannerFocus || 'center center'}
                          onChange={(e) =>
                            setTourForm({ ...tourForm, bannerFocus: e.target.value })
                          }
                        >
                          {IMAGE_FOCUS_POSITIONS.map((pos) => (
                            <option key={pos.value} value={pos.value} className="bg-[#141420]">
                              {pos.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-white/35">
                          Which part of the image stays visible when cropped.
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Start</label>
                        <input
                          type="datetime-local"
                          className={inputClass}
                          value={tourForm.startDate}
                          onChange={(e) => setTourForm({ ...tourForm, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>End</label>
                        <input
                          type="datetime-local"
                          className={inputClass}
                          value={tourForm.endDate}
                          onChange={(e) => setTourForm({ ...tourForm, endDate: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-6 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={tourForm.featured}
                            onChange={(e) => setTourForm({ ...tourForm, featured: e.target.checked })}
                          />
                          Featured
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={tourForm.published}
                            onChange={(e) => setTourForm({ ...tourForm, published: e.target.checked })}
                          />
                          Published
                        </label>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={busy} className={btnPrimary}>
                          {editingTourId ? 'Save changes' : 'Create tour'}
                        </button>
                        <button type="button" onClick={closeForm} className={btnSecondary}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={saveShow} className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Tour</label>
                        <select
                          className={inputClass}
                          value={showForm.tourId}
                          onChange={(e) => {
                            const tourId = e.target.value
                            setShowForm({
                              ...showForm,
                              tourId,
                              tierConfigs: buildTierConfigs(tourId, editingShowId),
                            })
                          }}
                          required
                        >
                          <option value="">Select tour</option>
                          {tourOptions.map((t) => (
                            <option key={t.id} value={t.id} className="bg-[#141420]">
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Title</label>
                        <input
                          className={inputClass}
                          value={showForm.title}
                          onChange={(e) => setShowForm({ ...showForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Date & time</label>
                        <input
                          type="datetime-local"
                          className={inputClass}
                          value={showForm.date}
                          onChange={(e) => setShowForm({ ...showForm, date: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Show start time</label>
                        <input
                          className={inputClass}
                          value={showForm.showTime}
                          onChange={(e) => setShowForm({ ...showForm, showTime: e.target.value })}
                          placeholder="7:30 PM"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Show end time</label>
                        <input
                          className={inputClass}
                          value={showForm.showEndTime}
                          onChange={(e) => setShowForm({ ...showForm, showEndTime: e.target.value })}
                          placeholder="10:00 PM"
                        />
                        <p className="mt-1.5 text-xs text-white/35">
                          Required for tickets to show the full event window (e.g. 7:30 PM – 10:00 PM).
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Doors time</label>
                        <input
                          className={inputClass}
                          value={showForm.doorsTime}
                          onChange={(e) => setShowForm({ ...showForm, doorsTime: e.target.value })}
                          placeholder="7:00 PM"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <input
                          className={inputClass}
                          value={showForm.country}
                          onChange={(e) => setShowForm({ ...showForm, country: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input
                          className={inputClass}
                          value={showForm.city}
                          onChange={(e) => setShowForm({ ...showForm, city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Venue</label>
                        <input
                          className={inputClass}
                          value={showForm.venue}
                          onChange={(e) => setShowForm({ ...showForm, venue: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Address</label>
                        <input
                          className={inputClass}
                          value={showForm.address}
                          onChange={(e) => setShowForm({ ...showForm, address: e.target.value })}
                        />
                      </div>
                      {showForm.tierConfigs.length > 0 ? (
                        <div className="md:col-span-2">
                          <label className={labelClass}>Ticket tiers — allocation & pricing</label>
                          <p className="mb-3 text-xs text-white/35">
                            Tiers come from this show&apos;s tour. Set how many tickets each tier
                            has for this show (0 = unlimited), mark a tier sold out, and optionally
                            override the tour price for this show only.
                          </p>
                          <div className="space-y-3">
                            {showForm.tierConfigs.map((config) => (
                              <div
                                key={config.slug}
                                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                              >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <p className="text-sm font-medium text-white">{config.name}</p>
                                  <p className="text-xs text-white/40">
                                    Tour price {formatPrice(config.tourPriceCents, config.tourCurrency)}
                                    {config.sold > 0 ? ` · ${config.sold} sold` : ''}
                                  </p>
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className={labelClass}>Allocation (0 = unlimited)</label>
                                    <input
                                      className={inputClass}
                                      type="number"
                                      min="0"
                                      value={config.capacity}
                                      onChange={(e) =>
                                        updateTierConfig(config.slug, { capacity: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="flex flex-col justify-end gap-2 pb-2 sm:pb-2.5">
                                    <label className="flex items-center gap-2 text-sm text-white/70">
                                      <input
                                        type="checkbox"
                                        checked={config.soldOut}
                                        onChange={(e) =>
                                          updateTierConfig(config.slug, {
                                            soldOut: e.target.checked,
                                          })
                                        }
                                      />
                                      Sold out
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-white/70">
                                      <input
                                        type="checkbox"
                                        checked={config.overridePrice}
                                        onChange={(e) =>
                                          updateTierConfig(config.slug, {
                                            overridePrice: e.target.checked,
                                          })
                                        }
                                      />
                                      Override price
                                    </label>
                                  </div>
                                  {config.overridePrice ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className={labelClass}>Price (cents)</label>
                                        <input
                                          className={inputClass}
                                          type="number"
                                          min="0"
                                          value={config.priceCents}
                                          onChange={(e) =>
                                            updateTierConfig(config.slug, {
                                              priceCents: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Currency</label>
                                        <select
                                          className={inputClass}
                                          value={config.currency}
                                          onChange={(e) =>
                                            updateTierConfig(config.slug, {
                                              currency: e.target.value,
                                            })
                                          }
                                        >
                                          {SUPPORTED_CURRENCIES.map((c) => (
                                            <option key={c} value={c} className="bg-[#141420]">
                                              {c}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-end pb-2 text-xs text-white/35 sm:pb-3">
                                      Keeps {formatPrice(config.tourPriceCents, config.tourCurrency)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className={labelClass}>Currency</label>
                            <select
                              className={inputClass}
                              value={showForm.currency}
                              onChange={(e) =>
                                setShowForm({ ...showForm, currency: e.target.value })
                              }
                            >
                              {SUPPORTED_CURRENCIES.map((c) => (
                                <option key={c} value={c} className="bg-[#141420]">
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Price (cents)</label>
                            <input
                              className={inputClass}
                              value={showForm.priceCents}
                              onChange={(e) =>
                                setShowForm({ ...showForm, priceCents: e.target.value })
                              }
                            />
                            <p className="mt-1.5 text-xs text-white/35">
                              Used because this tour has no ticket tiers yet — add tiers in the
                              Tiers tab for per-tier pricing.
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <label className={labelClass}>Venue capacity</label>
                        <input
                          className={inputClass}
                          value={showForm.capacity}
                          onChange={(e) => setShowForm({ ...showForm, capacity: e.target.value })}
                        />
                        <p className="mt-1.5 text-xs text-white/35">
                          Informational only — sold out is driven by ticket tiers or the status
                          below.
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Status</label>
                        <select
                          className={inputClass}
                          value={showForm.status}
                          onChange={(e) => setShowForm({ ...showForm, status: e.target.value })}
                        >
                          <option value="on_sale" className="bg-[#141420]">On sale</option>
                          <option value="sold_out" className="bg-[#141420]">Sold out</option>
                          <option value="coming_soon" className="bg-[#141420]">Coming soon</option>
                          <option value="cancelled" className="bg-[#141420]">Cancelled</option>
                        </select>
                        <p className="mt-1.5 text-xs text-white/35">
                          Choose Sold out to stop ticket sales immediately. Shows also auto-mark
                          sold out when every tier hits 0 remaining.
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Tickets on sale date</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={showForm.ticketsOnSaleAt}
                          onChange={(e) =>
                            setShowForm({ ...showForm, ticketsOnSaleAt: e.target.value })
                          }
                        />
                        <p className="mt-1.5 text-xs text-white/35">
                          When status is Coming soon, displays e.g. “Tickets on sale 1 September 2026”.
                          Leave blank for plain “Coming Soon”.
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-red-500"
                            checked={showForm.status === 'sold_out'}
                            onChange={(e) =>
                              setShowForm({
                                ...showForm,
                                status: e.target.checked ? 'sold_out' : 'on_sale',
                              })
                            }
                          />
                          <span>
                            <span className="font-medium text-white">Mark as sold out</span>
                            <span className="mt-0.5 block text-xs text-white/40">
                              Blocks checkout regardless of venue capacity or remaining tier stock.
                            </span>
                          </span>
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>External ticket URL (optional)</label>
                        <input
                          className={inputClass}
                          value={showForm.externalTicketUrl}
                          onChange={(e) =>
                            setShowForm({ ...showForm, externalTicketUrl: e.target.value })
                          }
                          placeholder="Leave blank to use Stripe Checkout"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ImageCropField
                          label="Show artwork"
                          preset="showArtwork"
                          currentUrl={
                            showForm.artworkImage ||
                            (showForm.artworkImageKey && editingShowId
                              ? `/api/shows/${editingShowId}/artwork`
                              : '')
                          }
                          disabled={busy}
                          onCropped={(file) => void onShowArtworkChange(file)}
                          onRemoveCurrent={() =>
                            setShowForm((f) => ({ ...f, artworkImage: '', artworkImageKey: '' }))
                          }
                        />
                        {(showForm.artworkImage || showForm.artworkImageKey) ? (
                          <div className="mt-3 max-w-sm">
                            <label className={labelClass}>Fine-tune focus (optional)</label>
                            <select
                              className={inputClass}
                              value={showForm.artworkPosition || 'center center'}
                              onChange={(e) =>
                                setShowForm({ ...showForm, artworkPosition: e.target.value })
                              }
                            >
                              {IMAGE_FOCUS_POSITIONS.map((pos) => (
                                <option key={pos.value} value={pos.value} className="bg-[#141420]">
                                  {pos.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Show description (optional)</label>
                        <textarea
                          className={`${inputClass} min-h-[90px]`}
                          value={showForm.description}
                          onChange={(e) => setShowForm({ ...showForm, description: e.target.value })}
                          placeholder="Short blurb for the show page"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ImageCropField
                          label="Venue image (optional)"
                          preset="venue"
                          currentUrl={
                            showForm.venueImage ||
                            (showForm.venueImageKey && editingShowId
                              ? `/api/shows/${editingShowId}/venue`
                              : '')
                          }
                          disabled={busy}
                          onCropped={(file) => void onShowVenueChange(file)}
                          onRemoveCurrent={() =>
                            setShowForm((f) => ({ ...f, venueImage: '', venueImageKey: '' }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-6 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={showForm.featured}
                            onChange={(e) => setShowForm({ ...showForm, featured: e.target.checked })}
                          />
                          Featured
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={showForm.published}
                            onChange={(e) => setShowForm({ ...showForm, published: e.target.checked })}
                          />
                          Published
                        </label>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={busy} className={btnPrimary}>
                          {editingShowId ? 'Save changes' : 'Create show'}
                        </button>
                        <button type="button" onClick={closeForm} className={btnSecondary}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              ) : null}

              {tab === 'tours' ? (
                <div className="admin-card overflow-hidden">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>
                          Tour
                        </th>
                        <th className="hidden md:table-cell">
                          Status
                        </th>
                        <th className="hidden lg:table-cell">
                          Featured
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={4} className="px-5 py-4">
                              <div className="h-4 animate-pulse rounded bg-white/5" />
                            </td>
                          </tr>
                        ))
                      ) : tours.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-10 text-center text-sm text-white/40">
                            No tours yet. Create one to get started.
                          </td>
                        </tr>
                      ) : (
                        tours.map((tour) => (
                          <tr key={tour.id} className="transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {tour.coverImage || tour.bannerImage ? (
                                  <div className="h-9 w-9 overflow-hidden rounded-xl bg-white/5">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={tour.coverImage || tour.bannerImage}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-xs font-bold text-violet-300">
                                    {tour.title.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-white">{tour.title}</p>
                                  <p className="text-xs text-white/40">{tour.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-5 py-4 md:table-cell">
                              <StatusBadge status={tour.published ? 'published' : 'draft'} />
                            </td>
                            <td className="hidden px-5 py-4 lg:table-cell">
                              {tour.featured ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                                  <Star className="h-3 w-3" />
                                  Featured
                                </span>
                              ) : (
                                <span className="text-xs text-white/25">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => editTour(tour)} className={btnGhost}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => toggleFeaturedTour(tour)}
                                  className={btnGhost}
                                >
                                  {tour.featured ? 'Unfeature' : 'Feature'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => removeTour(tour.id)}
                                  className={btnDanger}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-card overflow-hidden">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>
                          Date
                        </th>
                        <th>
                          City / Venue
                        </th>
                        <th className="hidden lg:table-cell">
                          Price
                        </th>
                        <th className="hidden md:table-cell">
                          Status
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="px-5 py-4">
                              <div className="h-4 animate-pulse rounded bg-white/5" />
                            </td>
                          </tr>
                        ))
                      ) : shows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm text-white/40">
                            No shows yet. Create one after adding a tour.
                          </td>
                        </tr>
                      ) : (
                        shows.map((show) => {
                          const d = formatShowDate(show.date)
                          return (
                            <tr key={show.id} className="transition-colors hover:bg-white/[0.02]">
                              <td className="whitespace-nowrap px-5 py-4">
                                <p className="text-sm font-medium text-white">
                                  {d.day} {d.month}
                                </p>
                                <p className="text-xs text-white/40">{d.weekday}</p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-white">
                                  {show.city}
                                  {show.featured ? (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                                      Featured
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-white/40">
                                  {show.venue} · {show.country}
                                </p>
                              </td>
                              <td className="hidden whitespace-nowrap px-5 py-4 text-sm text-white/70 lg:table-cell">
                                {displayPrice(show)}
                              </td>
                              <td className="hidden px-5 py-4 md:table-cell">
                                <StatusBadge status={show.status} />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-3">
                                  <button type="button" onClick={() => editShow(show)} className={btnGhost}>
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy || show.status === 'cancelled'}
                                    onClick={() => toggleSoldOutShow(show)}
                                    className={btnGhost}
                                  >
                                    {show.status === 'sold_out' ? 'Put on sale' : 'Sold out'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => toggleFeaturedShow(show)}
                                    className={btnGhost}
                                  >
                                    {show.featured ? 'Unfeature' : 'Feature'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => removeShow(show.id)}
                                    className={btnDanger}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {tab === 'tiers' ? (
            <TiersAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'cms' ? (
            <CmsAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'sales' ? (
            <SalesAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'scanner' ? (
            <ScannerAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'bonus' ? (
            <div className="space-y-10">
              <ShowreelAdminPanel
                onMessage={(msg) => {
                  setMessage(msg)
                  setError('')
                }}
                onError={(msg) => {
                  setError(msg)
                  setMessage('')
                }}
              />
              <BonusAdminPanel
                onMessage={(msg) => {
                  setMessage(msg)
                  setError('')
                }}
                onError={(msg) => {
                  setError(msg)
                  setMessage('')
                }}
              />
            </div>
          ) : null}

          {tab === 'studio' ? (
            <StudioAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'kevin11' ? (
            <Kevin11AdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'legal' ? (
            <LegalAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'theme' ? (
            <ThemeAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'ai' ? (
            <AIKevAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
