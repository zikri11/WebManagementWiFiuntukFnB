"use client";

import apiClient from "@/lib/api-client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams, useRouter } from "next/navigation";
import {
  BrainCircuit,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle,
  ArrowLeft
} from "lucide-react";

interface AiReport {
  id: string;
  serverId: string;
  provider: string;
  configJson: string;
  resultMd: string;
  status: string;
  createdAt: string;
  server?: {
    name: string;
    host: string;
  };
}

export default function AiReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<AiReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (id) {
      loadReport(id);
    }
  }, [id]);

  const loadReport = async (reportId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/ai/reports/${reportId}`);
      setReport(response.data);
    } catch (error: any) {
      console.error("Failed to load AI report:", error);
      setErrorMessage("Gagal memuat laporan AI. Mungkin laporan telah dihapus atau tidak ditemukan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = async () => {
    if (report?.resultMd) {
      await navigator.clipboard.writeText(report.resultMd);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-on-surface-variant">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-sm font-medium">Memuat Laporan Analisis AI...</p>
      </div>
    );
  }

  if (errorMessage || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-2">Laporan Tidak Ditemukan</h3>
        <p className="text-sm text-on-surface-variant mb-6">{errorMessage}</p>
        <button
          onClick={() => router.push('/ai')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke AI Assistant
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/ai')}
            className="p-2.5 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-variant hover:text-primary rounded-xl transition-all shadow-sm active:scale-95"
            title="Kembali ke AI Assistant"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-primary" />
              Laporan Analisis AI
            </h1>
            <p className="text-on-surface-variant text-sm mt-0.5 hidden sm:block">
              Detail hasil diagnosa keamanan dan performa router.
            </p>
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopyResult}
          disabled={isCopied}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
            isCopied
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface"
          }`}
        >
          {isCopied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Berhasil Disalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Salin Laporan</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Card Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-outline-variant bg-surface-container-low gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Target Router:</span>
            <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
              {report.server?.name || "Unknown Server"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span>
              Model: <strong className="capitalize text-on-surface">{report.provider}</strong>
            </div>
            <div className="w-1 h-1 rounded-full bg-outline-variant hidden sm:block"></div>
            <div className="text-on-surface-variant">
              Dianalisis pada: <strong className="text-on-surface">{new Date(report.createdAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</strong>
            </div>
          </div>
        </div>

        {/* Markdown Render Area */}
        <div className="p-5 sm:p-8 overflow-x-auto bg-surface prose prose-sm sm:prose-base max-w-none prose-p:text-on-surface-variant prose-strong:text-on-surface prose-li:text-on-surface-variant prose-headings:text-primary prose-a:text-primary prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-pre:bg-surface-container-low prose-pre:border prose-pre:border-outline-variant prose-hr:border-outline-variant">
          <ReactMarkdown>
            {report.resultMd}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
