/**
 * AiController — Skeleton
 *
 * Mengekspos endpoint untuk menjalankan AI analysis dan mengambil laporan.
 * Dokumentasi Swagger di-generate otomatis dari dekorator @nestjs/swagger.
 */
import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AiService } from './ai.service.js';

@ApiTags('AI Analysis')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/servers/:id/analyze
   * Jalankan AI analysis untuk server MikroTik tertentu.
   */
  @Post('servers/:id/analyze')
  // Batasi panggilan LLM yang mahal: maksimal 10 / jam / IP
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @ApiOperation({
    summary: 'Analisis konfigurasi hotspot MikroTik menggunakan AI',
  })
  @ApiParam({ name: 'id', description: 'ID server MikroTik' })
  @ApiResponse({ status: 201, description: 'Analisis berhasil dijalankan' })
  @ApiResponse({ status: 404, description: 'Server tidak ditemukan' })
  @ApiResponse({ status: 503, description: 'LLM provider tidak tersedia' })
  async analyzeServer(
    @Param('id') id: string,
    @Body() body: { provider: string },
  ) {
    return this.aiService.analyzeServer(id, body.provider);
  }

  /**
   * GET /ai/reports
   * Ambil semua laporan AI.
   */
  @Get('reports')
  @ApiOperation({ summary: 'Daftar semua laporan AI analysis' })
  @ApiResponse({ status: 200, description: 'Daftar laporan berhasil diambil' })
  async getReports() {
    return this.aiService.getReports();
  }

  /**
   * GET /ai/reports/:id
   * Ambil satu laporan AI berdasarkan ID.
   */
  @Get('reports/:id')
  @ApiOperation({ summary: 'Detail laporan AI analysis' })
  @ApiParam({ name: 'id', description: 'ID laporan AI' })
  @ApiResponse({ status: 200, description: 'Detail laporan berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Laporan tidak ditemukan' })
  async getReportById(@Param('id') id: string) {
    return this.aiService.getReportById(id);
  }
}
