'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, Briefcase, FileText, Search } from 'lucide-react'
import { fetchCompanies, toggleCompany, PlatformCompany } from '@/lib/super-admin'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    FREE:         'bg-canvas text-muted border-border',
    STARTER:      'bg-blue-50 text-blue-700 border-blue-200',
    PROFESSIONAL: 'bg-purple-50 text-purple-700 border-purple-200',
    ENTERPRISE:   'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles[plan] ?? styles.FREE}`}>
      {plan}
    </span>
  )
}

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-companies', debouncedSearch],
    queryFn: () => fetchCompanies({ search: debouncedSearch || undefined }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleCompany(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-companies'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
      setConfirmId(null)
    },
  })

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    clearTimeout((window as unknown as { _st: ReturnType<typeof setTimeout> })._st)
    ;(window as unknown as { _st: ReturnType<typeof setTimeout> })._st = setTimeout(
      () => setDebouncedSearch(val),
      300,
    )
  }

  const companies = data?.companies ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-strong">Companies</h1>
          <p className="text-sm text-muted mt-0.5">
            {data?.total ?? '—'} registered tenants on the platform
          </p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={handleSearch}
            placeholder="Search companies..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className="text-left px-4 py-3 text-muted font-medium">Company</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Plan</th>
              <th className="text-center px-4 py-3 text-muted font-medium">
                <Users size={13} className="inline mr-1" />Users
              </th>
              <th className="text-center px-4 py-3 text-muted font-medium">
                <Briefcase size={13} className="inline mr-1" />Employees
              </th>
              <th className="text-center px-4 py-3 text-muted font-medium">
                <FileText size={13} className="inline mr-1" />Expenses
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">Status</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && companies.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted">
                  <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                  No companies found
                </td>
              </tr>
            )}
            {companies.map((c: PlatformCompany) => (
              <tr key={c.id} className={`border-b border-border last:border-0 ${!c.isActive ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-strong">{c.name}</p>
                  <p className="text-muted text-xs font-mono">{c.slug}</p>
                </td>
                <td className="px-4 py-3"><PlanBadge plan={c.plan} /></td>
                <td className="px-4 py-3 text-center text-strong font-medium">{c._count.users}</td>
                <td className="px-4 py-3 text-center text-strong font-medium">{c._count.employees}</td>
                <td className="px-4 py-3 text-center text-strong font-medium">{c._count.expenses}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.isActive ? 'success' : 'danger'}>
                    {c.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted text-xs">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmId === c.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-danger font-medium">
                        {c.isActive ? 'Suspend?' : 'Activate?'}
                      </span>
                      <Button
                        size="sm"
                        variant={c.isActive ? 'danger' : 'primary'}
                        onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                        disabled={toggleMutation.isPending}
                      >
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant={c.isActive ? 'ghost' : 'primary'}
                      onClick={() => setConfirmId(c.id)}
                    >
                      {c.isActive ? 'Suspend' : 'Activate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
