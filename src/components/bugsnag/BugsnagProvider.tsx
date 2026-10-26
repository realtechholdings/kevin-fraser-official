'use client'

import React from 'react'
import Bugsnag from '@bugsnag/js'
import BugsnagPluginReact from '@bugsnag/plugin-react'
import BugsnagPerformance from '@bugsnag/browser-performance'

const BUGSNAG_API_KEY = 'f13bd04343ddc51eb83167f6a550310f'

function BugsnagPassthrough({ children }: { children?: React.ReactNode }) {
  return children
}

let ErrorBoundary: React.ComponentType<{ children?: React.ReactNode }> = BugsnagPassthrough

if (typeof window !== 'undefined' && !Bugsnag.isStarted()) {
  Bugsnag.start({
    apiKey: BUGSNAG_API_KEY,
    plugins: [new BugsnagPluginReact()],
  })
  BugsnagPerformance.start({ apiKey: BUGSNAG_API_KEY })
  const plugin = Bugsnag.getPlugin('react')
  if (plugin) ErrorBoundary = plugin.createErrorBoundary(React)
}

export default function BugsnagProvider({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
