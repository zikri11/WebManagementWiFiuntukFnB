import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Prisma 7: Driver Adapter wajib untuk PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin Default ────────────────────────────────────────────────────────
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: 'admin@wifimanagement.local' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@wifimanagement.local',
        password: hashedPassword,
        name: 'Super Admin',
        isActive: true,
      },
    });
    console.log(`✅ Admin dibuat: ${admin.email}`);
    console.log(`   Password default: admin123 (GANTI SEGERA!)`);
  } else {
    console.log(`ℹ️  Admin sudah ada: ${existingAdmin.email}`);
  }

  console.log('\n✨ Seeding selesai!');
  console.log('\n📌 Login credentials:');
  console.log('   Email   : admin@wifimanagement.local');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
