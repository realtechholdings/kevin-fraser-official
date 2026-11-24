import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/admin(.*)', '/api/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Invitation emails land on /admin with a Clerk ticket. That page is signed-in
  // only, so the ticket was dropped and Accept invitation did nothing.
  if (
    (req.nextUrl.pathname === '/admin' || req.nextUrl.pathname.startsWith('/admin/')) &&
    req.nextUrl.searchParams.has('__clerk_ticket')
  ) {
    const url = req.nextUrl.clone()
    url.pathname = '/sign-up'
    return NextResponse.redirect(url)
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}
