import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Kevin Fraser Official',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-app-root">{children}</div>
}
