                'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogIn, LogOut, CheckCircle2 } from 'lucide-react'
import {
  fetchMyEmployee, fetchAttendance, checkIn, checkOut,
  AttendanceRecord,
} from '@/lib/employees'
import { formatTime12h } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ATTENDANCE_STATUS_VARIANT: Record<string, 'active' | 'inactive' | 'pending'> = {
  PRESENT: 'active',
  ABSENT: 'inactive',
  LATE: 'pending',
  HALF_DAY: 'pending',
  ON_LEAVE: 'inactive',
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { data: me, isLoading: loadingMe, error: meError } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: fetchMyEmployee,
    retry: false,
  })

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance', 'me', me?.id],
    queryFn: () => fetchAttendance(me!.id),
    enabled: !!me?.id,
  })

  const checkInMutation = useMutation({
    mutationFn: () => checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'me'] })
      setError('')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed.'
      setError(message)
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'me'] })
      setError('')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed.'
      setError(message)
    },
  })

  const todayRecord = attendance.find(
    (r) => new Date(r.date).toDateString() === new Date().toDateString()
  )

  if (loadingMe) {
    return <div className="p-10 text-center text-[13px] text-muted">Loading...</div>
  }

  if (meError || !me) {
    return (
      <PageTransition>
        <PageHeader title="Attendance" subtitle="Your check-in history" />
        <Card className="p-8 text-center">
          <p className="text-[13px] text-muted">
            No employee profile is linked to your account. Ask an admin to link you to an employee record before checking in.
          </p>
        </Card>
      </PageTransition>
    )
  }

  const last14 = attendance.slice(0, 14)

  return (
    <PageTransition>
      <PageHeader title="Attendance" subtitle="Your check-in history" />

      {/* Today */}
      <Card className="p-5 mb-4">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Today</p>

        {error && (
          <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          {!todayRecord ? (
            <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
              <LogIn size={14} className="mr-1.5" />
              {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
            </Button>
          ) : !todayRecord.checkOut ? (
            <>
              <p className="text-[13px] text-muted">
                Checked in at{' '}
                <strong className="text-strong">
                  {new Date(todayRecord.checkIn!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </p>
              <Button
                variant="secondary"
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
              >
                <LogOut size={14} className="mr-1.5" />
                {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <CheckCircle2 size={15} className="text-success" />
              <span>
                Done for today —{' '}
                <strong className="text-strong">
                  {new Date(todayRecord.checkIn!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
                {' → '}
                <strong className="text-strong">
                  {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Last 14 days */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Last 14 days</p>
        </div>

        {loadingAttendance && (
          <div className="p-8 text-center text-[13px] text-muted">Loading...</div>
        )}

        {!loadingAttendance && last14.length === 0 && (
          <div className="p-8 text-center text-[13px] text-muted">No attendance records yet.</div>
        )}

        {!loadingAttendance && last14.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Check In</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Check Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {last14.map((record: AttendanceRecord) => (
                <tr key={record.id} className="hover:bg-canvas">
                  <td className="px-5 py-3 text-strong">
                    {new Date(record.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={ATTENDANCE_STATUS_VARIANT[record.status] ?? 'inactive'}>
                      {record.status.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {record.checkIn ? formatTime12h(record.checkIn) : <span className="text-muted/50 italic">Not checked in</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {record.checkOut ? formatTime12h(record.checkOut) : <span className="text-muted/50 italic">Not checked out</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageTransition>
  )
}
