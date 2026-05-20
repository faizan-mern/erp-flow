'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'

type Tab = 'company' | 'platform'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, logout } = useAuthStore()

  const [tab, setTab] = useState<Tab>('company')
  const [form, setForm] = useState(() => ({
    email: '',
    password: '',
    companySlug:
      typeof window !== 'undefined' ? (localStorage.getItem('lastCompanySlug') ?? '') : '',
  }))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const slug = tab === 'platform' ? '__platform__' : form.companySlug
      const res = await api.post('/api/v1/auth/login', { ...form, companySlug: slug })
      const { accessToken, user } = res.data.data
      setAuth(user, accessToken)
      if (typeof window !== 'undefined' && tab === 'company') {
        localStorage.setItem('lastCompanySlug', form.companySlug)
      }
      router.push(user.role === 'SUPER_ADMIN' ? '/super-admin/companies' : '/dashboard')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials. Please try again.'
      setError(message)
      logout()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-strong">Welcome back</h1>
        <p className="text-muted mt-1 text-sm">Sign in to your account</p>
      </div>

      <div className="flex rounded-lg border border-border bg-canvas p-1 mb-6">
        <button
          type="button"
          onClick={() => { setTab('company'); setError('') }}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === 'company'
              ? 'bg-white text-strong shadow-sm'
              : 'text-muted hover:text-strong'
          }`}
        >
          Company Login
        </button>
        <button
          type="button"
          onClick={() => { setTab('platform'); setError('') }}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === 'platform'
              ? 'bg-white text-strong shadow-sm'
              : 'text-muted hover:text-strong'
          }`}
        >
          Platform Admin
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === 'company' && (
          <Field label="Company Slug">
            <Input
              name="companySlug"
              value={form.companySlug}
              onChange={handleChange}
              placeholder="e.g. acme-corp"
              required
            />
          </Field>
        )}

        <Field label="Email">
          <Input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
            required
          />
        </Field>

        <Field label="Password">
          <PasswordInput name="password" value={form.password} onChange={handleChange} required />
        </Field>

        {error && (
          <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {tab === 'company' && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted">
            No account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-muted hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      )}
    </Card>
  )
}
