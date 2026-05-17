'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchMyEmployee } from '@/lib/employees'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'

// EMPLOYEE-facing entry to view/edit their own employee record. We don't
// rebuild the full edit form here — we just resolve the caller's employeeId
// via /employees/me and route them to the existing detail page. That page
// already handles role-aware "View vs Edit" rendering and salary visibility.
export default function ProfilePage() {
  const router = useRouter()

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['my-employee'],
    queryFn: fetchMyEmployee,
    retry: false,
  })

  useEffect(() => {
    if (employee?.id) {
      router.replace(`/dashboard/employees/${employee.id}`)
    }
  }, [employee?.id, router])

  return (
    <PageTransition>
      <Card className="p-10 text-center">
        {isLoading && (
          <p className="text-[13px] text-muted">Loading your profile...</p>
        )}
        {isError && (
          <>
            <p className="text-[14px] font-semibold text-strong mb-1">No employee record</p>
            <p className="text-[13px] text-muted max-w-md mx-auto">
              Your user account isn&apos;t linked to an employee profile yet. Ask
              your company admin to set one up for you.
            </p>
          </>
        )}
        {employee && (
          <p className="text-[13px] text-muted">Redirecting to your profile...</p>
        )}
      </Card>
    </PageTransition>
  )
}
