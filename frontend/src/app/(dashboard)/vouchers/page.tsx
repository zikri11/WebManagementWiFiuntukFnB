"use client";

import { useServerStore } from "@/store/server-store";
import { useToastStore } from "@/store/toast-store";
import apiClient from "@/lib/api-client";
import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Ticket,
  Download,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Loader2,
  Activity,
  FileText,
  X,
  Check,
  CheckCircle,
  Printer,
  RefreshCw,
  Settings,
  ArrowRight,
  Sparkles,
  Type,
  Hash,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Layers,
  Trash2
} from "lucide-react";

interface VoucherProfile {
  name: string;
  rateLimit: string;
  validity: string | null;
}

interface Voucher {
  id: string;
  serverId: string;
  profileId: string;
  username: string;
  password: string;
  status: "UNUSED" | "USED" | "REVOKED" | "EXPIRED";
  batchId: string | null;
  outletName: string | null;
  usedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  profile?: VoucherProfile;
  server?: {
    name: string;
  };
}

interface HotspotProfile {
  id: string;
  serverId: string;
  name: string;
  rateLimit: string;
  validity: string | null;
}

type CharFormat = "UPPERCASE" | "LOWERCASE" | "MIXED_CASE" | "LETTERS_ONLY" | "NUMBERS_ONLY" | "ALPHANUMERIC";

const charFormatOptions: {
  value: CharFormat;
  label: string;
  description: string;
  preview: string;
  icon: React.ReactNode;
}[] = [
  { value: "UPPERCASE",    label: "Huruf Besar",    description: "A–Z saja",       preview: "KAFE-WXBZ",   icon: <span className="text-xs font-bold">AA</span> },
  { value: "LOWERCASE",    label: "Huruf Kecil",    description: "a–z saja",       preview: "kafe-wxbz",   icon: <span className="text-xs font-bold">aa</span> },
  { value: "MIXED_CASE",   label: "Besar & Kecil",  description: "Acak mixed",     preview: "KaFe-WxBz",   icon: <span className="text-xs font-bold">Aa</span> },
  { value: "LETTERS_ONLY", label: "Huruf Saja",     description: "Tanpa angka",    preview: "ABCXYZ",      icon: <Type className="w-3.5 h-3.5" /> },
  { value: "NUMBERS_ONLY", label: "Angka Saja",     description: "0–9 saja",       preview: "284739",      icon: <Hash className="w-3.5 h-3.5" /> },
  { value: "ALPHANUMERIC", label: "Campuran",        description: "Huruf + Angka", preview: "K4F3-8W2Z",   icon: <Shuffle className="w-3.5 h-3.5" /> },
];

export default function VouchersPage() {
  const { activeServerId, servers, fetchServers, syncActiveServer, isSyncing } = useServerStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [profiles, setProfiles] = useState<HotspotProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Tab States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [generatorTab, setGeneratorTab] = useState<"single" | "batch">("single");

  // Filtering & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [profileFilter, setProfileFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Delete States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States (Single Voucher)
  const [singleForm, setSingleForm] = useState({
    profileId: "",
    username: "",
    password: "",
    outletName: "",
  });

  // Form States (Batch Voucher)
  const [batchForm, setBatchForm] = useState({
    profileId: "",
    count: 50,
    usernamePrefix: "",
    charLength: 6,
    charFormat: "UPPERCASE" as CharFormat,
    outletName: "",
  });

  // Batch Processing Popup
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProcessingInfo, setBatchProcessingInfo] = useState<{
    count: number;
    profileName: string;
    batchId: string | null;
    done: boolean;
  } | null>(null);

  // Action Loading & Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [latestBatchId, setLatestBatchId] = useState<string | null>(null);

  const activeServer = servers.find((s) => s.id === activeServerId);

  // Load vouchers and profiles
  useEffect(() => {
    fetchServers();
    loadVouchers();
    loadProfiles();
  }, [activeServerId, fetchServers]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, statusFilter, profileFilter, itemsPerPage]);

  const loadVouchers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/vouchers");
      // Hanya tampilkan voucher milik server yang sedang aktif
      if (activeServerId) {
        const filtered = response.data.filter((v: Voucher) => v.serverId === activeServerId);
        setVouchers(filtered);
      } else {
        setVouchers([]);
      }
    } catch (error: any) {
      console.error("Failed to load vouchers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!activeServerId) return;
    const toast = useToastStore.getState();
    const result = await syncActiveServer(activeServerId);
    await loadVouchers();
    await loadProfiles();

    if (result === null) {
      toast.error(
        "Gagal terhubung ke router MikroTik. Periksa koneksi lalu coba lagi.",
        "Sinkronisasi gagal",
      );
    } else if (result.usersSynced === false) {
      // Profil tersinkron tetapi daftar user gagal ditarik — voucher TIDAK diubah.
      // (Cegah bug "web kosong": data voucher lokal sengaja dipertahankan.)
      toast.warning(
        "Profil tersinkron, tetapi daftar voucher gagal ditarik. Data voucher lokal dipertahankan (tidak dihapus). Silakan coba lagi.",
        "Sinkronisasi sebagian",
      );
    } else {
      toast.success("Data profil & voucher berhasil diselaraskan dengan router.", "Sinkronisasi berhasil");
    }
  };

  const executeDelete = async () => {
    const toast = useToastStore.getState();
    setIsDeleting(true);
    try {
      const response = await apiClient.post("/vouchers/delete-bulk", { ids: deleteTarget });
      const data = response.data;

      // Selalu refresh daftar — sebagian voucher mungkin sudah terhapus
      setSelectedIds([]);
      await loadVouchers();
      setIsDeleteModalOpen(false);

      if (data?.failedCount && data.failedCount > 0) {
        // Partial-safe: sebagian gagal dihapus di router → voucher tsb TETAP ada di DB
        toast.warning(
          `${data.deletedCount} voucher terhapus, ${data.failedCount} gagal dihapus di router dan tetap tersimpan. Silakan coba lagi.`,
          "Sebagian gagal dihapus",
        );
      } else {
        toast.success(`${data?.deletedCount ?? deleteTarget.length} voucher berhasil dihapus.`, "Berhasil dihapus");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.message || "Terjadi kesalahan saat menghapus voucher.",
        "Gagal menghapus",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await apiClient.get("/profiles");
      if (activeServerId) {
        const filtered = response.data.filter((p: HotspotProfile) => p.serverId === activeServerId);
        setProfiles(filtered);
        
        // Auto-select first profile for forms
        if (filtered.length > 0) {
          setSingleForm((prev) => ({ ...prev, profileId: filtered[0].id }));
          setBatchForm((prev) => ({ ...prev, profileId: filtered[0].id }));
        }
      } else {
        setProfiles([]);
      }
    } catch (error: any) {
      console.error("Failed to load profiles:", error);
    }
  };

  // Form Handlers (Single)
  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSingleForm((prev) => ({ ...prev, [name]: value }));
  };

  // Form Handlers (Batch)
  const handleBatchInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBatchForm((prev) => ({
      ...prev,
      [name]: name === "count" || name === "charLength" ? parseInt(value) || 0 : value,
    }));
  };

  // Quick select preset counts for batch
  const selectBatchCountPreset = (presetCount: number) => {
    setBatchForm((prev) => ({ ...prev, count: presetCount }));
  };

  const resetForm = () => {
    setSingleForm({
      profileId: profiles[0]?.id || "",
      username: "",
      password: "",
      outletName: activeServer?.name || "",
    });
    setBatchForm({
      profileId: profiles[0]?.id || "",
      count: 50,
      usernamePrefix: "",
      charLength: 6,
      charFormat: "UPPERCASE",
      outletName: activeServer?.name || "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setLatestBatchId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    resetForm();
  };

  // Generate Single Voucher
  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServerId) {
      setErrorMessage("Silakan pilih router aktif terlebih dahulu.");
      return;
    }
    if (!singleForm.profileId) {
      setErrorMessage("Profil hotspot wajib dipilih.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        serverId: activeServerId,
        profileId: singleForm.profileId,
        username: singleForm.username || undefined,
        password: singleForm.password || undefined,
        outletName: singleForm.outletName || undefined,
      };

      const response = await apiClient.post("/vouchers/single", payload);
      if (response.data) {
        setSuccessMessage(`Voucher "${response.data.username}" berhasil dibuat!`);
        await loadVouchers();
        setTimeout(() => {
          closeAddModal();
        }, 1500);
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || "Gagal membuat voucher tunggal"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Batch Vouchers (BullMQ Background Queue)
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServerId) {
      setErrorMessage("Silakan pilih router aktif terlebih dahulu.");
      return;
    }
    if (!batchForm.profileId) {
      setErrorMessage("Profil hotspot wajib dipilih.");
      return;
    }
    if (batchForm.count < 1 || batchForm.count > 200) {
      setErrorMessage("Jumlah voucher per batch minimal 1 dan maksimal 200.");
      return;
    }

    const selectedProfileName = profiles.find(p => p.id === batchForm.profileId)?.name || "Unknown";

    // ── Tampilkan popup processing LANGSUNG sebelum API dipanggil ──
    setIsBatchProcessing(true);
    setBatchProcessingInfo({
      count: batchForm.count,
      profileName: selectedProfileName,
      batchId: null,
      done: false,
    });
    setIsAddModalOpen(false); // tutup form modal

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setLatestBatchId(null);

    try {
      const payload = {
        serverId: activeServerId,
        profileId: batchForm.profileId,
        count: batchForm.count,
        usernamePrefix: batchForm.usernamePrefix || undefined,
        charLength: batchForm.charLength || undefined,
        charFormat: batchForm.charFormat || undefined,
        outletName: batchForm.outletName || undefined,
      };

      const response = await apiClient.post("/vouchers/batch", payload);
      if (response.data) {
        const { batchId } = response.data;
        setLatestBatchId(batchId);
        // Update popup ke state "done"
        setBatchProcessingInfo(prev => prev ? { ...prev, batchId, done: true } : null);
        // Refresh voucher list di background
        await loadVouchers();
      }
    } catch (error: any) {
      setIsBatchProcessing(false);
      setBatchProcessingInfo(null);
      setIsAddModalOpen(true); // kembalikan modal form
      setGeneratorTab("batch");
      setErrorMessage(
        error.response?.data?.message || error.message || "Gagal membuat batch voucher"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const closeBatchProcessingPopup = () => {
    setIsBatchProcessing(false);
    setBatchProcessingInfo(null);
  };

  // Filter vouchers dynamically
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      // 1. Search Query (Username)
      if (
        searchQuery &&
        !voucher.username.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== "ALL" && voucher.status !== statusFilter) {
        return false;
      }

      // 3. Profile Filter
      if (profileFilter !== "ALL" && voucher.profileId !== profileFilter) {
        return false;
      }

      return true;
    });
  }, [vouchers, searchQuery, statusFilter, profileFilter]);

  // Statistics calculation for filtered / total
  const stats = useMemo(() => {
    const matchingVouchers = vouchers.filter((v) => {
      if (profileFilter !== "ALL" && v.profileId !== profileFilter) {
        return false;
      }
      return true;
    });

    const total = matchingVouchers.length;
    const unused = matchingVouchers.filter((v) => v.status === "UNUSED").length;
    const used = matchingVouchers.filter((v) => v.status === "USED").length;
    return { total, unused, used };
  }, [vouchers, profileFilter]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const paginatedVouchers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVouchers, currentPage, itemsPerPage]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = 3;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 2;
      }

      if (start > 2) {
        pages.push("ellipsis-1");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis-2");
      }

      pages.push(totalPages);
    }
    return pages;
  };

  const toggleSelectAll = () => {
    const unUsedInPage = paginatedVouchers.filter((v) => v.status === "UNUSED").map((v) => v.id);
    if (unUsedInPage.length === 0) return;
    
    const allSelected = unUsedInPage.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !unUsedInPage.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...unUsedInPage])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const confirmDelete = (ids: string[]) => {
    setDeleteTarget(ids);
    setIsDeleteModalOpen(true);
  };

  // Base URL backend (dari env, fallback localhost) — dipakai untuk PDF yang
  // dibuka langsung di browser (di luar axios apiClient).
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api";

  const getPdfBatchUrl = (batchId: string) => {
    return `${API_BASE}/vouchers/pdf/batch/${batchId}`;
  };

  const getPdfSingleUrl = (voucherId: string) => {
    return `${API_BASE}/vouchers/pdf/single/${voucherId}`;
  };

  const getPdfFilteredUrl = () => {
    return `${API_BASE}/vouchers/pdf/filtered?serverId=${activeServerId}&profileId=${profileFilter}&status=${statusFilter}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-on-surface">Voucher Hotspot</h1>
          </div>
          <p className="text-on-surface-variant mt-1 text-sm">
            {activeServer
              ? `Manajemen pembuatan voucher hotspot instan & massal terintegrasi antrean BullMQ untuk server: ${activeServer.name}`
              : "Pilihlah salah satu router di atas untuk mengelola voucher hotspot."}
          </p>
        </div>

        {activeServerId && profiles.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-outline-variant/40 border border-outline-variant disabled:opacity-50 transition-all font-medium rounded-xl shadow-sm text-sm"
              title="Sinkronisasi data voucher dengan MikroTik"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sinkronisasi
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-medium rounded-xl shadow-sm text-sm"
            >
              <Plus className="w-5 h-5" />
              Buat Voucher
            </button>
          </div>
        )}
      </div>

      {activeServerId && (
        /* Vouchers Summary Cards */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Voucher</p>
              <h3 className="text-2xl font-bold text-on-surface mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Belum Dipakai (Unused)</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.unused}</h3>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Terpakai (Used)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.used}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Table Section */}
      {!activeServerId ? (
        /* Empty State: No server selected */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Router Belum Terpilih</h3>
          <p className="text-on-surface-variant mt-2 text-sm max-w-md mx-auto">
            Voucher dibuat per server router. Silakan pilih salah satu router yang aktif terlebih dahulu di dropdown atas untuk melihat atau membuat voucher hotspot.
          </p>
        </div>
      ) : profiles.length === 0 ? (
        /* Empty State: No profiles on active server */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-sm">
          <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Profil Hotspot Belum Dibuat</h3>
          <p className="text-on-surface-variant mt-2 text-sm max-w-md mx-auto">
            Voucher hotspot memerlukan profil kecepatan dan masa aktif (Mikhmon style). Anda tidak dapat membuat voucher sebelum profil hotspot dibuat di server ini.
          </p>
          <a
            href="/profiles"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-medium rounded-xl shadow-sm text-sm"
          >
            Atur Profil Hotspot Sekarang <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        /* Content area with table & filter bar */
        <div className="space-y-4">
          
          {/* FILTER BAR CONTAINER */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              
              {/* Search query */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari Kode Voucher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-9 pr-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/40"
                />
                <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-8 pr-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="UNUSED">Belum Dipakai (Unused)</option>
                  <option value="USED">Sudah Terpakai (Used)</option>
                  <option value="EXPIRED">Kedaluwarsa (Expired)</option>
                  <option value="REVOKED">Dicabut (Revoked)</option>
                </select>
                <Filter className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5 pointer-events-none" />
              </div>

              {/* Profile filter */}
              <div className="relative">
                <select
                  value={profileFilter}
                  onChange={(e) => setProfileFilter(e.target.value)}
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-8 pr-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="ALL">Semua Paket</option>
                  {profiles.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name} ({prof.rateLimit})
                    </option>
                  ))}
                </select>
                <Activity className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5 pointer-events-none" />
              </div>

              {/* Delete and Cetak Semua Buttons */}
              <div className="col-span-1 lg:col-span-2 flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => confirmDelete(selectedIds)}
                    className="flex items-center justify-center gap-2 h-full min-h-[38px] px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-white transition-all font-semibold rounded-xl shadow-sm text-xs cursor-pointer flex-1 border border-error/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus ({selectedIds.length})
                  </button>
                )}
                <a
                  href={getPdfFilteredUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 h-full min-h-[38px] px-4 py-2 bg-emerald-600 hover:bg-emerald-600/90 active:scale-[0.98] text-white hover:text-white transition-all font-semibold rounded-xl shadow-sm text-xs cursor-pointer flex-1"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Semua ({profileFilter === "ALL" ? "Semua Paket" : profiles.find(p => p.id === profileFilter)?.name || "Paket"})
                </a>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-semibold">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                        onChange={toggleSelectAll}
                        disabled={paginatedVouchers.filter(v => v.status === "UNUSED").length === 0}
                        checked={
                          paginatedVouchers.filter(v => v.status === "UNUSED").length > 0 &&
                          paginatedVouchers.filter(v => v.status === "UNUSED").every(v => selectedIds.includes(v.id))
                        }
                      />
                    </th>
                    <th className="p-4">Kode Voucher</th>
                    <th className="p-4">Password</th>
                    <th className="p-4">Paket / Profile</th>
                    <th className="p-4">Outlet / Server</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Tanggal Dibuat</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          Memuat data voucher...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-on-surface-variant italic">
                        Tidak ada voucher yang cocok dengan kriteria filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((voucher) => {
                      // Speeds formatting
                      const rate = voucher.profile?.rateLimit || "-";
                      const validity = voucher.profile?.validity || "No Limit";

                      return (
                        <tr key={voucher.id} className={`hover:bg-surface-variant/35 transition-colors ${selectedIds.includes(voucher.id) ? 'bg-primary/5' : ''}`}>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              checked={selectedIds.includes(voucher.id)}
                              onChange={() => toggleSelect(voucher.id)}
                              disabled={voucher.status !== "UNUSED"}
                              title={voucher.status !== "UNUSED" ? "Hanya voucher UNUSED yang dapat dihapus" : "Pilih voucher"}
                            />
                          </td>
                          <td className="p-4 font-mono font-bold text-on-surface text-sm">
                            {voucher.username}
                          </td>
                          <td className="p-4 font-mono text-on-surface-variant">
                            {voucher.password === voucher.username ? (
                              <span className="text-[10px] bg-surface-variant px-1.5 py-0.5 rounded text-on-surface-variant/60 italic font-sans font-normal">
                                Sama dengan Kode
                              </span>
                            ) : (
                              voucher.password
                            )}
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-on-surface">{voucher.profile?.name || "-"}</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                                <span>{rate}</span>
                                <span>•</span>
                                <span>Aktif: {validity}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-on-surface-variant">
                            <div className="space-y-0.5">
                              <span>{voucher.server?.name || "Server"}</span>
                              {voucher.outletName && (
                                <p className="text-[10px] text-on-surface-variant/60">{voucher.outletName}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {/* Status badge formatting */}
                            {(() => {
                              let bg = "bg-outline-variant/20 border-outline-variant/30 text-on-surface-variant";
                              let dot = "bg-outline";
                              let label = "Unknown";

                              if (voucher.status === "UNUSED") {
                                bg = "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400";
                                dot = "bg-amber-500 shadow-[0_0_6px_#f59e0b]";
                                label = "Belum Dipakai";
                              } else if (voucher.status === "USED") {
                                bg = "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400";
                                dot = "bg-emerald-500 shadow-[0_0_6px_#10b981]";
                                label = "Terpakai";
                              } else if (voucher.status === "EXPIRED") {
                                bg = "bg-error/10 border-error/20 text-error";
                                dot = "bg-error";
                                label = "Kedaluwarsa";
                              } else if (voucher.status === "REVOKED") {
                                bg = "bg-surface-variant text-on-surface-variant border-outline-variant/20";
                                dot = "bg-outline";
                                label = "Dicabut";
                              }

                              return (
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${bg}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                  {label}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-4 text-on-surface-variant">
                            {new Date(voucher.createdAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short"
                            })}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={getPdfSingleUrl(voucher.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-1.5 border border-outline-variant hover:bg-primary-container hover:text-primary rounded-lg text-on-surface-variant transition-colors"
                                title="Cetak Kartu Voucher PDF Satuan"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </a>
                              {voucher.status === "UNUSED" && (
                                <button
                                  onClick={() => confirmDelete([voucher.id])}
                                  className="inline-flex items-center justify-center p-1.5 border border-error/30 hover:bg-error hover:text-white rounded-lg text-error transition-colors"
                                  title="Hapus Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Table bottom controls */}
            <div className="bg-surface-container-low border-t border-outline-variant/60 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-on-surface-variant text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Baris per halaman:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-surface-variant border border-outline-variant rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={50}>50</option>
                    <option value={999999}>Semua</option>
                  </select>
                </div>
                <div className="text-[11px] font-medium hidden sm:block border-l border-outline-variant/60 pl-3">
                {filteredVouchers.length === 0 ? (
                  <span>Menampilkan 0 voucher terbitan.</span>
                ) : (
                  <span>
                    Menampilkan <span className="font-bold text-on-surface">{(currentPage - 1) * itemsPerPage + 1}</span> – <span className="font-bold text-on-surface">{Math.min(currentPage * itemsPerPage, filteredVouchers.length)}</span> dari <span className="font-bold text-on-surface">{filteredVouchers.length}</span> voucher terbitan.
                  </span>
                )}
              </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-variant text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) => {
                    if (typeof page === "string") {
                      return (
                        <span key={`ellipsis-${index}`} className="px-1 text-on-surface-variant opacity-60">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[28px] h-7 px-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                          currentPage === page
                            ? "bg-primary text-on-primary shadow-sm"
                            : "border border-outline-variant hover:bg-surface-variant text-on-surface-variant"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-variant text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: BUAT VOUCHER BARU ----------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">Generator Voucher WiFi</h3>
                  <p className="text-[11px] text-on-surface-variant">Server: {activeServer?.name}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  closeAddModal();
                }}
                className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex bg-surface-container-low border-b border-outline-variant px-5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setGeneratorTab("single");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  generatorTab === "single"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Voucher Tunggal (Single)
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setGeneratorTab("batch");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  generatorTab === "batch"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Pembuatan Massal (Batch)
              </button>
            </div>

            {/* TAB CONTENT: SINGLE VOUCHER */}
            {generatorTab === "single" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateSingle(e);
                }}
              >
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Banners */}
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

                  {/* Profile selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Profil Hotspot (Paket WiFi) <span className="text-error">*</span></label>
                    <select
                      name="profileId"
                      value={singleForm.profileId}
                      onChange={handleSingleInputChange}
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>Pilih Profil Hotspot...</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.rateLimit} - Masa Aktif: {p.validity || "No Limit"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Username (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Kode Voucher (Username) <span className="text-on-surface-variant/40 font-normal">(Opsional)</span></label>
                    <input
                      type="text"
                      name="username"
                      value={singleForm.username}
                      onChange={handleSingleInputChange}
                      placeholder="Kosongkan untuk meng-generate acak 6 digit"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 font-mono"
                    />
                  </div>

                  {/* Password (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Password Voucher <span className="text-on-surface-variant/40 font-normal">(Opsional)</span></label>
                    <input
                      type="text"
                      name="password"
                      value={singleForm.password}
                      onChange={handleSingleInputChange}
                      placeholder="Kosongkan jika ingin disamakan dengan Kode Voucher"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 font-mono"
                    />
                  </div>

                  {/* Outlet Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Nama Outlet / Kafe <span className="text-on-surface-variant/40 font-normal">(Tampil di Cetakan)</span></label>
                    <input
                      type="text"
                      name="outletName"
                      value={singleForm.outletName}
                      onChange={handleSingleInputChange}
                      placeholder="Contoh: Kafe Utama Outlet B"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/40"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      closeAddModal();
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
                        Membuat...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Buat Voucher Tunggal
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: BATCH VOUCHER */}
            {generatorTab === "batch" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateBatch(e);
                }}
              >
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Banners */}
                  {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-error-container text-on-error-container border border-error/20 rounded-xl text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-medium">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                      </div>
                      
                      {latestBatchId && (
                        /* Shortcut link to print recently created batch */
                        <div className="p-4 bg-primary-container border border-primary/20 rounded-xl flex items-center justify-between text-xs animate-slide-up">
                          <span className="font-semibold text-on-primary-container">
                            Lembaran PDF Batch {latestBatchId} siap diunduh!
                          </span>
                          <a
                            href={getPdfBatchUrl(latestBatchId)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold rounded-lg shadow"
                          >
                            <Download className="w-3.5 h-3.5" /> Cetak PDF (A4)
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profile selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Profil Hotspot (Paket WiFi) <span className="text-error">*</span></label>
                    <select
                      name="profileId"
                      value={batchForm.profileId}
                      onChange={handleBatchInputChange}
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>Pilih Profil Hotspot...</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.rateLimit} - Masa Aktif: {p.validity || "No Limit"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Count (Number of vouchers) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-on-surface">Jumlah Voucher yang Ingin Dibuat (Batch) <span className="text-error">*</span></label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        name="count"
                        min="1"
                        max="200"
                        value={batchForm.count}
                        onChange={handleBatchInputChange}
                        className="w-24 bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none font-bold text-center"
                        required
                      />
                      <span className="text-xs text-on-surface-variant">
                        * Maksimal 200 voucher per satu batch pembuatan.
                      </span>
                    </div>
                    {/* Presets */}
                    <div className="flex gap-1.5 pt-1">
                      {[10, 20, 50, 100, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            selectBatchCountPreset(preset);
                          }}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${
                            batchForm.count === preset
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-outline-variant text-on-surface-variant hover:bg-surface-variant"
                          }`}
                        >
                          {preset} Pcs
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Prefix Kode Voucher <span className="text-on-surface-variant/40 font-normal">(Opsional)</span></label>
                    <input
                      type="text"
                      name="usernamePrefix"
                      value={batchForm.usernamePrefix}
                      onChange={handleBatchInputChange}
                      placeholder="Contoh: KAFE- atau OUTLET1-"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 font-mono"
                    />
                  </div>

                  {/* Char Length */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Panjang Karakter Acak (Monospace)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        name="charLength"
                        min="4"
                        max="10"
                        value={batchForm.charLength}
                        onChange={handleBatchInputChange}
                        className="w-24 bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none text-center font-semibold"
                        required
                      />
                      <span className="text-xs text-on-surface-variant">
                        * Rekomendasi: 6 karakter (mudah diketik di HP pelanggan).
                      </span>
                    </div>
                  </div>

                  {/* Outlet Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface">Nama Outlet / Kafe <span className="text-on-surface-variant/40 font-normal">(Tampil di Cetakan)</span></label>
                    <input
                      type="text"
                      name="outletName"
                      value={batchForm.outletName}
                      onChange={handleBatchInputChange}
                      placeholder="Contoh: Kafe Utama Outlet B"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/40"
                    />
                  </div>

                  {/* ── Format Karakter Kode Voucher ── */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-on-surface">Format Karakter Kode Voucher</label>
                      {/* Live Preview */}
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg tracking-wider">
                        {charFormatOptions.find(o => o.value === batchForm.charFormat)?.preview || ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {charFormatOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBatchForm(prev => ({ ...prev, charFormat: opt.value }))}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all ${
                            batchForm.charFormat === opt.value
                              ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30"
                              : "border-outline-variant text-on-surface-variant hover:border-primary/40 hover:bg-surface-variant"
                          }`}
                        >
                          <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                            batchForm.charFormat === opt.value ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant"
                          }`}>
                            {opt.icon}
                          </span>
                          <div>
                            <p className="text-[10px] font-semibold leading-tight">{opt.label}</p>
                            <p className="text-[9px] opacity-60 leading-tight">{opt.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60">
                      * Karakter O, I, 0, 1 dihindari agar tidak membingungkan pelanggan.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      closeAddModal();
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
                        Memproses Antrean...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Buat Batch Voucher (Massal)
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============ BATCH PROCESSING POPUP ============ */}
      {isBatchProcessing && batchProcessingInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up">
            
            {/* Animated gradient top bar */}
            <div className={`h-1.5 w-full ${
              batchProcessingInfo.done
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%] animate-[gradient_2s_ease_infinite]"
            } transition-all duration-500`} />

            <div className="p-6">
              {/* Icon */}
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                batchProcessingInfo.done
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-primary/10 text-primary"
              }`}>
                {batchProcessingInfo.done ? (
                  <CheckCircle className="w-8 h-8" />
                ) : (
                  <div className="relative">
                    <Layers className="w-8 h-8 opacity-30" />
                    <Loader2 className="w-8 h-8 animate-spin absolute inset-0" />
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-center font-bold text-on-surface text-base mb-1">
                {batchProcessingInfo.done ? "Batch Berhasil Dikirim!" : "Memproses Pembuatan Batch..."}
              </h3>
              <p className="text-center text-xs text-on-surface-variant mb-4">
                {batchProcessingInfo.done
                  ? "Voucher sedang dibuat di background. Daftar akan otomatis terbarui."
                  : "Antrean sedang dikirim ke sistem. Harap tunggu sebentar..."}
              </p>

              {/* Info Card */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Jumlah Voucher</span>
                  <span className="font-bold text-on-surface">{batchProcessingInfo.count} pcs</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Paket / Profil</span>
                  <span className="font-semibold text-on-surface">{batchProcessingInfo.profileName}</span>
                </div>
                {batchProcessingInfo.batchId && (
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Batch ID</span>
                    <span className="font-mono font-semibold text-primary text-[10px]">{batchProcessingInfo.batchId}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Status</span>
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
                    batchProcessingInfo.done ? "text-emerald-500" : "text-primary"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      batchProcessingInfo.done
                        ? "bg-emerald-500"
                        : "bg-primary animate-pulse"
                    }`} />
                    {batchProcessingInfo.done ? "QUEUED ✓" : "PROCESSING..."}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {batchProcessingInfo.done && batchProcessingInfo.batchId && (
                  <a
                    href={getPdfBatchUrl(batchProcessingInfo.batchId)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.97] transition-all font-semibold rounded-xl text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Cetak PDF Batch (A4)
                  </a>
                )}
                <button
                  onClick={closeBatchProcessingPopup}
                  disabled={!batchProcessingInfo.done && isSaving}
                  className={`flex items-center justify-center gap-1.5 w-full py-2.5 font-semibold rounded-xl text-sm border transition-colors ${
                    batchProcessingInfo.done
                      ? "border-outline-variant text-on-surface-variant hover:bg-surface-variant"
                      : "border-outline-variant/40 text-on-surface-variant/40 cursor-not-allowed"
                  }`}
                >
                  {batchProcessingInfo.done ? "Tutup" : "Menunggu konfirmasi..."}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up p-6">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-on-surface text-lg mb-2">
              Konfirmasi Penghapusan
            </h3>
            <p className="text-center text-sm text-on-surface-variant mb-6">
              Anda yakin ingin menghapus <strong>{deleteTarget.length}</strong> voucher?
              <br/><br/>
              Tindakan ini juga akan <strong>menghapus user dari router MikroTik</strong> dan tidak dapat dibatalkan.
            </p>

            {/* Hint saat proses berjalan — penghapusan banyak voucher butuh beberapa detik */}
            {isDeleting && (
              <div className="flex items-start gap-2.5 p-3 mb-4 bg-primary-container/40 text-on-surface-variant border border-primary/15 rounded-xl text-xs animate-fade-in">
                <Loader2 className="w-4 h-4 shrink-0 mt-0.5 text-primary animate-spin" />
                <span>
                  Menghapus <strong>{deleteTarget.length}</strong> voucher dari router & database.
                  Mohon tunggu, <strong>jangan tutup halaman ini</strong>.
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant hover:bg-surface-variant rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-error text-white hover:bg-error/90 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isDeleting ? "Menghapus..." : "Hapus Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
