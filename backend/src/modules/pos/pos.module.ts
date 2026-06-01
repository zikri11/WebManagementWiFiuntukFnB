import { Module } from '@nestjs/common';
import { PosController } from './pos.controller.js';
import { PosService } from './pos.service.js';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [VouchersModule, PrismaModule, ConfigModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
