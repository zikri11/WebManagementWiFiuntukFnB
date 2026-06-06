/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MikrotikService } from '../mikrotik/mikrotik.service.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { CreateServerDto } from './dto/create-server.dto.js';
import { UpdateServerDto } from './dto/update-server.dto.js';
import { TestConnectionDto } from './dto/test-connection.dto.js';
import { encryptSecret, decryptSecret } from '../../common/crypto.util.js';

@Injectable()
export class ServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikService: MikrotikService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Buang field password dari objek server sebelum dikirim ke klien. */
  private stripPassword<T extends { password?: string }>(server: T): Omit<T, 'password'> {
    const { password: _pw, ...safe } = server;
    return safe;
  }

  async create(createServerDto: CreateServerDto) {
    const { name, host, port, username, password, useSSL } = createServerDto;

    // Check if host already registered
    const existingServer = await this.prisma.mikrotikServer.findFirst({
      where: { host },
    });
    if (existingServer) {
      throw new BadRequestException(
        `Router dengan IP/Host ${host} sudah terdaftar`,
      );
    }

    const defaultPort = port || (useSSL ? 443 : 80);

    const server = await this.prisma.mikrotikServer.create({
      data: {
        name,
        host,
        port: defaultPort,
        username,
        password: encryptSecret(password), // enkripsi at-rest (AES-256-GCM)
        useSSL: useSSL ?? false,
      },
    });

    await this.activityLogService.logAction({
      action: 'SERVER_CREATED',
      serverId: server.id,
      entity: 'MikrotikServer',
      entityId: server.id,
      detail: `Router baru ditambahkan: ${name} (${host})`,
    });

    return this.stripPassword(server);
  }

  async findAll() {
    const servers = await this.prisma.mikrotikServer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return servers.map((s) => this.stripPassword(s));
  }

  async findOne(id: string) {
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id },
    });
    if (!server) {
      throw new NotFoundException(`Router dengan ID ${id} tidak ditemukan`);
    }
    return this.stripPassword(server);
  }

  async update(id: string, updateServerDto: UpdateServerDto) {
    await this.findOne(id);

    if (updateServerDto.host) {
      const existingServer = await this.prisma.mikrotikServer.findFirst({
        where: {
          host: updateServerDto.host,
          id: { not: id },
        },
      });
      if (existingServer) {
        throw new BadRequestException(
          `Router dengan IP/Host ${updateServerDto.host} sudah terdaftar`,
        );
      }
    }

    // Enkripsi password hanya jika benar-benar diisi (string kosong = tidak diubah).
    const data: Record<string, unknown> = { ...updateServerDto };
    if (data.password) {
      data.password = encryptSecret(data.password as string);
    } else {
      delete data.password;
    }

    const updated = await this.prisma.mikrotikServer.update({
      where: { id },
      data,
    });

    await this.activityLogService.logAction({
      action: 'SERVER_UPDATED',
      serverId: id,
      entity: 'MikrotikServer',
      entityId: id,
      detail: `Konfigurasi router diupdate: ${updated.name}`,
    });

    return this.stripPassword(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mikrotikServer.delete({
      where: { id },
    });
  }

  async testConnection(id: string) {
    // Baca row mentah (password masih terenkripsi) lalu dekripsi untuk dipakai.
    const server = await this.prisma.mikrotikServer.findUnique({ where: { id } });
    if (!server) {
      throw new NotFoundException(`Router dengan ID ${id} tidak ditemukan`);
    }

    const result = await this.mikrotikService.testConnection(
      server.host,
      server.port,
      server.username,
      decryptSecret(server.password),
      server.useSSL,
    );

    const lastStatus = result.success ? 'ONLINE' : 'OFFLINE';

    // Update status di database secara background
    await this.prisma.mikrotikServer.update({
      where: { id },
      data: {
        lastStatus,
        lastCheckedAt: new Date(),
      },
    });

    if (!result.success) {
      await this.activityLogService.logAction({
        action: 'ROUTER_CONNECTION_FAILED',
        serverId: id,
        entity: 'MikrotikServer',
        entityId: id,
        detail: `Test koneksi gagal: ${result.error}`,
      });
    }

    return {
      serverId: id,
      success: result.success,
      latency: result.latency,
      error: result.error,
      lastStatus,
    };
  }

  async testCustomConnection(testConnectionDto: TestConnectionDto) {
    const { host, port, username, password, useSSL } = testConnectionDto;
    const defaultPort = port || (useSSL ? 443 : 80);

    const result = await this.mikrotikService.testConnection(
      host,
      defaultPort,
      username,
      password,
      useSSL ?? false,
    );

    return {
      success: result.success,
      latency: result.latency,
      error: result.error,
    };
  }
}
