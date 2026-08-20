import { SignUp } from '@clerk/nextjs'
import { clerkAppearance } from '@/lib/clerkAppearance'

export default function SignUpPage() {
  return (
    <div
      className="light min-h-screen overflow-y-auto flex items-center justify-center bg-slate-100 px-4"
      style={{ colorScheme: 'light', color: '#0f172a' }}
    >
      <SignUp appearance={clerkAppearance} />
    </div>
  )
}
