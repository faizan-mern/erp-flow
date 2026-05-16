'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '', companySlug: '' })
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
      const res = await api.post('/api/v1/auth/login', form)
      const { accessToken, user } = res.data.data
      setAuth(user, accessToken)
      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please check your details.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-strong">Welcome back</h1>
        <p className="text-muted mt-1 text-sm">Sign in to your company account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Company Slug">
          <Input name="companySlug" value={form.companySlug} onChange={handleChange} placeholder="e.g. acme-corp" required />
        </Field>

        <Field label="Email">
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required />
        </Field>

        <Field label="Password">
          <Input name="password" type="password" value={form.password} onChange={handleChange} required />
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

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-muted">
          No account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Register
          </Link>
        </p>
        <Link href="/forgot-password" className="text-sm text-muted hover:text-primary transition-colors">
          Forgot password?
        </Link>
      </div>
    </Card>
  )
}
