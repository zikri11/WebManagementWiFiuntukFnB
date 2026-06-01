import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePosTransactionDto {
  @ApiProperty({
    description: 'ID Transaksi unik dari sistem kasir (POS)',
    example: 'TX-20260527-991',
  })
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @ApiProperty({
    description: 'ID Server MikroTik target',
    example: 'cmpnoc2ea0000o0ustysa8zf5',
  })
  @IsString()
  @IsNotEmpty()
  serverId!: string;

  @ApiProperty({
    description:
      'Nama profile hotspot di MikroTik yang digunakan untuk voucher',
    example: 'Paket_Ultra_5_Jam',
  })
  @IsString()
  @IsNotEmpty()
  profileName!: string;

  @ApiProperty({
    description: 'Nama outlet/kafe asal transaksi',
    example: 'Kafe Sudut Kota',
    required: false,
  })
  @IsString()
  @IsOptional()
  outletName?: string;

  @ApiProperty({
    description: 'Nama pelanggan (opsional)',
    example: 'Pelanggan Setia',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({
    description: 'Total nominal transaksi POS',
    example: 45000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;
}
