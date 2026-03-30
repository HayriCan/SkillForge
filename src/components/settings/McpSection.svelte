<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { settings, onPatch } = $props<{
    settings: Settings;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  const enabled = $derived((settings as any).enabledMcpjsonServers ?? [] as string[]);
  const disabled = $derived((settings as any).disabledMcpjsonServers ?? [] as string[]);
  const total = $derived(enabled.length + disabled.length);

  async function enable(server: string) {
    await onPatch((s: any) => {
      s.disabledMcpjsonServers = (s.disabledMcpjsonServers ?? []).filter((v: string) => v !== server);
      s.enabledMcpjsonServers = [...(s.enabledMcpjsonServers ?? []), server];
    });
  }

  async function disable(server: string) {
    await onPatch((s: any) => {
      s.enabledMcpjsonServers = (s.enabledMcpjsonServers ?? []).filter((v: string) => v !== server);
      s.disabledMcpjsonServers = [...(s.disabledMcpjsonServers ?? []), server];
    });
  }
</script>

<Section title="MCP Servers" count={total}>
  {#if total === 0}
    <div class="text-xs text-[var(--text-ghost)]">No MCP servers configured</div>
  {:else}
    <div class="flex flex-col gap-1">
      {#each enabled as server}
        <div class="flex items-center justify-between px-2 py-1.5 rounded bg-[var(--surface-2)]">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-[var(--success)]"></div>
            <span class="text-xs text-[var(--text-primary)] font-mono">{server}</span>
          </div>
          <button onclick={() => disable(server)} class="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Disable</button>
        </div>
      {/each}
      {#each disabled as server}
        <div class="flex items-center justify-between px-2 py-1.5 rounded bg-[var(--surface-2)]">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-[var(--surface-4)]"></div>
            <span class="text-xs text-[var(--text-muted)] font-mono">{server}</span>
          </div>
          <button onclick={() => enable(server)} class="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Enable</button>
        </div>
      {/each}
    </div>
  {/if}
</Section>
