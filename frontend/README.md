# Frontend - WiFi Management Admin Panel
# Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4 + shadcn/ui

Direktori ini berisi source code untuk Admin Panel web-based.

## Stack
- Next.js 16 (App Router) + React 19
- TypeScript 6.x
- Tailwind CSS 4.x
- shadcn/ui (CLI 4.x / latest)
- TanStack Query 5.x (server state — data API)
- Zustand 5.x (client state — auth, session, UI)
- React Hook Form 7.x + Zod 4.x (form & validasi)
- Axios 1.x (HTTP client)
- Lucide React 1.x (icons)
- next-themes 0.4.x (dark/light mode)
- react-pdf 10.x / pdfmake 0.3.x (preview & cetak voucher)

## Jalankan Development
```bash
pnpm install
cp .env.local.example .env.local
pnpm run dev
```

Akses: http://localhost:3000

## Halaman (App Router)
```
src/app/
├── (auth)/
│   └── login/
├── (dashboard)/
│   ├── dashboard/
│   ├── servers/
│   ├── profiles/
│   ├── vouchers/
│   ├── pos/
│   ├── monitoring/
│   ├── ai-analysis/
│   └── logs/
```
