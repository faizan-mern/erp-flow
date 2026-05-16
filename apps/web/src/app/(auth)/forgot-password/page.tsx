'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: '', companySlug: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/v1/auth/forgot-password', form)
      setSubmitted(true)
    } catch {
      // Backend always returns success to avoid revealing if email exists.
      // Only show error on network failure.
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md p-8 shadow-sm text-center">
        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={22} className="text-success" />
        </div>
        <h2 className="text-xl font-semibold text-strong mb-2">Check your email</h2>
        <p className="text-[13px] text-muted mb-6">
          If an account exists for <strong>{form.email}</strong>, a reset link has been sent.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center border border-border text-muted px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-canvas transition-colors"
        >
          Back to login
        </Link>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-sm">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-strong transition-colors mb-6"
      >
        <ArrowLeft size={13} />
        Back to login
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-strong">Reset password</h1>
        <p className="text-muted mt-1 text-sm">Enter your company slug and email to receive a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Company Slug">
          <Input name="companySlug" value={form.companySlug} onChange={handleChange} placeholder="acme-corp" required />
        </Field>

        <Field label="Email">
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required />
        </Field>

        {error && (
          <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </Card>
  )
}
