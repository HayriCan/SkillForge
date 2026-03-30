<script lang="ts">
  import { toasts, removeToast, type ToastType } from '../lib/toast.svelte';

  const icons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2715',
    warning: '\u26A0',
    info: '\u2139',
  };

  const colors: Record<ToastType, string> = {
    success: 'var(--success)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  };
</script>

{#if toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {#each toasts as toast (toast.id)}
      <div
        class="animate-slide-in-left flex items-start gap-3 rounded-lg border px-3 py-2.5 shadow-lg transition-opacity duration-200"
        style="background: var(--surface-3); border-color: var(--border-default);"
      >
        <!-- Color bar -->
        <div
          class="mt-0.5 h-5 w-1 shrink-0 rounded-full"
          style="background: {colors[toast.type]};"
        ></div>

        <!-- Icon -->
        <span
          class="mt-px shrink-0 text-sm font-semibold"
          style="color: {colors[toast.type]};"
        >
          {icons[toast.type]}
        </span>

        <!-- Message -->
        <span class="flex-1 text-sm" style="color: var(--text-primary);">
          {toast.message}
        </span>

        <!-- Dismiss button -->
        <button
          class="shrink-0 cursor-pointer text-sm transition-colors hover:opacity-80"
          style="color: var(--text-muted); background: none; border: none;"
          onclick={() => removeToast(toast.id)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}
