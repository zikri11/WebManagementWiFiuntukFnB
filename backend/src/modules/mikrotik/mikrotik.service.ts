/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MikrotikService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper untuk membuat HTTP request ke RouterOS REST API.
   */
  private async request(
    host: string,
    port: number,
    username: string,
    password: string,
    useSsl: boolean,
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' = 'GET',
    body?: any,
    timeoutMs: number = 5000,
  ): Promise<any> {
    const protocol = useSsl ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}:${port}/rest`;
    const url = `${baseUrl}/${path.replace(/^\//, '')}`;

    const base64Auth = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Basic ${base64Auth}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      clearTimeout(id);

      if (response.status === 401 || response.status === 403) {
        throw new BadRequestException(
          'Kredensial MikroTik salah atau akses ditolak',
        );
      }

      if (method === 'DELETE' && response.status === 204) {
        return { success: true };
      }

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const json = JSON.parse(text);
          if (json.detail || json.message) {
            errorMsg = json.detail || json.message;
          }
        } catch {
          if (text) errorMsg = text;
        }
        throw new BadRequestException(
          `Gagal menghubungi MikroTik: ${errorMsg}`,
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return { success: true };
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new BadRequestException(
          `Koneksi ke MikroTik timeout setelah ${timeoutMs}ms`,
        );
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Koneksi ke MikroTik gagal: ${error.message || error}`,
      );
    }
  }

  /**
   * Helper untuk mendapatkan kredensial server berdasarkan ID.
   */
  private async getServerCredentials(serverId: string) {
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(
        'Server MikroTik tidak ditemukan di database',
      );
    }
    return server;
  }

  /**
   * Buat koneksi dan verifikasi kredensial router MikroTik.
   */
  async connect(
    host: string,
    port: number,
    username: string,
    password: string,
    useSsl: boolean = false,
  ) {
    const portToUse = port || (useSsl ? 443 : 80);
    return this.request(
      host,
      portToUse,
      username,
      password,
      useSsl,
      'system/resource',
      'GET',
      null,
      5000,
    );
  }

  /**
   * Test koneksi ke router dan hitung latensi.
   */
  async testConnection(
    host: string,
    port: number,
    username: string,
    password: string,
    useSsl: boolean = false,
  ) {
    const start = Date.now();
    try {
      await this.connect(host, port, username, password, useSsl);
      const latency = Date.now() - start;
      return { success: true, latency, error: undefined };
    } catch (error: any) {
      return {
        success: false,
        latency: 0,
        error: error.message || 'Koneksi gagal',
      };
    }
  }

  /**
   * Ambil daftar hotspot user profile dari router.
   */
  async getHotspotProfiles(serverId: string) {
    const creds = await this.getServerCredentials(serverId);
    const response = await this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      'ip/hotspot/user/profile',
      'GET',
    );
    return Array.isArray(response) ? response : [];
  }

  /**
   * Buat hotspot user baru di router (untuk voucher).
   */
  async createHotspotUser(
    serverId: string,
    username: string,
    password: string,
    profile: string,
  ) {
    const creds = await this.getServerCredentials(serverId);
    return this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      'ip/hotspot/user',
      'PUT',
      {
        name: username,
        password: password,
        profile: profile,
      },
    );
  }

  /**
   * Hapus hotspot user dari router (revoke voucher).
   */
  async removeHotspotUser(serverId: string, username: string) {
    const creds = await this.getServerCredentials(serverId);

    // Langkah 1: Cari ID internal MikroTik untuk user tersebut
    const users = await this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      `ip/hotspot/user?name=${encodeURIComponent(username)}`,
      'GET',
    );

    if (!Array.isArray(users) || users.length === 0) {
      throw new NotFoundException(
        `User hotspot "${username}" tidak ditemukan di router`,
      );
    }

    const internalId = users[0]['.id'];
    if (!internalId) {
      throw new BadRequestException(
        `Gagal mendapatkan ID internal untuk user "${username}"`,
      );
    }

    // Langkah 2: Hapus menggunakan ID internal
    return this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      `ip/hotspot/user/${internalId}`,
      'DELETE',
    );
  }

  /**
   * Ambil daftar user hotspot aktif saat ini.
   */
  async getActiveUsers(serverId: string) {
    const creds = await this.getServerCredentials(serverId);
    const response = await this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      'ip/hotspot/active',
      'GET',
    );
    return Array.isArray(response) ? response : [];
  }

  /**
   * Ambil daftar semua user hotspot yang terdaftar di router.
   */
  async getHotspotUsers(serverId: string) {
    const creds = await this.getServerCredentials(serverId);
    const response = await this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      'ip/hotspot/user',
      'GET',
    );
    return Array.isArray(response) ? response : [];
  }

  /**
   * Ambil statistik resource system (CPU, RAM, HDD, Uptime) dari router.
   */
  async getSystemResource(serverId: string) {
    const creds = await this.getServerCredentials(serverId);
    return this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      'system/resource',
      'GET',
    );
  }

  /**
   * Ambil konfigurasi lengkap hotspot untuk AI analysis.
   * Data yang diambil: system resource, profile, pool, dhcp, dns, hotspot user.
   */
  async getFullConfig(serverId: string) {
    const creds = await this.getServerCredentials(serverId);

    const endpoints = {
      resources: 'system/resource',
      profiles: 'ip/hotspot/user/profile',
      pools: 'ip/pool',
      dhcpServers: 'ip/dhcp-server',
      dns: 'ip/dns',
      hotspots: 'ip/hotspot',
      users: 'ip/hotspot/user',
    };

    const results: Record<string, any> = {};

    // Ambil secara paralel menggunakan Promise.allSettled agar jika salah satu gagal, yang lain tetap jalan
    const promises = Object.entries(endpoints).map(async ([key, path]) => {
      try {
        const data = await this.request(
          creds.host,
          creds.port,
          creds.username,
          creds.password,
          creds.useSSL,
          path,
          'GET',
          null,
          4000, // Timeout 4 detik per request
        );
        results[key] = data;
      } catch (error: any) {
        results[key] = { error: error.message || 'Gagal mengambil data' };
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Daftarkan hotspot user profile baru di router.
   */
  async createHotspotProfile(
    serverId: string,
    name: string,
    rateLimit: string,
    sessionTimeout?: string,
    idleTimeout?: string,
    sharedUsers: number = 1,
  ) {
    const creds = await this.getServerCredentials(serverId);
    const body: any = {
      name,
      'rate-limit': rateLimit,
      'shared-users': sharedUsers.toString(),
    };
    if (sessionTimeout) body['session-timeout'] = sessionTimeout;
    if (idleTimeout) body['idle-timeout'] = idleTimeout;

    return this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      'ip/hotspot/user/profile',
      'PUT',
      body,
    );
  }

  /**
   * Hapus hotspot user profile dari router.
   */
  async removeHotspotProfile(serverId: string, name: string) {
    const creds = await this.getServerCredentials(serverId);

    // Cari ID internal MikroTik
    const profiles = await this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      `ip/hotspot/user/profile?name=${encodeURIComponent(name)}`,
      'GET',
    );

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { success: true };
    }

    const internalId = profiles[0]['.id'];
    if (!internalId) return { success: true };

    return this.request(
      creds.host,
      creds.port,
      creds.username,
      creds.password,
      creds.useSSL,
      `ip/hotspot/user/profile/${internalId}`,
      'DELETE',
    );
  }
}
