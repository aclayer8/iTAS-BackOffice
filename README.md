# iTAS BackOffice System

> **Enterprise IT Asset & Maintenance Contract Management Platform**
> Built for IT System Integrators | Production-Ready | Next.js 15 + PostgreSQL + Prisma

---

## Overview

The **iTAS BackOffice System** is a centralized internal management platform for IT System Integrator companies. It replaces spreadsheet-based workflows with a professional enterprise web application supporting:

- Maintenance Contract (MA) lifecycle management
- Serial number and IT asset tracking
- Warranty monitoring and alerts
- License & subscription management
- Customer & multi-site management
- Certificate document generation
- Renewal pipeline tracking

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui |
| State / Tables | TanStack Table v8, Zustand |
| Forms | React Hook Form + Zod |
| Backend | Next.js API Routes (REST) |
| Auth | NextAuth.js v5 + JWT |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Storage | S3-compatible (MinIO / AWS S3) |
| PDF Gen | @react-pdf/renderer |
| QR Code | qrcode.js |
| Email | Nodemailer / Resend |
| Containerization | Docker + Docker Compose |

---

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clone & Install
```bash
git clone https://github.com/your-org/itas-backoffice.git
cd itas-backoffice
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Start Services
```bash
docker-compose up -d  # Starts PostgreSQL + MinIO
```

### 4. Database Setup
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### Default Admin Credentials
```
Email:    admin@itas.co.th
Password: Admin@1234!
```

---

## Production Deployment

### Docker (Self-Hosted VPS)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel (Frontend) + External PostgreSQL
```bash
vercel deploy --prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production guide.

---

## Project Structure

```
iTAS-BackOffice/
├── prisma/                     # Database schema & migrations
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   ├── components/             # Reusable UI components
│   ├── lib/                    # Utilities, auth, prisma client
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Helper functions
├── public/                     # Static assets
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## Modules

| # | Module | Description |
|---|---|---|
| 1 | Authentication & RBAC | JWT auth, role-based access (Admin/Sale/Engineer/Viewer) |
| 2 | Dashboard | KPI widgets, expiry alerts, activity feed |
| 3 | Customer Management | Company profiles, contacts, billing info |
| 4 | Site Management | Multi-site per customer with contacts |
| 5 | Contract Management | MA contracts with auto-generated contract numbers |
| 6 | Contract Renewals | Renewal pipeline and clone workflow |
| 7 | Asset Management | Hardware assets with serial numbers |
| 8 | Warranty Tracking | Warranty monitoring with expiry alerts |
| 9 | License Management | Software licenses and subscriptions |
| 10 | Certificate Generator | PDF certificate generation with corporate branding |
| 11 | File Attachments | S3-backed file storage for contracts, assets, licenses |
| 12 | Audit Logs | Full audit trail with before/after values |
| 13 | Reports | Excel/CSV/PDF exports |
| 14 | Notifications | In-app + email expiry alerts |
| 15 | QR Code Tracking | QR codes for assets and contracts |
| 16 | Global Search | Cross-entity search by serial, contract no, customer |
| 17 | Activity Timeline | Per-entity activity history |

---

## License

Proprietary — iTAS Internal Use Only
