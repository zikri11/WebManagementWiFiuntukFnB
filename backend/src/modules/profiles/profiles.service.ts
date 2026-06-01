/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MikrotikService } from '../mikrotik/mikrotik.service.js';
import { CreateProfileDto } from './dto/create-profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikService: MikrotikService,
  ) {}

  async create(createProfileDto: CreateProfileDto) {
    const {
      serverId,
      name,
      rateLimit,
      sessionTimeout,
      idleTimeout,
      sharedUsers,
      validity,
      description,
    } = createProfileDto;

    // Check if server exists
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(
        `Router dengan ID ${serverId} tidak ditemukan`,
      );
    }

    // Check unique name on this server
    const existing = await this.prisma.hotspotProfile.findUnique({
      where: {
        serverId_name: { serverId, name },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Profil dengan nama "${name}" sudah terdaftar pada router ini`,
      );
    }

    let syncedToRouter = false;
    try {
      // 1. Daftarkan di MikroTik CHR asli
      await this.mikrotikService.createHotspotProfile(
        serverId,
        name,
        rateLimit,
        sessionTimeout,
        idleTimeout,
        sharedUsers,
      );
      syncedToRouter = true;
    } catch (error: any) {
      // Kita log error tapi tetap simpan di DB sebagai syncedToRouter = false
      console.warn(
        `Gagal sinkronisasi profil "${name}" ke MikroTik:`,
        error.message || error,
      );
    }

    // 2. Simpan di Database
    return this.prisma.hotspotProfile.create({
      data: {
        serverId,
        name,
        rateLimit,
        sessionTimeout,
        idleTimeout,
        sharedUsers,
        validity,
        description,
        syncedToRouter,
      },
    });
  }

  async findAll() {
    return this.prisma.hotspotProfile.findMany({
      include: { server: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.hotspotProfile.findUnique({
      where: { id },
      include: { server: true },
    });
    if (!profile) {
      throw new NotFoundException(
        `Profil Hotspot dengan ID ${id} tidak ditemukan`,
      );
    }
    return profile;
  }

  async update(id: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.findOne(id);
    const { name, rateLimit, sessionTimeout, idleTimeout, sharedUsers } =
      updateProfileDto;

    // Jika ganti nama, check uniqueness
    if (name && name !== profile.name) {
      const existing = await this.prisma.hotspotProfile.findUnique({
        where: {
          serverId_name: { serverId: profile.serverId, name },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Profil dengan nama "${name}" sudah terdaftar pada router ini`,
        );
      }
    }

    // Update di DB
    const updated = await this.prisma.hotspotProfile.update({
      where: { id },
      data: updateProfileDto,
    });

    // Sinkronisasi ke router: Hapus profile lama, buat yang baru!
    // Ini taktik paling aman di MikroTik daripada mem-patch
    try {
      await this.mikrotikService.removeHotspotProfile(
        profile.serverId,
        profile.name,
      );
      await this.mikrotikService.createHotspotProfile(
        profile.serverId,
        name || profile.name,
        rateLimit || profile.rateLimit,
        sessionTimeout !== undefined
          ? sessionTimeout
          : (profile.sessionTimeout ?? undefined),
        idleTimeout !== undefined
          ? idleTimeout
          : (profile.idleTimeout ?? undefined),
        sharedUsers !== undefined ? sharedUsers : profile.sharedUsers,
      );
      await this.prisma.hotspotProfile.update({
        where: { id },
        data: { syncedToRouter: true },
      });
    } catch (error: any) {
      console.warn(
        `Gagal sinkronisasi update profil ke MikroTik:`,
        error.message || error,
      );
      await this.prisma.hotspotProfile.update({
        where: { id },
        data: { syncedToRouter: false },
      });
    }

    return updated;
  }

  async remove(id: string) {
    const profile = await this.findOne(id);

    // Hapus di MikroTik router
    try {
      await this.mikrotikService.removeHotspotProfile(
        profile.serverId,
        profile.name,
      );
    } catch (error: any) {
      console.warn(
        `Gagal menghapus profil "${profile.name}" di MikroTik:`,
        error.message || error,
      );
    }

    // Hapus di DB
    return this.prisma.hotspotProfile.delete({
      where: { id },
    });
  }

  /**
   * Mengambil profile yang sudah ada di CHR dan menyimpannya ke database
   */
  async syncFromRouter(serverId: string) {
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(
        `Router dengan ID ${serverId} tidak ditemukan`,
      );
    }

    // 1. Ambil data dari MikroTik secara real-time
    const routerProfiles = await this.mikrotikService.getHotspotProfiles(serverId);
    let routerUsers: any[] = [];
    let routerActiveUsers: any[] = [];
    try {
      routerUsers = await this.mikrotikService.getHotspotUsers(serverId);
      routerActiveUsers = await this.mikrotikService.getActiveUsers(serverId);
    } catch (e: any) {
      console.warn('Gagal mengambil hotspot users/active users dari router:', e.message || e);
    }

    const imported: any[] = [];
    let deletedProfilesCount = 0;
    let deletedVouchersCount = 0;
    let importedVouchersCount = 0;

    // 2. PENYELARASAN PROFIL HOTSPOT
    const routerProfileNames = new Set(routerProfiles.map((rp: any) => rp.name));
    
    // Ambil profil yang ada di DB lokal untuk server ini
    const dbProfiles = await this.prisma.hotspotProfile.findMany({
      where: { serverId },
    });

    for (const dbProfile of dbProfiles) {
      // Jika profil di DB tidak ada lagi di MikroTik, hapus beserta vouchernya!
      if (!routerProfileNames.has(dbProfile.name)) {
        // Hapus voucher di bawah profil ini terlebih dahulu (untuk menghindari RESTRICT constraint)
        const delVouchers = await this.prisma.voucher.deleteMany({
          where: { profileId: dbProfile.id },
        });
        deletedVouchersCount += delVouchers.count;

        // Hapus profil itu sendiri
        await this.prisma.hotspotProfile.delete({
          where: { id: dbProfile.id },
        });
        deletedProfilesCount++;
      }
    }

    // Upsert profil yang ada di MikroTik ke DB lokal
    for (const rProfile of routerProfiles) {
      const name = rProfile.name;
      const rateLimit = rProfile['rate-limit'] || '2M/2M';
      const sessionTimeout = rProfile['session-timeout'] || null;
      const idleTimeout = rProfile['idle-timeout'] || null;
      const sharedUsers = parseInt(rProfile['shared-users'] || '1', 10);

      const existing = await this.prisma.hotspotProfile.findUnique({
        where: {
          serverId_name: { serverId, name },
        },
      });

      if (!existing) {
        const newProfile = await this.prisma.hotspotProfile.create({
          data: {
            serverId,
            name,
            rateLimit,
            sessionTimeout,
            idleTimeout,
            sharedUsers,
            validity: '1d', // default validity
            syncedToRouter: true,
            description: 'Diimpor otomatis dari router MikroTik',
          },
        });
        imported.push(newProfile);
      } else {
        // Perbarui profil lokal agar sinkron dengan konfigurasi MikroTik saat ini
        await this.prisma.hotspotProfile.update({
          where: { id: existing.id },
          data: {
            rateLimit,
            sessionTimeout,
            idleTimeout,
            sharedUsers,
            syncedToRouter: true,
          },
        });
      }
    }

    // 3. PENYELARASAN VOUCHER HOTSPOT (PASCA-RESET)
    // Jika koneksi router sukses (routerProfiles berhasil ditarik), hapus voucher lokal yang tidak terdaftar lagi di MikroTik
    if (routerProfiles.length > 0) {
      const routerUsernames = new Set(routerUsers.map((ru: any) => ru.name));
      const activeUsernames = new Set(routerActiveUsers.map((au: any) => au.user));
      
      const dbVouchers = await this.prisma.voucher.findMany({
        where: { serverId },
      });
      const dbUsernames = new Set(dbVouchers.map((v) => v.username));

      for (const dbVoucher of dbVouchers) {
        // Jika voucher di DB lokal tidak terdaftar sebagai user hotspot di MikroTik, hapus!
        if (!routerUsernames.has(dbVoucher.username)) {
          await this.prisma.voucher.delete({
            where: { id: dbVoucher.id },
          });
          deletedVouchersCount++;
        }
      }

      // Import user dari MikroTik yang belum ada di database lokal
      // Kita butuh pemetaan nama profil ke ID profil lokal
      const localProfiles = await this.prisma.hotspotProfile.findMany({
        where: { serverId },
      });
      const profileMap = new Map<string, string>();
      for (const p of localProfiles) {
        profileMap.set(p.name, p.id);
      }

      for (const rUser of routerUsers) {
        // Cek apakah voucher sudah pernah dipakai atau sedang dipakai
        const isUsed = (rUser.uptime && rUser.uptime !== '0s') || 
                       (rUser['bytes-in'] && parseInt(rUser['bytes-in']) > 0) || 
                       (rUser['bytes-out'] && parseInt(rUser['bytes-out']) > 0) ||
                       activeUsernames.has(rUser.name);
                       
        const targetStatus = isUsed ? 'USED' : 'UNUSED';

        if (!dbUsernames.has(rUser.name)) {
          const profileName = rUser.profile || 'default';
          const localProfileId = profileMap.get(profileName);
          
          if (localProfileId) {
            await this.prisma.voucher.create({
              data: {
                serverId,
                profileId: localProfileId,
                username: rUser.name,
                password: rUser.password || '',
                status: targetStatus,
                batchId: 'sync-imported',
              },
            });
            importedVouchersCount++;
          } else {
            console.warn(`User ${rUser.name} menggunakan profil "${profileName}" yang tidak ada di lokal. Diabaikan.`);
          }
        } else {
          // Jika voucher sudah ada di DB, pastikan statusnya up-to-date
          const existingVoucher = dbVouchers.find((v) => v.username === rUser.name);
          if (existingVoucher && existingVoucher.status !== targetStatus) {
            await this.prisma.voucher.update({
              where: { id: existingVoucher.id },
              data: { status: targetStatus },
            });
          }
        }
      }
    }

    return {
      serverId,
      totalRouterProfiles: routerProfiles.length,
      importedCount: imported.length,
      deletedProfilesCount,
      deletedVouchersCount,
      importedVouchersCount,
      imported,
    };
  }
}
