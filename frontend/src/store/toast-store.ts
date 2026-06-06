import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  leaving?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string, title?: string, duration?: number) => number;
  success: (message: string, title?: string, duration?: number) => number;
  error: (message: string, title?: string, duration?: number) => number;
  warning: (message: string, title?: string, duration?: number) => number;
  info: (message: string, title?: string, duration?: number) => number;
  dismiss: (id: number) => void;
  remove: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => {
  const push: ToastState['push'] = (type, message, title, duration) => {
    const id = ++counter;
    // Error & warning bertahan lebih lama agar sempat dibaca
    const ttl = duration ?? (type === 'error' || type === 'warning' ? 6000 : 4000);

    set((s) => ({ toasts: [...s.toasts, { id, type, message, title }] }));

    if (ttl > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), ttl);
    }
    return id;
  };

  return {
    toasts: [],
    push,
    success: (m, t, d) => push('success', m, t, d),
    error: (m, t, d) => push('error', m, t, d),
    warning: (m, t, d) => push('warning', m, t, d),
    info: (m, t, d) => push('info', m, t, d),
    dismiss: (id) => {
      // Tandai 'leaving' untuk animasi keluar, hapus setelah animasi selesai
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      }));
      if (typeof window !== 'undefined') {
        window.setTimeout(() => get().remove(id), 220);
      } else {
        get().remove(id);
      }
    },
    remove: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});
