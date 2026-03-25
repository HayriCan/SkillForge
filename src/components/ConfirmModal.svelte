<script lang="ts">
  import { tick } from 'svelte';

  let visible = $state(false);
  let confirmBtn = $state<HTMLButtonElement | null>(null);
  let title = $state('');
  let message = $state('');
  let resolveFn = $state<((ok: boolean) => void) | null>(null);

  /**
   * Show a confirmation dialog. Returns true if confirmed.
   */
  export function confirm(t: string, msg: string): Promise<boolean> {
    title = t;
    message = msg;
    visible = true;
    tick().then(() => confirmBtn?.focus());
    return new Promise((resolve) => {
      resolveFn = resolve;
    });
  }

  function respond(ok: boolean) {
    visible = false;
    resolveFn?.(ok);
    resolveFn = null;
  }
</script>

{#if visible}
  <div class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/30 backdrop-blur-sm cursor-default"
      aria-label="Close"
      onclick={() => respond(false)}
    ></button>

    <!-- Modal — macOS-native dialog style -->
    <div role="dialog" aria-modal="true" class="relative bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg shadow-2xl shadow-black/15 p-5 min-w-[340px] max-w-md animate-scale-in"
      onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); respond(false); } }}>

      <!-- Warning icon -->
      <div class="w-9 h-9 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center mb-3.5">
        <svg class="w-5 h-5 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
      </div>

      <h3 class="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">{title}</h3>
      <p class="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">{message}</p>

      <div class="flex justify-end gap-2">
        <button
          onclick={() => respond(false)}
          class="px-4 py-1.5 rounded text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors duration-150 focus-ring"
        >
          Cancel
        </button>
        <button
          bind:this={confirmBtn}
          onclick={() => respond(true)}
          class="px-4 py-1.5 rounded text-[13px] font-medium bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white transition-colors duration-150 focus-ring"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}
