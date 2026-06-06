import { create } from 'zustand';
import apiClient from '@/lib/api-client';

export interface MikrotikServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  useSSL: boolean;
  lastStatus: string;
  lastCheckedAt?: string | null;
}

interface ServerState {
  servers: MikrotikServer[];
  activeServerId: string | null;
  isSyncing: boolean;
  syncError: string | null;
  setServers: (servers: MikrotikServer[]) => void;
  setActiveServerId: (id: string) => void;
  getActiveServer: () => MikrotikServer | undefined;
  fetchServers: () => Promise<void>;
  checkActiveServerStatus: () => Promise<void>;
  syncActiveServer: (id: string) => Promise<SyncResult | null>;
}

export interface SyncResult {
  usersSynced?: boolean;
  importedVouchersCount?: number;
  deletedVouchersCount?: number;
  [key: string]: unknown;
}

export const useServerStore = create<ServerState>((set, get) => {
  const isBrowser = typeof window !== 'undefined';
  const savedActiveServerId = isBrowser ? localStorage.getItem('wifi_active_server_id') : null;

  return {
    servers: [],
    activeServerId: savedActiveServerId,
    isSyncing: false,
    syncError: null,
    setServers: (servers) => {
      set({ servers });
      
      // Jika activeServerId belum diset, atau serverId yang diset tidak ada dalam list, pasang server pertama sebagai default
      const currentActiveId = get().activeServerId;
      const exists = servers.some((s) => s.id === currentActiveId);
      
      if (servers.length > 0 && (!currentActiveId || !exists)) {
        const defaultId = servers[0].id;
        if (isBrowser) {
          localStorage.setItem('wifi_active_server_id', defaultId);
        }
        set({ activeServerId: defaultId });
      }
    },
    setActiveServerId: (id) => {
      if (isBrowser) {
        localStorage.setItem('wifi_active_server_id', id);
      }
      set({ activeServerId: id });
    },
    getActiveServer: () => {
      const { servers, activeServerId } = get();
      return servers.find((s) => s.id === activeServerId);
    },
    fetchServers: async () => {
      try {
        const response = await apiClient.get('/servers');
        get().setServers(response.data);
      } catch (error) {
        // Gagal fetch servers — abaikan (mungkin belum ada server yang ditambahkan)
        console.error('Failed to fetch servers:', error);
      }
    },
    checkActiveServerStatus: async () => {
      const activeServerId = get().activeServerId;
      if (!activeServerId) return;

      try {
        const response = await apiClient.post(`/servers/${activeServerId}/test-connection`);
        const { lastStatus } = response.data;
        
        // Update the server's lastStatus in the store
        const currentServers = get().servers;
        const updatedServers = currentServers.map(server => 
          server.id === activeServerId 
            ? { ...server, lastStatus } 
            : server
        );
        
        set({ servers: updatedServers });
      } catch (error) {
        console.error('Failed to check server status:', error);
        // Set offline if failed to reach backend or other errors
        const currentServers = get().servers;
        const updatedServers = currentServers.map(server => 
          server.id === activeServerId 
            ? { ...server, lastStatus: 'OFFLINE' } 
            : server
        );
        set({ servers: updatedServers });
      }
    },
    syncActiveServer: async (id: string): Promise<SyncResult | null> => {
      if (!id) return null;
      set({ isSyncing: true, syncError: null });
      try {
        const response = await apiClient.post(`/profiles/sync/${id}`);

        // Set ONLINE status on successful synchronization
        const currentServers = get().servers;
        const updatedServers = currentServers.map(server =>
          server.id === id
            ? { ...server, lastStatus: 'ONLINE' }
            : server
        );
        set({ servers: updatedServers, isSyncing: false, syncError: null });
        return (response.data ?? null) as SyncResult | null;
      } catch (error: any) {
        console.error('Failed to sync active server:', error);
        const errMsg = error.response?.data?.message || error.message || 'Gagal sinkronisasi data dari router MikroTik.';

        // Set OFFLINE status on sync error
        const currentServers = get().servers;
        const updatedServers = currentServers.map(server =>
          server.id === id
            ? { ...server, lastStatus: 'OFFLINE' }
            : server
        );
        set({ servers: updatedServers, isSyncing: false, syncError: errMsg });
        return null;
      }
    },
  };
});
