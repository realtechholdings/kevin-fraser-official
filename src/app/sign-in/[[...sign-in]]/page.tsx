import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center bg-slate-100 px-4">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#0f172a',
            colorBackground: '#ffffff',
            borderRadius: '0.375rem',
          },
          elements: {
            card: 'shadow-sm border border-slate-200',
            headerTitle: 'text-slate-900',
            headerSubtitle: 'text-slate-500',
            formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
            footerActionLink: 'text-slate-900 hover:text-slate-700',
          },
        }}
      />
    </div>
  )
}
