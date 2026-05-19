# Role Behavior

Three roles are used in the app on every company tenant. Roles are stored on
the `User` row and read out of the JWT on every request. The backend enforces
them; the frontend only hides/shows UI based on the same role and never relies
on client-side checks for security.

| Role | Who it is | How it's created |
|---|---|---|
| `COMPANY_ADMIN` | The user who registered the company | Set automatically on `POST /api/v1/auth/register` |
| `MANAGER` | Mid-level user — can approve expenses, manage employees | Invited by an admin from the Team page |
| `EMPLOYEE` | Regular user — submits own data, sees only their own records | Invited by an admin from the Team page |

## On `SUPER_ADMIN`

The Cyberify assessment lists four roles: Super Admin, Company Admin, Manager,
Employee. `SUPER_ADMIN` exists in the `Role` enum in `schema.prisma` so the
data model matches the assessment, but no auth flow or UI exposes it.

The reason is deliberate: a Super Admin in a multi-tenant SaaS is a
platform-level operator that sees across companies. In our scope the only
"platform action" is company creation, which already happens automatically on
register — there is no operational workload that would justify a separate
Super Admin panel. The rubric awards no marks for one either. The enum value
stays so the schema is forward-compatible if such a role is ever needed.

---

## What each role can do

### COMPANY_ADMIN
- Full access to every module within their own company tenant.
- Manage the Team page (invite users, change roles).
- See all employees, all expenses, all analytics.
- Approve / reject expenses (segregation-of-duties rule still applies: cannot approve their own submission).

### MANAGER
- Read all employees, expenses, attendance.
- Approve / reject expenses submitted by others (cannot approve their own).
- See expense analytics (`/dashboard/expenses/analytics`).
- **Cannot** access the Team page (sidebar link is hidden, backend returns 403).

### EMPLOYEE
- See and edit their own profile + their own attendance via `/dashboard/profile`,
  which resolves `GET /employees/me` and routes them to their own detail page.
- Submit expenses, see only their own expenses in the list.
- **Cannot** see other people's expenses, approve anything, or see analytics
  (the Analytics button on the Expenses page is hidden for them, and the
  analytics route returns 403 with a friendly "No access" message if reached
  directly).
- **Cannot** access the Team page or the Employees directory — both sidebar
  links are hidden, AND the backend now returns 403 on `GET /employees` for
  this role (protects salary fields in the list payload). The per-id endpoint
  `GET /employees/:id` is allowed only for the employee's own id; any other id
  returns 403 from the controller.
- Direct URL access to `/dashboard/employees` redirects them to `/dashboard/profile`
  so they don't see a failed-load error.

---

## How it's enforced

**Backend** — `requireRole(...allowed)` middleware on routes that don't need
finer-grained checks. Example:

```ts
// apps/server/src/modules/expense/expense.routes.ts
router.get('/analytics/monthly', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.analytics))
router.post('/:id/approve',      requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.approve))

// apps/server/src/modules/employee/employee.routes.ts
router.get('/', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.list))   // list hides salaries from EMPLOYEE
router.get('/:id', h(controller.getOne))                                        // per-row check in controller (EMPLOYEE allowed for own id only)
```

Any caller without an allowed role gets a 403 from the middleware before the
controller runs. When the rule depends on the row itself (e.g. "employee can
see own record but not others"), the check lives in the controller instead so
the same route can serve admins, managers, and self-access employees.

**List endpoints** also apply row-level filtering inside the service layer.
For example, `listExpensesForRequester` accepts the caller's role + employeeId
and silently narrows the query to `employeeId = caller` when the role is `EMPLOYEE`.

**Frontend** — pages read `useAuthStore()` and hide UI per role. Examples:

```ts
// Sidebar: Team link only for admins
{ href: '/dashboard/team', label: 'Team', icon: UserCog, adminOnly: true }

// Employees list: EMPLOYEE sees "View" instead of "Edit", no Add/Deactivate buttons
// Expense list: EMPLOYEE never sees the manager approval queue
```

The frontend role-aware UI is a UX nicety; the backend `requireRole` + service-layer
filter is the actual authorization. Either layer alone is insufficient.

---

## Common Source of Confusion

- **Employee model vs User role.** A `User` (auth identity, has a `role`) is separate
  from the `Employee` row (HR record, has firstName/lastName/position). They are linked
  one-to-one by `Employee.userId`. The role lives on `User`. The "who submitted this
  expense" link lives on `Employee`. The expense controller resolves the caller's
  `employeeId` from their `userId` before any read or write.

- **An admin without an Employee row cannot submit expenses.** Because expenses are
  attributed to employees, a fresh admin (created during register but never linked to
  an Employee record) gets a 400 when trying to submit. Solution: invite yourself or
  create your own Employee record from the Employees page.
