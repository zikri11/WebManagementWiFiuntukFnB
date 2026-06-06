# BACKEND.md — Arsitektur Backend

**Proyek:** Web Management WiFi untuk FnB (P5)
**Status dokumen:** mencerminkan kondisi kode hasil audit (in-progress).

---

## 1. Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | NestJS 11 (TypeScript, **ESM** — import pakai sufiks `.js`) |
| ORM | Prisma 7 + `@prisma/adapter-pg` (driver adapter wajib di Prisma 7) |
| Database | PostgreSQL (port `5433`, DB `wifi_mgmt_db`) |
| Queue | BullMQ + Redis (generate voucher batch) |
| Auth | JWT (`@nestjs/jwt` + passport-jwt) |
| Integrasi MikroTik | **`routeros-client`** — RouterOS **API binary** (port 8728 / 8729-TLS), mendukung **RouterOS v6 & v7** |
| PDF | `pdfkit` + `qrcode` |
| Keamanan | `helmet`, `@nestjs/throttler`, `bcrypt`, AES-256-GCM (kredensial router) |
| Dokumentasi | Swagger (`@nestjs/swagger`) di `/api/docs` |

Global prefix: **`/api`**. Validasi global via `ValidationPipe` (whitelist + transform).

---

## 2. Struktur Modul

`backend/src/modules/`:

| Modul | Fungsi |
|-------|--------|
| `auth` | Login admin (JWT), guard `JwtAuthGuard` |
| `servers` | CRUD server MikroTik, test koneksi |
| `profiles` | CRUD hotspot profile + sinkronisasi dari router |
| `vouchers` | Generate single/batch, PDF, bulk delete |
| `monitoring` | User aktif, resource, traffic (real-time via polling) |
| `ai` | Analisis konfigurasi MikroTik via LLM |
| `activity-log` | Log aktivitas (paginated) |
| `mikrotik` | Shared (`@Global`) — integrasi RouterOS binary API |
| `prisma` | Shared (`@Global`) — PrismaService |

---

## 3. Endpoint yang SUDAH ADA

> Semua terproteksi `JwtAuthGuard` kecuali ditandai **(publik)**.

### Auth — `/api/auth`
| Verb | Path | Keterangan |
|------|------|------------|
| POST | `/auth/login` | Login → JWT. Throttle **5/menit/IP** (anti brute-force) |
| GET | `/auth/me` | Profil admin aktif |

### Servers — `/api/servers`
| Verb | Path | Keterangan |
|------|------|------------|
| POST | `/servers` | Tambah router (password **dienkripsi AES**) |
| GET | `/servers` | List router (password **di-strip** dari response) |
| GET | `/servers/:id` | Detail router |
| PATCH | `/servers/:id` | Update router |
| DELETE | `/servers/:id` | Hapus router (cascade ke profile/voucher) |
| POST | `/servers/:id/test-connection` | Uji koneksi router tersimpan |
| POST | `/servers/test-connection-custom` | Uji koneksi kredensial kustom |

### Profiles — `/api/profiles`
| Verb | Path | Keterangan |
|------|------|------------|
| POST | `/profiles` | Buat profile + sync ke router |
| GET | `/profiles` | List profile |
| GET | `/profiles/:id` | Detail profile |
| PATCH | `/profiles/:id` | Update + resync |
| DELETE | `/profiles/:id` | Hapus profile |
| POST | `/profiles/sync/:serverId` | Tarik profile+voucher dari router (upsert, guard wipe, transaksi) |

### Vouchers — `/api/vouchers`
| Verb | Path | Keterangan |
|------|------|------------|
| POST | `/vouchers/single` | Generate 1 voucher (instan) |
| POST | `/vouchers/batch` | Generate batch (BullMQ background job) |
| POST | `/vouchers/delete-bulk` | Hapus massal (UNUSED) — **partial-safe** |
| GET | `/vouchers` | List voucher |
| GET | `/vouchers/:id` | Detail voucher |
| GET | `/vouchers/pdf/batch/:batchId` | PDF per batch **(publik)** |
| GET | `/vouchers/pdf/single/:id` | PDF single **(publik)** |
| GET | `/vouchers/pdf/filtered?serverId=&profileId=&status=` | PDF terfilter **(publik)** |

### Monitoring — `/api/monitoring`
| Verb | Path | Keterangan |
|------|------|------------|
| GET | `/monitoring/active/:serverId` | User hotspot aktif |
| GET | `/monitoring/resources/:serverId` | CPU/RAM/HDD/uptime |
| GET | `/monitoring/traffic/:serverId` | RX/TX per interface |

### AI — `/api/ai`
| Verb | Path | Keterangan |
|------|------|------------|
| POST | `/ai/servers/:id/analyze` | Analisis config via LLM. Throttle **10/jam/IP** |
| GET | `/ai/reports` | List laporan AI |
| GET | `/ai/reports/:id` | Detail laporan |

### Activity Log — `/api/activity-log`
| Verb | Path | Keterangan |
|------|------|------------|
| GET | `/activity-log?skip=&take=&serverId=&action=` | Log paginated + filter |

---

## 4. Integrasi MikroTik (`MikrotikService`)

- Library **`routeros-client`** (API binary), mendukung **v6 + v7**.
- Pola koneksi: **connect → write → close** per operasi (stateless).
- Patch `Channel.prototype.processPacket` menangani reply `!empty` RouterOS v7.
- Kredensial per-server diambil dari DB, **didekripsi** (AES-256-GCM) di `getServerCredentials`.
- Port default: `8728` (api) / `8729` (api-ssl bila `useSSL`).

Method utama: `connect`, `testConnection`, `getHotspotProfiles`, `getHotspotUsers`,
`getActiveUsers`, `getSystemResource`, `getInterfaces`, `getFullConfig`, `createHotspotProfile`,
`removeHotspotProfile`, `createHotspotUser`, `removeHotspotUser`,
**`removeHotspotUsersByNames`** (bulk 1-koneksi, partial-safe).

---

## 5. Skema Database (Prisma)

6 model + enum (`@@map` ke snake_case jamak, ID `cuid()`):

| Model | Tabel | Inti |
|-------|-------|------|
| `Admin` | `admins` | email unik, password bcrypt |
| `MikrotikServer` | `mikrotik_servers` | host, port, username, **password (AES)**, useSSL, lastStatus |
| `HotspotProfile` | `hotspot_profiles` | rateLimit, sessionTimeout, sharedUsers, validity · unik `[serverId,name]` |
| `Voucher` | `vouchers` | username (unik global), password, status, batchId, outletName, expiredAt |
| `AiReport` | `ai_reports` | provider, configJson, resultMd, status |
| `ActivityLog` | `activity_logs` | action(enum), entity, detail, ipAddress |

Enum: `ServerStatus`, `VoucherStatus`, `AiReportStatus`, `LogAction`.
FK `Voucher→Server`, `Voucher→Profile`, `AiReport→Server` = **onDelete Cascade**.

---

## 6. Endpoint yang HARUS DIBUAT (sesuai Project Brief)

### 6.1 POS — `POST /api/pos/v1/trigger-voucher` ❌ **BELUM ADA**

> 📄 **Spesifikasi lengkap (payload, auth API key, skema DB, alur, error, cURL, checklist):
> lihat [`doc/POS_INTEGRATION.md`](./POS_INTEGRATION.md).** Ringkasan di bawah.

Modul `pos` sebelumnya dihapus (akan dibangun ulang oleh rekan tim). Spesifikasi target:

**Tujuan:** sistem kasir (POS) memicu pembuatan voucher otomatis saat transaksi selesai →
response berisi data voucher untuk dicetak di struk.

**Proteksi:** header `x-api-key: <POS_API_KEY>` (BUKAN JWT — dipanggil mesin POS).

**Request body (usulan):**
```jsonc
{
  "transactionId": "TRX-001",   // unik, idempoten (cegah dobel voucher)
  "serverId": "cuid-server",    // router target
  "profileName": "1k",          // nama profile (bandwidth/durasi)
  "quantity": 1,                // jumlah voucher (single/batch)
  "outletName": "Kafe A",       // opsional, tampil di struk
  "customerName": "Budi"        // opsional
}
```

**Response (usulan):** array voucher `{ username, password, profileName, validity, rateLimit, loginUrl }`
untuk dicetak.

**Reuse yang sudah ada:** `VouchersService.generateSingle()` / `generateBatch()` →
`MikrotikService.createHotspotUser()`. Tambah idempotensi via `transactionId` (model
`PosTransaction` baru atau kolom penanda di Voucher).

**Catatan env:** `POS_API_KEY` (tambahkan kembali ke `.env` + `.env.example`).

### 6.2 (Opsional) Monitoring WebSocket/SSE
Monitoring kini **polling** (3-60 dtk). Brief minta "real-time" — terpenuhi via polling, namun
WebSocket/SSE = optimasi untuk target < 5 detik & kurangi beban.

---

## 7. Keamanan & Environment

**Sudah aktif:** helmet, throttler (login 5/mnt, AI 10/jam, default 100/mnt), JWT guard,
AES-256-GCM password router, bcrypt admin, `ValidationPipe` whitelist, CORS dari `FRONTEND_URL`.

**Env wajib** (`backend/.env`, lihat `.env.example`):
```
DATABASE_URL, REDIS_HOST, REDIS_PORT
JWT_SECRET            # wajib (tanpa fallback — gagal cepat bila kosong)
MIKROTIK_ENC_KEY     # wajib — 64 char hex (32 byte) untuk enkripsi kredensial
LLM_PROVIDER, OPENROUTER_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY
FRONTEND_URL, PORT
# POS_API_KEY        # tambahkan saat modul POS dibangun ulang
```

## 8. Command
```bash
cd backend
npm run start:dev      # dev (watch) → http://localhost:<PORT>/api
npm run build
npm run db:migrate     # prisma migrate dev
npm run db:seed        # admin default (admin@wifimanagement.local / admin123)
npm run db:studio
```
