'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import {
  META_PIXEL_ID,
  clearPendingCheckout,
  isMetaPixelEnabled,
  readPendingCheckout,
  trackMeta,
  trackMetaCustom,
} from '@/lib/metaPixel'

const SKIP_PREFIXES = ['/admin', '/sign-in', '/sign-up', '/dashboard']

function shouldTrackPath(pathname: string) {
  return !SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function MetaPixelTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirst = useRef(true)

  useEffect(() => {
    if (!isMetaPixelEnabled() || !pathname || !shouldTrackPath(pathname)) return

    // Initial PageView is fired by the base pixel snippet; only re-fire on SPA navigations.
    if (isFirst.current) {
      isFirst.current = false
    } else {
      trackMeta('PageView')
    }

    // Stripe cancel_url lands here — treat as abandoned checkout.
    if (pathname === '/worlds/stage' && searchParams.get('cancelled') === '1') {
      const pending = readPendingCheckout()
      trackMetaCustom('AbandonCheckout', {
        content_ids: pending?.content_ids,
        content_name: pending?.content_name,
        content_type: 'product',
        value: pending?.value,
        currency: pending?.currency,
        num_items: pending?.num_items,
      })
      clearPendingCheckout()
    }
  }, [pathname, searchParams])

  return null
}

export default function MetaPixel() {
  if (!isMetaPixelEnabled()) return null

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <MetaPixelTracker />
      </Suspense>
    </>
  )
}
