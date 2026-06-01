"use client";

import { useServerStore } from "@/store/server-store";
import apiClient from "@/lib/api-client";
import { useEffect, useState } from "react";
import {
  Plus,
  Server,
  Wifi,
  WifiOff,
  Activity,
  Trash2,
  Check,
  X,
  AlertCircle,
  Info,
  Shield,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Lock,
  Unlock,
  Settings
} from "lucide-react";

interface ServerDetail {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  useSSL: boolean;
  hotspotName?: string;
  dnsName?: string;
  lastStatus: string;
  lastCheckedAt?: string;
}

export default function ServersPage() {
  const { servers, activeServerId, setActiveServerId, fetchServers } = useServerStore();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerDetail | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states (common for both add and edit)
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: "",
    username: "",
    password: "",
    useSSL: false,
    hotspotName: "",
    dnsName: "",
  });

  // Verification & Loading states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency?: number;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load servers on mount
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Handle Form Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Reset states
  const resetForm = () => {
    setFormData({
      name: "",
      host: "",
      port: "",
      username: "",
      password: "",
      useSSL: false,
      hotspotName: "",
      dnsName: "",
    });
    setTestResult(null);
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditMode(false);
    setShowDeleteConfirm(false);
  };

  // Open Add Modal
  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open Detail Modal
  const openDetailModal = (server: any) => {
    resetForm();
    setSelectedServer(server);
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port.toString(),
      username: server.username,
      password: "", // Jangan tampilkan password demi keamanan
      useSSL: server.useSSL,
      hotspotName: server.hotspotName || "",
      dnsName: server.dnsName || "",
    });
  };

  // Close Modals
  const closeModals = () => {
    setIsAddModalOpen(false);
    setSelectedServer(null);
    resetForm();
  };

  // Test connection with credentials (DRAFT / BEFORE SAVE)
  const testConnectionCustom = async () => {
    if (!formData.host || !formData.username) {
      setErrorMessage("Host IP dan Username harus diisi untuk melakukan test connection");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setErrorMessage("");

    try {
      const response = await apiClient.post("/servers/test-connection-custom", {
        host: formData.host,
        port: formData.port ? parseInt(formData.port) : undefined,
        username: formData.username,
        password: formData.password, // can be empty string if update doesn't touch password
        useSSL: formData.useSSL,
      });

      if (response.data.success) {
        setTestResult({
          success: true,
          latency: response.data.latency,
        });
      } else {
        setTestResult({
          success: false,
          error: response.data.error || "Koneksi ditolak oleh router MikroTik",
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.message || error.message || "Gagal menghubungi router",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test connection for EXISTING server
  const testConnectionExisting = async (serverId: string) => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMessage("");

    try {
      const response = await apiClient.post(`/servers/${serverId}/test-connection`);
      if (response.data.success) {
        setTestResult({
          success: true,
          latency: response.data.latency,
        });
        // Refresh server list in background to update status badges
        fetchServers();
      } else {
        setTestResult({
          success: false,
          error: response.data.error || "Koneksi terputus ke MikroTik",
        });
        fetchServers();
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.message || error.message || "Gagal menghubungi router",
      });
      fetchServers();
    } finally {
      setIsTesting(false);
    }
  };

  // Save new server
  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.host || !formData.username || !formData.password) {
      setErrorMessage("Semua kolom bertanda bintang (*) wajib diisi");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiClient.post("/servers", {
        name: formData.name,
        host: formData.host,
        port: formData.port ? parseInt(formData.port) : undefined,
        username: formData.username,
        password: formData.password,
        useSSL: formData.useSSL,
        hotspotName: formData.hotspotName || undefined,
        dnsName: formData.dnsName || undefined,
      });

      if (response.data) {
        setSuccessMessage("Router MikroTik baru berhasil didaftarkan!");
        await fetchServers();
        // Set new server as active if it's the only one or default
        if (servers.length === 0) {
          setActiveServerId(response.data.id);
        }
        setTimeout(() => {
          closeModals();
        }, 1500);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || "Gagal menyimpan router");
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing server
  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer) return;

    if (!formData.name || !formData.host || !formData.username) {
      setErrorMessage("Nama, Host IP, dan Username wajib diisi");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Hanya kirim password jika diubah oleh user
      const payload: any = {
        name: formData.name,
        host: formData.host,
        port: formData.port ? parseInt(formData.port) : undefined,
        username: formData.username,
        useSSL: formData.useSSL,
        hotspotName: formData.hotspotName || undefined,
        dnsName: formData.dnsName || undefined,
      };

      if (formData.password.trim() !== "") {
        payload.password = formData.password;
      }

      const response = await apiClient.patch(`/servers/${selectedServer.id}`, payload);

      if (response.data) {
        setSuccessMessage("Perubahan data router berhasil disimpan!");
        await fetchServers();
        setIsEditMode(false);
        // Update local object detail
        setSelectedServer(response.data);
        setTestResult(null);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || "Gagal memperbarui router");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete server
  const handleDeleteServer = async () => {
    if (!selectedServer) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      await apiClient.delete(`/servers/${selectedServer.id}`);
      await fetchServers();

      // Jika server yang dihapus adalah server aktif, set active ke server pertama yang tersisa (jika ada)
      if (activeServerId === selectedServer.id) {
        const remaining = servers.filter((s) => s.id !== selectedServer.id);
        if (remaining.length > 0) {
          setActiveServerId(remaining[0].id);
        } else {
          // Kosongkan active server
          if (typeof window !== "undefined") {
            localStorage.removeItem("wifi_active_server_id");
          }
          // refresh page / store state
          window.location.reload();
        }
      }

      closeModals();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || "Gagal menghapus router");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-on-surface">Router Servers</h1>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-full">
              {servers.length} Terdaftar
            </span>
          </div>
          <p className="text-on-surface-variant mt-1 text-sm">
            Kelola koneksi multi-server MikroTik, monitor latensi API, dan sesuaikan kredensial router.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-medium rounded-xl shadow-sm text-sm"
        >
          <Plus className="w-5 h-5" />
          Daftarkan Router
        </button>
      </div>

      {/* Main Grid List */}
      {servers.length === 0 ? (
        /* Empty State */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-sm">
          <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Server className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Belum ada Router yang Terdaftar</h3>
          <p className="text-on-surface-variant mt-2 text-sm max-w-md mx-auto">
            Sistem kami mendukung manajemen multi-server MikroTik sekaligus. Tambahkan router pertama Anda untuk mulai mengelola voucher & transaksi POS.
          </p>

          {/* Setup Guide for IT Admin */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-5 text-left mt-8 space-y-3.5">
            <h4 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Panduan Setup Awal MikroTik (REST API):
            </h4>
            <ol className="text-xs text-on-surface-variant space-y-2.5 list-decimal list-inside">
              <li>
                Pastikan REST API aktif di router MikroTik Anda (RouterOS v7 ke atas). Ketik di Terminal:
                <code className="block mt-1 p-2 bg-surface-variant text-on-surface font-mono rounded border border-outline-variant overflow-x-auto text-[10px]">
                  /ip service enable rest
                </code>
              </li>
              <li>
                Pastikan port API terjangkau dari server sistem kita (Default: port <span className="font-semibold">80</span> HTTP atau port <span className="font-semibold">443</span> HTTPS).
              </li>
              <li>
                Buatlah akun user admin MikroTik khusus dengan hak akses <span className="font-semibold">write</span> dan <span className="font-semibold">api</span>.
              </li>
              <li>
                Klik tombol <span className="text-primary font-semibold">Daftarkan Router</span> di atas, masukkan detail koneksi, klik <span className="font-semibold">Uji Koneksi</span>, lalu simpan!
              </li>
            </ol>
          </div>

          <button
            onClick={openAddModal}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-medium rounded-xl shadow-sm text-sm"
          >
            Mulai Setup Sekarang <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Servers Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const isOnline = server.lastStatus === "ONLINE";
            const isOffline = server.lastStatus === "OFFLINE";
            const isActive = server.id === activeServerId;

            return (
              <div
                key={server.id}
                onClick={() => openDetailModal(server)}
                className={`group relative bg-surface-container-lowest border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer ${isActive ? "border-primary ring-1 ring-primary" : "border-outline-variant"
                  }`}
              >
                {/* Active Indicator Badge */}
                {isActive && (
                  <span className="absolute top-3 right-3 bg-primary-container text-on-primary-container text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                    Aktif
                  </span>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isOnline
                    ? "bg-emerald-500/10 text-emerald-500"
                    : isOffline
                      ? "bg-error-container/20 text-error"
                      : "bg-surface-variant text-on-surface-variant"
                    }`}>
                    <Server className="w-6 h-6" />
                  </div>

                  {/* Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-bold text-on-surface truncate group-hover:text-primary transition-colors pr-8">
                      {server.name}
                    </h3>
                    <p className="text-xs font-mono text-on-surface-variant truncate">
                      {server.host}:{server.port}
                    </p>

                    {/* Visual Badges (Port & SSL status) */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-1.5 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-semibold rounded">
                        API Port {server.port}
                      </span>
                      {server.useSSL ? (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold rounded">
                          <Shield className="w-3 h-3" /> SSL
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded">
                          Plain HTTP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer status bar */}
                <div className="flex items-center justify-between border-t border-outline-variant/55 mt-4 pt-3 text-xs">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                      : isOffline
                        ? "bg-error animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.7)]"
                        : "bg-outline"
                      }`}></div>
                    <span className="font-medium text-on-surface-variant capitalize">
                      {isOnline ? "Online" : isOffline ? "Offline" : "Unknown"}
                    </span>
                  </div>

                  {/* Quick ping info */}
                  {isOnline && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                      <Activity className="w-3 h-3" />
                      Ping Ready
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- MODAL: DAFTAR ROUTER BARU ----------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">Daftarkan Router MikroTik</h3>
                  <p className="text-[11px] text-on-surface-variant">Hubungkan sistem dengan REST API MikroTik</p>
                </div>
              </div>
              <button onClick={closeModals} className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleAddServer}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Error Banner */}
                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-error-container text-on-error-container border border-error/20 rounded-xl text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMessage && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-medium">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Input Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface">Nama Router <span className="text-error">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Router Utama Kafe"
                    className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40"
                    required
                  />
                </div>

                {/* Input Host & Port */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Host IP / Domain <span className="text-error">*</span></label>
                    <input
                      type="text"
                      name="host"
                      value={formData.host}
                      onChange={handleInputChange}
                      placeholder="Contoh: 192.168.88.1"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Port API</label>
                    <input
                      type="number"
                      name="port"
                      value={formData.port}
                      onChange={handleInputChange}
                      placeholder="Kosong = Default"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40"
                    />
                  </div>
                </div>

                {/* Checkbox UseSSL */}
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <input
                    type="checkbox"
                    id="useSSL"
                    name="useSSL"
                    checked={formData.useSSL}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary bg-surface-variant border-outline-variant rounded focus:ring-primary"
                  />
                  <label htmlFor="useSSL" className="text-xs font-medium text-on-surface-variant flex items-center gap-1.5 cursor-pointer select-none">
                    Gunakan SSL (HTTPS) untuk koneksi aman
                    <span title="Centang jika REST API MikroTik menggunakan HTTPS. Port default akan menjadi 443 (jika kolom port dikosongkan).">
                      <Info className="w-3.5 h-3.5 text-on-surface-variant/50" />
                    </span>
                  </label>
                </div>

                {/* Input User & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Username Admin <span className="text-error">*</span></label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="admin"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Password <span className="text-error">*</span></label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40"
                      required
                    />
                  </div>
                </div>

                {/* ── Mikhmon Data ── */}
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-outline-variant/60" />
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1"> Data</span>
                    <div className="h-px flex-1 bg-outline-variant/60" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">Hotspot Name</label>
                      <input
                        type="text"
                        name="hotspotName"
                        value={formData.hotspotName}
                        onChange={handleInputChange}
                        placeholder="Contoh: hotspot1"
                        className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40 font-mono"
                      />
                      <p className="text-[10px] text-on-surface-variant/60">Nama server hotspot di MikroTik (IP › Hotspot › Servers › Name)</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">DNS Name</label>
                      <input
                        type="text"
                        name="dnsName"
                        value={formData.dnsName}
                        onChange={handleInputChange}
                        placeholder="Contoh: hotspot.wifi.com"
                        className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/40 font-mono"
                      />
                      <p className="text-[10px] text-on-surface-variant/60">DNS name login page captive portal pelanggan</p>
                    </div>
                  </div>
                </div>

                {/* Connection Test Result Box */}
                {testResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-error-container border-error/20 text-on-error-container"
                    }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>KONEKSI TERHUBUNG!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-error" />
                          <span>KONEKSI GAGAL TERHUBUNG!</span>
                        </>
                      )}
                    </div>
                    {testResult.success ? (
                      <p className="text-[11px] opacity-90">
                        Sistem berhasil berkomunikasi dengan MikroTik REST API. Latensi: <span className="font-bold">{testResult.latency} ms</span>. Router ini siap digunakan.
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono leading-relaxed break-words opacity-90">
                        Error: {testResult.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Uji Koneksi Button */}
                <button
                  type="button"
                  onClick={testConnectionCustom}
                  disabled={isTesting || isSaving}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-primary/30 text-primary hover:bg-primary/5 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all font-semibold rounded-xl text-xs mt-2"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Sedang Melakukan Ping ke Router...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Uji Koneksi (Test Connection)
                    </>
                  )}
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-5 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={isSaving}
                  className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-semibold rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isTesting}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 disabled:scale-100 transition-all font-semibold rounded-xl text-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan Router
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: DETAIL & EDIT ROUTER ----------------- */}
      {selectedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedServer.lastStatus === "ONLINE" ? "bg-emerald-500/10 text-emerald-500" : "bg-error-container/20 text-error"
                  }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{isEditMode ? "Edit Data Router" : "Detail Koneksi Router"}</h3>
                  <p className="text-[11px] text-on-surface-variant">ID: {selectedServer.id}</p>
                </div>
              </div>
              <button onClick={closeModals} className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (isEditMode) {
                handleUpdateServer(e);
              }
            }}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Success/Error banners */}
                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-error-container text-on-error-container border border-error/20 rounded-xl text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-medium">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* SHOW DETAIL VIEW OR EDIT VIEW */}
                {!isEditMode ? (
                  /* Detail Read Only View */
                  <div className="space-y-4">
                    {/* Status Box */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Status Router</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full ${selectedServer.lastStatus === "ONLINE"
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                            : "bg-error animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.7)]"
                            }`}></div>
                          <span className="font-bold text-on-surface text-sm">
                            {selectedServer.lastStatus === "ONLINE" ? "Online / Terhubung" : "Offline / Terputus"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); testConnectionExisting(selectedServer.id); }}
                        disabled={isTesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50"
                      >
                        {isTesting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Activity className="w-3.5 h-3.5" />
                        )}
                        Ping Ulang
                      </button>
                    </div>

                    {/* Detailed info grid */}
                    <div className="grid grid-cols-2 gap-4 bg-surface-container-low border border-outline-variant/60 rounded-xl p-4.5 text-xs space-y-1.5">
                      <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                        <span className="text-on-surface-variant font-medium">Nama Koneksi:</span>
                        <span className="text-on-surface font-semibold">{selectedServer.name}</span>
                      </div>
                      <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                        <span className="text-on-surface-variant font-medium">Host Address (IP):</span>
                        <span className="text-on-surface font-mono font-semibold">{selectedServer.host}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-outline-variant/30 pr-2">
                        <span className="text-on-surface-variant font-medium">Port API:</span>
                        <span className="text-on-surface font-semibold">{selectedServer.port}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-outline-variant/30 pl-2">
                        <span className="text-on-surface-variant font-medium">Keamanan SSL:</span>
                        <span className="text-on-surface font-semibold flex items-center gap-1">
                          {selectedServer.useSSL ? (
                            <><Shield className="w-3 h-3 text-emerald-500" /> Aktif (HTTPS)</>
                          ) : (
                            <><ShieldAlert className="w-3 h-3 text-amber-500" /> Nonaktif (HTTP)</>
                          )}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                        <span className="text-on-surface-variant font-medium">Username login:</span>
                        <span className="text-on-surface font-mono font-semibold">{selectedServer.username}</span>
                      </div>
                      {selectedServer.hotspotName && (
                        <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                          <span className="text-on-surface-variant font-medium">Hotspot Name:</span>
                          <span className="text-on-surface font-mono font-semibold">{selectedServer.hotspotName}</span>
                        </div>
                      )}
                      {selectedServer.dnsName && (
                        <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                          <span className="text-on-surface-variant font-medium">DNS Name:</span>
                          <span className="text-on-surface font-mono font-semibold">{selectedServer.dnsName}</span>
                        </div>
                      )}
                      {selectedServer.lastCheckedAt && (
                        <div className="col-span-2 flex justify-between py-1.5">
                          <span className="text-on-surface-variant font-medium">Terakhir dicek:</span>
                          <span className="text-on-surface-variant">{new Date(selectedServer.lastCheckedAt).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Edit Mode Form Fields */
                  <div className="space-y-4">
                    {/* Warning Edit */}
                    <div className="p-3 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-xl text-[11px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <span>
                        Mengubah data host/kredensial yang salah dapat memutus integrasi voucher POS secara real-time. Lakukan test connection sebelum menyimpan.
                      </span>
                    </div>

                    {/* Input Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">Nama Router</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                        required
                      />
                    </div>

                    {/* Host & Port */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface">Host IP / Domain</label>
                        <input
                          type="text"
                          name="host"
                          value={formData.host}
                          onChange={handleInputChange}
                          className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface">Port API</label>
                        <input
                          type="number"
                          name="port"
                          value={formData.port}
                          onChange={handleInputChange}
                          className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* SSL */}
                    <div className="flex items-center gap-2.5 px-1">
                      <input
                        type="checkbox"
                        id="edit_useSSL"
                        name="useSSL"
                        checked={formData.useSSL}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary bg-surface-variant border-outline-variant rounded"
                      />
                      <label htmlFor="edit_useSSL" className="text-xs font-medium text-on-surface-variant cursor-pointer select-none">
                        Gunakan SSL (HTTPS) untuk koneksi aman
                      </label>
                    </div>

                    {/* User & Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface">Username Admin</label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface">Password <span className="text-on-surface-variant/40 font-normal">(Isi jika ingin diubah)</span></label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/40"
                        />
                      </div>
                    </div>

                    {/* ── Mikhmon Data ── */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-outline-variant/60" />
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Mikhmon Data (Opsional)</span>
                        <div className="h-px flex-1 bg-outline-variant/60" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-on-surface">Hotspot Name</label>
                          <input
                            type="text"
                            name="hotspotName"
                            value={formData.hotspotName}
                            onChange={handleInputChange}
                            placeholder="Contoh: hotspot1"
                            className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none font-mono placeholder:text-on-surface-variant/40"
                          />
                          <p className="text-[10px] text-on-surface-variant/60">IP › Hotspot › Servers › Name</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-on-surface">DNS Name</label>
                          <input
                            type="text"
                            name="dnsName"
                            value={formData.dnsName}
                            onChange={handleInputChange}
                            placeholder="Contoh: hotspot.wifi.com"
                            className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none font-mono placeholder:text-on-surface-variant/40"
                          />
                          <p className="text-[10px] text-on-surface-variant/60">DNS captive portal login page</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connection Test Result (Both in edit and view modes) */}
                {testResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-error-container border-error/20 text-on-error-container"
                    }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>KONEKSI TERHUBUNG!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-error" />
                          <span>KONEKSI GAGAL TERHUBUNG!</span>
                        </>
                      )}
                    </div>
                    {testResult.success ? (
                      <p className="text-[11px] opacity-90">
                        Sistem berhasil menghubungi MikroTik REST API. Latensi: <span className="font-bold">{testResult.latency} ms</span>.
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono leading-relaxed break-words opacity-90">
                        Error: {testResult.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Test Connection Button in Edit Mode */}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); testConnectionCustom(); }}
                    disabled={isTesting || isSaving}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-primary/30 text-primary hover:bg-primary/5 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all font-semibold rounded-xl text-xs mt-2"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Pinging...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        Uji Koneksi Data Baru (Test Connection)
                      </>
                    )}
                  </button>
                )}

                {/* SHOW DELETE CONFIRM DOCK */}
                {showDeleteConfirm && (
                  <div className="p-4 bg-error-container border border-error/25 rounded-xl text-xs space-y-3 animate-fade-in mt-4">
                    <div className="flex items-start gap-2.5 text-on-error-container font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
                      <div>
                        <span>HAPUS ROUTER INI SEPENUHNYA?</span>
                        <p className="text-[10px] font-normal opacity-85 mt-0.5 leading-relaxed">
                          Tindakan ini tidak dapat dibatalkan. Menghapus router akan mematikan monitoring, integrasi POS, dan manajemen voucher untuk outlet/kafe yang terhubung ke server ini.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 border border-outline-variant bg-surface-container-low hover:bg-surface-variant text-on-surface-variant font-bold rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteServer}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-error text-on-error hover:bg-error/90 font-bold rounded-lg flex items-center gap-1"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Ya, Hapus Router
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-outline-variant bg-surface-container-low flex justify-between items-center gap-3">
                {/* Delete button (only show when not confirming delete) */}
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowDeleteConfirm(true); }}
                    disabled={isSaving || isTesting}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-error hover:bg-error-container border border-error/10 hover:border-transparent rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex justify-end gap-3">
                  {!isEditMode ? (
                    /* Read Mode actions */
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); closeModals(); }}
                        className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-semibold rounded-xl text-xs transition-colors"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setIsEditMode(true); }}
                        className="flex items-center gap-1 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 font-semibold rounded-xl text-xs transition-colors active:scale-[0.98]"
                      >
                        Edit Router
                      </button>
                    </>
                  ) : (
                    /* Edit Mode actions */
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditMode(false);
                          setTestResult(null);
                          setErrorMessage("");
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-semibold rounded-xl text-xs transition-colors"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || isTesting}
                        className="flex items-center gap-1.5 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 font-semibold rounded-xl text-xs transition-all active:scale-[0.97] disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Simpan Perubahan
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
