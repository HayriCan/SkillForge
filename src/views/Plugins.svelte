<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, readFile, writeFile } from '../lib/fs';
  import { loadSettings, saveSettings } from '../lib/settings';
  import { exists } from '@tauri-apps/plugin-fs';
  import { marked } from 'marked';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  type Plugin = {
    key: string;
    name: string;
    source: string;
    enabled: boolean;
    installed: boolean;
    version?: string;
    installedAt?: string;
    scope?: string;
    installPath?: string;
    hasReadme: boolean;
    readmePath?: string;
  };

  let plugins = $state<Plugin[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();
  let readmeContent = $state('');
  let readmePlugin = $state('');
  let showReadme = $state(false);

  function parseKey(key: string): { name: string; source: string } {
    const at = key.indexOf('@');
    if (at > 0) return { name: key.slice(0, at), source: key.slice(at + 1) };
    return { name: key, source: '' };
  }

  function enabledPlugins(): Plugin[] {
    return plugins.filter((p) => p.enabled);
  }

  function disabledPlugins(): Plugin[] {
    return plugins.filter((p) => !p.enabled);
  }

  async function load() {
    const base = await claudeDir();
    const enabledMap: Record<string, boolean> = {};
    const installedMap: Record<string, { version?: string; installedAt?: string; scope?: string; installPath?: string }> = {};

    // Read enabledPlugins from settings.json
    try {
      const s = await loadSettings();
      for (const [key, val] of Object.entries(s.enabledPlugins ?? {})) {
        enabledMap[key] = val;
      }
    } catch {}

    // Read installed_plugins.json
    const installedPath = `${base}/plugins/installed_plugins.json`;
    try {
      if (await exists(installedPath)) {
        const raw = await readFile(installedPath);
        const data = JSON.parse(raw) as { plugins?: Record<string, Array<{ version?: string; installedAt?: string; scope?: string; installPath?: string }>> };
        if (data.plugins) {
          for (const [key, entries] of Object.entries(data.plugins)) {
            const latest = entries[0];
            installedMap[key] = {
              version: latest?.version,
              installedAt: latest?.installedAt,
              scope: latest?.scope,
              installPath: latest?.installPath,
            };
          }
        }
      }
    } catch {}

    // Merge: all unique keys from both sources
    const allKeys = new Set([...Object.keys(enabledMap), ...Object.keys(installedMap)]);
    const result: Plugin[] = [];

    for (const key of allKeys) {
      const { name, source } = parseKey(key);
      const installed = key in installedMap;
      const enabled = enabledMap[key] === true;
      const installPath = installedMap[key]?.installPath;
      let hasReadme = false;
      let readmePath = '';
      if (installPath) {
        try {
          if (await exists(`${installPath}/README.md`)) {
            hasReadme = true;
            readmePath = `${installPath}/README.md`;
          }
        } catch {}
      }
      // Fallback: check marketplaces directory
      if (!hasReadme && source) {
        const marketplacePaths = [
          `${base}/plugins/marketplaces/${source}/plugins/${name}/README.md`,
          `${base}/plugins/marketplaces/${source}/README.md`,
        ];
        for (const mp of marketplacePaths) {
          try {
            if (await exists(mp)) {
              hasReadme = true;
              readmePath = mp;
              break;
            }
          } catch {}
        }
      }
      result.push({
        key,
        name,
        source,
        enabled,
        installed,
        version: installedMap[key]?.version,
        installedAt: installedMap[key]?.installedAt,
        scope: installedMap[key]?.scope,
        installPath,
        hasReadme,
        readmePath: readmePath || undefined,
      });
    }

    // Sort: enabled first, then by name
    result.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    plugins = result;
    onCount(result.length);
  }

  async function toggle(plugin: Plugin) {
    const s = await loadSettings();
    const ep = { ...(s.enabledPlugins ?? {}) };
    if (plugin.enabled) {
      // Disable: set to false or remove key
      ep[plugin.key] = false;
    } else {
      // Enable
      ep[plugin.key] = true;
    }
    s.enabledPlugins = ep;
    await saveSettings(s);
    await load();
  }

  async function confirmRemove(plugin: Plugin) {
    const ok = await confirmModal?.confirm(
      'Remove Plugin',
      `Remove "${plugin.name}" from settings? ${plugin.installed ? 'The cached files will remain in ~/.claude/plugins/cache/.' : ''}`
    );
    if (!ok) return;
    await remove(plugin);
  }

  async function remove(plugin: Plugin) {
    // Remove from settings.json enabledPlugins
    const s = await loadSettings();
    if (s.enabledPlugins && plugin.key in s.enabledPlugins) {
      delete s.enabledPlugins[plugin.key];
      await saveSettings(s);
    }

    // Remove from installed_plugins.json
    const base = await claudeDir();
    const installedPath = `${base}/plugins/installed_plugins.json`;
    try {
      if (await exists(installedPath)) {
        const raw = await readFile(installedPath);
        const data = JSON.parse(raw) as { version?: number; plugins?: Record<string, unknown> };
        if (data.plugins && plugin.key in data.plugins) {
          delete data.plugins[plugin.key];
          await writeFile(installedPath, JSON.stringify(data, null, 4));
        }
      }
    } catch {}

    await load();
  }

  async function showPluginReadme(plugin: Plugin) {
    if (!plugin.readmePath) return;
    try {
      readmeContent = await readFile(plugin.readmePath);
    } catch {
      readmeContent = '';
    }
    readmePlugin = plugin.name;
    showReadme = true;
  }

  function formatDate(iso?: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  onMount(load);
</script>

{#snippet pluginRow(plugin: Plugin)}
  <div class="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-subtle)] transition-all duration-200 hover:bg-[var(--surface-2)]">
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[12px] font-semibold
                  {plugin.enabled ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-accent)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)] border border-[var(--border-subtle)]'}">
        {plugin.name.slice(0, 2).toUpperCase()}
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[13px] truncate {plugin.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}">{plugin.name}</span>
          {#if plugin.version}
            <span class="text-[10px] font-mono text-[var(--text-ghost)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded">{plugin.version.slice(0, 12)}</span>
          {/if}
          {#if plugin.scope === 'local'}
            <span class="text-[10px] font-mono text-[var(--warning)] bg-[var(--warning)]/10 px-1.5 py-0.5 rounded">local</span>
          {/if}
        </div>
        <div class="flex items-center gap-2 mt-0.5">
          {#if plugin.source}
            <span class="text-[10px] text-[var(--text-ghost)] truncate font-mono">{plugin.source}</span>
          {/if}
          {#if plugin.installedAt}
            <span class="text-[10px] text-[var(--text-ghost)]">· {formatDate(plugin.installedAt)}</span>
          {/if}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0 ml-3">
      {#if plugin.hasReadme}
        <button
          onclick={() => showPluginReadme(plugin)}
          class="px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--info)] hover:bg-[var(--info)]/10 transition-all duration-200"
          title="View README"
        >
          README
        </button>
      {/if}
      <button
        onclick={() => toggle(plugin)}
        class="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
               {plugin.enabled
                 ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
                 : 'text-[var(--accent)] hover:bg-[var(--accent-subtle)]'}"
      >
        {plugin.enabled ? 'Disable' : 'Enable'}
      </button>
      <button onclick={() => confirmRemove(plugin)} class="px-3 py-1.5 rounded-lg text-[11px] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all duration-200">Remove</button>
    </div>
  </div>
{/snippet}

<div class="h-full min-h-0 flex flex-col max-w-3xl mx-auto w-full">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Plugins</h2>
    <span class="text-[10px] text-[var(--text-ghost)] font-mono">{enabledPlugins().length} active / {plugins.length} total</span>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if enabledPlugins().length > 0}
      <div class="mb-5">
        <div class="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-ghost)] px-4 py-2">Enabled</div>
        <div class="stagger-list">
          {#each enabledPlugins() as plugin}
            {@render pluginRow(plugin)}
          {/each}
        </div>
      </div>
    {/if}

    {#if disabledPlugins().length > 0}
      <div>
        <div class="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-ghost)] px-4 py-2">Disabled</div>
        <div class="stagger-list">
          {#each disabledPlugins() as plugin}
            {@render pluginRow(plugin)}
          {/each}
        </div>
      </div>
    {/if}

    {#if plugins.length === 0}
      <EmptyState
        icon="◎"
        title="No plugins configured"
        description="Plugins from settings.json will appear here"
      />
    {/if}
  </div>
</div>

<ConfirmModal bind:this={confirmModal} />

{#if showReadme}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onclick={(e) => { if (e.target === e.currentTarget) showReadme = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') showReadme = false; }}
  >
    <div class="bg-[var(--surface-0)] border border-[var(--border-default)] w-full max-w-2xl max-h-[80vh] rounded-lg flex flex-col animate-scale-in overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
        <span class="text-sm font-semibold text-[var(--text-primary)]">{readmePlugin} — README</span>
        <button
          onclick={() => showReadme = false}
          aria-label="Close"
          class="text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors"
        ><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>
      <div class="flex-1 overflow-y-auto p-5">
        {#if readmeContent}
          <div class="prose-readme text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {@html marked.parse(readmeContent)}
          </div>
        {:else}
          <div class="text-center text-[var(--text-ghost)] text-sm py-8">README.md bulunamadı</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
