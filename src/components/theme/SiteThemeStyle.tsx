import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { themeToCss } from '@/lib/settings/themeCss'

/** Apply saved Theme colours (including Sold Out) before the client hydrates. */
export default async function SiteThemeStyle() {
  const settings = await getSiteSettings()
  return (
    <style
      data-kf-theme-settings="ssr"
      dangerouslySetInnerHTML={{ __html: themeToCss(settings.theme) }}
    />
  )
}
