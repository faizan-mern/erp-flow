'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Layers, LogOut, Building2, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const NAV = [
  { href: '/super-admin/companies', label: 'Companies', icon: Building2 },
  { href: '/super-admin/stats',     label: 'Stats',     icon: BarChart3  },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard')
  }, [user, router])

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  if (!user || user.role !== 'SUPER_ADMIN') return null

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Layers size={13} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[15px] font-semibold text-strong tracking-tight">ERPFlow</span>
            <span className="ml-2 text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">
              Platform Admin
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-strong hover:bg-canvas'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-strong transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
