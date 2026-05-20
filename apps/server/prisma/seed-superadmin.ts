import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email    = process.env.SUPER_ADMIN_EMAIL    ?? process.argv[2]
  const password = process.env.SUPER_ADMIN_PASSWORD ?? process.argv[3]

  if (!email || !password) {
    console.error('Usage: npm run create-super-admin -- <email> <password>')
    console.error('  or:  SUPER_ADMIN_EMAIL=x SUPER_ADMIN_PASSWORD=y npm run create-super-admin')
    process.exit(1)
  }

  let platform = await prisma.company.findUnique({ where: { slug: '__platform__' } })
  if (!platform) {
    platform = await prisma.company.create({
      data: { name: 'Platform', slug: '__platform__', isActive: false },
    })
    console.log('Created __platform__ company')
  }

  const existing = await prisma.user.findFirst({ where: { email, companyId: platform.id } })
  if (existing) {
    console.log(`Super admin already exists: ${email}`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      companyId: platform.id,
      email,
      passwordHash,
      role:       'SUPER_ADMIN',
      firstName:  'Platform',
      lastName:   'Admin',
      isVerified: true,
    },
  })

  console.log(`Super admin created: ${user.email}`)
  console.log(`Login at /login → Platform tab → email: ${email}`)
  console.log(`Company slug for direct login: __platform__`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
