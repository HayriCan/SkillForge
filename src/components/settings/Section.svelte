<script lang="ts">
  import type { Snippet } from 'svelte';

  const { title, count, children, actions } = $props<{
    title: string;
    count?: number;
    children: Snippet;
    actions?: Snippet;
  }>();

  let open = $state(true);
</script>

<div class="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-1)]/30">
  <button
    onclick={() => open = !open}
    class="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)] transition-all duration-200"
  >
    <div class="flex items-center gap-2.5">
      <span class="text-[10px] text-[var(--text-ghost)] transition-transform duration-200 {open ? 'rotate-0' : '-rotate-90'}">▾</span>
      <span class="text-[13px] font-semibold text-[var(--text-secondary)]">{title}</span>
      {#if count !== undefined}
        <span class="text-[10px] text-[var(--text-ghost)] font-mono bg-[var(--surface-3)] px-1.5 py-0.5 rounded-md">{count}</span>
      {/if}
    </div>
    {#if actions}
      <div role="presentation" onclick={(e) => e.stopPropagation()}>
        {@render actions()}
      </div>
    {/if}
  </button>
  {#if open}
    <div class="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)] animate-fade-in">
      {@render children()}
    </div>
  {/if}
</div>
