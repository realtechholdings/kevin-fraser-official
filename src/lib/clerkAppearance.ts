/** Light Clerk UI with black text — isolates auth from site dark mode. */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#ff6b35',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorTextOnPrimaryBackground: '#0b0b0f',
    colorInputBackground: '#ffffff',
    colorInputText: '#0f172a',
    colorNeutral: '#0f172a',
    borderRadius: '0.375rem',
  },
  elements: {
    rootBox: 'clerk-root',
    card: 'bg-white text-slate-900 shadow-sm border border-slate-200',
    headerTitle: '!text-slate-900',
    headerSubtitle: '!text-slate-500',
    socialButtonsBlockButton:
      '!bg-white !text-slate-900 border border-slate-200 hover:!bg-slate-50',
    socialButtonsBlockButtonText: '!text-slate-900 !font-medium',
    formFieldLabel: '!text-slate-900',
    formFieldInput:
      '!bg-white !text-slate-900 border-slate-200 placeholder:!text-slate-400',
    formButtonPrimary:
      '!bg-[#ff6b35] !text-[#0b0b0f] hover:!bg-[#e85f2e] !font-semibold',
    footerActionLink: '!text-slate-900 hover:!text-slate-700',
    footerActionText: '!text-slate-500',
    identityPreviewText: '!text-slate-900',
    identityPreviewEditButton: '!text-slate-900',
    formFieldInputShowPasswordButton: '!text-slate-500',
    dividerText: '!text-slate-500',
  },
} as const
