<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { settings, onPatch } = $props<{
    settings: Settings;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  let newKey = $state('');
  let newValue = $state('');

  const entries = $derived(Object.entries(settings.env ?? {}));

  async function add() {
    if (!newKey.trim()) return;
    await onPatch((s: Settings) => {
      s.env = { ...(s.env ?? {}), [newKey.trim()]: newValue };
    });
    newKey = '';
    newValue = '';
  }

  async function remove(key: string) {
    await onPatch((s: Settings) => {
      if (s.env) delete s.env[key];
    });
  }

  async function update(key: string, value: string) {
    await onPatch((s: Settings) => {
      if (s.env) s.env[key] = value;
    });
  }
</script>

<Section title="Environment Variables" count={entries.length}>
  {#snippet actions()}
    <button onclick={() => {}} class="text-[11px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors">+ Add</button>
  {/snippet}

  <div class="flex flex-col gap-1.5">
    {#each entries as [key, value]}
      <div class="flex items-center gap-2 group">
        <span class="w-48 shrink-0 text-[12px] text-[var(--text-secondary)] font-mono truncate">{key}</span>
        <span class="text-[12px] text-[var(--text-ghost)]">=</span>
        <input
          value={value}
          onchange={(e) => update(key, e.currentTarget.value)}
          class="flex-1 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
        />
        <button onclick={() => remove(key)} aria-label="Remove variable" class="text-[12px] text-[var(--danger)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 px-1">x</button>
      </div>
    {/each}
  </div>

  <div class="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
    <input bind:value={newKey} placeholder="KEY" class="w-48 shrink-0 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" />
    <span class="text-[12px] text-[var(--text-ghost)]">=</span>
    <input bind:value={newValue} placeholder="value" class="flex-1 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" />
    <button onclick={add} class="text-[11px] text-[var(--accent)] hover:text-[var(--accent)] font-semibold px-2">Add</button>
  </div>
</Section>
