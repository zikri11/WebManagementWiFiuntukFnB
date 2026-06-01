"use client";

import { useServerStore } from "@/store/server-store";
import apiClient from "@/lib/api-client";
import { useEffect, useState } from "react";
import {
  Plus,
  Users,
  Clock,
  Tag,
  Check,
  X,
  AlertCircle,
  Info,
  Loader2,
  Settings,
  Activity,
  Trash2,
  RefreshCw,
  TrendingUp,
  Download,
  Upload,
  ArrowRight,
  Server
} from "lucide-react";

interface HotspotProfile {
  id: string;
  serverId: string;
  name: string;
  rateLimit: string;
  sessionTimeout: string | null;
  idleTimeout: string | null;
  sharedUsers: number;
  validity: string | null;
  description: string | null;
  syncedToRouter: boolean;
  createdAt: string;
  server?: {
    name: string;
  };
}

export default function ProfilesPage() {
  const { activeServerId, servers, fetchServers } = useServerStore();
  const [profiles, setProfiles] = useState<HotspotProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<HotspotProfile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states (common for both add and edit)
  const [formData, setFormData] = useState({
    name: "",
    rateLimit: "",
    sessionTimeout: "",
    idleTimeout: "",
    sharedUsers: 1,
    validity: "",
    description: "",
  });

  // Action & Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeServer = servers.find((s) => s.id === activeServerId);

  // Load profiles on mount or when activeServerId changes
  useEffect(() => {
    fetchServers();
    loadProfiles();
  }, [activeServerId, fetchServers]);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/profiles");
      // Filter profiles by activeServerId
      if (activeServerId) {
        const filtered = response.data.filter(
          (p: HotspotProfile) => p.serverId === activeServerId
        );
        setProfiles(filtered);
      } else {
        setProfiles([]);
      }
    } catch (error: any) {
      console.error("Failed to load profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Input Changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "sharedUsers" ? parseInt(value) || 1 : value,
    }));
  };

  // Preset Rate Limit speed selection
  const selectRateLimitPreset = (preset: string) => {
    setFormData((prev) => ({
      ...prev,
      rateLimit: preset,
    }));
  };

  // Reset form states
  const resetForm = () => {
    setFormData({
      name: "",
      rateLimit: "1M/2M", // default rateLimit preset
      sessionTimeout: "",
      idleTimeout: "",
      sharedUsers: 1,
      validity: "",
      description: "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditMode(false);
    setShowDeleteConfirm(false);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openDetailModal = (profile: HotspotProfile) => {
    resetForm();
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      rateLimit: profile.rateLimit,
      sessionTimeout: profile.sessionTimeout || "",
      idleTimeout: profile.idleTimeout || "",
      sharedUsers: profile.sharedUsers,
      validity: profile.validity || "",
      description: profile.description || "",
    });
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setSelectedProfile(null);
    resetForm();
  };

  // Synchronize profiles FROM active router
  const syncFromRouter = async () => {
    if (!activeServerId) {
      setErrorMessage("Silakan pilih router aktif di pojok kiri atas terlebih dahulu");
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiClient.post(`/profiles/sync/${activeServerId}`);
      if (response.data) {
        const { totalRouterProfiles, importedCount, importedVouchersCount } = response.data;
        setSuccessMessage(
          `Sukses menarik data dari router! Total ${totalRouterProfiles} profil ditemukan, ${importedCount} profil baru & ${importedVouchersCount || 0} voucher/user berhasil diimpor.`
        );
        await loadProfiles();
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message ||
        error.message ||
        "Gagal melakukan sinkronisasi profil dari router"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Create new Hotspot Profile
  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServerId) {
      setErrorMessage("Router aktif tidak terdeteksi. Silakan hubungkan router terlebih dahulu.");
      return;
    }

    // Validation
    const nameRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!nameRegex.test(formData.name)) {
      setErrorMessage(
        "Nama profil tidak valid. MikroTik mewajibkan nama tanpa spasi (gunakan underscore '_' atau dash '-')."
      );
      return;
    }

    if (!formData.name || !formData.rateLimit) {
      setErrorMessage("Nama profil dan Rate Limit (Bandwidth) wajib diisi.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        serverId: activeServerId,
        name: formData.name,
        rateLimit: formData.rateLimit,
        sessionTimeout: formData.sessionTimeout || undefined,
        idleTimeout: formData.idleTimeout || undefined,
        sharedUsers: formData.sharedUsers,
        validity: formData.validity || undefined,
        description: formData.description || undefined,
      };

      const response = await apiClient.post("/profiles", payload);

      if (response.data) {
        setSuccessMessage("Profil hotspot baru berhasil disimpan & dibuat di router MikroTik!");
        await loadProfiles();
        setTimeout(() => {
          closeModals();
        }, 1500);
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || "Gagal membuat profil hotspot baru"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    // Validation
    const nameRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!nameRegex.test(formData.name)) {
      setErrorMessage("Nama profil tidak boleh ada spasi (gunakan underscore '_' atau dash '-')");
      return;
    }

    if (!formData.name || !formData.rateLimit) {
      setErrorMessage("Nama dan Rate Limit (Bandwidth) wajib diisi");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        name: formData.name,
        rateLimit: formData.rateLimit,
        sessionTimeout: formData.sessionTimeout || null,
        idleTimeout: formData.idleTimeout || null,
        sharedUsers: formData.sharedUsers,
        validity: formData.validity || null,
        description: formData.description || null,
      };

      const response = await apiClient.patch(`/profiles/${selectedProfile.id}`, payload);

      if (response.data) {
        setSuccessMessage("Profil hotspot berhasil diperbarui di database & MikroTik!");
        await loadProfiles();
        setIsEditMode(false);
        setSelectedProfile(response.data);
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || "Gagal memperbarui profil"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Sync profile again (Force push to router if out of sync)
  const handleForceSyncProfile = async (profile: HotspotProfile) => {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const payload = {
        name: profile.name,
        rateLimit: profile.rateLimit,
        sessionTimeout: profile.sessionTimeout,
        idleTimeout: profile.idleTimeout,
        sharedUsers: profile.sharedUsers,
        validity: profile.validity,
        description: profile.description,
      };

      await apiClient.patch(`/profiles/${profile.id}`, payload);
      setSuccessMessage("Profil berhasil di-push ulang dan tersinkronisasi di router!");
      await loadProfiles();
      // update modal if open
      if (selectedProfile?.id === profile.id) {
        const updated = { ...profile, syncedToRouter: true };
        setSelectedProfile(updated);
      }
    } catch (error: any) {
      setErrorMessage("Gagal menyinkronkan ulang ke router: " + (error.message || "error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete profile
  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      await apiClient.delete(`/profiles/${selectedProfile.id}`);
      await loadProfiles();
      closeModals();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || "Gagal menghapus profil"
      );
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
            <h1 className="text-2xl font-bold text-on-surface">Hotspot Profiles</h1>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-full">
              {profiles.length} Profil Aktif
            </span>
          </div>
          <p className="text-on-surface-variant mt-1 text-sm">
            {activeServer
              ? `Mengelola konfigurasi paket internet & voucher MikroTik di server: ${activeServer.name}`
              : "Pilihlah salah satu router di atas untuk mengelola profil hotspot."}
          </p>
        </div>

        {activeServerId && (
          <div className="flex items-center gap-3">
            <button
              onClick={syncFromRouter}
              disabled={isSyncing || isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-outline-variant text-on-surface-variant bg-surface-container-lowest hover:bg-surface-variant active:scale-[0.98] disabled:opacity-50 transition-all font-semibold rounded-xl text-sm"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <RefreshCw className="w-4 h-4 text-on-surface-variant" />
              )}
              Sync dari Router
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-medium rounded-xl shadow-sm text-sm"
            >
              <Plus className="w-5 h-5" />
              Buat Profile
            </button>
          </div>
        )}
      </div>

      {/* Success/Error global alert banner */}
      {successMessage && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-medium animate-fade-in">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!activeServerId ? (
        /* Empty State: No Router Selected */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Router Belum Terpilih</h3>
          <p className="text-on-surface-variant mt-2 text-sm max-w-md mx-auto">
            Sistem WiFi Management bekerja secara dinamis berbasis multi-server. Silakan pilih salah satu router yang aktif terlebih dahulu di dropdown atas untuk mengelola profil hotspotnya.
          </p>
        </div>
      ) : isLoading ? (
        /* Loading skeleton state */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-surface-container-low rounded-2xl border border-outline-variant/60"></div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        /* Empty State: No profiles for selected server */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-sm">
          <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Belum ada Profil di Router Ini</h3>
          <p className="text-on-surface-variant mt-2 text-sm max-w-md mx-auto">
            Voucher hotspot memerlukan profil agar mengetahui batasan bandwidth, kuota, atau masa aktif perangkat. Anda dapat mengimpor profil bawaan atau membuat profil baru.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
            <button
              onClick={syncFromRouter}
              disabled={isSyncing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 border border-outline-variant text-on-surface hover:bg-surface-variant font-semibold rounded-xl text-sm"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Impor Otomatis Bawaan MikroTik
            </button>
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-medium rounded-xl shadow-sm text-sm"
            >
              Buat Profil Kustom <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Profiles Grid list */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => {
            const isSynced = profile.syncedToRouter;
            // Parse rate limit uplink/downlink for nicer display
            // Format format: upload/download like 1M/2M
            const speeds = profile.rateLimit.split("/");
            const uploadSpeed = speeds[0] || "?";
            const downloadSpeed = speeds[1] || "?";

            return (
              <div
                key={profile.id}
                onClick={() => openDetailModal(profile)}
                className="group relative bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Profile name & Sync status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-on-surface text-base truncate group-hover:text-primary transition-colors">
                        {profile.name}
                      </h3>
                      {profile.description ? (
                        <p className="text-xs text-on-surface-variant truncate max-w-[200px]" title={profile.description}>
                          {profile.description}
                        </p>
                      ) : (
                        <p className="text-xs text-on-surface-variant/40 italic">Tanpa deskripsi</p>
                      )}
                    </div>

                    {/* Sync Indicator Dot */}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${isSynced
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-error-container border-error/20 text-on-error-container"
                        }`}
                      title={isSynced ? "Profil tersinkronisasi di router" : "Gagal sinkronisasi ke router"}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-error animate-pulse"
                        }`} />
                      {isSynced ? "Tersinkron" : "Tidak Sinkron"}
                    </div>
                  </div>

                  {/* Mikhmon Parameters UI Layout */}
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 py-3 border-y border-outline-variant/50 text-xs">
                    {/* Bandwidth Rate Limit */}
                    <div className="space-y-0.5 col-span-2">
                      <span className="text-[10px] text-on-surface-variant/75 font-semibold uppercase tracking-wider">Limit Bandwidth</span>
                      <div className="flex items-center gap-2 text-on-surface font-semibold">
                        <Activity className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex items-center gap-1">
                          <Upload className="w-3 h-3 text-on-surface-variant" />
                          <span>{uploadSpeed}</span>
                          <span className="text-on-surface-variant/50">/</span>
                          <Download className="w-3 h-3 text-on-surface-variant" />
                          <span>{downloadSpeed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Shared Users */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-on-surface-variant/75 font-semibold uppercase tracking-wider">Shared Users</span>
                      <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                        <Users className="w-4 h-4 text-on-surface-variant" />
                        <span>{profile.sharedUsers} Device</span>
                      </div>
                    </div>

                    {/* Validity Duration */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-on-surface-variant/75 font-semibold uppercase tracking-wider">Masa Aktif</span>
                      <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                        <Tag className="w-4 h-4 text-on-surface-variant" />
                        <span>{profile.validity || "Tanpa Batas"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Sesi timeouts */}
                <div className="flex items-center justify-between mt-3 text-[11px] text-on-surface-variant pt-1">
                  <div className="flex items-center gap-1" title="Session Timeout">
                    <Clock className="w-3.5 h-3.5 text-on-surface-variant/55" />
                    <span>Sesi: {profile.sessionTimeout || "Unlimited"}</span>
                  </div>
                  {profile.idleTimeout && (
                    <div className="text-[10px] bg-surface-variant px-1.5 py-0.5 rounded">
                      Idle: {profile.idleTimeout}
                    </div>
                  )}
                </div>

                {/* Force sync fix action inside grid card if desynced */}
                {!isSynced && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleForceSyncProfile(profile);
                    }}
                    className="absolute bottom-16 right-5 bg-error text-on-error hover:bg-error/95 px-2.5 py-1 text-[10px] font-bold rounded-lg shadow transition-transform active:scale-95 flex items-center gap-1"
                    title="Profil gagal dibuat di MikroTik karena kendala jaringan. Klik untuk coba dorong kembali."
                  >
                    <RefreshCw className="w-3 h-3 animate-spin-reverse" />
                    Perbaiki Sinkronisasi
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- MODAL: BUAT PROFILE BARU ----------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-low">
              <div>
                <h3 className="font-bold text-on-surface">Buat Profil Hotspot</h3>
                <p className="text-[11px] text-on-surface-variant">Konfigurasi profile hotspot</p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  closeModals();
                }}
                className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddProfile(e);
              }}
            >
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

                {/* Profile Target Server Info */}
                <div className="flex items-start gap-2 text-[11px] text-on-surface-variant/80 pb-2">
                  <Server className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Profil akan disimpan di database & disinkronkan ke router: <span className="font-bold text-on-surface">{activeServer?.name}</span>
                  </span>
                </div>

                {/* Input Profile Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Nama Profil <span className="text-error">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Paket_1_Jam (tanpa spasi)"
                    className="w-full bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/30 transition-all"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant/50 px-1">Gunakan underscore (_) atau minus (-) sebagai pengganti spasi.</p>
                </div>

                {/* Input Rate Limit (Bandwidth) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Rate Limit (Bandwidth) <span className="text-error">*</span></label>
                    <span className="text-[9px] text-on-surface-variant/60">Upload/Download</span>
                  </div>
                  <input
                    type="text"
                    name="rateLimit"
                    value={formData.rateLimit}
                    onChange={handleInputChange}
                    placeholder="1M/2M"
                    className="w-full bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/30 font-mono transition-all"
                    required
                  />
                  {/* Preset quick selection */}
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {["512k/1M", "1M/1M", "2M/2M", "5M/5M"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          selectRateLimitPreset(preset);
                        }}
                        className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${formData.rateLimit === preset
                            ? "bg-primary text-on-primary shadow-sm"
                            : "bg-surface-variant text-on-surface-variant hover:text-on-surface"
                          }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shared Users */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Shared Users</label>
                    <input
                      type="number"
                      name="sharedUsers"
                      min="1"
                      max="100"
                      value={formData.sharedUsers}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
                      required
                    />
                  </div>

                  {/* Validity Duration (Masa Aktif) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Masa Aktif (Validity)</label>
                    <input
                      type="text"
                      name="validity"
                      value={formData.validity}
                      onChange={handleInputChange}
                      placeholder="1d, 12h, 30m"
                      className="w-full bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/30 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Session Timeout & Idle Timeout */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Session Timeout</label>
                    <input
                      type="text"
                      name="sessionTimeout"
                      value={formData.sessionTimeout}
                      onChange={handleInputChange}
                      placeholder="Contoh: 1h"
                      className="w-full bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/30 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Idle Timeout</label>
                    <input
                      type="text"
                      name="idleTimeout"
                      value={formData.idleTimeout}
                      onChange={handleInputChange}
                      placeholder="Contoh: 5m"
                      className="w-full bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/30 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Input Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">Deskripsi (Opsional)</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Catatan kecil untuk paket ini..."
                    className="w-full h-16 bg-transparent border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/30 resize-none transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-5 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    closeModals();
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-semibold rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 transition-all font-semibold rounded-xl text-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Buat Profil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: DETAIL & EDIT PROFILE ----------------- */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary`}>
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">
                    {isEditMode ? "Edit Profil Hotspot" : "Detail Profil Hotspot"}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">ID: {selectedProfile.id}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  closeModals();
                }}
                className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form / Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isEditMode) {
                  handleUpdateProfile(e);
                }
              }}
            >
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
                    {/* Status Sinkronisasi Box */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Integrasi MikroTik</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full ${selectedProfile.syncedToRouter
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                              : "bg-error animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.7)]"
                            }`}></div>
                          <span className="font-bold text-on-surface text-sm">
                            {selectedProfile.syncedToRouter ? "Tersinkronisasi & Aktif" : "Gagal / Tidak Sinkron"}
                          </span>
                        </div>
                      </div>
                      {!selectedProfile.syncedToRouter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleForceSyncProfile(selectedProfile);
                          }}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                          Push ke Router
                        </button>
                      )}
                    </div>

                    {/* Mikhmon Parameters details */}
                    <div className="grid grid-cols-2 gap-4 bg-surface-container-low border border-outline-variant/60 rounded-xl p-4.5 text-xs space-y-1">
                      <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                        <span className="text-on-surface-variant font-medium">Nama Profil:</span>
                        <span className="text-on-surface font-semibold">{selectedProfile.name}</span>
                      </div>
                      <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                        <span className="text-on-surface-variant font-medium">Limit Kecepatan (Rate Limit):</span>
                        <span className="text-on-surface font-mono font-semibold">{selectedProfile.rateLimit}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-outline-variant/30 pr-2">
                        <span className="text-on-surface-variant font-medium">Shared Users:</span>
                        <span className="text-on-surface font-semibold">{selectedProfile.sharedUsers} Perangkat</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-outline-variant/30 pl-2">
                        <span className="text-on-surface-variant font-medium">Masa Aktif (Validity):</span>
                        <span className="text-on-surface font-semibold">{selectedProfile.validity || "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-outline-variant/30 pr-2">
                        <span className="text-on-surface-variant font-medium">Session Timeout:</span>
                        <span className="text-on-surface font-semibold">{selectedProfile.sessionTimeout || "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-outline-variant/30 pl-2">
                        <span className="text-on-surface-variant font-medium">Idle Timeout:</span>
                        <span className="text-on-surface font-semibold">{selectedProfile.idleTimeout || "Unlimited"}</span>
                      </div>
                      <div className="col-span-2 flex justify-between py-1.5 border-b border-outline-variant/30">
                        <span className="text-on-surface-variant font-medium">MikroTik Host Server:</span>
                        <span className="text-on-surface font-semibold">{selectedProfile.server?.name || "MikroTik Server"}</span>
                      </div>
                      {selectedProfile.description && (
                        <div className="col-span-2 space-y-1 pt-1">
                          <span className="text-on-surface-variant font-medium block">Catatan / Deskripsi:</span>
                          <p className="p-3 bg-surface-variant text-on-surface rounded-lg italic">
                            "{selectedProfile.description}"
                          </p>
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
                        Mengubah profil akan otomatis menghapus profil lama di router MikroTik dan mendaftarkan profil baru untuk mencegah duplikasi atau konflik ID.
                      </span>
                    </div>

                    {/* Input Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">Nama Profil</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                        required
                      />
                    </div>

                    {/* Rate Limit */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-on-surface">Rate Limit (Upload/Download)</label>
                      <input
                        type="text"
                        name="rateLimit"
                        value={formData.rateLimit}
                        onChange={handleInputChange}
                        className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none font-mono"
                        required
                      />
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["512k/512k", "512k/1M", "1M/1M", "1M/2M", "2M/2M", "2M/4M", "5M/5M"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              selectRateLimitPreset(preset);
                            }}
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded border transition-colors ${formData.rateLimit === preset
                                ? "bg-primary/10 border-primary text-primary"
                                : "border-outline-variant text-on-surface-variant hover:bg-surface-variant"
                              }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shared Users */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">Shared Users</label>
                      <input
                        type="number"
                        name="sharedUsers"
                        min="1"
                        max="100"
                        value={formData.sharedUsers}
                        onChange={handleInputChange}
                        className="w-24 bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none font-semibold text-center"
                        required
                      />
                    </div>

                    {/* Validity */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">Masa Aktif Voucher (Validity)</label>
                      <input
                        type="text"
                        name="validity"
                        value={formData.validity}
                        onChange={handleInputChange}
                        className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                      />
                    </div>

                    {/* timeouts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface">Session Timeout</label>
                        <input
                          type="text"
                          name="sessionTimeout"
                          value={formData.sessionTimeout}
                          onChange={handleInputChange}
                          className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface">Idle Timeout</label>
                        <input
                          type="text"
                          name="idleTimeout"
                          value={formData.idleTimeout}
                          onChange={handleInputChange}
                          className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface">Deskripsi</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full h-16 bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* SHOW DELETE CONFIRM BLOCK */}
                {showDeleteConfirm && (
                  <div className="p-4 bg-error-container border border-error/25 rounded-xl text-xs space-y-3 animate-fade-in mt-4">
                    <div className="flex items-start gap-2.5 text-on-error-container font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
                      <div>
                        <span>HAPUS PROFIL HOTSPOT INI?</span>
                        <p className="text-[10px] font-normal opacity-85 mt-0.5 leading-relaxed">
                          Tindakan ini akan menghapus data profil dari database dan menyingkirkannya dari setelan MikroTik secara permanen. Voucher yang sudah dibuat menggunakan profil ini berpotensi gagal login di router jika profilnya hilang.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowDeleteConfirm(false);
                        }}
                        className="px-3 py-1.5 border border-outline-variant bg-surface-container-low hover:bg-surface-variant text-on-surface-variant font-bold rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteProfile();
                        }}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-error text-on-error hover:bg-error/90 font-bold rounded-lg flex items-center gap-1"
                      >
                        {isSaving ? <Loader2 className="w-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Ya, Hapus Profil
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-outline-variant bg-surface-container-low flex justify-between items-center gap-3">
                {/* Delete trigger (only show when not confirming delete) */}
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeleteConfirm(true);
                    }}
                    disabled={isSaving}
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
                    /* Read Mode footer actions */
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          closeModals();
                        }}
                        className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-semibold rounded-xl text-xs transition-colors"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditMode(true);
                        }}
                        className="flex items-center gap-1 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 font-semibold rounded-xl text-xs transition-colors active:scale-[0.98]"
                      >
                        Edit Profil
                      </button>
                    </>
                  ) : (
                    /* Edit Mode footer actions */
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditMode(false);
                          setErrorMessage("");
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-semibold rounded-xl text-xs transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.97] transition-all font-semibold rounded-xl text-xs"
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
