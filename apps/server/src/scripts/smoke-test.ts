import 'dotenv/config'
import { prisma } from '../prisma/client'

async function main() {
  console.log('Smoke test — connecting to database...\n')

  const [companies, users, employees, expenses, products, stockMovements, activityLogs] =
    await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.employee.count(),
      prisma.expense.count(),
      prisma.product.count(),
      prisma.stockMovement.count(),
      prisma.activityLog.count(),
    ])

  console.log('Table         | Rows')
  console.log('--------------|------')
  console.log(`companies     | ${companies}`)
  console.log(`users         | ${users}`)
  console.log(`employees     | ${employees}`)
  console.log(`expenses      | ${expenses}`)
  console.log(`products      | ${products}`)
  console.log(`stockMovements| ${stockMovements}`)
  console.log(`activityLogs  | ${activityLogs}`)
  console.log('\nDB connection OK ✓')
}

main()
  .catch((err) => {
    console.error('Smoke test FAILED:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
