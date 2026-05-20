# Database Schema Diagram

14 tables — shared PostgreSQL database with row-level tenant isolation via `companyId`.

```mermaid
erDiagram
    COMPANIES {
        uuid id PK
        string name
        string slug UK
        string domain UK
        enum plan
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    USERS {
        uuid id PK
        uuid companyId FK
        string email
        string passwordHash
        enum role
        string firstName
        string lastName
        boolean isVerified
        string verifyToken
        string resetToken
        datetime resetTokenExp
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        string deviceInfo
        datetime expiresAt
        datetime createdAt
    }

    EMPLOYEES {
        uuid id PK
        uuid companyId FK
        uuid userId FK
        string firstName
        string lastName
        string department
        string position
        date hireDate
        decimal salary
        string phone
        string address
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    ATTENDANCE {
        uuid id PK
        uuid companyId FK
        uuid employeeId FK
        date date
        datetime checkIn
        datetime checkOut
        enum status
        string notes
        datetime createdAt
    }

    EXPENSE_CATEGORIES {
        uuid id PK
        uuid companyId FK
        string name
        string color
        datetime createdAt
    }

    EXPENSES {
        uuid id PK
        uuid companyId FK
        uuid employeeId FK
        uuid categoryId FK
        string title
        decimal amount
        string currency
        enum status
        uuid approvedById FK
        datetime approvedAt
        string rejectReason
        string invoiceUrl
        string notes
        date expenseDate
        datetime createdAt
        datetime updatedAt
    }

    PRODUCTS {
        uuid id PK
        uuid companyId FK
        string name
        string sku
        string description
        string category
        decimal unitPrice
        int quantity
        int lowStockThreshold
        string warehouseLocation
        string barcode
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    STOCK_MOVEMENTS {
        uuid id PK
        uuid companyId FK
        uuid productId FK
        enum type
        int quantity
        int previousQuantity
        int newQuantity
        string reason
        uuid performedById FK
        datetime createdAt
    }

    NOTIFICATIONS {
        uuid id PK
        uuid companyId FK
        uuid userId FK
        string type
        string title
        string message
        boolean isRead
        json data
        datetime createdAt
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid companyId FK
        uuid userId FK
        string action
        string resourceType
        string resourceId
        json details
        string ipAddress
        datetime createdAt
    }

    AI_CHATS {
        uuid id PK
        uuid companyId FK
        uuid userId FK
        string title
        datetime createdAt
        datetime updatedAt
    }

    AI_MESSAGES {
        uuid id PK
        uuid chatId FK
        enum role
        string content
        json metadata
        datetime createdAt
    }

    REPORTS {
        uuid id PK
        uuid companyId FK
        uuid generatedById FK
        string type
        string title
        json data
        datetime createdAt
    }

    COMPANIES ||--o{ USERS : "has many"
    COMPANIES ||--o{ EMPLOYEES : "has many"
    COMPANIES ||--o{ EXPENSE_CATEGORIES : "has many"
    COMPANIES ||--o{ EXPENSES : "has many"
    COMPANIES ||--o{ PRODUCTS : "has many"
    COMPANIES ||--o{ STOCK_MOVEMENTS : "has many"
    COMPANIES ||--o{ NOTIFICATIONS : "has many"
    COMPANIES ||--o{ ACTIVITY_LOGS : "has many"
    COMPANIES ||--o{ AI_CHATS : "has many"
    COMPANIES ||--o{ REPORTS : "has many"

    USERS ||--o{ REFRESH_TOKENS : "has many"
    USERS ||--o| EMPLOYEES : "linked to"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ACTIVITY_LOGS : "generates"
    USERS ||--o{ AI_CHATS : "owns"
    USERS ||--o{ STOCK_MOVEMENTS : "performs"
    USERS ||--o{ EXPENSES : "approves"

    EMPLOYEES ||--o{ ATTENDANCE : "has many"
    EMPLOYEES ||--o{ EXPENSES : "submits"

    EXPENSE_CATEGORIES ||--o{ EXPENSES : "categorizes"

    PRODUCTS ||--o{ STOCK_MOVEMENTS : "tracked by"

    AI_CHATS ||--o{ AI_MESSAGES : "contains"
```

## Multi-Tenancy Design

Every table except `COMPANIES` has a `companyId` column. Every repository query includes `WHERE companyId = ?` extracted from the JWT. A valid token from Company A cannot read Company B data even if they share the same database.

## Key Design Decisions

| Decision | Reason |
|---|---|
| UUID primary keys | Don't leak row counts; safe to expose in URLs |
| `Decimal` for money | Float has rounding errors — `0.1 + 0.2 ≠ 0.3` exactly |
| Soft delete (`isActive`) | Preserves audit trail; prevents broken foreign key references |
| `STOCK_MOVEMENTS` as immutable ledger | Full history of every quantity change; `previousQuantity` + `newQuantity` stored so queries don't need to replay the log |
| `REFRESH_TOKENS` stores hashes | If the DB is breached, raw tokens are not exposed |
| `USERS` ↔ `EMPLOYEES` optional link | An employee can exist as an HR record without a login account |
| `Json` columns on logs/notifications | Variable structured data without extra tables |
