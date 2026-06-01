import { create } from 'zustand';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  setSession: (token: string, admin: Admin) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load initial state from localStorage if running in browser
  const isBrowser = typeof window !== 'undefined';
  const savedToken = isBrowser ? localStorage.getItem('wifi_token') : null;
  const savedAdmin = isBrowser ? localStorage.getItem('wifi_admin') : null;

  return {
    token: savedToken,
    admin: savedAdmin ? JSON.parse(savedAdmin) : null,
    isAuthenticated: !!savedToken,
    setSession: (token, admin) => {
      if (isBrowser) {
        localStorage.setItem('wifi_token', token);
        localStorage.setItem('wifi_admin', JSON.stringify(admin));
      }
      set({ token, admin, isAuthenticated: true });
    },
    clearSession: () => {
      if (isBrowser) {
        localStorage.removeItem('wifi_token');
        localStorage.removeItem('wifi_admin');
      }
      set({ token: null, admin: null, isAuthenticated: false });
    },
  };
});
