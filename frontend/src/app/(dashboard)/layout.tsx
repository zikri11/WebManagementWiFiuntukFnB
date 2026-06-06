"use client";

import { useAuthStore } from "@/store/auth-store";
import { useServerStore } from "@/store/server-store";
import { ToastContainer } from "@/components/Toast";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Server,
  Users,
  Ticket,
  Activity,
  BrainCircuit,
  LogOut,
  Menu,
  ChevronDown,
  Wifi,
  History
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, admin, clearSession } = useAuthStore();
  const { 
    servers, 
    activeServerId, 
    setActiveServerId, 
    fetchServers, 
    isSyncing, 
    syncActiveServer 
  } = useServerStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    if (!isAuthenticated) {
      router.push("/login");
    } else {
      fetchServers();
    }
  }, [isAuthenticated, router, fetchServers, isMounted]);

  // Run full sync when activeServerId is loaded
  useEffect(() => {
    if (activeServerId && isMounted) {
      syncActiveServer(activeServerId);
    }
  }, [activeServerId, syncActiveServer, isMounted]);

  const handleServerChange = async (id: string) => {
    setActiveServerId(id);
    await syncActiveServer(id);
  };

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  // Prevent hydration mismatch by rendering a basic shell during SSR
  if (!isMounted) {
    return <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans"></div>;
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Servers", href: "/servers", icon: Server },
    { name: "Profiles", href: "/profiles", icon: Users },
    { name: "Vouchers", href: "/vouchers", icon: Ticket },
    { name: "AI Analysis", href: "/ai", icon: BrainCircuit },
    { name: "Activity Logs", href: "/logs", icon: History },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-outline-variant bg-surface-container-low">
        <span className="font-bold text-lg text-on-surface">FnB WiFi</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          <Menu className="w-6 h-6 text-on-surface" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? "block" : "hidden"} md:block w-full md:w-64 bg-surface-container-low border-r border-outline-variant shrink-0`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Activity className="w-6 h-6" /> FnB WiFi
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">Management System</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-medium"
                    : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-outline-variant bg-surface flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Server Selector */}
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <select
                  value={activeServerId || ""}
                  onChange={(e) => handleServerChange(e.target.value)}
                  className="appearance-none bg-surface-variant border border-outline-variant text-on-surface text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>Select Router...</option>
                  {servers.map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.host})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-2.5 pointer-events-none" />
              </div>
              
              {/* Status Indicator */}
              {activeServerId && servers.find(s => s.id === activeServerId) && (() => {
                const activeServer = servers.find(s => s.id === activeServerId);
                const status = activeServer?.lastStatus;
                
                let dotColor = "bg-surface-variant"; // UNKNOWN
                let statusText = "Unknown";
                
                if (status === "ONLINE") {
                  dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
                  statusText = "Online";
                } else if (status === "OFFLINE") {
                  dotColor = "bg-error shadow-[0_0_8px_rgba(220,38,38,0.6)]";
                  statusText = "Offline";
                }

                return (
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-surface-variant/50 rounded-md border border-outline-variant/30" title={`Status: ${statusText}`}>
                    <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                    <span className="text-xs font-medium text-on-surface-variant capitalize">
                      {statusText}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-on-surface">{admin?.name}</p>
              <p className="text-xs text-on-surface-variant">{admin?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-surface p-4 lg:p-8 relative">
          {children}

          {/* Syncing Overlay (Glassmorphism design) */}
          {isSyncing && (
            <div className="absolute inset-0 bg-surface/75 backdrop-blur-md flex flex-col items-center justify-center z-50 transition-all duration-300">
              <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-xl max-w-sm text-center space-y-4 flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-primary-container border-t-primary rounded-full animate-spin"></div>
                  <Wifi className="w-6 h-6 text-primary absolute animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Sinkronisasi Router...</h3>
                  <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                    Menghubungkan ke MikroTik & menyelaraskan data profil hotspot serta voucher aktif secara real-time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Notifikasi global (toast) */}
      <ToastContainer />
    </div>
  );
}
