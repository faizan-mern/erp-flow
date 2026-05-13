'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/dashboard/employees', label: 'Employees', icon: '👥' },
  { href: '/dashboard/expenses', label: 'Expenses', icon: '💰' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: '📦' },
  { href: '/dashboard/ai', label: 'AI Assistant', icon: '✨' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      logout()
      router.push('/login')
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">

      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <span className="font-bold text-slate-900 text-lg">ERP Platform</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ').toLowerCase()}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-500 hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-sm font-medium text-slate-500 capitalize">
            {pathname.split('/').pop() || 'dashboard'}
          </h1>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
            {user?.role?.replace('_', ' ')}
          </span>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
