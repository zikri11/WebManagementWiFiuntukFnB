# 📡 WiFi Management System untuk FnB
## Voucher Hotspot MikroTik — Terintegrasi POS + AI Analisis Konfigurasi

---

## 🎯 Tujuan Proyek

Proyek ini bertujuan membangun **sistem manajemen WiFi berbasis web** yang dirancang khusus untuk bisnis **Food & Beverage (FnB)** seperti kafe, restoran, kedai kopi, dan outlet sejenis yang menyediakan akses internet kepada pelanggan melalui sistem voucher hotspot MikroTik.

Sistem ini dikembangkan sebagai alternatif modern dari tools seperti Mikhmon, dengan penambahan fitur-fitur unggulan:

- **Multi-router support** — mengelola lebih dari satu perangkat MikroTik dari satu panel terpusat.
- **Integrasi POS** — voucher WiFi otomatis dibuat saat kasir menyelesaikan transaksi.
- **Cetak Voucher di Struk** — voucher langsung muncul di struk belanja pelanggan.
- **AI Analysis** — sistem membaca dan menganalisis konfigurasi hotspot MikroTik, lalu memberikan diagnosis dan rekomendasi perbaikan secara otomatis.
- **Monitoring Real-time** — melihat user hotspot aktif dan traffic per outlet.

---

## 🏁 Target MVP

Target akhir MVP adalah sistem demo yang mampu:

1. Berjalan di satu server lokal atau cloud.
2. Mengelola **minimal satu router MikroTik** via API.
3. Menghasilkan voucher dari panel admin maupun dari endpoint POS.
4. Menampilkan laporan AI berdasarkan konfigurasi hotspot yang ditarik langsung dari router.
5. Memonitor user aktif secara real-time.

---

## 👥 Target Pengguna

| Peran | Akses | Tugas |
|---|---|---|
| **Owner / IT FnB** | Panel Admin Web | Setup router, buat voucher, baca laporan AI, monitoring |
| **Kasir** | POS (tanpa login panel) | Transaksi seperti biasa, voucher otomatis dibuat |
| **Pelanggan** | Struk belanja | Menerima voucher WiFi untuk login ke hotspot |

---

## ✅ Fitur dalam Scope MVP

| No | Fitur | Status |
|---|---|---|
| 1 | Login admin | MVP |
| 2 | CRUD server MikroTik | MVP |
| 3 | Test koneksi ke router | MVP |
| 4 | Manajemen hotspot user profile | MVP |
| 5 | Generate voucher single | MVP |
| 6 | Generate voucher batch | MVP |
| 7 | Cetak voucher PDF | MVP |
| 8 | Endpoint integrasi POS | MVP |
| 9 | Monitoring user hotspot aktif | MVP |
| 10 | Log aktivitas sistem | MVP |
| 11 | AI analysis konfigurasi hotspot | MVP |
| 12 | Dashboard ringkas per outlet/server | MVP |

---

## ❌ Fitur di Luar Scope MVP

Fitur berikut direncanakan untuk pengembangan lanjutan setelah MVP selesai:

- Captive portal custom per outlet.
- Voucher dengan QR Code.
- Validity voucher berdasarkan tanggal tertentu.
- Forecast pemakaian voucher mingguan.
- Auto-fix konfigurasi MikroTik.
- Multi-tenant untuk banyak franchise.
- Advanced analytics traffic pelanggan.
- Role permission kompleks untuk banyak tipe user.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN PANEL (Web)                    │
│               Next.js + Tailwind + shadcn/ui            │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / REST API
┌───────────────────────▼─────────────────────────────────┐
│                    BACKEND API                          │
│                NestJS + Prisma + JWT                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Auth     │  │ MikroTik │  │ Voucher  │  │ AI/LLM │  │
│  │ Module   │  │ Module   │  │ Module   │  │ Module │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ POS      │  │ Monitor  │  │    Queue Worker       │  │
│  │ Module   │  │ Module   │  │    (BullMQ + Redis)   │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼────────────────┐
          │             │                │
┌─────────▼──┐  ┌───────▼───┐  ┌────────▼──────┐
│ PostgreSQL │  │   Redis   │  │ MikroTik API  │
│  Database  │  │  Cache +  │  │  (Port 8728 / │
│            │  │  Queue    │  │   8729 SSL)   │
└────────────┘  └───────────┘  └───────────────┘
```

---

## 📁 Struktur Direktori Proyek

```
/
├── frontend/          # Next.js Admin Panel
├── backend/           # NestJS API Server
├── docs/              # Dokumentasi tambahan
├── docker/            # Docker & docker-compose config
├── PROJECT.md         # File ini — tujuan dan scope proyek
└── DOKUMENTASI.md     # Tech stack, tools, dan panduan setup
```

---

## 📅 Informasi Proyek

| Item | Detail |
|---|---|
| **Tipe Proyek** | Magang / KP (Kerja Praktek) |
| **Jenis Aplikasi** | Web-based Management System |
| **Target Awal** | Demo MVP pada 1 server lokal |
| **Integrasi Utama** | MikroTik RouterOS API, LLM AI, POS System |
