<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { settings, onPatch } = $props<{
    settings: Settings;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  let newAllow = $state('');
  let newDeny = $state('');

  const allow = $derived((settings.permissions?.allow ?? []) as string[]);
  const deny = $derived((settings.permissions?.deny ?? []) as string[]);
  const ask = $derived((settings.permissions?.ask ?? []) as string[]);
  const dirs = $derived(settings.permissions?.additionalDirectories ?? []);

  async function addToList(field: 'allow' | 'deny', value: string) {
    if (!value.trim()) return;
    await onPatch((s: Settings) => {
      if (!s.permissions) s.permissions = {};
      const list = s.permissions[field] ?? [];
      if (!list.includes(value.trim())) {
        s.permissions[field] = [...list, value.trim()];
      }
    });
  }

  async function removeFromList(field: 'allow' | 'deny' | 'ask', value: string) {
    await onPatch((s: Settings) => {
      if (!s.permissions) return;
      s.permissions[field] = (s.permissions[field] ?? []).filter((v) => v !== value);
    });
  }
</script>

<Section title="Permissions">
  <div class="flex flex-col gap-4">
    <div>
      <div class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em] mb-2">Allow</div>
      <div class="flex flex-wrap gap-1.5">
        {#each allow as item}
          <span class="inline-flex items-center gap-1.5 bg-[var(--success)]/8 border border-[var(--success)]/20 text-[var(--success)] text-[12px] px-2.5 py-1 rounded-lg font-mono">
            {item}
            <button onclick={() => removeFromList('allow', item)} class="hover:text-[var(--danger)] transition-colors text-[10px]">x</button>
          </span>
        {/each}
        <div class="inline-flex gap-1">
          <input bind:value={newAllow} placeholder="add..." onkeydown={(e) => { if (e.key === 'Enter') { addToList('allow', newAllow); newAllow = ''; }}} class="w-32 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" />
        </div>
      </div>
    </div>

    <div>
      <div class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em] mb-2">Deny</div>
      <div class="flex flex-wrap gap-1.5">
        {#each deny as item}
          <span class="inline-flex items-center gap-1.5 bg-[var(--danger)]/8 border border-[var(--danger)]/20 text-[var(--danger)] text-[12px] px-2.5 py-1 rounded-lg font-mono">
            {item}
            <button onclick={() => removeFromList('deny', item)} class="hover:text-[var(--text-secondary)] transition-colors text-[10px]">x</button>
          </span>
        {/each}
        <div class="inline-flex gap-1">
          <input bind:value={newDeny} placeholder="add..." onkeydown={(e) => { if (e.key === 'Enter') { addToList('deny', newDeny); newDeny = ''; }}} class="w-32 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" />
        </div>
      </div>
    </div>

    {#if ask.length > 0}
      <div>
        <div class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em] mb-2">Ask</div>
        <div class="flex flex-wrap gap-1.5">
          {#each ask as item}
            <span class="inline-flex items-center gap-1.5 bg-[var(--warning)]/8 border border-[var(--warning)]/20 text-[var(--warning)] text-[12px] px-2.5 py-1 rounded-lg font-mono">
              {item}
              <button onclick={() => removeFromList('ask', item)} class="hover:text-[var(--danger)] transition-colors text-[10px]">x</button>
            </span>
          {/each}
        </div>
      </div>
    {/if}

    {#if dirs.length > 0}
      <div>
        <div class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em] mb-2">Additional Directories</div>
        <div class="flex flex-col gap-1">
          {#each dirs as dir}
            <span class="text-[12px] text-[var(--text-secondary)] font-mono">{dir}</span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Section>
