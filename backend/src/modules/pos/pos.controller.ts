import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PosService } from './pos.service.js';
import { CreatePosTransactionDto } from './dto/create-pos-transaction.dto.js';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';

@ApiTags('POS Integration')
@Controller('pos')
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly configService: ConfigService,
  ) {}

  @Post('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Menerima transaksi POS untuk membuat voucher otomatis',
    description:
      'Endpoint ini dipicu oleh sistem kasir fisik saat transaksi belanja selesai. Menghasilkan kode voucher WiFi otomatis.',
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key khusus sistem kasir POS',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description:
      'Transaksi sukses dan voucher WiFi berhasil dibuat / dikembalikan.',
  })
  @ApiResponse({
    status: 401,
    description: 'API Key tidak valid atau tidak disertakan di header.',
  })
  @ApiResponse({
    status: 404,
    description: 'Router MikroTik atau profil hotspot tidak ditemukan.',
  })
  async createTransaction(
    @Body() dto: CreatePosTransactionDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    const validApiKey =
      this.configService.get<string>('POS_API_KEY') || 'pos_secret_key_123';

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException(
        'API Key sistem kasir tidak valid atau tidak disertakan pada header "x-api-key"',
      );
    }

    return this.posService.processTransaction(dto);
  }
}
