Fase 1 — Infrastruktur & Foundation
  ├── Init project NestJS (nest new backend)
  ├── Setup Prisma + schema database lengkap
  ├── Jalankan docker-compose (PostgreSQL + Redis)
  └── Setup Swagger + konfigurasi dasar app

Fase 2 — Auth
  ├── Register/Login endpoint
  ├── JWT Strategy + Guard
  └── Hash password (bcrypt)

Fase 3 — MikroTik Module
  ├── Implementasi MikrotikService (koneksi RouterOS API)
  ├── CRUD server MikroTik
  └── Endpoint test-connection

Fase 4 — Profile & Voucher
  ├── Hotspot profile CRUD
  ├── Generate voucher single
  ├── Generate voucher batch (BullMQ queue)
  └── Generate PDF (PDFKit)

Fase 5 — POS + Monitoring
  ├── Endpoint POST /pos/transactions
  └── GET active users dari router

Fase 6 — Init Frontend
  ├── Init Next.js project
  ├── Setup Tailwind 4 + shadcn/ui
  ├── Layout dashboard + routing
  └── Halaman login + auth flow

Fase 7 — Connect Frontend ke Backend
  ├── Setup Axios client + TanStack Query
  ├── Sambungkan semua halaman ke API
  └── UI monitoring real-time

Fase 8 — AI Module
  └── Implementasi saat API key tersedia
