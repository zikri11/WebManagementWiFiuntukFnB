import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VouchersService } from './vouchers.service.js';
import { GenerateSingleDto } from './dto/generate-single.dto.js';
import { GenerateBatchDto } from './dto/generate-batch.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { Response } from 'express';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post('single')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate 1 voucher hotspot instant' })
  @ApiResponse({ status: 201, description: 'Voucher berhasil dibuat' })
  async generateSingle(@Body() dto: GenerateSingleDto) {
    return this.vouchersService.generateSingle(dto);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate voucher massal secara background' })
  @ApiResponse({
    status: 202,
    description: 'Batch dimasukkan ke antrean worker',
  })
  async generateBatch(@Body() dto: GenerateBatchDto) {
    return this.vouchersService.generateBatch(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ambil list semua voucher terbitan' })
  @ApiResponse({ status: 200, description: 'List voucher berhasil diambil' })
  async findAll() {
    return this.vouchersService.findAll();
  }

  @Get('pdf/filtered')
  @ApiOperation({
    summary: 'Download lembaran PDF voucher berdasarkan filter server dan profile',
  })
  @ApiResponse({ status: 200, description: 'File PDF voucher streamed' })
  async getPdfForFilter(
    @Query('serverId') serverId: string,
    @Query('profileId') profileId: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const buffer = await this.vouchersService.getPdfForFilter(serverId, profileId, status);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=vouchers-filtered.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ambil detail voucher' })
  @ApiResponse({
    status: 200,
    description: 'Detail voucher berhasil diambil',
  })
  async findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Get('pdf/batch/:batchId')
  @ApiOperation({
    summary: 'Download lembaran PDF voucher per batch (Public/Browser)',
  })
  @ApiResponse({ status: 200, description: 'File PDF voucher streamed' })
  async getPdfForBatch(
    @Param('batchId') batchId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.vouchersService.getPdfForBatch(batchId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=vouchers-${batchId}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('pdf/single/:id')
  @ApiOperation({ summary: 'Download PDF 1 voucher tunggal (Public/Browser)' })
  @ApiResponse({ status: 200, description: 'File PDF voucher streamed' })
  async getPdfForSingle(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.vouchersService.getPdfForSingle(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=voucher-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
