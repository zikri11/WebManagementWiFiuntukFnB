# Dokumentasi Teknis Tambahan

Direktori ini menyimpan dokumentasi teknis di luar `PROJECT.md` dan `DOKUMENTASI.md`.

## Struktur

| Folder | Isi |
|---|---|
| `api-spec/` | Export Swagger/OpenAPI JSON (auto-generated dari backend) |
| `diagrams/` | Diagram arsitektur, ERD database, flow diagram |
| `mikrotik/` | Panduan aktivasi API MikroTik, contoh command RouterOS |
| `pos-integration/` | Panduan integrasi POS, contoh request & response payload |
| `ai-prompts/` | Template system prompt untuk AI analysis konfigurasi hotspot |

## Cara Export Swagger

Setelah backend berjalan, export OpenAPI spec dengan:

```bash
curl http://localhost:4000/api/docs-json -o docs/api-spec/openapi.json
```

Atau buka langsung di browser: http://localhost:4000/api/docs
