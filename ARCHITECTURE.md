# iTAS BackOffice System — Full System Architecture

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│   Browser (Chrome/Edge/Safari)  |  Email Client  |  QR Scanner  │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS (443)
┌────────────────────▼────────────────────────────────────────────┐
│                    REVERSE PROXY (Traefik)                       │
│              SSL Termination | Rate Limiting                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│               NEXT.JS 15 APPLICATION (Docker)                    │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │   App Router UI   │    │         API Routes (REST)         │   │
│  │                  │    │                                  │   │
│  │  /dashboard      │    │  /api/auth          (NextAuth)   │   │
│  │  /customers      │    │  /api/customers      CRUD        │   │
│  │  /contracts      │    │  /api/contracts      CRUD        │   │
│  │  /assets         │    │  /api/assets         CRUD        │   │
│  │  /licenses       │    │  /api/licenses       CRUD        │   │
│  │  /renewals       │    │  /api/renewals       CRUD        │   │
│  │  /reports        │    │  /api/search         Global      │   │
│  │  /settings       │    │  /api/dashboard      Stats       │   │
│  │                  │    │  /api/notifications  CRUD        │   │
│  │  shadcn/ui       │    │  /api/files          Upload      │   │
│  │  TanStack Table  │    │  /api/reports        Export      │   │
│  │  React Hook Form │    │  /api/certificates   Generate    │   │
│  │  Zod Validation  │    │  /api/cron/notify    Scheduler   │   │
│  └──────────────────┘    └──────────────────────────────────┘   │
└────────┬───────────────────────────────┬────────────────────────┘
         │                               │
┌────────▼──────────┐    ┌──────────────▼──────────────────────┐
│   PostgreSQL 16   │    │          S3 Storage (MinIO)          │
│                   │    │                                      │
│  - users          │    │  /contracts/    PDF attachments      │
│  - customers      │    │  /assets/       Photos, docs         │
│  - customer_sites │    │  /licenses/     License docs         │
│  - contracts      │    │  /customers/    KYC docs             │
│  - contract_items │    │  /certificates/ Generated PDFs       │
│  - contract_ren.. │    │  /public/       Logos, templates     │
│  - assets         │    └──────────────────────────────────────┘
│  - asset_histo..  │
│  - licenses       │    ┌──────────────────────────────────────┐
│  - vendors        │    │          Redis (Optional)            │
│  - attachments    │    │                                      │
│  - audit_logs     │    │  - Session cache                     │
│  - notifications  │    │  - Rate limiting counters            │
│  - activity_logs  │    │  - Search cache                      │
│  - tags           │    └──────────────────────────────────────┘
└───────────────────┘
```

---

## 2. Production Folder Structure

```
iTAS-BackOffice/
├── prisma/
│   ├── schema.prisma              # Complete database schema
│   ├── seed.ts                    # Seed data
│   └── migrations/                # Migration history
│
├── public/
│   ├── images/
│   │   ├── logo.png               # Company logo (for certificates)
│   │   └── logo-white.png
│   └── icons/
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/           # Protected layout
│   │   │   ├── layout.tsx         # Dashboard shell (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       # KPI + alerts + activity
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx       # List with filters
│   │   │   │   ├── new/page.tsx   # Create form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx   # Detail view
│   │   │   │       └── edit/page.tsx
│   │   │   ├── contracts/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── edit/page.tsx
│   │   │   │       └── certificate/page.tsx
│   │   │   ├── renewals/
│   │   │   ├── assets/
│   │   │   ├── licenses/
│   │   │   ├── reports/
│   │   │   ├── audit-logs/
│   │   │   └── settings/
│   │   │       ├── users/
│   │   │       ├── vendors/
│   │   │       └── tags/
│   │   │
│   │   └── api/                   # REST API routes
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── customers/
│   │       │   ├── route.ts       # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts   # GET, PATCH, DELETE
│   │       │       └── sites/route.ts
│   │       ├── contracts/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── items/route.ts
│   │       │       ├── certificate/route.ts
│   │       │       └── clone/route.ts
│   │       ├── renewals/
│   │       ├── assets/
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── history/route.ts
│   │       │       └── qr/route.ts
│   │       ├── licenses/
│   │       ├── dashboard/route.ts
│   │       ├── search/route.ts
│   │       ├── notifications/route.ts
│   │       ├── files/
│   │       │   ├── upload/route.ts
│   │       │   └── [id]/route.ts
│   │       ├── reports/
│   │       │   ├── contracts/route.ts
│   │       │   ├── warranties/route.ts
│   │       │   └── assets/route.ts
│   │       ├── users/route.ts
│   │       ├── vendors/route.ts
│   │       └── cron/
│   │           └── notify/route.ts
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Dark sidebar navigation
│   │   │   ├── Header.tsx         # Top bar with search + notifications
│   │   │   └── Breadcrumb.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx       # KPI widget card
│   │   │   ├── ExpiryAlerts.tsx   # Expiry alert list
│   │   │   ├── ActivityFeed.tsx   # Recent activity timeline
│   │   │   └── QuickSearch.tsx    # Quick search bar
│   │   ├── data-table/
│   │   │   ├── DataTable.tsx      # TanStack Table wrapper
│   │   │   ├── DataTablePagination.tsx
│   │   │   ├── DataTableToolbar.tsx  # Filter + export buttons
│   │   │   └── DataTableColumnToggle.tsx
│   │   ├── forms/
│   │   │   ├── CustomerForm.tsx
│   │   │   ├── ContractForm.tsx
│   │   │   ├── ContractItemsForm.tsx
│   │   │   ├── AssetForm.tsx
│   │   │   └── LicenseForm.tsx
│   │   ├── contract/
│   │   │   ├── ContractStatusBadge.tsx
│   │   │   ├── ContractTimeline.tsx
│   │   │   └── CertificatePreview.tsx
│   │   ├── asset/
│   │   │   ├── AssetCard.tsx
│   │   │   ├── AssetQRCode.tsx
│   │   │   └── AssetHistoryList.tsx
│   │   ├── common/
│   │   │   ├── ExpiryBadge.tsx    # Color-coded expiry indicator
│   │   │   ├── FileUpload.tsx     # Drag-drop file upload
│   │   │   ├── GlobalSearch.tsx   # Command palette (Cmd+K)
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   └── RoleGuard.tsx      # Permission-based conditional render
│   │   └── pdf/
│   │       └── CertificateDocument.tsx  # @react-pdf/renderer template
│   │
│   ├── hooks/
│   │   ├── useCustomers.ts        # TanStack Query hooks
│   │   ├── useContracts.ts
│   │   ├── useAssets.ts
│   │   ├── useNotifications.ts
│   │   ├── useGlobalSearch.ts
│   │   └── usePermission.ts       # RBAC hook
│   │
│   ├── lib/
│   │   ├── prisma.ts              # Prisma singleton
│   │   ├── auth.ts                # NextAuth config
│   │   ├── rbac.ts                # RBAC matrix
│   │   ├── api-helpers.ts         # Response builders + guards
│   │   ├── s3.ts                  # File storage
│   │   ├── notifications.ts       # Notification job
│   │   ├── contract-number.ts     # Auto number generation
│   │   ├── search.ts              # Global search logic
│   │   └── email.ts               # Email sender
│   │
│   ├── types/
│   │   └── index.ts               # All TypeScript interfaces
│   │
│   └── utils/
│       ├── date.ts                # Date formatting helpers
│       ├── format.ts              # Currency, file size
│       ├── validators.ts          # Zod schemas
│       └── export.ts              # Excel/CSV export
│
├── scripts/
│   └── db/
│       └── init.sql               # DB init (shadow DB setup)
│
├── .env.example
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── Dockerfile.dev
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. ER Diagram (Entity Relationships)

```
USERS ──────────────────────────────────────────────────────────┐
  id, email, name, passwordHash, role, status                   │
  ↕ (created_by)                                                │
CUSTOMERS ─────────────────────────────────────────────────────┐│
  id, companyName, shortName, taxId, status, tier               ││
  ↕ (1 to many)                                                 ││
CUSTOMER_SITES                                                  ││
  id, customerId, siteName, province, isHeadOffice              ││
  ↕ (1 to many)                                                 ││
CONTRACTS ──────────────────────────────────────────────────────┤│
  id, contractNo, customerId, siteId, vendorId                  ││
  startDate, endDate, slaType, supportType, status              ││
  ↕ (1 to many)                                 ↕ (versioning)  ││
CONTRACT_ITEMS          CONTRACT_RENEWALS       CONTRACTS       ││
  id, contractId         id, contractId         (parent)        ││
  itemType (ENUM)        renewalNo, status                      ││
  serialNumber (NULL)    startDate, endDate                     ││
  quantity (NULL)                                               ││
                                                                ││
ASSETS ─────────────────────────────────────────────────────────┘│
  id, assetCode, brand, model, serialNumber (NULL)               │
  assetType, customerId, siteId, engineerOwnerId ────────────────┘
  warrantyStart, warrantyEnd, lifecycleStatus
  ↕ (1 to many)
ASSET_HISTORIES
  id, assetId, event, performedBy, oldValue, newValue

LICENSES
  id, licenseName, quantity, unit
  startDate, endDate, customerId, siteId, renewalStatus

VENDORS
  id, name, shortName, country, supportPortal

ATTACHMENTS (polymorphic)
  id, entityType, entityId, s3Key, fileName, mimeType

AUDIT_LOGS
  id, userId, action, entityType, entityId, oldValues, newValues

NOTIFICATIONS
  id, userId, type, status, entityType, entityId, daysUntil

TAGS ← ASSET_TAGS → ASSETS
TAGS ← CUSTOMER_TAGS → CUSTOMERS
```

---

## 4. API Endpoint Design

### Authentication
```
POST   /api/auth/signin          Login (returns JWT session cookie)
POST   /api/auth/signout         Logout
GET    /api/auth/session         Current session
```

### Customers
```
GET    /api/customers            List (paginated, filtered)
POST   /api/customers            Create
GET    /api/customers/:id        Get by ID (with sites, contracts count)
PATCH  /api/customers/:id        Update
DELETE /api/customers/:id        Soft delete
GET    /api/customers/:id/sites  List sites
POST   /api/customers/:id/sites  Create site
```

### Contracts
```
GET    /api/contracts            List (filter: status, customerId, expiring)
POST   /api/contracts            Create (auto-generates contract no)
GET    /api/contracts/:id        Get with items, renewals
PATCH  /api/contracts/:id        Update
DELETE /api/contracts/:id        Soft delete
POST   /api/contracts/:id/clone  Clone for renewal
GET    /api/contracts/:id/items  List items
POST   /api/contracts/:id/items  Add item
PATCH  /api/contracts/:id/items/:itemId  Update item
DELETE /api/contracts/:id/items/:itemId  Remove item
GET    /api/contracts/:id/certificate    Generate certificate PDF
```

### Renewals
```
GET    /api/renewals             List (filter: status, contractId)
POST   /api/renewals             Create renewal
GET    /api/renewals/:id         Get by ID
PATCH  /api/renewals/:id         Update
DELETE /api/renewals/:id         Soft delete
```

### Assets
```
GET    /api/assets               List (filter: type, customerId, expiring)
POST   /api/assets               Create (auto-generates asset code)
GET    /api/assets/:id           Get with history
PATCH  /api/assets/:id           Update
DELETE /api/assets/:id           Soft delete
GET    /api/assets/:id/history   Asset event history
POST   /api/assets/:id/history   Add history event
GET    /api/assets/:id/qr        Get QR code image
```

### Licenses
```
GET    /api/licenses             List
POST   /api/licenses             Create
GET    /api/licenses/:id         Get
PATCH  /api/licenses/:id         Update
DELETE /api/licenses/:id         Soft delete
```

### Dashboard & Search
```
GET    /api/dashboard            Stats + expiry alerts
GET    /api/search?q=            Global search (all entities)
GET    /api/notifications        User notifications
PATCH  /api/notifications/:id    Mark as read
DELETE /api/notifications/all    Mark all as read
```

### Files
```
POST   /api/files/upload         Upload file to S3
GET    /api/files/:id            Get download URL (pre-signed)
DELETE /api/files/:id            Delete file
```

### Reports
```
GET    /api/reports/contracts    Contract expiration report (xlsx/csv/pdf)
GET    /api/reports/warranties   Warranty report
GET    /api/reports/assets       Asset inventory
GET    /api/reports/licenses     License usage
```

### Admin
```
GET    /api/users                List users
POST   /api/users                Create user
PATCH  /api/users/:id            Update user (role, status)
DELETE /api/users/:id            Deactivate
GET    /api/vendors              List vendors
POST   /api/vendors              Create vendor
GET    /api/audit-logs           Audit trail (admin only)
POST   /api/cron/notify          Run notification job (cron/internal)
```

---

## 5. Authentication Flow

```
1. User submits credentials → POST /api/auth/signin
2. NextAuth validates via Credentials provider
   a. Find user by email (not deleted, status=ACTIVE)
   b. bcrypt.compare(password, passwordHash)
   c. If valid → return user object with role
3. NextAuth creates JWT session:
   { sub: userId, email, name, role }
4. Session cookie set (httpOnly, secure, sameSite=lax)
5. Middleware reads session on every request
6. JWT decoded → role checked against route permissions
7. On 401 → redirect to /login with callbackUrl
8. On 403 → redirect to /unauthorized
```

---

## 6. Database Index Strategy

```sql
-- High-frequency search fields
CREATE INDEX idx_contracts_contract_no ON contracts(contract_no);
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_deleted_at ON contracts(deleted_at);

-- Partial index for active contracts (most common query)
CREATE INDEX idx_contracts_active ON contracts(end_date, customer_id)
  WHERE deleted_at IS NULL AND status = 'ACTIVE';

-- Assets
CREATE INDEX idx_assets_serial_number ON assets(serial_number);
CREATE INDEX idx_assets_customer_id ON assets(customer_id);
CREATE INDEX idx_assets_warranty_end ON assets(warranty_end);
CREATE INDEX idx_assets_deleted_at ON assets(deleted_at);

-- Full-text search
CREATE INDEX idx_customers_fts ON customers
  USING gin(to_tsvector('english', company_name || ' ' || COALESCE(short_name, '')));

-- Notifications (frequent reads by userId+status)
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);

-- Audit logs (range queries by date)
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

---

## 7. Global Search Architecture

```typescript
// Search strategy: search key tables in parallel

const searchResults = await Promise.all([
  // 1. Contracts (by contractNo, soNo, poNo)
  prisma.contract.findMany({
    where: {
      OR: [
        { contractNo: { contains: q, mode: 'insensitive' } },
        { soNo: { contains: q, mode: 'insensitive' } },
        { poNo: { contains: q, mode: 'insensitive' } },
      ],
      deletedAt: null,
    },
    take: 5,
  }),

  // 2. Customers (by companyName, shortName, taxId)
  prisma.customer.findMany({
    where: {
      OR: [
        { companyName: { contains: q, mode: 'insensitive' } },
        { shortName: { contains: q, mode: 'insensitive' } },
        { taxId: { contains: q, mode: 'insensitive' } },
      ],
      deletedAt: null,
    },
    take: 5,
  }),

  // 3. Assets (by serialNumber, assetCode, model)
  prisma.asset.findMany({
    where: {
      OR: [
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { assetCode: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ],
      deletedAt: null,
    },
    take: 5,
  }),

  // 4. Contract Items (by serialNumber, partNumber)
  prisma.contractItem.findMany({
    where: {
      OR: [
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { partNumber: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 5,
    include: { contract: { select: { contractNo: true, customerId: true } } },
  }),
]);
```

---

## 8. Certificate Generator Architecture

```
User clicks "Generate Certificate"
→ GET /api/contracts/:id/certificate
→ Fetch full contract data + items + customer + site
→ Build CertificateData object
→ React PDF renders CertificateDocument component
→ Stream PDF buffer as response
→ Browser downloads "Certificate_iTAS-MA260001.pdf"

CertificateDocument features:
- Company logo (top left)
- Document title "CERTIFICATION OF MAINTENANCE SERVICE"
- Customer info block
- Items table (supports hardware + licenses with optional S/N)
- SLA & support type
- Service period
- Signature area
- Page number + print date
```

---

## 9. Notification Architecture

```
CRON JOB (Daily 08:00 via /api/cron/notify):
├── Check contracts ending in 30/60/90 days → create notifications
├── Check asset warranties ending in 30/60/90 days → create notifications
├── Check licenses ending in 30/60/90 days → create notifications
├── Update license.renewalStatus based on endDate
└── (Optional) Send email via Nodemailer/Resend

IN-APP NOTIFICATIONS:
├── NotificationBell component polls GET /api/notifications
├── Badge shows unread count
├── Dropdown shows recent 10 notifications
└── "Mark all read" clears badge

EMAIL NOTIFICATIONS:
├── HTML email template (Handlebars/React Email)
├── List of expiring items with links
└── Sent once per threshold (30/60/90 days)
```

---

## 10. Security Implementation

```
Authentication:   NextAuth.js v5 (JWT strategy, httpOnly cookies)
Password:         bcrypt (12 rounds)
RBAC:             Permission matrix per role, checked in middleware + API routes
Input Validation: Zod schemas on all API inputs
SQL Injection:    Protected by Prisma ORM (parameterized queries)
XSS:              Next.js escapes by default; CSP headers in next.config
CSRF:             Next.js built-in CSRF protection for API routes
Rate Limiting:    Middleware with Redis counter (per IP)
File Upload:      MIME type + size validation before S3 upload
Audit Trail:      All mutations logged with user, IP, before/after values
Soft Delete:      Records never permanently deleted from DB
Secret Keys:      Environment variables (never committed)
HTTPS:            Enforced via Traefik redirect
```

---

## 11. Performance Optimization

```
Database:
  - Indexed all high-frequency filter/search columns
  - Partial indexes for active-only queries (skip soft-deleted)
  - Paginated all list endpoints (default 20/page, max 100)
  - Select only needed columns in includes

Frontend:
  - TanStack Query (React Query) for data fetching + caching
  - Server Components for initial page load (no JS hydration)
  - Client Components only where interactivity required
  - Lazy loaded heavy components (PDF preview, chart)
  - Table virtualization for large datasets (TanStack Virtual)

Caching:
  - Redis for notification count cache (TTL: 60s)
  - Next.js built-in fetch cache for static lookups (vendors, tags)
  - Pre-signed S3 URLs cached for 1 hour

Search:
  - Debounced search input (300ms)
  - Paginated results
  - Result caching with query key
```

---

## 12. Docker Production Setup

```yaml
Services:
  traefik      → SSL termination, auto Let's Encrypt, port 80/443
  app          → Next.js (port 3000, internal only)
  postgres     → PostgreSQL 16 (internal only, not exposed)
  minio        → S3 storage (internal API, optional console)
  redis        → Cache + rate limiting (internal only)

Network:
  internal     → postgres, redis, minio, app (no external access)
  external     → traefik, app (internet-facing)

Volumes:
  postgres_data  → Persistent DB storage
  minio_data     → File storage
  redis_data     → Cache persistence
  letsencrypt    → SSL certificates
```

---

## 13. Production Best Practices

```
Code Quality:
  ✓ TypeScript strict mode (no any)
  ✓ Zod validation on all API inputs + form fields
  ✓ SOLID principles — services separated from routes
  ✓ Error boundaries on all pages
  ✓ Consistent API response format {success, data, error}

Database:
  ✓ All relations properly indexed
  ✓ Soft delete on all core entities
  ✓ Transactions for compound writes (contract + items)
  ✓ Audit log on all mutations

Security:
  ✓ Never expose passwordHash in API responses
  ✓ License keys encrypted at rest
  ✓ Pre-signed URLs for file access (no public S3)
  ✓ Rate limiting on auth endpoints

Operations:
  ✓ Docker health checks on all services
  ✓ Graceful shutdown handling
  ✓ Database migrations versioned (Prisma migrate)
  ✓ Seed data for quick environment setup
  ✓ Environment variables documented in .env.example

Monitoring:
  ✓ Structured JSON logging (production)
  ✓ Audit log for security events
  ✓ Health endpoint at /api/health
```
