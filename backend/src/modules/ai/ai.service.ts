import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MikrotikService } from '../mikrotik/mikrotik.service.js';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikService: MikrotikService,
  ) {}

  /**
   * Menghasilkan prompt AI berdasarkan konfigurasi
   */
  private generatePrompt(configJson: string): string {
    return `Anda adalah seorang Network Engineer dan Mikrotik Expert. Berikut adalah konfigurasi dari sebuah router Mikrotik yang digunakan untuk layanan Hotspot voucher FnB. Tugas Anda adalah menganalisis konfigurasi ini secara menyeluruh, mencakup system resource, profil hotspot, IP pool, DHCP, dan DNS. Temukan apakah ada masalah keamanan, kesalahan konfigurasi (misconfig), atau area yang bisa dioptimalkan untuk performa jaringan. Berikan minimal 3 temuan (findings) relevan dan berikan saran perbaikan (fix) yang spesifik dan praktis untuk masing-masing temuan. Sajikan hasil analisis Anda dalam format Markdown yang rapi dengan struktur:
1. Ringkasan Kondisi Server
2. Temuan Utama (minimal 3)
3. Saran Perbaikan
4. Kesimpulan.

Konfigurasi: 
${configJson}`;
  }

  /**
   * Memanggil Gemini API
   */
  private async callGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const model = 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respon dari AI.';
  }

  /**
   * Memanggil OpenRouter API
   */
  private async callOpenRouter(prompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-OpenRouter-Title': 'WiFi Management System'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API Error: ${error}`);
    }

    const data = await response.json();
    // OpenRouter may return a refusal in the message object or normal content
    const message = data.choices?.[0]?.message;
    if (message?.refusal) {
        return `Penolakan dari AI: ${message.refusal}`;
    }
    return message?.content || 'Tidak ada respon dari AI.';
  }

  /**
   * Memanggil OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY || '';
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API Error: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Tidak ada respon dari AI.';
  }

  /**
   * Memanggil Anthropic API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API Error: ${error}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'Tidak ada respon dari AI.';
  }

  /**
   * Ambil konfigurasi hotspot dari MikroTik dan kirim ke LLM untuk dianalisis.
   */
  async analyzeServer(serverId: string, provider: string): Promise<any> {

    const server = await this.prisma.mikrotikServer.findUnique({
      where: { id: serverId },
    });
    if (!server) {
      throw new NotFoundException(`Router dengan ID ${serverId} tidak ditemukan`);
    }

    // 1. Tarik data konfigurasi
    let configData;
    try {
      configData = await this.mikrotikService.getFullConfig(serverId);
    } catch (err: any) {
      throw new BadRequestException(`Gagal menarik konfigurasi dari router: ${err.message}`);
    }

    const configJson = JSON.stringify(configData, null, 2);
    const prompt = this.generatePrompt(configJson);

    let resultMd = '';
    const actualProvider = provider?.toLowerCase() || 'gemini';

    // 2. Panggil provider
    try {
      if (actualProvider === 'openrouter') {
        resultMd = await this.callOpenRouter(prompt);
      } else if (actualProvider === 'openai') {
        resultMd = await this.callOpenAI(prompt);
      } else if (actualProvider === 'anthropic') {
        resultMd = await this.callAnthropic(prompt);
      } else {
        resultMd = await this.callGemini(prompt);
      }
    } catch (err: any) {
      throw new BadRequestException(`Gagal memanggil LLM provider (${actualProvider}): ${err.message}`);
    }

    // 3. Simpan hasil
    const report = await this.prisma.aiReport.create({
      data: {
        serverId,
        provider: actualProvider,
        configJson,
        resultMd,
        status: 'COMPLETED',
      },
    });

    return report;
  }

  /**
   * Ambil semua laporan AI dari database.
   */
  async getReports() {
    return this.prisma.aiReport.findMany({
      include: {
        server: { select: { name: true, host: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Ambil satu laporan AI berdasarkan ID.
   */
  async getReportById(reportId: string) {
    const report = await this.prisma.aiReport.findUnique({ 
      where: { id: reportId },
      include: {
        server: { select: { name: true, host: true } }
      }
    });
    
    if (!report) {
      throw new NotFoundException(`Laporan dengan ID ${reportId} tidak ditemukan`);
    }
    return report;
  }
}
