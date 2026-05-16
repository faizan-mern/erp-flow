import { prisma } from '../../prisma/client'
import { CreateEmployeeInput, UpdateEmployeeInput } from './employee.validator'
import { todayInAppTz } from '../../utils/time'

export async function listEmployees(
  companyId: string,
  filters: { page: number; limit: number; department?: string; search?: string; isActive?: string }
) {
  const where = {
    companyId,
    ...(filters.isActive !== undefined && { isActive: filters.isActive === 'true' }),
    ...(filters.department && { department: filters.department }),
    ...(filters.search && {
      OR: [
        { firstName: { contains: filters.search, mode: 'insensitive' as const } },
        { lastName: { contains: filters.search, mode: 'insensitive' as const } },
        { position: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, role: true } } },
    }),
    prisma.employee.count({ where }),
  ])

  return { employees, total, page: filters.page, limit: filters.limit }
}

export async function findEmployeeById(id: string, companyId: string) {
  return prisma.employee.findFirst({
    where: { id, companyId },
    include: { user: { select: { email: true, role: true } } },
  })
}

export async function findEmployeeByUserId(userId: string, companyId: string) {
  return prisma.employee.findFirst({
    where: { userId, companyId },
  })
}

export async function createEmployee(companyId: string, data: CreateEmployeeInput) {
  return prisma.employee.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      department: data.department,
      position: data.position,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      salary: data.salary,
      phone: data.phone,
      address: data.address,
      userId: data.userId,
    },
  })
}

export async function updateEmployee(id: string, companyId: string, data: UpdateEmployeeInput) {
  return prisma.employee.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.department !== undefined && { department: data.department }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.hireDate && { hireDate: new Date(data.hireDate) }),
      ...(data.salary !== undefined && { salary: data.salary }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
    },
  })
}

export async function deactivateEmployee(id: string, companyId: string) {
  return prisma.employee.update({
    where: { id },
    data: { isActive: false },
  })
}

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────

export async function findTodayAttendance(employeeId: string) {
  return prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: todayInAppTz() } },
  })
}

export async function createAttendanceRecord(employeeId: string, companyId: string, notes?: string) {
  return prisma.attendance.create({
    data: {
      companyId,
      employeeId,
      date: todayInAppTz(),
      checkIn: new Date(),
      notes,
    },
  })
}

export async function updateAttendanceCheckout(attendanceId: string) {
  return prisma.attendance.update({
    where: { id: attendanceId },
    data: { checkOut: new Date() },
  })
}

export async function listAttendance(employeeId: string, companyId: string, limit = 30) {
  return prisma.attendance.findMany({
    where: { employeeId, companyId },
    orderBy: { date: 'desc' },
    take: limit,
  })
}
