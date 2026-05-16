'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'companyName' && {
        companySlug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      }),
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/v1/auth/register', form)
      setSuccess('Company registered! Check your email to verify your account, then log in.')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md p-8 shadow-sm text-center">
        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={22} className="text-success" />
        </div>
        <h2 className="text-xl font-semibold text-strong mb-2">You&apos;re all set</h2>
        <p className="text-muted text-sm mb-6">{success}</p>
        <Button onClick={() => router.push('/login')}>
          Go to login
        </Button>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-strong">Create your company</h1>
        <p className="text-muted mt-1 text-sm">Set up your ERPFlow workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Company Name">
          <Input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Acme Corp" required />
        </Field>

        <Field label="Company Slug" hint="Used in your login URL. Lowercase letters, numbers, hyphens only.">
          <Input name="companySlug" value={form.companySlug} onChange={handleChange} placeholder="acme-corp" required className="font-mono" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <Input name="firstName" value={form.firstName} onChange={handleChange} required />
          </Field>
          <Field label="Last Name">
            <Input name="lastName" value={form.lastName} onChange={handleChange} required />
          </Field>
        </div>

        <Field label="Email">
          <Input name="email" type="email" value={form.email} onChange={handleChange} required />
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
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
