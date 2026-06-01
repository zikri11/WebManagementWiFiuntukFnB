import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ServersService } from './servers.service.js';
import { CreateServerDto } from './dto/create-server.dto.js';
import { UpdateServerDto } from './dto/update-server.dto.js';
import { TestConnectionDto } from './dto/test-connection.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Servers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  @ApiOperation({ summary: 'Daftarkan router MikroTik baru' })
  @ApiResponse({ status: 201, description: 'Router berhasil didaftarkan' })
  @ApiResponse({
    status: 400,
    description: 'Data input tidak valid atau router sudah terdaftar',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createServerDto: CreateServerDto) {
    return this.serversService.create(createServerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Ambil semua router MikroTik yang terdaftar' })
  @ApiResponse({ status: 200, description: 'List router berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.serversService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail router MikroTik berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail router berhasil diambil' })
  @ApiResponse({ status: 404, description: 'Router tidak ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.serversService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update data router MikroTik' })
  @ApiResponse({ status: 200, description: 'Router berhasil diupdate' })
  @ApiResponse({ status: 404, description: 'Router tidak ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateServerDto: UpdateServerDto,
  ) {
    return this.serversService.update(id, updateServerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus router MikroTik dari database' })
  @ApiResponse({ status: 200, description: 'Router berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Router tidak ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    return this.serversService.remove(id);
  }

  @Post(':id/test-connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Uji koneksi real-time ke router MikroTik' })
  @ApiResponse({ status: 200, description: 'Koneksi berhasil diuji' })
  @ApiResponse({ status: 404, description: 'Router tidak ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testConnection(@Param('id') id: string) {
    return this.serversService.testConnection(id);
  }

  @Post('test-connection-custom')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Uji koneksi ke router MikroTik dengan kredensial kustom' })
  @ApiResponse({ status: 200, description: 'Koneksi berhasil diuji' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testCustomConnection(@Body() testDto: TestConnectionDto) {
    return this.serversService.testCustomConnection(testDto);
  }
}
