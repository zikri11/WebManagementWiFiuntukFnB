/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-call */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VouchersService } from '../vouchers/vouchers.service.js';
import { CreatePosTransactionDto } from './dto/create-pos-transaction.dto.js';

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
  ) {}

  async processTransaction(dto: CreatePosTransactionDto) {
    const {
      transactionId,
      serverId,
      profileName,
      outletName,
      customerName,
      totalAmount,
    } = dto;

    // 1. Cek Router / Server
    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(
        `Router MikroTik dengan ID "${serverId}" tidak ditemukan`,
      );
    }

    // 2. Cek Idempotensi (Apakah transaksi ini sudah pernah sukses diproses sebelumnya?)
    const existingTx = await this.prisma.posTransaction.findUnique({
      where: { transactionId },
      include: {
        vouchers: {
          include: {
            profile: true,
            server: true,
          },
        },
      },
    });

    if (
      existingTx &&
      existingTx.status === 'SUCCESS' &&
      existingTx.vouchers.length > 0
    ) {
      const voucher = existingTx.vouchers[0];
      return {
        message: 'Transaksi sudah sukses diproses sebelumnya (Idempotent)',
        transaction: {
          id: existingTx.id,
          transactionId: existingTx.transactionId,
          status: existingTx.status,
          createdAt: existingTx.createdAt,
        },
        receipt: this.formatReceiptData(voucher, server),
      };
    }

    // 3. Catat / Update Transaksi ke PENDING
    let txRecord;
    if (!existingTx) {
      txRecord = await this.prisma.posTransaction.create({
        data: {
          transactionId,
          outletId: serverId, // Gunakan serverId sebagai outletId yang relevan
          totalAmount: totalAmount || 0,
          customerName: customerName || null,
          voucherProfile: profileName,
          status: 'PENDING',
        },
      });
    } else {
      txRecord = await this.prisma.posTransaction.update({
        where: { id: existingTx.id },
        data: {
          status: 'PENDING',
          errorMessage: null,
        },
      });
    }

    // 4. Cari Profil Hotspot target
    const profile = await this.prisma.hotspotProfile.findFirst({
      where: {
        serverId,
        name: {
          equals: profileName,
          mode: 'insensitive',
        },
      },
    });

    if (!profile) {
      const errMsg = `Profil Hotspot dengan nama "${profileName}" tidak ditemukan di router ini`;
      await this.prisma.posTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: errMsg,
        },
      });
      throw new NotFoundException(errMsg);
    }

    try {
      // 5. Generate Voucher menggunakan VouchersService
      const voucher = await this.vouchersService.generateSingle({
        serverId,
        profileId: profile.id,
        outletName: outletName || 'KAFE WIFI',
      });

      // 6. Hubungkan voucher ke transaksi POS
      const updatedVoucher = await this.prisma.voucher.update({
        where: { id: voucher.id },
        data: {
          posTransId: txRecord.id,
        },
        include: {
          profile: true,
          server: true,
        },
      });

      // 7. Update status transaksi POS menjadi SUCCESS
      await this.prisma.posTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: 'SUCCESS',
        },
      });

      // 8. Kembalikan detail transaksi & struk terformat
      return {
        message: 'Voucher WiFi berhasil dibuat otomatis dari transaksi POS',
        transaction: {
          id: txRecord.id,
          transactionId,
          status: 'SUCCESS',
          createdAt: txRecord.createdAt,
        },
        receipt: this.formatReceiptData(updatedVoucher, server),
      };
    } catch (error: any) {
      const errMsg =
        error.message || 'Terjadi kesalahan sistem saat membuat voucher';
      await this.prisma.posTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: errMsg,
        },
      });
      throw new BadRequestException(`Gagal memproses transaksi POS: ${errMsg}`);
    }
  }

  /**
   * Helper untuk menyusun data voucher agar siap dicetak di struk thermal.
   */
  private formatReceiptData(voucher: any, server: any) {
    const profile = voucher.profile;
    const serverHost = server.host || 'wifi.net';

    let validityText = 'Aktif: -';
    const val = profile?.validity || '1d';
    if (val.endsWith('d')) validityText = `Aktif:${val.slice(0, -1)}Hari`;
    else if (val.endsWith('h')) validityText = `Aktif:${val.slice(0, -1)}Jam`;
    else validityText = `Aktif:${val}`;

    let durationText = 'Durasi: -';
    const limit = profile?.sessionTimeout || '5h';
    if (limit.endsWith('h')) durationText = `Durasi:${limit.slice(0, -1)}Jam`;
    else if (limit.endsWith('d'))
      durationText = `Durasi:${limit.slice(0, -1)}Hari`;
    else durationText = `Durasi:${limit}`;

    return {
      title: '=== VOUCHER WIFI KAFE ===',
      outletName: (voucher.outletName || 'Kafe WiFi').toUpperCase(),
      username: voucher.username,
      password: voucher.password,
      validity: validityText,
      duration: durationText,
      rateLimit: profile?.rateLimit || 'Full Speed',
      portalUrl: `http://${serverHost}`,
      instructions: [
        '1. Hubungkan WiFi ke hotspot kafe.',
        `2. Buka browser ke http://${serverHost}`,
        '3. Masukkan Username & Password di atas.',
      ],
      footer: '==========================',
    };
  }
}
