'use client'

import { useEffect } from 'react'
import { mountSupportWidget } from '@hivemind/support/widget'

export default function SupportAdminPanel() {
  useEffect(() => {
    const widget = mountSupportWidget({
      hiveMindUrl: 'https://www.hivemynd.io',
      ingestApiKey: 'hmsk_f29a487512ae5c43d4b55d0e41bd27b4618c68f834d4c2c7',
    })
    widget.open()
    return () => widget.destroy()
  }, [])

  return (
    <div className="admin-card p-6">
      <h2 className="text-lg font-semibold text-white">HiveMind Support</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
        Send a bug, feature request, change, or update. Bugs can be fixed automatically when
        auto-heal is on. Features, changes, and updates are planned in the support centre and wait
        for approval.
      </p>
    </div>
  )
}
