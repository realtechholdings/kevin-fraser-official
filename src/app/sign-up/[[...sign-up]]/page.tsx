import { SignUp } from '@clerk/nextjs'
import { clerkAppearance } from '@/lib/clerkAppearance'

type Props = {
  searchParams: Promise<{ __clerk_ticket?: string | string[] }>
}

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams
  const ticket = params.__clerk_ticket
  const invited = Array.isArray(ticket) ? ticket.some(Boolean) : Boolean(ticket)

  return (
    <div
      className="light min-h-screen overflow-y-auto flex items-center justify-center bg-slate-100 px-4"
      style={{ colorScheme: 'light', color: '#0f172a' }}
    >
      <SignUp
        appearance={clerkAppearance}
        {...(invited
          ? { forceRedirectUrl: '/admin', fallbackRedirectUrl: '/admin' }
          : {})}
      />
    </div>
  )
}
