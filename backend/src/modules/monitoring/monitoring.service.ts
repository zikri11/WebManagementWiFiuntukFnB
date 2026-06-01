/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MikrotikService } from '../mikrotik/mikrotik.service.js';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikService: MikrotikService,
  ) {}

  /**
   * Mengambil daftar pengguna aktif di Hotspot secara real-time.
   */
  async getActiveUsers(serverId: string) {
    // 1. Cek keberadaan server
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(
        `Server MikroTik dengan ID "${serverId}" tidak ditemukan`,
      );
    }

    try {
      const activeRaw = await this.mikrotikService.getActiveUsers(serverId);

      return activeRaw.map((u: any) => ({
        id: u['.id'] || u.id,
        username: u.user || 'Unknown',
        ipAddress: u.address || '-',
        macAddress: u['mac-address'] || '-',
        uptime: u.uptime || '-',
        bytesIn: u['bytes-in'] ? parseInt(u['bytes-in'], 10) : 0,
        bytesOut: u['bytes-out'] ? parseInt(u['bytes-out'], 10) : 0,
        sessionTimeLeft: u['session-time-left'] || null,
        idleTime: u['idle-time'] || null,
      }));
    } catch (error: any) {
      throw new Error(
        `Gagal memantau pengguna aktif dari MikroTik: ${error.message}`,
      );
    }
  }

  /**
   * Mengambil statistik pemakaian hardware / resource sistem dari router MikroTik secara real-time.
   */
  async getRouterResources(serverId: string) {
    // 1. Cek keberadaan server
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(
        `Server MikroTik dengan ID "${serverId}" tidak ditemukan`,
      );
    }

    try {
      const resources = await this.mikrotikService.getSystemResource(serverId);

      return {
        serverId,
        serverName: server.name,
        uptime: resources.uptime || 'Unknown',
        cpuLoad:
          resources['cpu-load'] !== undefined
            ? parseInt(resources['cpu-load'], 10)
            : 0,
        cpuCount: resources['cpu-count']
          ? parseInt(resources['cpu-count'], 10)
          : 1,
        freeMemory: resources['free-memory']
          ? parseInt(resources['free-memory'], 10)
          : 0,
        totalMemory: resources['total-memory']
          ? parseInt(resources['total-memory'], 10)
          : 0,
        freeHddSpace: resources['free-hdd-space']
          ? parseInt(resources['free-hdd-space'], 10)
          : 0,
        totalHddSpace: resources['total-hdd-space']
          ? parseInt(resources['total-hdd-space'], 10)
          : 0,
        version: resources.version || 'Unknown',
        boardName: resources['board-name'] || 'Unknown',
        architectureName: resources['architecture-name'] || 'Unknown',
      };
    } catch (error: any) {
      throw new Error(
        `Gagal memantau resource hardware dari MikroTik: ${error.message}`,
      );
    }
  }
}
