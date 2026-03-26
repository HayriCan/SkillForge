<script lang="ts">
  import { onMount } from 'svelte';
  import {
    loadAllMcpEntries,
    saveScopedMcpServer,
    removeScopedMcpServer,
    toggleMcpServer,
    loadProjectTrust,
    setProjectTrust,
    trustAllProjects,
    MCP_PRESETS,
    type McpServer,
    type McpServerType,
    type McpScope,
    type ScopedMcpEntry,
    type ProjectTrustEntry,
  } from '../lib/mcp';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import { addToast } from '../lib/toast.svelte';
  import { validateServerName } from '../lib/validation';
  import { getActiveAdapter } from '../lib/adapters/index';
  import type { CliAdapter } from '../lib/adapters/types';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  let entries = $state<ScopedMcpEntry[]>([]);
  let selected = $state<ScopedMcpEntry | null>(null);
  let loading = $state(true);
  let adapter = $state<CliAdapter | null>(null);
  let trustEntries = $state<ProjectTrustEntry[]>([]);
  let trustLoading = $state(false);
  let trustingAll = $state(false);
  let trustExpanded = $state(false);
  let showAdd = $state(false);
  let showPresets = $state(false);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  // Form state
  let formName = $state('');
  let formType = $state<McpServerType>('stdio');
  let formCommand = $state('');
  let formArgs = $state('');
  let formUrl = $state('');
  let formEnv = $state('');
  let formScope = $state<McpScope>('user');
  let formProjectPath = $state('');
  let formSaving = $state(false);
  let editMode = $state(false);
  let serverNameError = $state('');

  async function load() {
    loading = true;
    adapter = await getActiveAdapter();
    if (!adapter.supportsMcp) {
      entries = [];
      onCount(0);
      loading = false;
      return;
    }
    const [allEntries, trust] = await Promise.all([loadAllMcpEntries(), loadProjectTrust()]);
    entries = allEntries;
    trustEntries = trust;
    onCount(entries.length);
    loading = false;
  }

  async function handleTrustAll() {
    trustingAll = true;
    try {
      await trustAllProjects();
      trustEntries = trustEntries.map((e) => ({ ...e, trusted: true }));
      addToast('All projects trusted', 'success');
    } catch (e) {
      addToast(`Failed: ${e}`, 'error');
    } finally {
      trustingAll = false;
    }
  }

  async function handleToggleTrust(entry: ProjectTrustEntry) {
    try {
      await setProjectTrust(entry.path, !entry.trusted);
      trustEntries = trustEntries.map((e) => e.path === entry.path ? { ...e, trusted: !e.trusted } : e);
    } catch (e) {
      addToast(`Failed: ${e}`, 'error');
    }
  }

  function openAdd() {
    editMode = false;
    formName = '';
    formType = 'stdio';
    formCommand = '';
    formArgs = '';
    formUrl = '';
    formEnv = '';
    formScope = 'user';
    formProjectPath = '';
    serverNameError = '';
    showAdd = true;
    showPresets = false;
  }

  function openEdit(entry: ScopedMcpEntry) {
    editMode = true;
    formName = entry.name;
    formType = entry.server.type;
    formCommand = entry.server.command ?? '';
    formArgs = (entry.server.args ?? []).join(' ');
    formUrl = entry.server.url ?? '';
    formEnv = entry.server.env
      ? Object.entries(entry.server.env).map(([k, v]) => `${k}=${v}`).join('\n')
      : '';
    formScope = entry.scope;
    formProjectPath = entry.projectPath ?? '';
    showAdd = true;
    showPresets = false;
  }

  function applyPreset(preset: (typeof MCP_PRESETS)[number]) {
    formName = preset.name;
    formType = preset.server.type;
    formCommand = preset.server.command ?? '';
    formArgs = (preset.server.args ?? []).join(' ');
    formUrl = preset.server.url ?? '';
    formEnv = preset.server.env
      ? Object.entries(preset.server.env).map(([k, v]) => `${k}=${v}`).join('\n')
      : '';
    showPresets = false;
    showAdd = true;
  }

  function parseEnv(raw: string): Record<string, string> | undefined {
    const lines = raw.split('\n').filter((l) => l.trim() && l.includes('='));
    if (lines.length === 0) return undefined;
    return Object.fromEntries(lines.map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }));
  }

  async function submit() {
    if (!editMode) {
      const err = validateServerName(formName);
      if (err) {
        serverNameError = err;
        return;
      }
    }
    formSaving = true;
    try {
      const server: McpServer = { type: formType };
      if (formType === 'stdio') {
        if (formCommand.trim()) server.command = formCommand.trim();
        const args = formArgs.trim().split(/\s+/).filter(Boolean);
        if (args.length > 0) server.args = args;
      } else {
        if (formUrl.trim()) server.url = formUrl.trim();
      }
      const env = parseEnv(formEnv);
      if (env) server.env = env;

      if (editMode && selected) {
        await removeScopedMcpServer(selected.name, selected.scope, selected.projectPath);
      }
      await saveScopedMcpServer(
        formName.trim(),
        server,
        formScope,
        formScope === 'project' ? formProjectPath.trim() : undefined,
      );
      addToast(`Server "${formName.trim()}" ${editMode ? 'updated' : 'added'}`, 'success');
      showAdd = false;
      selected = null;
      await load();
    } catch (e) {
      addToast(`Failed to save server: ${e}`, 'error');
    } finally {
      formSaving = false;
    }
  }

  async function toggle(entry: ScopedMcpEntry) {
    try {
      await toggleMcpServer(entry.name, entry.scope, entry.projectPath);
      addToast(`Server "${entry.name}" ${entry.server.disabled ? 'enabled' : 'disabled'}`, 'info');
      await load();
    } catch (e) {
      addToast(`Failed to toggle server: ${e}`, 'error');
    }
  }

  async function remove(entry: ScopedMcpEntry) {
    const ok = await confirmModal?.confirm('Remove Server', `Remove MCP server "${entry.name}"?`);
    if (!ok) return;
    try {
      await removeScopedMcpServer(entry.name, entry.scope, entry.projectPath);
      if (selected?.name === entry.name) { selected = null; showAdd = false; }
      addToast(`Server "${entry.name}" removed`, 'success');
      await load();
    } catch (e) {
      addToast(`Failed to remove server: ${e}`, 'error');
    }
  }

  onMount(load);
</script>

<div class="flex gap-0 h-full min-h-0">
  <!-- Server list -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
      <span class="text-[10px] text-[var(--text-ghost)] font-mono tracking-wide">{entries.length} servers</span>
      <div class="flex items-center gap-1">
        <button
          onclick={() => { showPresets = !showPresets; showAdd = false; }}
          class="h-7 px-2 rounded-md text-[11px] text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150"
          aria-label="Preset templates"
        ><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/></svg></button>
        <button
          onclick={openAdd}
          class="h-7 px-2.5 rounded-md text-[11px] font-medium text-[var(--accent-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-150 flex items-center gap-1"
        >
          <span class="text-sm leading-none">+</span> Add
        </button>
      </div>
    </div>

    {#if showPresets}
      <div class="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] animate-fade-in">
        <div class="px-3 py-2 text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-wider">Presets</div>
        {#each MCP_PRESETS as preset}
          <button
            onclick={() => applyPreset(preset)}
            class="w-full text-left px-4 py-2.5 hover:bg-[var(--surface-3)] transition-colors text-[12px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]/50"
          >
            <span class="font-mono text-[var(--accent-dim)]">{preset.name}</span>
            <span class="text-[10px] text-[var(--text-ghost)] ml-2">{preset.label}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto stagger-list">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <span class="text-[13px] text-[var(--text-ghost)] animate-pulse-dot">Loading...</span>
        </div>
      {:else if adapter && !adapter.supportsMcp}
        <EmptyState
          icon="mcp"
          title="MCP not supported"
          description="{adapter.label} does not support MCP servers"
        />
      {:else if entries.length === 0 && !showAdd}
        <EmptyState
          icon="mcp"
          title="No MCP servers"
          description="Add MCP servers to extend Claude's capabilities"
          actionLabel="Add Server"
          onAction={openAdd}
        />
      {:else}
        {#each entries as entry}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            onclick={() => { selected = entry; openEdit(entry); }}
            class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative cursor-pointer
                   {selected?.name === entry.name && selected?.projectPath === entry.projectPath ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
          >
            {#if selected?.name === entry.name && selected?.projectPath === entry.projectPath}
              <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
            {/if}
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <button
                  onclick={(e) => { e.stopPropagation(); toggle(entry); }}
                  class="w-3 h-3 rounded-full shrink-0 transition-colors duration-200 {entry.server.disabled ? 'bg-[var(--border-default)]' : 'bg-[var(--success)]'}"
                  aria-label={entry.server.disabled ? 'Enable server' : 'Disable server'}
                ></button>
                <span class="text-[13px] truncate font-mono {entry.server.disabled ? 'text-[var(--text-ghost)] line-through' : 'text-[var(--text-secondary)]'}">{entry.name}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)]">{entry.server.type}</span>
                {#if entry.scope === 'project'}
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-dim)]" title={entry.projectPath}>local</span>
                {/if}
                <button
                  onclick={(e) => { e.stopPropagation(); remove(entry); }}
                  class="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-[var(--text-ghost)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all duration-150"
                  aria-label="Remove server"
                ><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
            </div>
            {#if entry.server.command}
              <div class="text-[10px] text-[var(--text-ghost)] truncate mt-0.5 ml-5 font-mono">{entry.server.command} {(entry.server.args ?? []).join(' ')}</div>
            {:else if entry.server.url}
              <div class="text-[10px] text-[var(--text-ghost)] truncate mt-0.5 ml-5 font-mono">{entry.server.url}</div>
            {/if}
            {#if entry.scope === 'project' && entry.projectPath}
              <div class="text-[9px] text-[var(--text-ghost)] truncate mt-0.5 ml-5 opacity-60">{entry.projectPath}</div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Project Trust section -->
    {#if trustEntries.length > 0}
      {@const untrusted = trustEntries.filter((e) => !e.trusted).length}
      <div class="border-t border-[var(--border-subtle)]">
        <button
          onclick={() => trustExpanded = !trustExpanded}
          class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors duration-150"
        >
          <span class="flex-1 text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.12em]">
            Project Trust
          </span>
          {#if untrusted > 0}
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--warning,#f59e0b)]/15 text-[var(--warning,#f59e0b)] border border-[var(--warning,#f59e0b)]/30">
              {untrusted} pending
            </span>
          {:else}
            <span class="text-[9px] font-mono text-[var(--success)]">all trusted</span>
          {/if}
          <span class="text-[10px] text-[var(--text-ghost)] transition-transform duration-200 {trustExpanded ? 'rotate-180' : ''}">▾</span>
        </button>

        {#if trustExpanded}
          <div class="animate-fade-in border-t border-[var(--border-subtle)]">
            {#if untrusted > 0}
              <div class="px-3 py-2 border-b border-[var(--border-subtle)]">
                <button
                  onclick={handleTrustAll}
                  disabled={trustingAll}
                  class="w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150
                         bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] disabled:opacity-50"
                >
                  {trustingAll ? 'Trusting...' : `Trust All ${trustEntries.length} Projects`}
                </button>
              </div>
            {/if}
            <div class="max-h-48 overflow-y-auto">
              {#each trustEntries as entry}
                <div class="flex items-center gap-2.5 px-3 py-2 border-b border-[var(--border-subtle)]/50 hover:bg-[var(--surface-2)] group">
                  <button
                    onclick={() => handleToggleTrust(entry)}
                    class="w-3 h-3 rounded-full shrink-0 transition-colors duration-200 {entry.trusted ? 'bg-[var(--success)]' : 'bg-[var(--border-default)] group-hover:bg-[var(--text-ghost)]'}"
                    aria-label={entry.trusted ? 'Revoke trust' : 'Trust project'}
                  ></button>
                  <span class="flex-1 text-[11px] truncate font-mono {entry.trusted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-ghost)]'}">{entry.name}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Add/Edit form -->
  {#if showAdd}
    <div class="flex-1 min-w-0 flex flex-col px-8 py-6 animate-fade-in overflow-y-auto">
      <h2 class="text-[15px] font-semibold text-[var(--text-primary)] mb-5">{editMode ? 'Edit Server' : 'Add MCP Server'}</h2>

      <div class="flex flex-col gap-4 max-w-md">
        <!-- Name -->
        <div>
          <label class="block text-[11px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">Server Name</label>
          <input
            bind:value={formName}
            placeholder="e.g. filesystem"
            disabled={editMode}
            class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors disabled:opacity-50"
            oninput={() => { serverNameError = ''; }}
          />
          {#if serverNameError}<p class="text-[11px] text-[var(--danger)] mt-1">{serverNameError}</p>{/if}
        </div>

        <!-- Type -->
        <div>
          <label class="block text-[11px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">Transport Type</label>
          <div class="flex gap-2">
            {#each ['stdio', 'sse', 'http'] as t}
              <button
                onclick={() => { formType = t as McpServerType; }}
                class="px-3 py-1.5 rounded-lg text-[12px] font-mono transition-all duration-150
                       {formType === t ? 'bg-[var(--accent-dim)] text-[var(--surface-0)]' : 'bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}"
              >{t}</button>
            {/each}
          </div>
        </div>

        {#if formType === 'stdio'}
          <!-- Command -->
          <div>
            <label class="block text-[11px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">Command</label>
            <input
              bind:value={formCommand}
              placeholder="e.g. npx"
              class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
            />
          </div>
          <!-- Args -->
          <div>
            <label class="block text-[11px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">Arguments <span class="normal-case">(space-separated)</span></label>
            <input
              bind:value={formArgs}
              placeholder="e.g. -y @modelcontextprotocol/server-filesystem ."
              class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
            />
          </div>
        {:else}
          <!-- URL -->
          <div>
            <label class="block text-[11px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">Server URL</label>
            <input
              bind:value={formUrl}
              placeholder="e.g. http://localhost:3000/mcp"
              class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
            />
          </div>
        {/if}

        <!-- Env vars -->
        <div>
          <label class="block text-[11px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">
            Environment Variables <span class="normal-case">(one KEY=value per line)</span>
          </label>
          <textarea
            bind:value={formEnv}
            placeholder="API_KEY=your-key-here&#10;ANOTHER_VAR=value"
            rows={3}
            class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1">
          <button
            onclick={submit}
            disabled={!formName.trim() || formSaving}
            class="px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200
                   {formName.trim() ? 'bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] shadow-lg shadow-black/5' : 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-default'}"
          >
            {formSaving ? 'Saving...' : editMode ? 'Update' : 'Add Server'}
          </button>
          <button
            onclick={() => { showAdd = false; selected = null; }}
            class="px-4 py-2.5 rounded-lg text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-200"
          >Cancel</button>
        </div>
      </div>
    </div>
  {:else if !showAdd && entries.length > 0}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up max-w-xs">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/></svg></div>
        <p class="text-[13px] text-[var(--text-ghost)]">Select a server to edit it</p>
      </div>
    </div>
  {/if}
</div>

<ConfirmModal bind:this={confirmModal} />
