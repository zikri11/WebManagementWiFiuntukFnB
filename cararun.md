🚀 Cara Menjalankan Proyek
Langkah 1 — Jalankan Docker (PostgreSQL + Redis)
Buka terminal di root folder proyek:

powershell
# Di folder: d:\MAGANG-KP\PROJEK\DEMO\DEMO
docker-compose up -d
Ini akan menjalankan:

🗄️ PostgreSQL di port 5433
⚡ Redis di port 6379
Langkah 2 — Jalankan Backend (NestJS)
powershell
# Masuk ke folder backend
cd d:\MAGANG-KP\PROJEK\DEMO\DEMO\backend
# Install dependencies (jika belum)
npm install
# Jalankan migrasi database Prisma
npm run db:migrate
# Jalankan backend dev server
npm run start:dev
Backend akan berjalan di: http://localhost:4000
Swagger docs: http://localhost:4000/api

Langkah 3 — Jalankan Frontend (Next.js)
Buka terminal baru (jangan tutup terminal backend):

powershell
# Masuk ke folder frontend
cd d:\MAGANG-KP\PROJEK\DEMO\DEMO\frontend
# Install dependencies (jika belum)
pnpm install   # atau npm install
# Jalankan frontend dev server
pnpm dev   # atau npm run dev
Frontend akan berjalan di: http://localhost:3000
🔑 Akun Login Default
Field	Value
Email	[EMAIL_ADDRESS]
Password	admin123