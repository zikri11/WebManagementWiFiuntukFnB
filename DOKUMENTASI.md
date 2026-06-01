# 📚 Dokumentasi Teknis
## WiFi Management System — FnB Hotspot MikroTik

---

## 🧱 Tech Stack

### Frontend

| Teknologi | Versi | Fungsi |
|---|---|---|
| **Next.js** | **16.x** | Framework React untuk SSR & SPA Admin Panel |
| **React** | **19.x** | Library UI utama |
| **Tailwind CSS** | **4.x** | Utility-first CSS framework |
| **shadcn/ui** | **CLI 4.x / latest** | Komponen UI berbasis Radix + Tailwind |
| **React Hook Form** | **7.x latest** | Manajemen form yang efisien |
| **Zod** | **4.x** | Validasi schema form (type-safe) |
| **TanStack Query** | **5.x latest** | Data fetching, caching, dan sinkronisasi server state |
| **Zustand** | **5.x latest** | Global state management (auth token, session, UI state) |
| **Axios** | **1.x latest** | HTTP client untuk request ke backend |
| **Lucide React** | **1.x latest** | Icon library |
| **next-themes** | **0.4.x latest** | Dark/Light mode support |
| **react-pdf** | **10.x latest** | Preview PDF voucher di browser |
| **pdfmake** | **0.3.x latest** | Generate PDF di sisi client (opsional) |
| **TypeScript** | **6.x** | Superset JavaScript untuk type safety |

> **Catatan State Management:**
> - **TanStack Query** → mengelola server state (data dari API, caching, refetch)
> - **Zustand** → mengelola client state (auth token, user session, sidebar state, UI preferences)
> - Keduanya saling melengkapi, tidak tumpang tindih

---

### Backend

| Teknologi | Versi | Fungsi |
|---|---|---|
| **NestJS** | **11.x** | Framework Node.js modular + TypeScript |
| **Prisma ORM** | **7.x** | ORM untuk PostgreSQL (type-safe, auto-migration) |
| **PostgreSQL** | **18.x** | Database relasional utama |
| **Redis** | **8.x** | Cache + backend queue untuk BullMQ |
| **BullMQ** | **5.x latest** | Queue worker untuk proses async (batch voucher, PDF, AI) |
| **jsonwebtoken** | **9.x latest** | JWT token generation & verification |
| **Passport.js** | **0.7.x latest** | Strategy middleware autentikasi NestJS |
| **bcrypt** | **6.x latest** | Hashing password admin |
| **class-validator** | **0.15.x latest** | Validasi DTO di NestJS |
| **class-transformer** | **0.5.x latest** | Serialisasi/deserialisasi objek |
| **PDFKit** | **0.18.x latest** | Generate PDF voucher di server |
| **@nestjs/swagger** | **8.x latest** | Auto-generate Swagger/OpenAPI docs dari dekorator |
| **TypeScript** | **6.x** | Bahasa utama backend |

---

### Integrasi MikroTik

| Teknologi | Fungsi |
|---|---|
| **node-routeros** / **routeros-client** | Library komunikasi ke RouterOS API |
| **RouterOS REST API** | Alternatif untuk router dengan RouterOS 7.x ke atas |

> **Catatan Port MikroTik:**
> - Port API default: `8728`
> - Port API SSL: `8729`
> - Pastikan API service aktif di router: `IP → Services → api`
>
> **Module MikroTik di Backend:**
> MikroTik API client dipisahkan sebagai **module tersendiri** (`MikrotikModule`) di dalam NestJS.
> Module ini meng-export `MikrotikService` yang dapat di-inject ke module lain (servers, vouchers, monitoring, ai).
> Pemisahan ini memudahkan unit testing dengan cara me-mock `MikrotikService` tanpa perlu koneksi router sungguhan.

---

### AI / LLM Integration

| Provider | Keterangan |
|---|---|
| **OpenAI API** | Pilihan utama (GPT-4o / GPT-4.1) — butuh API key |
| **Anthropic Claude API** | Alternatif, kualitas reasoning tinggi |
| **Google Gemini API** | Alternatif dengan tier gratis tersedia |

> **Status LLM untuk MVP:**
> Folder dan skeleton module AI sudah disiapkan (`AiModule`, `AiService`, `AiController`).
> Provider LLM akan dikonfigurasi via environment variable (`LLM_PROVIDER`).
> Koneksi ke API LLM eksternal akan diimplementasikan saat API key sudah tersedia.

```
backend/src/modules/ai/
├── ai.module.ts
├── ai.controller.ts
├── ai.service.ts
├── dto/
│   ├── analyze-server.dto.ts
│   └── ai-report.dto.ts
└── providers/
    ├── llm-provider.interface.ts   ← Interface abstraksi provider
    ├── openai.provider.ts          ← Skeleton (siap diisi)
    ├── anthropic.provider.ts       ← Skeleton (siap diisi)
    └── gemini.provider.ts          ← Skeleton (siap diisi)
```

---

### DevOps & Tooling

| Teknologi | Versi | Fungsi |
|---|---|---|
| **Docker** | 24.x+ | Containerisasi service (DB, Redis) |
| **Docker Compose** | 2.x+ | Orkestrasi multi-container |
| **pnpm** | 9.x+ | Package manager — lebih cepat dari npm/yarn |
| **ESLint** | Latest | Linting kode TypeScript |
| **Prettier** | Latest | Code formatter otomatis |
| **Git** | Latest | Version control |

---

## 🗄️ Skema Database (Overview)

```
admins              → Data login admin (email, password hash, name)
mikrotik_servers    → Data router MikroTik (host, port, credential, status)
hotspot_profiles    → Profile bandwidth/durasi voucher
vouchers            → Voucher yang sudah dibuat (username, password, status)
pos_transactions    → Log transaksi dari POS beserta voucher yang dibuat
activity_logs       → Log semua aktivitas sistem
ai_reports          → Hasil analisis AI per server MikroTik
```

---

## 📖 API Documentation (Swagger)

Backend menggunakan `@nestjs/swagger` untuk auto-generate dokumentasi API.

| Akses | URL |
|---|---|
| **Swagger UI** | http://localhost:4000/api/docs |
| **OpenAPI JSON** | http://localhost:4000/api/docs-json |

Setiap endpoint, DTO, dan response di-annotate dengan dekorator Swagger (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`), sehingga dokumentasi selalu sinkron dengan kode.

---

## 🔌 API Endpoint (Ringkasan)

### Authentication
```
POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

### MikroTik Server
```
GET    /servers
POST   /servers
GET    /servers/:id
PATCH  /servers/:id
DELETE /servers/:id
POST   /servers/:id/test-connection
```

### Hotspot Profile
```
GET    /profiles
POST   /profiles
GET    /profiles/:id
PATCH  /profiles/:id
DELETE /profiles/:id
POST   /profiles/sync-from-router
```

### Voucher
```
GET    /vouchers
POST   /vouchers/single
POST   /vouchers/batch
GET    /vouchers/:id
GET    /vouchers/:id/pdf
POST   /vouchers/:id/revoke
```

### POS Integration
```
POST   /pos/transactions
GET    /pos/logs
POST   /pos/simulate
```

### Monitoring
```
GET    /monitoring/servers/:id/active-users
GET    /monitoring/summary
```

### AI Analysis
```
POST   /ai/servers/:id/analyze
GET    /ai/reports
GET    /ai/reports/:id
```

### Activity Log
```
GET    /logs
```

---

## 🚀 Panduan Setup Development

### Prasyarat

Pastikan semua tools berikut sudah terinstall:

```bash
node     >= 22.x   (LTS terbaru, kompatibel dengan Next.js 16 & NestJS 11)
pnpm     >= 9.x
docker   >= 24.x
docker-compose >= 2.x
git
```

### 1. Clone Repositori

```bash
git clone <repo-url>
cd wifi-management
```

### 2. Jalankan Service Database & Redis

```bash
docker-compose up -d
# Tunggu hingga healthcheck postgres & redis HEALTHY
docker-compose ps
```

### 3. Setup Backend

```bash
cd backend
pnpm install
cp .env.example .env       # Isi variabel environment
pnpm prisma migrate dev    # Jalankan migrasi database
pnpm prisma db seed        # (Opsional) Isi data admin awal
pnpm run start:dev         # Jalankan development server
```

### 4. Setup Frontend

```bash
cd frontend
pnpm install
cp .env.local.example .env.local   # Isi NEXT_PUBLIC_API_URL
pnpm run dev                        # Jalankan development server
```

### 5. Akses Aplikasi

| Service | URL |
|---|---|
| Frontend Admin Panel | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Swagger API Docs | http://localhost:4000/api/docs |
| Bull Board (Queue Monitor) | http://localhost:4000/bull-board |

---

## 🔐 Environment Variables

### Backend (`.env`)

```env
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="postgresql://postgres:password@localhost:5432/wifi_mgmt_db"

# ===========================================
# REDIS
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379

# ===========================================
# JWT
# ===========================================
JWT_SECRET=ganti_dengan_secret_key_yang_panjang_dan_aman
JWT_EXPIRES_IN=7d

# ===========================================
# AI / LLM (Isi saat API key tersedia)
# ===========================================
# Pilihan: openai | anthropic | gemini
LLM_PROVIDER=openai

# OpenAI (isi jika LLM_PROVIDER=openai)
OPENAI_API_KEY=

# Anthropic Claude (isi jika LLM_PROVIDER=anthropic)
ANTHROPIC_API_KEY=

# Google Gemini (isi jika LLM_PROVIDER=gemini)
GEMINI_API_KEY=

# ===========================================
# APP
# ===========================================
PORT=4000
NODE_ENV=development
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 📋 Catatan Penting & Keputusan Teknis

### State Management: Zustand + TanStack Query
Dua library state management digunakan dengan peran yang berbeda dan tidak tumpang tindih:
- **TanStack Query** → server state: data dari API, caching otomatis, background refetch, loading/error state.
- **Zustand** → client state: auth token, user info setelah login, pengaturan sidebar, UI preferences.

### MikroTik sebagai Module Terpisah
`MikrotikModule` adalah shared module yang mengekspos `MikrotikService`. Service ini digunakan oleh:
- `ServersModule` — test koneksi, baca info router
- `VouchersModule` — buat/hapus hotspot user
- `MonitoringModule` — ambil active users & traffic
- `AiModule` — tarik konfigurasi hotspot untuk dianalisis

Pemisahan ini memudahkan testing (mock service) dan menghindari duplikasi kode koneksi.

### Swagger Otomatis via Dekorator
Dengan `@nestjs/swagger`, dokumentasi API di-generate otomatis dari kode. Tidak perlu menulis file YAML terpisah. Setiap perubahan pada DTO atau controller langsung tercermin di Swagger UI.

### AI Module: Skeleton Siap API
AI module sudah dibuat sebagai skeleton dengan interface abstraksi provider. Saat API key tersedia, tinggal mengisi implementasi di file provider yang sudah ada tanpa perlu mengubah struktur modul.

### Kenapa NestJS 11?
NestJS 11 kompatibel penuh dengan TypeScript 6.x dan mendukung ESM module resolution yang lebih modern. Fitur modular, DI container, dan ekosistemnya sangat cocok untuk proyek berskala menengah dengan banyak integrasi.

### Kenapa Prisma 7?
Prisma 7 membawa peningkatan performa query signifikan dan kompatibilitas penuh dengan PostgreSQL 18. Type-safety end-to-end dan auto-completion pada query mempermudah pengembangan.

### Kenapa BullMQ 5?
Proses berat seperti generate 100+ voucher sekaligus atau request AI yang lambat tidak boleh memblokir HTTP request. BullMQ + Redis 8 memungkinkan background processing dengan retry otomatis dan monitoring via Bull Board.

---

## 🗓️ Roadmap Pengembangan

| Fase | Target | Keterangan |
|---|---|---|
| **Fase 1** | Infrastruktur & Auth | Setup project, Docker, DB schema, Login JWT |
| **Fase 2** | MikroTik Module | MikrotikService, CRUD server, test koneksi |
| **Fase 3** | Profile & Voucher | Hotspot profile, generate single & batch, PDF |
| **Fase 4** | POS Integration | Endpoint transaksi, response voucher otomatis |
| **Fase 5** | Monitoring | User aktif real-time, auto-refresh |
| **Fase 6** | AI Analysis | Tarik konfigurasi, kirim ke LLM API, tampilkan laporan |
| **Fase 7** | Polish & Demo | Log aktivitas, Swagger docs lengkap, UI polish |
