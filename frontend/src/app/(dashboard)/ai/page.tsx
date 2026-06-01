"use client";

import { useServerStore } from "@/store/server-store";
import apiClient from "@/lib/api-client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BrainCircuit,
  Key,
  Server,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown,
  History,
  Trash2,
  X,
  Copy,
  CheckCircle,
  Sparkles,
  MessageSquare,
  Cpu
} from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function AiPage() {
  const { activeServerId, servers, fetchServers } = useServerStore();
  const [reports, setReports] = useState<AiReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Settings State
  const [provider, setProvider] = useState("openrouter");
  
  const router = useRouter();

  const activeServer = servers.find((s) => s.id === activeServerId);

  useEffect(() => {
    fetchServers();
    loadReports();
    // Load saved provider from localStorage if available
    const savedProvider = localStorage.getItem("wifi_ai_provider");
    if (savedProvider) setProvider(savedProvider);
  }, [fetchServers]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/ai/reports");
      setReports(response.data);
    } catch (error: any) {
      console.error("Failed to load AI reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProvider(val);
    localStorage.setItem("wifi_ai_provider", val);
  };


  const handleAnalyze = async () => {
    if (!activeServerId) {
      setErrorMessage("Silakan pilih router aktif di pojok kiri atas terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        provider,
      };
      
      const response = await apiClient.post(`/ai/servers/${activeServerId}/analyze`, payload);
      if (response.data) {
        setSuccessMessage("Analisis AI berhasil diselesaikan!");
        await loadReports();
        router.push(`/ai/${response.data.id}`); // Buka laporan terbaru di halaman baru
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message ||
        error.message ||
        "Terjadi kesalahan saat memanggil AI provider. Pastikan API Key valid dan koneksi internet stabil."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openReport = (report: AiReport) => {
    router.push(`/ai/${report.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              AI Assistant
            </h1>
          </div>
          <p className="text-on-surface-variant mt-1 text-sm max-w-xl">
            Diagnosa otomatis konfigurasi router MikroTik Anda menggunakan kecerdasan buatan. Temukan celah keamanan dan optimalisasi performa.
          </p>
        </div>
        
        {/* Router Status Badge Moved Here */}
        {activeServerId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-full shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Router: {activeServer?.name}</span>
          </div>
        )}
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 bg-error-container text-on-error-container border border-error/20 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="ml-auto opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-medium">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="ml-auto opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-on-surface-variant" />
              Pilih Model AI
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface">Pilih Model AI</label>
                <div className="relative">
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      localStorage.setItem("wifi_ai_provider", e.target.value);
                    }}
                    className="w-full appearance-none bg-surface-variant border border-outline-variant text-on-surface text-sm rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  >
                    <option value="openrouter">OpenRouter (GLM)</option>
                    <option value="gemini">Google Gemini (1.5 Flash)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !activeServerId}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all font-semibold rounded-xl shadow-md group relative overflow-hidden"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sedang Menganalisis...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />
                      Mulai Analisis
                    </>
                  )}
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 -translate-x-full bg-white/20 skew-x-12 group-hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm min-h-[400px]">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-on-surface-variant" />
              Riwayat Analisis
            </h3>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                <p className="text-sm">Memuat histori laporan...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4">
                  <BrainCircuit className="w-8 h-8 text-on-surface-variant/50" />
                </div>
                <h4 className="text-lg font-bold text-on-surface">Belum ada analisis</h4>
                <p className="text-sm text-on-surface-variant max-w-md mt-2">
                  Anda belum pernah melakukan analisis AI. Silakan klik "Mulai Analisis" untuk memulai diagnosis router.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div 
                    key={report.id}
                    onClick={() => openReport(report)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-container-lowest hover:bg-surface-variant border border-outline-variant rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                        <BrainCircuit className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-on-surface capitalize group-hover:text-primary transition-colors">Analisis Router: {report.server?.name || "Unknown"}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {/* Colored Provider Badge */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize shadow-sm ${
                            report.provider === 'openrouter' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                            report.provider === 'gemini' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                            report.provider === 'openai' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                            'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                          }`}>
                            {report.provider}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/70">
                            {new Date(report.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0">
                      <span className="text-xs font-semibold text-primary group-hover:underline">Lihat Hasil &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
