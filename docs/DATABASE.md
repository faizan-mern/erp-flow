# Database Design

## Why PostgreSQL + Prisma

**PostgreSQL** is the industry standard for relational SaaS data. It supports:
- JSON columns (for flexible metadata)
- UUID primary keys (better for distributed systems than auto-increment integers)
- Strong constraints and foreign keys
- Excellent indexing

**Prisma ORM** sits between your code and PostgreSQL. Instead of writing raw SQL, you define your schema in a `.prisma` file and Prisma generates a type-safe client. Benefits:
- TypeScript types auto-generated from schema (no manual type definitions)
- Migrations tracked in version control
- Readable, declarative schema syntax

---

## Tenant Isolation Strategy

Every single table (except `companies`) has a `companyId` column.

**Why:** If a user from Company A somehow gets a valid JWT, they still can't see Company B's data because every query is filtered by `companyId` extracted from their token. It's defense in depth.

**The rule:** No repository function ever runs a query without `where: { companyId }`. This is enforced by code review and the architecture pattern — the `companyId` comes from `req.user.companyId` set by middleware, never from user input.

---

## Full Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── COMPANY (the tenant) ───────────────────────────────────────────────────
model Company {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique   // used in URLs: acme-corp
  domain    String?  @unique   // optional custom domain
  plan      Plan     @default(FREE)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // relations
  users             User[]
  employees         Employee[]
  expenses          Expense[]
  expenseCategories ExpenseCategory[]
  products          Product[]
  stockMovements    StockMovement[]
  notifications     Notification[]
  activityLogs      ActivityLog[]
  aiChats           AiChat[]
  reports           Report[]

  @@map("companies")
}

enum Plan {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

// ─── USER (authentication & roles) ─────────────────────────────────────────
// A user belongs to exactly one company.
// Same email can exist across different companies (@@unique on [email, companyId])
model User {
  id            String    @id @default(uuid())
  companyId     String
  email         String
  passwordHash  String
  role          Role      @default(EMPLOYEE)
  firstName     String
  lastName      String
  isVerified    Boolean   @default(false)
  verifyToken   String?   // for email verification link
  resetToken    String?   // for password reset link
  resetTokenExp DateTime? // expiry for reset token
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  company          Company        @relation(fields: [companyId], references: [id])
  refreshTokens    RefreshToken[]
  employee         Employee?
  approvedExpenses Expense[]      @relation("ApprovedBy")
  activityLogs     ActivityLog[]
  notifications    Notification[]
  aiChats          AiChat[]
  stockMovements   StockMovement[]

  @@unique([email, companyId])
  @@index([companyId])
  @@map("users")
}

enum Role {
  SUPER_ADMIN
  COMPANY_ADMIN
  MANAGER
  EMPLOYEE
}

// ─── REFRESH TOKEN ──────────────────────────────────────────────────────────
// We store a HASH of the refresh token, not the token itself.
// If DB is breached, raw tokens are not exposed.
model RefreshToken {
  id         String   @id @default(uuid())
  userId     String
  tokenHash  String   @unique
  deviceInfo String?  // e.g. "Chrome on Windows"
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

// ─── EMPLOYEE (HR profile) ──────────────────────────────────────────────────
// An employee can optionally have a user account (for system login).
// Some employees are just records — they don't log in.
model Employee {
  id         String    @id @default(uuid())
  companyId  String
  userId     String?   @unique  // nullable — not all employees have login
  firstName  String
  lastName   String
  department String?
  position   String?
  hireDate   DateTime? @db.Date
  salary     Decimal?  @db.Decimal(12, 2)
  phone      String?
  address    String?
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  company    Company      @relation(fields: [companyId], references: [id])
  user       User?        @relation(fields: [userId], references: [id])
  attendance Attendance[]
  expenses   Expense[]

  @@index([companyId])
  @@map("employees")
}

// ─── ATTENDANCE ─────────────────────────────────────────────────────────────
// One record per employee per day.
// @@unique([employeeId, date]) ensures no duplicate entries for same day.
model Attendance {
  id         String           @id @default(uuid())
  companyId  String
  employeeId String
  date       DateTime         @db.Date
  checkIn    DateTime?
  checkOut   DateTime?
  status     AttendanceStatus @default(PRESENT)
  notes      String?
  createdAt  DateTime         @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, date])
  @@index([companyId, date])
  @@map("attendance")
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  ON_LEAVE
}

// ─── EXPENSE CATEGORY ───────────────────────────────────────────────────────
model ExpenseCategory {
  id        String   @id @default(uuid())
  companyId String
  name      String
  color     String   @default("#6366f1")
  createdAt DateTime @default(now())

  company  Company   @relation(fields: [companyId], references: [id])
  expenses Expense[]

  @@unique([companyId, name])
  @@index([companyId])
  @@map("expense_categories")
}

// ─── EXPENSE ────────────────────────────────────────────────────────────────
model Expense {
  id           String        @id @default(uuid())
  companyId    String
  employeeId   String
  categoryId   String?
  title        String
  amount       Decimal       @db.Decimal(12, 2)
  currency     String        @default("USD")
  status       ExpenseStatus @default(PENDING)
  approvedById String?
  approvedAt   DateTime?
  invoiceUrl   String?       // Cloudinary URL for uploaded PDF
  notes        String?
  expenseDate  DateTime      @db.Date
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  company    Company          @relation(fields: [companyId], references: [id])
  employee   Employee         @relation(fields: [employeeId], references: [id])
  category   ExpenseCategory? @relation(fields: [categoryId], references: [id])
  approvedBy User?            @relation("ApprovedBy", fields: [approvedById], references: [id])

  @@index([companyId, status])
  @@index([companyId, expenseDate])
  @@map("expenses")
}

enum ExpenseStatus {
  PENDING
  APPROVED
  REJECTED
}

// ─── PRODUCT (Inventory) ────────────────────────────────────────────────────
model Product {
  id                String   @id @default(uuid())
  companyId         String
  name              String
  sku               String   // Stock Keeping Unit — unique identifier per company
  description       String?
  category          String?
  unitPrice         Decimal  @db.Decimal(12, 2)
  quantity          Int      @default(0)
  lowStockThreshold Int      @default(10)
  warehouseLocation String?
  barcode           String?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  company        Company         @relation(fields: [companyId], references: [id])
  stockMovements StockMovement[]

  @@unique([companyId, sku])
  @@index([companyId])
  @@map("products")
}

// ─── STOCK MOVEMENT ─────────────────────────────────────────────────────────
// Every change to inventory quantity is logged here.
// This gives a full audit trail and enables "how did we get to this quantity?" analysis.
model StockMovement {
  id               String            @id @default(uuid())
  companyId        String
  productId        String
  type             StockMovementType
  quantity         Int               // how many units changed
  previousQuantity Int               // quantity before this change
  newQuantity      Int               // quantity after this change
  reason           String?
  performedById    String
  createdAt        DateTime          @default(now())

  product     Product @relation(fields: [productId], references: [id])
  performedBy User    @relation(fields: [performedById], references: [id])

  @@index([companyId, productId])
  @@index([companyId, createdAt])
  @@map("stock_movements")
}

enum StockMovementType {
  IN          // receiving stock
  OUT         // dispatching stock
  ADJUSTMENT  // manual correction
}

// ─── NOTIFICATION ───────────────────────────────────────────────────────────
model Notification {
  id        String   @id @default(uuid())
  companyId String
  userId    String
  type      String   // EXPENSE_APPROVED | EXPENSE_REJECTED | LOW_STOCK | etc.
  title     String
  message   String
  isRead    Boolean  @default(false)
  data      Json?    // extra context (e.g. { expenseId: "..." })
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([companyId, userId, isRead])
  @@map("notifications")
}

// ─── ACTIVITY LOG ───────────────────────────────────────────────────────────
// Audit trail for all user actions across the platform.
model ActivityLog {
  id           String   @id @default(uuid())
  companyId    String
  userId       String
  action       String   // CREATE | UPDATE | DELETE | LOGIN | APPROVE | REJECT
  resourceType String   // expense | product | employee | user
  resourceId   String?
  details      Json?    // what changed (before/after values)
  ipAddress    String?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([companyId, createdAt])
  @@index([companyId, userId])
  @@map("activity_logs")
}

// ─── AI CHAT ────────────────────────────────────────────────────────────────
// Each conversation thread is one AiChat.
// Messages within it are AiMessage records.
model AiChat {
  id        String     @id @default(uuid())
  companyId String
  userId    String
  title     String     @default("New Chat")
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  company  Company     @relation(fields: [companyId], references: [id])
  user     User        @relation(fields: [userId], references: [id])
  messages AiMessage[]

  @@index([companyId, userId])
  @@map("ai_chats")
}

// ─── AI MESSAGE ─────────────────────────────────────────────────────────────
model AiMessage {
  id        String      @id @default(uuid())
  chatId    String
  role      MessageRole
  content   String
  metadata  Json?       // { sqlQuery: "...", rowCount: 5, tokensUsed: 120 }
  createdAt DateTime    @default(now())

  chat AiChat @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@index([chatId])
  @@map("ai_messages")
}

enum MessageRole {
  USER
  ASSISTANT
}

// ─── REPORT ─────────────────────────────────────────────────────────────────
model Report {
  id            String   @id @default(uuid())
  companyId     String
  generatedById String
  type          String   // EXPENSE_SUMMARY | INVENTORY_STATUS | EMPLOYEE_REPORT
  title         String
  data          Json     // the full report data snapshot
  createdAt     DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId, type])
  @@map("reports")
}
```

---

## Table Relationships Explained

```
companies
  ├── users (one company → many users)
  │     └── refreshTokens (one user → many devices/sessions)
  │     └── employee (one user → one employee profile, optional)
  ├── employees
  │     └── attendance (one employee → many attendance records)
  │     └── expenses (one employee → many expenses submitted)
  ├── expenseCategories
  │     └── expenses (one category → many expenses)
  ├── products
  │     └── stockMovements (one product → many movement logs)
  ├── notifications (one company → many notifications)
  ├── activityLogs (one company → many logs)
  └── aiChats
        └── aiMessages (one chat → many messages)
```

---

## Indexing Strategy

Indexes speed up queries but slow down writes. We only index columns we actually filter/sort by.

| Index | Why |
|---|---|
| `users(companyId)` | Every user lookup filters by company |
| `users(email, companyId)` | Login query looks up by email within a company |
| `attendance(companyId, date)` | Daily attendance reports filter by date |
| `expenses(companyId, status)` | Pending approval list filters by status |
| `expenses(companyId, expenseDate)` | Monthly reports filter by date |
| `products(companyId)` | All inventory queries scoped to company |
| `stockMovements(companyId, productId)` | Product history queries |
| `activityLogs(companyId, createdAt)` | Recent activity feed sorted by time |
| `notifications(companyId, userId, isRead)` | Unread notification count |

---

## Key Design Decisions

1. **UUID over auto-increment IDs** — UUIDs don't leak record counts ("you're user #47") and work better across distributed systems

2. **`Decimal` for money, not `Float`** — Float has rounding errors. `0.1 + 0.2 = 0.30000000000000004` in float. Decimal is exact. Always use Decimal for currency.

3. **Soft delete with `isActive`** — Products and Employees aren't deleted from DB, just marked inactive. Preserves historical data and audit trail.

4. **`Json` columns for flexibility** — `data` on Notification, `details` on ActivityLog, `metadata` on AiMessage — these hold variable structured data without needing extra tables.

5. **StockMovement as audit log** — Never just update `product.quantity` directly. Always create a StockMovement record and update quantity. This gives you the full history of every change.
