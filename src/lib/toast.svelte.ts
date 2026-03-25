export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3000;

let counter = 0;

export const toasts = $state<Toast[]>([]);

/** Remove a toast by its id */
export function removeToast(id: string): void {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx !== -1) {
    toasts.splice(idx, 1);
  }
}

/** Add a new toast notification. Auto-dismisses after 3 seconds. Max 3 visible. */
export function addToast(message: string, type: ToastType = 'info'): void {
  const id = `toast-${++counter}`;
  toasts.push({ id, message, type });

  // Remove oldest if over limit
  while (toasts.length > MAX_TOASTS) {
    toasts.shift();
  }

  setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
}
