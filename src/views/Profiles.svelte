<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listProfiles,
    listTrash,
    saveProfile,
    createEmptyProfile,
    loadProfile,
    deleteProfile,
    restoreFromTrash,
    purgeFromTrash,
    copyResourcesBetweenProfiles,
    getActiveProfile,
    type Profile,
    type TrashedProfile,
    SNAPSHOT_DIRS,
  } from '../lib/profiles';
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
  let createBlank = $state(false);
  let newName = $state('');
  let newDesc = $state('');
  let saving = $state(false);
  let switching = $state(false);
  let trashOpen = $state(false);
  let copyFrom = $state('');
  let copyDirSel = $state<Record<string, boolean>>(Object.fromEntries(SNAPSHOT_DIRS.map((d) => [d, true])));
  let copying = $state(false);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  async function load() {
    loading = true;
    [profiles, trash] = await Promise.all([listProfiles(), listTrash()]);
    activeProfile = getActiveProfile();
    onCount(profiles.length);
    loading = false;
  }

  async function create() {
    if (!newName.trim()) return;
    saving = true;
    try {
      if (createBlank) {
        await createEmptyProfile(newName.trim(), newDesc.trim() || undefined);
        addToast(`Blank profile "${newName.trim()}" created`, 'success');
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

  async function switchTo(profile: Profile) {
    switching = true;
    try {
      await loadProfile(profile.name);
      activeProfile = profile.name;
      addToast(`Switched to "${profile.name}"`, 'success');
      onProfileSwitch?.();
    } catch (e) {
      addToast(`Failed to switch: ${e}`, 'error');
    } finally {
      switching = false;
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
        onclick={() => { showCreate = true; createBlank = false; }}
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

        <!-- Type toggle -->
        <div class="flex gap-1.5">
          <button
            onclick={() => createBlank = false}
            class="flex-1 py-1 rounded-md text-[11px] font-medium transition-all duration-150 border
                   {!createBlank ? 'bg-[var(--accent-dim)] text-[var(--surface-0)] border-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--accent-dim)]'}"
          >
            Full Snapshot
          </button>
          <button
            onclick={() => createBlank = true}
            class="flex-1 py-1 rounded-md text-[11px] font-medium transition-all duration-150 border
                   {createBlank ? 'bg-[var(--accent-dim)] text-[var(--surface-0)] border-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--accent-dim)]'}"
          >
            Blank Profile
          </button>
        </div>
        <p class="text-[10px] text-[var(--text-ghost)]">
          {createBlank ? 'Factory-fresh — no config, no agents, no MCP servers' : 'Saves current agents, hooks, commands, etc.'}
        </p>

        <div class="flex gap-2">
          <button
            onclick={create}
            disabled={!newName.trim() || saving}
            class="flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-150
                   {newName.trim() ? 'bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-default'}"
          >
            {saving ? 'Saving...' : createBlank ? 'Create Blank' : 'Save Current Config'}
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
      {:else if profiles.length === 0 && !showCreate}
        <EmptyState
          icon="profiles"
          title="No profiles yet"
          description="Save your current config as a named profile to switch between setups"
          actionLabel="Create Profile"
          onAction={() => { showCreate = true; }}
        />
      {:else}
        {#each profiles as profile}
          <button
            onclick={() => { selected = profile; copyFrom = ''; }}
            class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                   {selected?.name === profile.name ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
          >
            {#if selected?.name === profile.name}
              <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
            {/if}
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-1.5 h-1.5 rounded-full shrink-0 {activeProfile === profile.name ? 'bg-[var(--success)]' : 'bg-[var(--border-default)]'}"></div>
                <span class="text-[13px] truncate {selected?.name === profile.name ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{profile.name}</span>
              </div>
              <span class="text-[10px] text-[var(--text-ghost)] font-mono shrink-0">{formatDate(profile.createdAt)}</span>
            </div>
            {#if profile.description}
              <div class="text-[11px] text-[var(--text-ghost)] truncate mt-0.5 ml-3.5">{profile.description}</div>
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
  {#if selected}
    <div class="flex-1 min-w-0 flex flex-col px-8 py-6 overflow-y-auto animate-fade-in">
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-2.5 mb-1">
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">{selected.name}</h2>
            {#if activeProfile === selected.name}
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30">ACTIVE</span>
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

      <!-- Actions -->
      <div class="flex flex-col gap-3 mb-8">
        {#if activeProfile !== selected.name}
          <button
            onclick={() => switchTo(selected!)}
            disabled={switching}
            class="w-full max-w-xs py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200
                   bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] shadow-lg shadow-black/5 disabled:opacity-50"
          >
            {switching ? 'Switching...' : 'Switch to this Profile'}
          </button>
        {:else}
          <div class="w-full max-w-xs py-2.5 rounded-lg text-[13px] font-semibold text-center bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]">
            Currently Active
          </div>
        {/if}

        <button
          onclick={() => { newName = selected!.name; newDesc = selected!.description ?? ''; createBlank = false; showCreate = true; }}
          class="w-full max-w-xs py-2 rounded-lg text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] transition-all duration-200"
        >
          Update (overwrite with current config)
        </button>

        <button
          onclick={() => remove(selected!)}
          class="w-full max-w-xs py-2 rounded-lg text-[13px] text-[var(--danger)]/60 hover:text-[var(--danger)] border border-transparent hover:border-[var(--danger)]/20 hover:bg-[var(--danger)]/5 transition-all duration-200"
        >
          Move to Trash
        </button>
      </div>

      <!-- Copy Resources section -->
      <div class="border-t border-[var(--border-subtle)] pt-6">
        <h3 class="text-[12px] font-semibold text-[var(--text-muted)] mb-4 uppercase tracking-[0.1em]">Copy Resources From</h3>

        <div class="flex flex-col gap-3 max-w-xs">
          <select
            bind:value={copyFrom}
            class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-dim)] transition-colors"
          >
            <option value="">Select source profile...</option>
            {#each profiles.filter((p) => p.name !== selected?.name) as p}
              <option value={p.name}>{p.name}</option>
            {/each}
          </select>

          {#if copyFrom}
            <div class="grid grid-cols-2 gap-2">
              {#each SNAPSHOT_DIRS as dir}
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    bind:checked={copyDirSel[dir]}
                    class="rounded border-[var(--border-default)] accent-[var(--accent)]"
                  />
                  <span class="text-[12px] text-[var(--text-secondary)] font-mono group-hover:text-[var(--text-primary)] transition-colors">{dir}/</span>
                </label>
              {/each}
            </div>

            <button
              onclick={copyResources}
              disabled={copying || SNAPSHOT_DIRS.filter((d) => copyDirSel[d]).length === 0}
              class="py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                     bg-[var(--surface-3)] hover:bg-[var(--surface-4,var(--surface-3))] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] disabled:opacity-40"
            >
              {copying ? 'Copying...' : `Copy to "${selected.name}"`}
            </button>
          {/if}
        </div>
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
