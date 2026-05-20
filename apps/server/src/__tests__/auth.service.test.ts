import * as service from '../modules/auth/auth.service'

jest.mock('../modules/auth/auth.repository')
jest.mock('bcryptjs')
jest.mock('../utils/jwt')
jest.mock('../utils/email', () => ({ sendPasswordResetEmail: jest.fn() }))
jest.mock('../utils/activity', () => ({ logActivity: jest.fn() }))

import * as repo from '../modules/auth/auth.repository'
import bcrypt    from 'bcryptjs'
import * as jwt  from '../utils/jwt'

const mockRepo   = repo   as jest.Mocked<typeof repo>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt    = jwt    as jest.Mocked<typeof jwt>

// Minimal stubs — only include fields the service logic actually reads
const COMPANY = { id: 'company-1', name: 'Acme Corp', slug: 'acme', isActive: true }
const USER    = {
  id: 'user-1', email: 'admin@acme.com', firstName: 'Alice', lastName: 'Smith',
  passwordHash: '$2a$12$hashed', role: 'ADMIN', isVerified: true,
  companyId: 'company-1', employee: { id: 'employee-1' },
}
const EMPLOYEE = { id: 'employee-1' }
const STORED_TOKEN = {
  id: 'token-1', tokenHash: 'hashed', userId: 'user-1', deviceInfo: null,
  createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
  user: USER,
}

// Cast helpers — service only reads a subset of full Prisma types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asResolved = (v: unknown) => v as any

const REGISTER_INPUT = {
  companyName: 'Acme Corp', companySlug: 'acme',
  firstName: 'Alice', lastName: 'Smith',
  email: 'admin@acme.com', password: 'password123',
}
const LOGIN_INPUT = {
  companySlug: 'acme', email: 'admin@acme.com', password: 'password123',
}

// ── register() ────────────────────────────────────────────────────────────────

describe('auth.service.register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates company + admin and returns tokens', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(null)
    ;(mockBcrypt.hash as jest.Mock).mockResolvedValue('$2a$12$hashed')
    mockRepo.createCompanyAndAdmin.mockResolvedValue(
      asResolved({ user: USER, company: COMPANY, employee: EMPLOYEE }),
    )
    mockRepo.saveRefreshToken.mockResolvedValue(undefined as never)
    mockJwt.signAccessToken.mockReturnValue('access-token')
    mockJwt.signRefreshToken.mockReturnValue('refresh-token')

    const result = await service.register(REGISTER_INPUT)

    expect(mockRepo.findCompanyBySlug).toHaveBeenCalledWith('acme')
    expect(mockRepo.createCompanyAndAdmin).toHaveBeenCalled()
    expect(result.accessToken).toBe('access-token')
    expect(result.refreshToken).toBe('refresh-token')
    expect(result.user.email).toBe('admin@acme.com')
    expect(result.user.companySlug).toBe('acme')
    expect(result.user.employeeId).toBe('employee-1')
  })

  it('throws 409 when company slug is already taken', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(asResolved(COMPANY))

    await expect(service.register(REGISTER_INPUT)).rejects.toMatchObject({
      message: 'Company slug already taken',
      status: 409,
    })
    expect(mockRepo.createCompanyAndAdmin).not.toHaveBeenCalled()
  })
})

// ── login() ───────────────────────────────────────────────────────────────────

describe('auth.service.login', () => {
  beforeEach(() => jest.clearAllMocks())

  function setupSuccessfulLogin() {
    mockRepo.findCompanyBySlug.mockResolvedValue(asResolved(COMPANY))
    mockRepo.findUserByEmail.mockResolvedValue(asResolved(USER))
    ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockRepo.saveRefreshToken.mockResolvedValue(undefined as never)
    mockRepo.updateLastLogin.mockResolvedValue(undefined as never)
    mockJwt.signAccessToken.mockReturnValue('access-token')
    mockJwt.signRefreshToken.mockReturnValue('refresh-token')
  }

  it('returns tokens on valid credentials', async () => {
    setupSuccessfulLogin()

    const result = await service.login(LOGIN_INPUT)

    expect(result.accessToken).toBe('access-token')
    expect(result.user.email).toBe('admin@acme.com')
    expect(result.user.employeeId).toBe('employee-1')
    expect(mockRepo.updateLastLogin).toHaveBeenCalledWith('user-1')
  })

  it('throws 404 when company does not exist', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(null)

    await expect(service.login(LOGIN_INPUT)).rejects.toMatchObject({ status: 404 })
    expect(mockRepo.findUserByEmail).not.toHaveBeenCalled()
  })

  it('throws 403 when company is suspended', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(asResolved({ ...COMPANY, isActive: false }))

    await expect(service.login(LOGIN_INPUT)).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('suspended'),
    })
  })

  it('allows __platform__ login even when isActive is false', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(
      asResolved({ ...COMPANY, slug: '__platform__', isActive: false }),
    )
    mockRepo.findUserByEmail.mockResolvedValue(asResolved({ ...USER, employee: null }))
    ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockRepo.saveRefreshToken.mockResolvedValue(undefined as never)
    mockRepo.updateLastLogin.mockResolvedValue(undefined as never)
    mockJwt.signAccessToken.mockReturnValue('access-token')
    mockJwt.signRefreshToken.mockReturnValue('refresh-token')

    const result = await service.login({ ...LOGIN_INPUT, companySlug: '__platform__' })
    expect(result.accessToken).toBe('access-token')
    expect(result.user.employeeId).toBeNull()
  })

  it('throws 401 when user is not found', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(asResolved(COMPANY))
    mockRepo.findUserByEmail.mockResolvedValue(null)

    await expect(service.login(LOGIN_INPUT)).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 on wrong password', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(asResolved(COMPANY))
    mockRepo.findUserByEmail.mockResolvedValue(asResolved(USER))
    ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(false)

    await expect(service.login(LOGIN_INPUT)).rejects.toMatchObject({ status: 401 })
  })

  it('throws 403 when user email is not verified', async () => {
    mockRepo.findCompanyBySlug.mockResolvedValue(asResolved(COMPANY))
    mockRepo.findUserByEmail.mockResolvedValue(asResolved({ ...USER, isVerified: false }))
    ;(mockBcrypt.compare as jest.Mock).mockResolvedValue(true)

    await expect(service.login(LOGIN_INPUT)).rejects.toMatchObject({ status: 403 })
  })
})

// ── refresh() ─────────────────────────────────────────────────────────────────

describe('auth.service.refresh', () => {
  beforeEach(() => jest.clearAllMocks())

  const PAYLOAD = { userId: 'user-1', companyId: 'company-1', role: 'ADMIN', email: 'admin@acme.com' }

  it('issues a new token pair on valid refresh token', async () => {
    mockJwt.verifyRefreshToken.mockReturnValue(asResolved(PAYLOAD))
    mockRepo.findRefreshToken.mockResolvedValue(asResolved(STORED_TOKEN))
    mockRepo.deleteRefreshToken.mockResolvedValue(undefined as never)
    mockRepo.saveRefreshToken.mockResolvedValue(undefined as never)
    mockJwt.signAccessToken.mockReturnValue('new-access')
    mockJwt.signRefreshToken.mockReturnValue('new-refresh')

    const result = await service.refresh('raw-refresh-token')

    expect(result.accessToken).toBe('new-access')
    expect(result.refreshToken).toBe('new-refresh')
    expect(mockRepo.deleteRefreshToken).toHaveBeenCalledTimes(1)
    expect(mockRepo.saveRefreshToken).toHaveBeenCalledTimes(1)
  })

  it('throws 401 when refresh token is not in DB (revoked)', async () => {
    mockJwt.verifyRefreshToken.mockReturnValue(asResolved(PAYLOAD))
    mockRepo.findRefreshToken.mockResolvedValue(null)

    await expect(service.refresh('revoked-token')).rejects.toMatchObject({ status: 401 })
    expect(mockRepo.deleteRefreshToken).not.toHaveBeenCalled()
  })

  it('throws 401 when stored token is expired', async () => {
    mockJwt.verifyRefreshToken.mockReturnValue(asResolved(PAYLOAD))
    mockRepo.findRefreshToken.mockResolvedValue(
      asResolved({ ...STORED_TOKEN, expiresAt: new Date(Date.now() - 1000) }),
    )

    await expect(service.refresh('expired-token')).rejects.toMatchObject({ status: 401 })
  })
})
