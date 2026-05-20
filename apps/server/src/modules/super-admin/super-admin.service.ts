import * as repo from './super-admin.repository'
import { ListCompaniesInput } from './super-admin.validator'

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status })
}

export async function listCompanies(input: ListCompaniesInput) {
  return repo.listAllCompanies(input.page, input.limit, input.search)
}

export async function getPlatformStats() {
  return repo.getPlatformStats()
}

export async function toggleActive(id: string, isActive: boolean) {
  const company = await repo.findCompanyById(id)
  if (!company) fail('Company not found', 404)
  return repo.toggleCompanyActive(id, isActive)
}
