<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { settings, onPatch } = $props<{
    settings: Settings;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  const marketplaces = $derived(Object.keys((settings as any).extraKnownMarketplaces ?? {}));

  let newMarketplace = $state('');

  async function add() {
    if (!newMarketplace.trim()) return;
    await onPatch((s: any) => {
      s.extraKnownMarketplaces = { ...(s.extraKnownMarketplaces ?? {}), [newMarketplace.trim()]: {} };
    });
    newMarketplace = '';
  }

  async function remove(key: string) {
    await onPatch((s: any) => {
      if (s.extraKnownMarketplaces) delete s.extraKnownMarketplaces[key];
    });
  }
</script>

<Section title="Marketplaces" count={marketplaces.length}>
  {#if marketplaces.length === 0}
    <div class="text-[13px] text-[var(--text-ghost)]">No extra marketplaces</div>
  {:else}
    <div class="flex flex-col gap-1.5">
      {#each marketplaces as mp}
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-2)] group">
          <span class="text-[12px] text-[var(--text-secondary)] font-mono">{mp}</span>
          <button onclick={() => remove(mp)} aria-label="Remove marketplace" class="text-[12px] text-[var(--danger)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">x</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
    <input bind:value={newMarketplace} placeholder="marketplace-name" onkeydown={(e) => { if (e.key === 'Enter') add(); }} class="flex-1 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" />
    <button onclick={add} class="text-[11px] text-[var(--accent)] font-semibold px-2">Add</button>
  </div>
</Section>
