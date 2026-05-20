# Role Reference

Four roles are implemented across the platform. Roles are stored on the `User` row and extracted
from the JWT on every request. The backend enforces access; the frontend mirrors the same rules
in the UI.

---

## Role Overview

| Role | Scope | How created |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide — all tenants | Seed script: `npm run create-super-admin` |
| `COMPANY_ADMIN` | Own company — full access | Automatically assigned on registration |
| `MANAGER` | Own company — approve, manage | Invited by admin from the Team page |
| `EMPLOYEE` | Own company — own data only | Invited by admin from the Team page |

---

## SUPER_ADMIN

Platform-level operator. Does not belong to a company tenant — belongs to the `__platform__`
sentinel company which is created by the seed script.

**Can do:**
- View all registered companies (name, plan, user count, expense count, status)
- See platform-wide stats (total companies, users, employees, expenses)
- Suspend a company tenant (blocks all logins for that company)
- Reactivate a suspended company

**Cannot do:**
- Read row-level business data from any tenant (no access to individual expenses, employees, etc.)
- This is the least-privilege SaaS pattern — platform operators see metadata, not customer data

**Access:** Log in at `/login` using the **Platform Admin** tab.

---

## COMPANY_ADMIN

The user who registered the company. Full access within their own tenant.

**Can do:**
- All employee CRUD (create, edit, deactivate)
- All expense management (view all, approve/reject expenses submitted by others)
- Expense analytics
- Inventory management (products, stock movements)
- Team management (invite users, change roles)
- AI assistant
- Dashboard

**Note:** Segregation of duties applies — an admin cannot approve their own expense submission.

---

## MANAGER

Mid-level role. Invited by an admin.

**Can do:**
- View all employees (read-only)
- Approve / reject expenses submitted by others (not their own)
- View expense analytics
- Record stock movements (IN/OUT/ADJUSTMENT)
- AI assistant
- Dashboard

**Cannot do:**
- Access the Team page (invite users or change roles)
- Create, edit, or deactivate employees

---

## EMPLOYEE

Regular user. Invited by an admin.

**Can do:**
- View and edit their own profile (`/dashboard/profile`)
- Check in / check out attendance
- Submit expenses, view their own expense history
- AI assistant
- Notifications

**Cannot do:**
- View other employees' records (backend returns 403, sidebar link hidden)
- View expense analytics
- Approve or reject any expense
- Access Team management

**Direct URL access:** Navigating to `/dashboard/employees` redirects to `/dashboard/profile`
rather than showing an error page.

---

## How enforcement works

**Backend** — `requireRole(...roles)` middleware runs before the controller on protected routes:

```ts
router.get('/', requireRole('COMPANY_ADMIN', 'MANAGER'), handler)
router.get('/analytics/monthly', requireRole('COMPANY_ADMIN', 'MANAGER'), handler)
router.post('/:id/approve', requireRole('COMPANY_ADMIN', 'MANAGER'), handler)
```

For per-row access rules (e.g. employee sees only their own record), the check runs inside
the controller after the row is fetched, using `req.user.role` and `req.user.userId`.

List endpoints apply a service-layer row filter — `listExpenses` silently narrows results
to `employeeId = caller` when the caller's role is `EMPLOYEE`.

**Frontend** — pages read `useAuthStore()` and hide/show UI elements per role. This is a UX
layer only. The backend remains the authoritative enforcement point regardless of what the
frontend shows.

---

## User vs Employee distinction

A `User` row holds the auth identity and role. An `Employee` row holds the HR record
(name, position, department, salary). They are linked one-to-one by `Employee.userId`.

An admin freshly registered has a `User` row but no `Employee` row. To submit expenses,
they must create their own Employee record from the Employees page, then the system links
the two automatically.
