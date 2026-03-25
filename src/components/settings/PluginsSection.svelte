<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { settings, onPatch } = $props<{
    settings: Settings;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  type PluginItem = { key: string; enabled: boolean };

  const plugins = $derived(
    Object.entries(settings.enabledPlugins ?? {}).map(([key, enabled]) => ({ key, enabled })) as PluginItem[]
  );

  async function toggle(key: string, current: boolean) {
    await onPatch((s: Settings) => {
      s.enabledPlugins = { ...(s.enabledPlugins ?? {}), [key]: !current };
    });
  }

  async function remove(key: string) {
    await onPatch((s: Settings) => {
      if (s.enabledPlugins) delete s.enabledPlugins[key];
    });
  }
</script>

<Section title="Plugins" count={plugins.length}>
  {#if plugins.length === 0}
    <div class="text-xs text-[var(--text-ghost)]">No plugins configured</div>
  {:else}
    <div class="flex flex-col gap-1">
      {#each plugins as plugin}
        <div class="flex items-center justify-between px-2 py-1.5 rounded bg-[var(--surface-2)] group">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {plugin.enabled ? 'bg-[var(--success)]' : 'bg-[var(--surface-4)]'}"></div>
            <span class="text-xs font-mono {plugin.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}">{plugin.key}</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick={() => toggle(plugin.key, plugin.enabled)} class="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              {plugin.enabled ? 'Disable' : 'Enable'}
            </button>
            <button onclick={() => remove(plugin.key)} class="text-xs text-[var(--danger)] hover:opacity-80 transition-colors">Remove</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Section>
