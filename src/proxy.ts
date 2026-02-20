/**
 * Next.js 16.1.1 Proxy
 * 
 * Handles:
 * - URL rewrites (Persian routes to English routes)
 * - Admin authentication
 * - Request routing
 * 
 * Note: In Next.js 16.1.1, Proxy replaces Middleware. This file should be named proxy.ts
 * The function can be exported as default or named 'proxy'
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const url = request.nextUrl.clone()

  // Rewrite /اخبار/ به /news/ برای مسیرهای فارسی
  // بررسی مسیرهای فارسی (هم encode شده و هم decode شده)
  if (pathname.startsWith('/اخبار/') || pathname.startsWith('/%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1/')) {
    // اگر encode شده است، decode کن
    let decodedPath = pathname
    try {
      decodedPath = decodeURIComponent(pathname)
    } catch {
      // اگر decode نشد، از خود pathname استفاده کن
    }
    
    // استخراج slug بعد از /اخبار/
    const slug = decodedPath.replace(/^\/اخبار\//, '').replace(/^\/%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1\//, '')
    url.pathname = `/news/${slug}`
    
    // Use structured logging (Next.js 16 best practice)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [Proxy] Rewrite: ${pathname} -> ${url.pathname}`)
    }
    
    return NextResponse.rewrite(url)
  }

  // اگر مسیر /اخبار است (بدون slash بعدی)
  if (pathname === '/اخبار' || pathname === '/%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1') {
    url.pathname = '/news'
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [Proxy] Rewrite: ${pathname} -> ${url.pathname}`)
    }
    
    return NextResponse.rewrite(url)
  }

  // فقط مسیرهایی که با /admin شروع میشن رو بررسی کن
  if (pathname.startsWith('/admin')) {
    const isAuthRoute =
      pathname === '/admin/signin' ||
      pathname === '/admin/signup' ||
      pathname.startsWith('/admin/api/')

    // اگه مسیر auth هست (یعنی لاگین یا signup یا api) → ردش کن بره
    if (isAuthRoute) {
      return NextResponse.next()
    }

    // بقیه مسیرهای admin → باید توکن داشته باشه
    const token = request.cookies.get('session')?.value
    if (!token) {
      const loginUrl = new URL('/admin/signin', request.url)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch (error) {
      // Log authentication errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [Proxy] Auth failed for ${pathname}:`, error instanceof Error ? error.message : 'Invalid token')
      }
      
      const loginUrl = new URL('/admin/signin', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // بقیه مسیرهای سایت عمومی هستن و نیازی به بررسی ندارن
  return NextResponse.next()
}

// Configure which routes should be processed by proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
}

