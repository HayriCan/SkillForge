<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listProfiles,
    listTrash,
    saveProfile,
    createEmptyProfile,
    createFromTemplate,
    loadProfile,
    deleteProfile,
    restoreFromTrash,
    purgeFromTrash,
    copyResourcesBetweenProfiles,
    getActiveProfile,
    PROFILE_TEMPLATES,
    type Profile,
    type TrashedProfile,
    type TemplateType,
    SNAPSHOT_DIRS,
  } from '../lib/profiles';
  import { getActiveAdapter } from '../lib/adapters/index';
  import { estimateCurrentTokens, estimateProfileTokens, formatTokens, type TokenEstimate } from '../lib/tokenEstimator';
  import { switchToDefault } from '../lib/profiles';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import { addToast } from '../lib/toast.svelte';

  const { onCount, onProfileSwitch, onProfilesChange } = $props<{
    onCount: (n: number) => void;
    onProfileSwitch?: () => void;
    onProfilesChange?: () => void;
  }>();

  let profiles = $state<Profile[]>([]);
  let trash = $state<TrashedProfile[]>([]);
  let activeProfile = $state<string | null>(null);
  let loading = $state(true);
  let selected = $state<Profile | null>(null);
  let showCreate = $state(false);
  let createMode = $state<'snapshot' | 'blank' | 'template'>('snapshot');
  let selectedTemplate = $state<TemplateType>('coding');
  let newName = $state('');
  let newDesc = $state('');
  let tokenEstimate = $state<TokenEstimate | null>(null);
  let tokenLoading = $state(false);
  let profileTokenMap = $state<Map<string, number>>(new Map());
  let selectedDefault = $state(false);
  let defaultTokenEstimate = $state<TokenEstimate | null>(null);
  let defaultTokenTotal = $state<number | null>(null);
  let saving = $state(false);
  let switching = $state(false);
  let switchingTo = $state<string | null>(null);
  let trashOpen = $state(false);
  let copyFrom = $state('');
  let copyDirSel = $state<Record<string, boolean>>(Object.fromEntries(SNAPSHOT_DIRS.map((d) => [d, true])));
  let copying = $state(false);
  let copyDropdownOpen = $state(false);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  async function load() {
    loading = true;
    const [profilesData, trashData, adapter] = await Promise.all([listProfiles(), listTrash(), getActiveAdapter()]);
    [profiles, trash] = [profilesData, trashData];
    activeProfile = getActiveProfile(adapter.id);
    onCount(profiles.length);
    loading = false;
    // Background token fetch for all profiles
    const entries = await Promise.all(
      profiles.map(async (p) => {
        try {
          const est = await estimateProfileTokens(p.name);
          return [p.name, est.total] as [string, number];
        } catch {
          return [p.name, 0] as [string, number];
        }
      })
    );
    profileTokenMap = new Map(entries);
    // Also fetch default (live) tokens
    try {
      const defEst = await estimateCurrentTokens();
      defaultTokenTotal = defEst.total;
      if (selectedDefault) defaultTokenEstimate = defEst;
    } catch {}
  }

  $effect(() => {
    if (selectedDefault) {
      estimateCurrentTokens()
        .then((est) => { defaultTokenEstimate = est; })
        .catch(() => { defaultTokenEstimate = null; });
    }
  });

  async function create() {
    if (!newName.trim()) return;
    saving = true;
    try {
      if (createMode === 'blank') {
        await createEmptyProfile(newName.trim(), newDesc.trim() || undefined);
        addToast(`Blank profile "${newName.trim()}" created`, 'success');
      } else if (createMode === 'template') {
        await createFromTemplate(newName.trim(), newDesc.trim() || undefined, selectedTemplate);
        addToast(`Profile "${newName.trim()}" created from ${selectedTemplate} template`, 'success');
      } else {
        await saveProfile(newName.trim(), newDesc.trim() || undefined);
        addToast(`Profile "${newName.trim()}" saved`, 'success');
      }
      newName = '';
      newDesc = '';
      showCreate = false;
      onProfilesChange?.();
      await load();
    } catch (e) {
      addToast(`Failed to save profile: ${e}`, 'error');
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    const s = selected;
    if (!s) { tokenEstimate = null; return; }
    tokenLoading = true;
    estimateProfileTokens(s.name)
      .then((est) => { tokenEstimate = est; })
      .catch(() => { tokenEstimate = null; })
      .finally(() => { tokenLoading = false; });
  });

  async function switchToDefaultProfile() {
    switching = true;
    switchingTo = 'Default';
    const start = Date.now();
    try {
      await switchToDefault();
      activeProfile = null;
      addToast('Switched to Default', 'success');
      onProfileSwitch?.();
    } catch (e) {
      addToast(`Failed to switch: ${e}`, 'error');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      switching = false;
      switchingTo = null;
    }
  }

  async function switchTo(profile: Profile) {
    switching = true;
    switchingTo = profile.name;
    const start = Date.now();
    try {
      await loadProfile(profile.name);
      activeProfile = profile.name;
      addToast(`Switched to "${profile.name}"`, 'success');
      onProfileSwitch?.();
    } catch (e) {
      addToast(`Failed to switch: ${e}`, 'error');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      switching = false;
      switchingTo = null;
    }
  }

  async function remove(profile: Profile) {
    const ok = await confirmModal?.confirm('Delete Profile', `"${profile.name}" trash klasörüne taşınacak. Geri kurtarılabilir.`);
    if (!ok) return;
    try {
      await deleteProfile(profile.name);
      if (selected?.name === profile.name) selected = null;
      addToast(`"${profile.name}" trash'e taşındı`, 'success');
      onProfilesChange?.();
      await load();
    } catch (e) {
      addToast(`Failed to delete: ${e}`, 'error');
    }
  }

  async function restore(item: TrashedProfile) {
    try {
      const name = await restoreFromTrash(item.trashName);
      addToast(`"${name}" restored`, 'success');
      onProfilesChange?.();
      await load();
    } catch (e) {
      addToast(`Failed to restore: ${e}`, 'error');
    }
  }

  async function purge(item: TrashedProfile) {
    const ok = await confirmModal?.confirm('Permanently Delete', `"${item.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`);
    if (!ok) return;
    try {
      await purgeFromTrash(item.trashName);
      addToast(`"${item.name}" permanently deleted`, 'success');
      await load();
    } catch (e) {
      addToast(`Failed to purge: ${e}`, 'error');
    }
  }

  async function copyResources() {
    if (!copyFrom || !selected) return;
    const dirs = SNAPSHOT_DIRS.filter((d) => copyDirSel[d]);
    if (dirs.length === 0) return;
    copying = true;
    try {
      await copyResourcesBetweenProfiles(copyFrom, selected.name, dirs);
      addToast(`Resources copied from "${copyFrom}" to "${selected.name}"`, 'success');
    } catch (e) {
      addToast(`Failed to copy: ${e}`, 'error');
    } finally {
      copying = false;
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  onMount(load);
</script>

<div class="flex gap-0 h-full min-h-0">
  <!-- List panel -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
      <span class="text-[10px] text-[var(--text-ghost)] font-mono tracking-wide">{profiles.length} profiles</span>
      <button
        onclick={() => { showCreate = true; createMode = 'snapshot'; }}
        class="h-7 px-2.5 rounded-md text-[11px] font-medium text-[var(--accent-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-150 flex items-center gap-1"
      >
        <span class="text-sm leading-none">+</span> New
      </button>
    </div>

    {#if showCreate}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="p-3 border-b border-[var(--border-subtle)] bg-[var(--accent-subtle)] flex flex-col gap-2 animate-fade-in"
           onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <input
          bind:value={newName}
          placeholder="Profile name"
          class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
          onkeydown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') { showCreate = false; newName = ''; newDesc = ''; } }}
        />
        <input
          bind:value={newDesc}
          placeholder="Description (optional)"
          class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-dim)] transition-colors"
          onkeydown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') { showCreate = false; newName = ''; newDesc = ''; } }}
        />

        <!-- Type toggle: 3-way -->
        <div class="flex gap-1">
          {#each (['snapshot', 'blank', 'template'] as const) as mode}
            <button
              onclick={() => createMode = mode}
              class="flex-1 py-1 rounded-md text-[10px] font-medium transition-all duration-150 border
                     {createMode === mode ? 'bg-[var(--accent-dim)] text-[var(--surface-0)] border-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--accent-dim)]'}"
            >
              {mode === 'snapshot' ? 'Full Snapshot' : mode === 'blank' ? 'Blank' : 'Template'}
            </button>
          {/each}
        </div>

        {#if createMode === 'template'}
          <div class="flex flex-col gap-1.5">
            {#each PROFILE_TEMPLATES as tpl}
              <button
                onclick={() => selectedTemplate = tpl.id}
                class="w-full text-left p-2 rounded-md border transition-all duration-150
                       {selectedTemplate === tpl.id ? 'border-[var(--accent-dim)] bg-[var(--accent-subtle)]' : 'border-[var(--border-subtle)] bg-[var(--surface-2)] hover:border-[var(--border-default)]'}"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-semibold text-[var(--text-primary)]">{tpl.label}</span>
                  {#if tpl.includeMcp}<span class="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)]">MCP</span>{/if}
                </div>
                <p class="text-[10px] text-[var(--text-ghost)] mt-0.5 leading-tight">{tpl.description}</p>
              </button>
            {/each}
          </div>
        {:else}
          <p class="text-[10px] text-[var(--text-ghost)]">
            {createMode === 'blank' ? 'Factory-fresh — no config, no agents, no MCP servers' : 'Saves current agents, hooks, commands, etc.'}
          </p>
        {/if}

        <div class="flex gap-2">
          <button
            onclick={create}
            disabled={!newName.trim() || saving}
            class="flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-150
                   {newName.trim() ? 'bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-default'}"
          >
            {saving ? 'Saving...' : createMode === 'blank' ? 'Create Blank' : createMode === 'template' ? `Use ${selectedTemplate} Template` : 'Save Current Config'}
          </button>
          <button
            onclick={() => { showCreate = false; newName = ''; newDesc = ''; }}
            class="px-3 py-1.5 rounded-md text-[12px] text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150"
          >✕</button>
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto stagger-list">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <span class="text-[13px] text-[var(--text-ghost)] animate-pulse-dot">Loading...</span>
        </div>
      {:else}
        <!-- Default (live state) entry -->
        <button
          onclick={() => { if (switching) return; selectedDefault = true; selected = null; copyFrom = ''; }}
          disabled={switching}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selectedDefault ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}
                 disabled:pointer-events-none"
        >
          {#if selectedDefault}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-1.5 h-1.5 rounded-full shrink-0 {activeProfile === null ? 'bg-[var(--success)]' : 'bg-[var(--border-default)]'}"></div>
              <span class="text-[13px] truncate {selectedDefault ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">Default</span>
              <span class="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)] shrink-0">live</span>
            </div>
            <span class="text-[10px] text-[var(--text-ghost)] font-mono shrink-0">~/.claude</span>
          </div>
          {#if defaultTokenTotal !== null}
            {@const max = Math.max(defaultTokenTotal, ...profileTokenMap.values(), 1)}
            {@const pct = Math.min(100, (defaultTokenTotal / max) * 100)}
            <div class="mt-1.5 ml-3.5 flex items-center gap-2">
              <div class="flex-1 h-[3px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700 {activeProfile === null ? 'bg-[var(--accent)]' : 'bg-[var(--text-ghost)]/40'}"
                  style="width: {pct}%"
                ></div>
              </div>
              <span class="text-[9px] font-mono text-[var(--text-ghost)] shrink-0">~{formatTokens(defaultTokenTotal)}</span>
            </div>
          {/if}
        </button>

        {#if profiles.length === 0 && !showCreate}
          <div class="px-4 py-4 text-center border-b border-[var(--border-subtle)]">
            <p class="text-[11px] text-[var(--text-ghost)] leading-relaxed">Save your current config as a named profile to switch between setups</p>
            <button
              onclick={() => { showCreate = true; createMode = 'snapshot'; }}
              class="mt-2 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[var(--accent-dim)] text-[var(--surface-0)] hover:bg-[var(--accent)] transition-all duration-150"
            >+ New Profile</button>
          </div>
        {/if}

        {#each profiles as profile}
          <button
            onclick={() => { if (switching) return; selected = profile; selectedDefault = false; copyFrom = ''; }}
            disabled={switching}
            class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                   {selected?.name === profile.name ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}
                   disabled:pointer-events-none"
          >
            {#if selected?.name === profile.name}
              <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
            {/if}
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-1.5 h-1.5 rounded-full shrink-0 {activeProfile === profile.name ? 'bg-[var(--success)]' : 'bg-[var(--border-default)]'}"></div>
                <span class="text-[13px] truncate {selected?.name === profile.name ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{profile.name}</span>
                {#if profile.templateType}
                  <span class="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)] shrink-0">{profile.templateType}</span>
                {/if}
              </div>
              <span class="text-[10px] text-[var(--text-ghost)] font-mono shrink-0">{formatDate(profile.createdAt)}</span>
            </div>
            {#if profile.description}
              <div class="text-[11px] text-[var(--text-ghost)] truncate mt-0.5 ml-3.5">{profile.description}</div>
            {/if}
            {#if profileTokenMap.has(profile.name)}
              {@const max = Math.max(...[...profileTokenMap.values()], 1)}
              {@const pct = Math.min(100, (profileTokenMap.get(profile.name)! / max) * 100)}
              <div class="mt-1.5 ml-3.5 flex items-center gap-2">
                <div class="flex-1 h-[3px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700 {activeProfile === profile.name ? 'bg-[var(--accent)]' : 'bg-[var(--text-ghost)]/40'}"
                    style="width: {pct}%"
                  ></div>
                </div>
                <span class="text-[9px] font-mono text-[var(--text-ghost)] shrink-0">~{formatTokens(profileTokenMap.get(profile.name)!)}</span>
              </div>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    <!-- Trash section -->
    {#if trash.length > 0}
      <div class="border-t border-[var(--border-subtle)]">
        <button
          onclick={() => trashOpen = !trashOpen}
          class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors duration-150"
        >
          <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.12em] flex-1">
            Recently Deleted ({trash.length})
          </span>
          <span class="text-[10px] text-[var(--text-ghost)] transition-transform duration-200 {trashOpen ? 'rotate-180' : ''}">▾</span>
        </button>

        {#if trashOpen}
          <div class="animate-fade-in">
            {#each trash as item}
              <div class="flex items-center gap-2 px-4 py-2 border-t border-[var(--border-subtle)] hover:bg-[var(--surface-2)] group">
                <div class="flex-1 min-w-0">
                  <div class="text-[12px] text-[var(--text-muted)] truncate">{item.name}</div>
                  <div class="text-[10px] text-[var(--text-ghost)] font-mono">{timeAgo(item.deletedAt)}</div>
                </div>
                <button
                  onclick={() => restore(item)}
                  class="text-[10px] px-2 py-1 rounded text-[var(--accent-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors duration-150 shrink-0"
                >
                  Restore
                </button>
                <button
                  onclick={() => purge(item)}
                  class="text-[10px] px-2 py-1 rounded text-[var(--danger)]/50 hover:text-[var(--danger)] hover:bg-[var(--danger)]/5 transition-colors duration-150 shrink-0 opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Detail panel -->
  {#if switching}
    <div class="flex-1 min-w-0 flex flex-col items-center justify-center gap-4 animate-fade-in">
      <!-- Spinner -->
      <div class="relative w-12 h-12">
        <div class="absolute inset-0 rounded-full border-2 border-[var(--border-subtle)]"></div>
        <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent)] animate-spin"></div>
      </div>
      <div class="text-center">
        <p class="text-[13px] font-semibold text-[var(--text-primary)]">Loading Profile</p>
        {#if switchingTo}
          <p class="text-[11px] text-[var(--text-ghost)] font-mono mt-0.5">"{switchingTo}"</p>
        {/if}
      </div>
      <p class="text-[10px] text-[var(--text-ghost)] max-w-[200px] text-center leading-relaxed">
        Saving current state and restoring snapshot…
      </p>
    </div>
  {:else if selectedDefault}
    <div class="flex-1 min-w-0 flex flex-col px-8 py-6 overflow-y-auto animate-fade-in">
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-2.5 mb-1">
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">Default</h2>
            {#if activeProfile === null}
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30">ACTIVE</span>
            {/if}
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)]">live</span>
          </div>
          <p class="text-[13px] text-[var(--text-muted)]">Current live state of ~/.claude/ — not a snapshot</p>
        </div>
      </div>

      <!-- Token Estimator for Default -->
      <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] overflow-hidden mb-6">
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Token Estimate</span>
            <span class="text-[9px] text-[var(--text-ghost)] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)]">live</span>
          </div>
          {#if defaultTokenEstimate}
            <span class="text-[15px] font-bold tabular-nums" style="color: var(--accent)">~{formatTokens(defaultTokenEstimate.total)}</span>
          {/if}
        </div>
        {#if defaultTokenEstimate}
          {@const tot = defaultTokenEstimate.total || 1}
          <div class="px-4 pt-3 pb-2">
            <div class="flex h-[6px] rounded-full overflow-hidden gap-[1px]">
              {#each [
                { val: defaultTokenEstimate.claudeMd, color: 'var(--accent)' },
                { val: defaultTokenEstimate.memoryMd, color: 'var(--text-ghost)' },
                { val: defaultTokenEstimate.skills,   color: 'var(--success)' },
                { val: defaultTokenEstimate.agents,   color: '#60a5fa' },
                { val: defaultTokenEstimate.hooks,    color: '#fbbf24' },
                { val: defaultTokenEstimate.mcp,      color: '#a78bfa' },
              ] as seg}
                {#if seg.val > 0}
                  <div class="h-full rounded-sm transition-all duration-500" style="width: {(seg.val / tot) * 100}%; background: {seg.color}; opacity: 0.85"></div>
                {/if}
              {/each}
            </div>
          </div>
          <div class="px-4 pb-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {#each [
              { label: 'CLAUDE.md', val: defaultTokenEstimate.claudeMd, count: null, color: 'var(--accent)' },
              { label: 'Skills',    val: defaultTokenEstimate.skills,   count: defaultTokenEstimate.skillCount, color: 'var(--success)' },
              { label: 'MEMORY.md', val: defaultTokenEstimate.memoryMd, count: null, color: 'var(--text-ghost)' },
              { label: 'Agents',    val: defaultTokenEstimate.agents,   count: defaultTokenEstimate.agentCount, color: '#60a5fa' },
              { label: 'Hooks',     val: defaultTokenEstimate.hooks,    count: defaultTokenEstimate.hookCount,  color: '#fbbf24' },
              { label: 'MCP',       val: defaultTokenEstimate.mcp,      count: defaultTokenEstimate.mcpServerCount, color: '#a78bfa' },
            ] as row}
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: {row.color}"></span>
                    <span class="text-[10px] font-mono text-[var(--text-ghost)]">{row.label}{row.count !== null ? ` ×${row.count}` : ''}</span>
                  </div>
                  <span class="text-[10px] font-mono font-medium text-[var(--text-muted)] tabular-nums">{formatTokens(row.val)}</span>
                </div>
                <div class="h-[2px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" style="width: {Math.min(100, (row.val / tot) * 100)}%; background: {row.color}; opacity: 0.7"></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Default actions -->
      <div class="flex flex-col gap-3">
        {#if activeProfile !== null}
          <button
            onclick={switchToDefaultProfile}
            disabled={switching}
            class="group w-full max-w-xs flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200
                   bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] disabled:opacity-50"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            {switching ? 'Switching...' : 'Switch to Default'}
          </button>
        {:else}
          <div class="w-full max-w-xs py-2.5 rounded-xl text-[13px] font-medium text-center bg-[var(--success)]/8 border border-[var(--success)]/25 text-[var(--success)] flex items-center justify-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse shrink-0"></span>
            Currently Active
          </div>
        {/if}
      </div>
    </div>
  {:else if selected}
    <div class="flex-1 min-w-0 flex flex-col px-8 py-6 overflow-y-auto animate-fade-in">
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-2.5 mb-1">
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">{selected.name}</h2>
            {#if activeProfile === selected.name}
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30">ACTIVE</span>
            {/if}
            {#if selected.templateType}
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-dim)] border border-[var(--accent-dim)]/30">{selected.templateType}</span>
            {/if}
          </div>
          {#if selected.description}
            <p class="text-[13px] text-[var(--text-muted)]">{selected.description}</p>
          {/if}
          <p class="text-[11px] text-[var(--text-ghost)] font-mono mt-1">Created {formatDate(selected.createdAt)}</p>
        </div>
      </div>

      <!-- Info box -->
      <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 mb-6">
        <div class="text-[11px] text-[var(--text-ghost)] leading-relaxed">
          {#if selected.isBlank}
            <p class="mb-2 font-medium text-[var(--text-muted)]">Blank profile — factory-fresh Claude Code state:</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> settings.json</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> agents/</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> CLAUDE.md</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> commands/</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> MEMORY.md</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> hooks/</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> .mcp.json</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--danger)]/60">∅</span> plans/ &amp; skills/</div>
            </div>
          {:else}
            <p class="mb-2 font-medium text-[var(--text-muted)]">Full snapshot — everything gets saved:</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> settings.json</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> agents/</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> CLAUDE.md</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> commands/</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> MEMORY.md</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> hooks/</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> .mcp.json</div>
              <div class="flex items-center gap-1.5"><span class="text-[var(--accent)]">✓</span> plans/ &amp; skills/</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Token Estimator -->
      <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] overflow-hidden mb-6">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Token Estimate</span>
            <span class="text-[9px] text-[var(--text-ghost)] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)]">≈ chars/4</span>
          </div>
          {#if tokenLoading}
            <span class="text-[10px] text-[var(--text-ghost)] animate-pulse-dot">Calculating...</span>
          {:else if tokenEstimate}
            <span class="text-[15px] font-bold tabular-nums" style="color: var(--accent)">~{formatTokens(tokenEstimate.total)}</span>
          {/if}
        </div>

        {#if tokenEstimate && !tokenLoading}
          <!-- Stacked total bar -->
          {@const tot = tokenEstimate.total || 1}
          <div class="px-4 pt-3 pb-2">
            <div class="flex h-[6px] rounded-full overflow-hidden gap-[1px]">
              {#each [
                { val: tokenEstimate.claudeMd, color: 'var(--accent)' },
                { val: tokenEstimate.memoryMd, color: 'var(--text-ghost)' },
                { val: tokenEstimate.skills,   color: 'var(--success)' },
                { val: tokenEstimate.agents,   color: '#60a5fa' },
                { val: tokenEstimate.hooks,    color: '#fbbf24' },
                { val: tokenEstimate.mcp,      color: '#a78bfa' },
              ] as seg}
                {#if seg.val > 0}
                  <div
                    class="h-full rounded-sm transition-all duration-500"
                    style="width: {(seg.val / tot) * 100}%; background: {seg.color}; opacity: 0.85"
                  ></div>
                {/if}
              {/each}
            </div>
          </div>

          <!-- Breakdown rows -->
          <div class="px-4 pb-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {#each [
              { label: 'CLAUDE.md',   val: tokenEstimate.claudeMd,  count: null,                          color: 'var(--accent)' },
              { label: 'Skills',      val: tokenEstimate.skills,    count: tokenEstimate.skillCount,      color: 'var(--success)' },
              { label: 'MEMORY.md',   val: tokenEstimate.memoryMd,  count: null,                          color: 'var(--text-ghost)' },
              { label: 'Agents',      val: tokenEstimate.agents,    count: tokenEstimate.agentCount,      color: '#60a5fa' },
              { label: 'Hooks',       val: tokenEstimate.hooks,     count: tokenEstimate.hookCount,       color: '#fbbf24' },
              { label: 'MCP',         val: tokenEstimate.mcp,       count: tokenEstimate.mcpServerCount,  color: '#a78bfa' },
            ] as row}
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: {row.color}"></span>
                    <span class="text-[10px] font-mono text-[var(--text-ghost)]">
                      {row.label}{row.count !== null ? ` ×${row.count}` : ''}
                    </span>
                  </div>
                  <span class="text-[10px] font-mono font-medium text-[var(--text-muted)] tabular-nums">{formatTokens(row.val)}</span>
                </div>
                <div class="h-[2px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    style="width: {Math.min(100, (row.val / tot) * 100)}%; background: {row.color}; opacity: 0.7"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if !tokenLoading}
          <div class="px-4 py-3 text-[10px] text-[var(--text-ghost)]">No estimate available</div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 mb-6">
        {#if activeProfile !== selected.name}
          <button
            onclick={() => switchTo(selected!)}
            disabled={switching}
            class="group flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
                   bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-white disabled:opacity-50"
          >
            <svg class="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            {switching ? 'Switching...' : 'Switch to this Profile'}
          </button>
        {:else}
          <div class="flex items-center gap-2 text-[12px] font-medium text-[var(--success)] shrink-0 mr-auto">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0"></span>
            Currently Active
          </div>
        {/if}

        <button
          onclick={() => { newName = selected!.name; newDesc = selected!.description ?? ''; createMode = 'snapshot'; showCreate = true; }}
          class="group flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium shrink-0
                 text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)]
                 transition-all duration-150"
        >
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Update
        </button>

        <button
          onclick={() => remove(selected!)}
          class="group flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium shrink-0
                 text-[var(--danger)]/60 hover:text-[var(--danger)] hover:bg-[var(--danger)]/8
                 transition-all duration-150"
        >
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Trash
        </button>
      </div>

      <!-- Copy Resources -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.1em]">Copy resources from another profile</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Dropdown -->
          <div class="relative flex-1">
            <button
              onclick={() => copyDropdownOpen = !copyDropdownOpen}
              class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] transition-all duration-150 outline-none
                     bg-[var(--surface-2)] border
                     {copyDropdownOpen ? 'border-[var(--accent-dim)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                     {copyFrom ? 'text-[var(--text-primary)]' : 'text-[var(--text-ghost)]'}"
            >
              <span class="truncate">{copyFrom || 'Select source profile...'}</span>
              <svg class="w-3 h-3 shrink-0 text-[var(--text-ghost)] transition-transform duration-150 {copyDropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>

            {#if copyDropdownOpen}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="fixed inset-0 z-40" onclick={() => copyDropdownOpen = false} onkeydown={() => copyDropdownOpen = false}></div>
              <div class="absolute top-full left-0 right-0 mt-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
                {#if profiles.filter((p) => p.name !== selected?.name).length === 0}
                  <div class="px-3 py-2.5 text-[11px] text-[var(--text-ghost)]">No other profiles</div>
                {:else}
                  {#each profiles.filter((p) => p.name !== selected?.name) as p}
                    <button
                      onclick={() => { copyFrom = p.name; copyDropdownOpen = false; }}
                      class="w-full text-left px-3 py-2.5 text-[12px] flex items-center gap-2 transition-colors duration-100
                             {copyFrom === p.name ? 'bg-[var(--accent-subtle)] text-[var(--accent-dim)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}"
                    >
                      <span class="w-1.5 h-1.5 rounded-full shrink-0 {copyFrom === p.name ? 'bg-[var(--accent-dim)]' : 'bg-[var(--border-default)]'}"></span>
                      {p.name}
                    </button>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>

          <button
            onclick={copyResources}
            disabled={!copyFrom || copying || SNAPSHOT_DIRS.filter((d) => copyDirSel[d]).length === 0}
            class="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150
                   bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copying ? 'Copying...' : 'Copy'}
          </button>
        </div>

        {#if copyFrom}
          <div class="flex flex-wrap gap-1 mt-2">
            {#each SNAPSHOT_DIRS as dir}
              <label class="flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md border transition-all duration-100 text-[10px] font-mono
                             {copyDirSel[dir]
                               ? 'border-[var(--accent-dim)]/30 bg-[var(--accent-subtle)] text-[var(--accent-dim)]'
                               : 'border-[var(--border-subtle)] text-[var(--text-ghost)] hover:border-[var(--border-default)]'}">
                <input type="checkbox" bind:checked={copyDirSel[dir]} class="sr-only" />
                {dir}/
              </label>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up max-w-xs">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg></div>
        <p class="text-[13px] text-[var(--text-ghost)] mb-2">Select a profile to manage it</p>
        <p class="text-[11px] text-[var(--text-ghost)] opacity-70">Profiles let you switch between different Claude Code setups — work, personal, experimental, client-specific.</p>
      </div>
    </div>
  {/if}
</div>

<ConfirmModal bind:this={confirmModal} />
