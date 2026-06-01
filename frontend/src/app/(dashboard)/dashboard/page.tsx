"use client";

import { useServerStore } from "@/store/server-store";
import { useEffect, useState, useCallback, useRef } from "react";
import apiClient from "@/lib/api-client";
import {
  Users,
  Ticket,
  Activity,
  Wifi,
  Cpu,
  Database,
  RefreshCw,
  Search,
  Clock,
  HardDrive,
  Terminal,
  Network,
  Radio,
  AlertTriangle,
  Play,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface ActiveUser {
  id: string;
  username: string;
  ipAddress: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  sessionTimeLeft: string | null;
  idleTime: string | null;
}

interface RouterResources {
  serverId: string;
  serverName: string;
  uptime: string;
  cpuLoad: number;
  cpuCount: number;
  freeMemory: number;
  totalMemory: number;
  freeHddSpace: number;
  totalHddSpace: number;
  version: string;
  boardName: string;
  architectureName: string;
}

export default function DashboardPage() {
  const { activeServerId, servers, setActiveServerId, checkActiveServerStatus, isSyncing } = useServerStore();
  
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [resources, setResources] = useState<RouterResources | null>(null);
  const [vouchersCount, setVouchersCount] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSilentLoading, setIsSilentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(3); // Default 3s (Tuntutan Real-Time)
  const [countdown, setCountdown] = useState<number>(3);

  const activeServer = servers.find(s => s.id === activeServerId);

  // Helper untuk format Bytes ke KB/MB/GB
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helper untuk format Uptime MikroTik (misal: 2d12h4m5s -> 2 Hari, 12 Jam...)
  const formatUptime = (uptimeStr: string) => {
    if (!uptimeStr || uptimeStr === "Unknown" || uptimeStr === "-") return "-";
    
    // Jika format standar Mikrotik e.g. 1w2d12h4m5s atau 12h4m5s
    let formatted = uptimeStr;
    formatted = formatted.replace("w", " Minggu ");
    formatted = formatted.replace("d", " Hari ");
    formatted = formatted.replace("h", " Jam ");
    formatted = formatted.replace("m", " Menit ");
    formatted = formatted.replace("s", " Detik");
    return formatted.trim();
  };

  // Fetch data dashboard
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!activeServerId) return;

    if (silent) {
      setIsSilentLoading(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      // 1. Fetch Active Users
      const activeRes = await apiClient.get<ActiveUser[]>(`/monitoring/active/${activeServerId}`);
      setActiveUsers(activeRes.data);

      // 2. Fetch Resources
      const resourcesRes = await apiClient.get<RouterResources>(`/monitoring/resources/${activeServerId}`);
      setResources(resourcesRes.data);

      // 3. Fetch Vouchers (to count vouchers for this server)
      const vouchersRes = await apiClient.get<any[]>("/vouchers");
      const filteredVouchers = vouchersRes.data.filter((v: any) => v.serverId === activeServerId);
      setVouchersCount(filteredVouchers.length);
      
      setError(null);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      // Jika error, coba test status server utama di store
      checkActiveServerStatus();
      setError(err.response?.data?.message || err.message || "Gagal terhubung ke router MikroTik.");
      // Reset data
      setActiveUsers([]);
      setResources(null);
    } finally {
      setIsLoading(false);
      setIsSilentLoading(false);
    }
  }, [activeServerId, checkActiveServerStatus]);

  // Trigger fetch ketika server aktif berubah atau selesai sinkronisasi
  useEffect(() => {
    if (activeServerId && !isSyncing) {
      fetchDashboardData(false);
      setCountdown(autoRefreshInterval);
    }
  }, [activeServerId, isSyncing, fetchDashboardData, autoRefreshInterval]);

  // Efek Timer Hitung Mundur Auto-Refresh
  useEffect(() => {
    if (!activeServerId || autoRefreshInterval === 0 || error) return;

    setCountdown(autoRefreshInterval);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeServerId, autoRefreshInterval, fetchDashboardData, error]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchDashboardData(false);
    setCountdown(autoRefreshInterval);
  };

  // Filter active users by search query
  const filteredUsers = activeUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.ipAddress.includes(searchQuery) ||
    u.macAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Perhitungan presentase memory & hdd
  const memoryUsagePercent = resources
    ? Math.round(((resources.totalMemory - resources.freeMemory) / resources.totalMemory) * 100)
    : 0;

  const hddUsagePercent = resources
    ? Math.round(((resources.totalHddSpace - resources.freeHddSpace) / resources.totalHddSpace) * 100)
    : 0;

  // Render State 1: Belum Pilih Router
  if (!activeServerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center bg-surface">
        <div className="w-24 h-24 bg-primary-container/40 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <Wifi className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Selamat Datang di WiFi Management</h1>
        <p className="text-on-surface-variant max-w-md mb-8">
          Silakan pilih salah satu router MikroTik aktif di pojok kanan atas atau klik daftar server di bawah untuk mulai memantau secara real-time.
        </p>

        {servers.length === 0 ? (
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant max-w-sm w-full shadow-sm">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-on-surface">Belum ada Router terdaftar</h3>
            <p className="text-xs text-on-surface-variant mt-1 mb-4">Daftarkan router MikroTik Anda terlebih dahulu untuk memulai.</p>
            <a 
              href="/servers" 
              className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/95 transition-colors"
            >
              Tambah Router
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
            {servers.map((server) => {
              const isOnline = server.lastStatus === "ONLINE";
              return (
                <button
                  key={server.id}
                  onClick={() => setActiveServerId(server.id)}
                  className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant hover:border-primary text-left transition-all hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isOnline 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-error-container text-on-error-container"
                      }`}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                      <Radio className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">{server.name}</h3>
                    <p className="text-xs text-on-surface-variant font-mono mt-1">{server.host}:{server.port}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs text-primary font-semibold">
                    <span>Hubungkan Router</span>
                    <Play className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface">Overview: {activeServer?.name}</h1>
            {activeServer?.lastStatus === "ONLINE" && !error ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Terhubung</span>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-error-container text-on-error-container text-xs font-semibold rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Terputus</span>
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant font-mono mt-1">Host: {activeServer?.host}:{activeServer?.port} | Versi ROS: {resources?.version || "-"}</p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Auto Refresh Selector */}
          <div className="flex items-center gap-2 bg-surface-variant/40 px-3 py-1.5 rounded-xl border border-outline-variant/40">
            <Clock className="w-4 h-4 text-on-surface-variant" />
            <span className="text-xs text-on-surface-variant font-medium">Auto-Refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setAutoRefreshInterval(val);
                setCountdown(val);
              }}
              className="bg-transparent text-xs text-on-surface font-semibold focus:outline-none cursor-pointer"
            >
              <option value={0}>Nonaktif</option>
              <option value={3}>3 Detik</option>
              <option value={10}>10 Detik</option>
              <option value={30}>30 Detik</option>
              <option value={60}>60 Detik</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isLoading || isSilentLoading}
            className={`p-2.5 bg-surface-variant hover:bg-outline-variant/40 border border-outline-variant text-on-surface-variant rounded-xl transition-all duration-300 flex items-center gap-2 text-xs font-semibold ${
              isLoading || isSilentLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"
            }`}
            title="Perbarui data sekarang secara manual"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isSilentLoading ? "animate-spin text-primary" : ""}`} />
            <span>Perbarui</span>
          </button>
        </div>
      </div>

      {/* Main Error Banner */}
      {error && (
        <div className="bg-error-container text-on-error-container p-5 rounded-2xl border border-error/20 shadow-sm flex items-start gap-4 animate-shake">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-error" />
          <div>
            <h3 className="font-bold text-base">Gagal Memantau Router</h3>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={handleManualRefresh}
              className="mt-3 px-4 py-1.5 bg-error text-on-error rounded-xl text-xs font-semibold hover:bg-error/95 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Coba Hubungkan Ulang
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton & Placeholder */}
      {isLoading && !isSilentLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-container-lowest h-28 rounded-2xl border border-outline-variant"></div>
          ))}
          <div className="lg:col-span-4 bg-surface-container-lowest h-64 rounded-2xl border border-outline-variant mt-4"></div>
        </div>
      ) : (
        <>
          {/* Overview Metric Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: User Aktif */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">User Aktif</p>
                <h3 className="text-3xl font-extrabold text-on-surface mt-1.5">
                  {error ? "-" : activeUsers.length}
                </h3>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Sesi Aktif
                </span>
              </div>
              <div className="w-12 h-12 bg-primary-container/60 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 2: Voucher Terbuat */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Voucher Terbuat</p>
                <h3 className="text-3xl font-extrabold text-on-surface mt-1.5">
                  {error ? "-" : vouchersCount}
                </h3>
                <span className="text-xs text-on-surface-variant mt-1 block">Total di database</span>
              </div>
              <div className="w-12 h-12 bg-secondary-container/60 text-secondary rounded-2xl flex items-center justify-center shadow-inner">
                <Ticket className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 3: Uptime Router */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Router Uptime</p>
                <h3 className="text-lg font-bold text-on-surface mt-3 truncate max-w-[160px]" title={resources?.uptime}>
                  {error || !resources ? "-" : resources.uptime}
                </h3>
                <span className="text-xs text-on-surface-variant mt-1.5 block">Waktu aktif router</span>
              </div>
              <div className="w-12 h-12 bg-tertiary-container/40 text-on-tertiary-container rounded-2xl flex items-center justify-center shadow-inner">
                <Wifi className="w-6 h-6 text-orange-700" />
              </div>
            </div>

            {/* Metric 4: Beban CPU */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Beban CPU</p>
                <h3 className="text-3xl font-extrabold text-on-surface mt-1.5">
                  {error || !resources ? "-" : `${resources.cpuLoad}%`}
                </h3>
                <span className={`text-xs font-bold block mt-1 ${
                  (resources?.cpuLoad || 0) > 80 ? "text-error" : (resources?.cpuLoad || 0) > 50 ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {error || !resources ? "-" : resources.cpuLoad > 80 ? "Beban Tinggi" : resources.cpuLoad > 50 ? "Beban Sedang" : "Normal"}
                </span>
              </div>
              <div className="w-12 h-12 bg-surface-variant text-on-surface-variant rounded-2xl flex items-center justify-center shadow-inner">
                <Cpu className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* System Performance & Hardware Resources Row */}
          {!error && resources && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Performa Router & Hardware
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CPU Progress Card */}
                <div className="bg-surface-variant/20 p-5 rounded-2xl border border-outline-variant/35 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-on-surface flex items-center gap-2">
                      <Cpu className="w-4.5 h-4.5 text-primary" /> Penggunaan CPU
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">{resources.cpuCount} Core</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-extrabold text-on-surface">{resources.cpuLoad}%</span>
                      <span className="text-xs text-on-surface-variant">Beban kerja</span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-variant rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          resources.cpuLoad > 85 
                            ? "bg-error" 
                            : resources.cpuLoad > 60 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${resources.cpuLoad}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* RAM Progress Card */}
                <div className="bg-surface-variant/20 p-5 rounded-2xl border border-outline-variant/35 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-on-surface flex items-center gap-2">
                      <Database className="w-4.5 h-4.5 text-primary" /> Memori RAM
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">
                      {formatBytes(resources.totalMemory)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-extrabold text-on-surface">{memoryUsagePercent}%</span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        Terpakai {formatBytes(resources.totalMemory - resources.freeMemory)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-variant rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          memoryUsagePercent > 85 
                            ? "bg-error" 
                            : memoryUsagePercent > 60 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${memoryUsagePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* HDD Progress Card */}
                <div className="bg-surface-variant/20 p-5 rounded-2xl border border-outline-variant/35 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-on-surface flex items-center gap-2">
                      <HardDrive className="w-4.5 h-4.5 text-primary" /> Penyimpanan HDD
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">
                      {formatBytes(resources.totalHddSpace)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-extrabold text-on-surface">{hddUsagePercent}%</span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        Sisa {formatBytes(resources.freeHddSpace)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-variant rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          hddUsagePercent > 85 
                            ? "bg-error" 
                            : hddUsagePercent > 60 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${hddUsagePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Spec Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-outline-variant/20">
                <div className="flex flex-col bg-surface-variant/10 px-4 py-3 rounded-xl border border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Tipe Board</span>
                  <span className="text-sm font-bold text-on-surface mt-0.5">{resources.boardName}</span>
                </div>
                <div className="flex flex-col bg-surface-variant/10 px-4 py-3 rounded-xl border border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Arsitektur</span>
                  <span className="text-sm font-bold text-on-surface mt-0.5">{resources.architectureName}</span>
                </div>
                <div className="flex flex-col bg-surface-variant/10 px-4 py-3 rounded-xl border border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Uptime Router</span>
                  <span className="text-sm font-bold text-on-surface mt-0.5 truncate" title={resources.uptime}>
                    {formatUptime(resources.uptime)}
                  </span>
                </div>
                <div className="flex flex-col bg-surface-variant/10 px-4 py-3 rounded-xl border border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Versi MikroTik</span>
                  <span className="text-sm font-bold text-on-surface mt-0.5 font-mono">{resources.version}</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Users Table Section */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-6 border-b border-outline-variant/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <Network className="w-5 h-5 text-primary" /> Pengguna Hotspot Aktif
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">Daftar pelanggan yang terhubung dan bertransaksi data di WiFi hotspot saat ini</p>
              </div>

              {/* Search Bar */}
              {!error && activeUsers.length > 0 && (
                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan username, IP, atau MAC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm bg-surface-variant/45 text-on-surface placeholder-on-surface-variant rounded-xl pl-9 pr-4 py-2 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              )}
            </div>

            {/* Table / Empty State */}
            {error ? (
              <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest">
                <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                <p className="font-semibold">Data pengguna aktif tidak tersedia</p>
                <p className="text-xs text-on-surface-variant mt-1">Nyalakan koneksi router MikroTik untuk mengambil data user aktif secara langsung.</p>
              </div>
            ) : activeUsers.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant bg-surface-container-lowest">
                <Users className="w-14 h-14 text-outline-variant mx-auto mb-4 animate-bounce" />
                <h3 className="font-bold text-on-surface text-base">Belum Ada Sesi Pengguna Aktif</h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
                  Saat ini tidak ada pelanggan kafe yang sedang menggunakan voucher WiFi terdaftar di router hotspot ini.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant bg-surface-container-lowest">
                <Search className="w-12 h-12 text-outline-variant mx-auto mb-3" />
                <h3 className="font-bold text-on-surface text-base">Tidak ada pencarian cocok</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Tidak menemukan pengguna aktif dengan kata pencarian &quot;{searchQuery}&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-variant/40 text-on-surface-variant font-semibold text-xs border-b border-outline-variant/60 select-none">
                      <th className="p-4 pl-6">Username / Voucher</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">MAC Address</th>
                      <th className="p-4">Waktu Uptime</th>
                      <th className="p-4 flex items-center gap-1.5"><ArrowUp className="w-3.5 h-3.5 text-primary" /> Upload</th>
                      <th className="p-4"><span className="flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5 text-emerald-600" /> Download</span></th>
                      <th className="p-4 pr-6">Sisa Waktu Sesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 text-sm text-on-surface">
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-primary-container/10 transition-colors group"
                      >
                        <td className="p-4 pl-6 font-bold text-primary flex items-center gap-2 group-hover:text-primary-container-low">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                          <span>{user.username}</span>
                        </td>
                        <td className="p-4 font-mono text-xs">{user.ipAddress}</td>
                        <td className="p-4 font-mono text-xs text-on-surface-variant">{user.macAddress}</td>
                        <td className="p-4 text-xs font-medium text-on-surface flex items-center gap-1.5 mt-1.5">
                          <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                          <span>{user.uptime}</span>
                        </td>
                        <td className="p-4 font-mono text-xs text-on-surface-variant">
                          {formatBytes(user.bytesIn)}
                        </td>
                        <td className="p-4 font-mono text-xs font-semibold text-on-surface">
                          {formatBytes(user.bytesOut)}
                        </td>
                        <td className="p-4 pr-6">
                          {user.sessionTimeLeft ? (
                            <span className="px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-lg border border-amber-500/30">
                              {user.sessionTimeLeft}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant text-xs font-semibold italic">Unlimited</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t border-outline-variant/40 bg-surface-variant/15 flex items-center justify-between text-xs text-on-surface-variant select-none">
                  <span>Menampilkan {filteredUsers.length} pengguna aktif</span>
                  {isSilentLoading && (
                    <span className="text-primary font-semibold flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memperbarui data...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
