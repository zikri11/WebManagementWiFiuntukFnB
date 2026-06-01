# WiFi Management System — FnB Hotspot MikroTik

> Sistem manajemen WiFi berbasis web untuk bisnis FnB dengan integrasi MikroTik, POS, dan AI Analysis.

## 📁 Struktur Proyek

```
wifi-management/
│
├── 📄 PROJECT.md              ← Tujuan & scope proyek
├── 📄 DOKUMENTASI.md          ← Tech stack, versi, setup guide, API reference
├── 📄 docker-compose.yml      ← Service PostgreSQL 18 + Redis 8
│
├── 📂 frontend/               ← Admin Panel (Next.js 16 + React 19)
│   ├── src/
│   │   ├── app/               ← Next.js App Router (halaman)
│   │   │   ├── (auth)/login/
│   │   │   └── (dashboard)/
│   │   │       ├── dashboard/
│   │   │       ├── servers/
│   │   │       ├── profiles/
│   │   │       ├── vouchers/
│   │   │       ├── pos/
│   │   │       ├── monitoring/
│   │   │       ├── ai-analysis/
│   │   │       └── logs/
│   │   ├── components/
│   │   │   ├── ui/            ← shadcn/ui components
│   │   │   ├── layout/        ← Sidebar, Navbar, Header
│   │   │   ├── forms/         ← Form components
│   │   │   └── shared/        ← Shared components
│   │   ├── hooks/             ← Custom React hooks
│   │   ├── lib/               ← Axios client, utils, helpers
│   │   ├── types/             ← TypeScript interfaces
│   │   └── store/             ← Zustand (auth, session, UI state)
│   ├── .env.local.example
│   └── README.md
│
├── 📂 backend/                ← API Server (NestJS 11 + Prisma 7)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          ← Login, JWT, Guards, Strategy
│   │   │   ├── mikrotik/      ← ★ Shared MikrotikService (Global Module)
│   │   │   ├── servers/       ← CRUD MikroTik servers
│   │   │   ├── profiles/      ← Hotspot user profiles
│   │   │   ├── vouchers/      ← Generate single & batch, PDF
│   │   │   ├── pos/           ← POS integration endpoint
│   │   │   ├── monitoring/    ← Active users real-time
│   │   │   ├── ai/            ← AI analysis + providers (skeleton)
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   └── providers/
│   │   │   │       ├── llm-provider.interface.ts
│   │   │   │       ├── openai.provider.ts     ← Skeleton ✓
│   │   │   │       ├── anthropic.provider.ts  ← Skeleton ✓
│   │   │   │       └── gemini.provider.ts     ← Skeleton ✓
│   │   │   └── logs/          ← Activity log
│   │   ├── common/            ← Guards, interceptors, decorators, filters
│   │   └── config/            ← App config (DB, Redis, JWT, AI)
│   ├── prisma/
│   │   ├── schema.prisma      ← Database schema
│   │   └── migrations/
│   ├── .env.example
│   └── README.md
│
└── 📂 docs/                   ← Dokumentasi teknis tambahan
    ├── api-spec/              ← Swagger/OpenAPI JSON export
    ├── diagrams/              ← ERD, arsitektur, flow diagram
    ├── mikrotik/              ← Panduan konfigurasi MikroTik
    ├── pos-integration/       ← Panduan & contoh payload POS
    └── ai-prompts/            ← Template system prompt AI
```

## 🛠️ Tech Stack Utama

| Layer | Teknologi | Versi |
|---|---|---|
| Frontend Framework | Next.js + React | 16.x + 19.x |
| Frontend UI | Tailwind CSS + shadcn/ui | 4.x |
| Frontend State | TanStack Query + Zustand | 5.x |
| TypeScript | TypeScript | 6.x |
| Backend Framework | NestJS | 11.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL | 18.x |
| Cache + Queue | Redis + BullMQ | 8.x + 5.x |
| API Docs | @nestjs/swagger | 8.x |

## 🚀 Quick Start

### 1. Jalankan Database & Redis
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
pnpm install
cp .env.example .env
pnpm prisma migrate dev
pnpm run start:dev
```

### 3. Setup Frontend
```bash
cd frontend
pnpm install
cp .env.local.example .env.local
pnpm run dev
```

### 4. Akses

| Service | URL |
|---|---|
| Admin Panel | http://localhost:3000 |
| API Server | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/api/docs |
| Bull Board | http://localhost:4000/bull-board |

---

> 📖 [PROJECT.md](./PROJECT.md) — Tujuan dan scope proyek
> 📚 [DOKUMENTASI.md](./DOKUMENTASI.md) — Tech stack lengkap, versi, dan panduan setup
