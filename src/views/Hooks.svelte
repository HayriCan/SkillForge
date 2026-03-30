<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, writeFile, deleteFile, getCreatedAt } from '../lib/fs';
  import { pushHistory } from '../lib/history';
  import { removeHookReferencingFile } from '../lib/settings';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount, initialSelect = '' } = $props<{ onCount: (n: number) => void; initialSelect?: string }>();

  type HookFile = { name: string; path: string; content: string; createdAt: Date | null };

  let hookFiles = $state<HookFile[]>([]);
  let selected = $state<HookFile | null>(null);
  let editContent = $state('');
  let newName = $state('');
  let isNew = $state(false);
  let hooksDir = $state('');
  let loading = $state(true);
  let error = $state('');
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();
  let dirty = $state(false);

  function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  async function load() {
    error = '';
    try {
      const base = await claudeDir();
      hooksDir = `${base}/hooks`;
      const entries = await listDirFull(hooksDir);
      const result: HookFile[] = [];
      for (const e of entries.filter((e) => !e.isDir)) {
        const path = `${hooksDir}/${e.name}`;
        const content = await readFile(path);
        const createdAt = await getCreatedAt(path);
        result.push({ name: e.name, path, content, createdAt });
      }
      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      hookFiles = result;
      onCount(result.length);
      if (initialSelect) {
        const match = result.find((h) => h.name === initialSelect || h.path.endsWith(initialSelect));
        if (match) select(match);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load hooks';
      console.error('[Hooks] Load failed:', e);
    } finally {
      loading = false;
    }
  }

  function select(h: HookFile) {
    selected = h;
    editContent = h.content;
    dirty = false;
    isNew = false;
  }

  async function save() {
    if (!selected) return;
    pushHistory(selected.path, selected.content);
    await writeFile(selected.path, editContent);
    selected = { ...selected, content: editContent };
    dirty = false;
    await load();
  }

  async function remove(h: HookFile) {
    await deleteFile(h.path);
    await removeHookReferencingFile(h.path);
    selected = null;
    await load();
  }

  async function createNew() {
    if (!newName.trim()) return;
    const path = `${hooksDir}/${newName.trim()}.py`;
    await writeFile(path, `#!/usr/bin/env python3\n# Hook: ${newName.trim()}\n`);
    newName = '';
    isNew = false;
    await load();
  }

  async function confirmDelete(h: HookFile) {
    const ok = await confirmModal?.confirm('Delete Hook', `Are you sure you want to delete "${h.name}"?\nThis also removes references from settings.json.`);
    if (!ok) return;
    await remove(h);
  }

  function showContextMenu(event: MouseEvent, h: HookFile) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(h.path) },
      { label: 'Delete', action: () => confirmDelete(h), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  onMount(load);
</script>

{#if isNew}
  <button class="fixed inset-0 z-10 cursor-default" aria-label="Close" onclick={() => { isNew = false; newName = ''; }}></button>
{/if}

<div class="flex gap-0 h-full min-h-0">
  <!-- Hook list -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Hooks</h2>
      <button onclick={() => { isNew = true; selected = null; }} class="text-[11px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
        <span class="text-sm leading-none">+</span> New
      </button>
    </div>

    {#if isNew}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="flex gap-2 p-3 border-b border-[var(--border-subtle)] bg-[var(--accent-subtle)] relative z-20 animate-fade-in" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <input bind:value={newName} placeholder="hook_name" class="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" onkeydown={(e) => { if (e.key === 'Enter') createNew(); if (e.key === 'Escape') { isNew = false; newName = ''; } }} />
        <button onclick={createNew} class="text-[11px] text-[var(--accent)] font-semibold px-2">Add</button>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto stagger-list">
      {#each hookFiles as h}
        <button
          onclick={() => select(h)}
          oncontextmenu={(e) => showContextMenu(e, h)}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selected?.path === h.path ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if selected?.path === h.path}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <span class="text-[13px] truncate min-w-0 {selected?.path === h.path ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{h.name}</span>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{formatDate(h.createdAt)}</span>
          </div>
        </button>
      {/each}
      {#if error}
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in-up">
          <div class="text-2xl text-[var(--danger)] mb-3">!</div>
          <div class="text-[13px] text-[var(--danger)] mb-1">{error}</div>
          <button onclick={load} class="mt-3 text-[11px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors">Retry</button>
        </div>
      {:else if loading}
        <div class="flex items-center justify-center py-12">
          <span class="text-[13px] text-[var(--text-ghost)] animate-pulse-dot">Loading...</span>
        </div>
      {:else if hookFiles.length === 0 && !isNew}
        <EmptyState
          icon="hooks"
          title="No hooks yet"
          description="Create your first hook script"
          actionLabel="Create Hook"
          onAction={() => { isNew = true; selected = null; }}
        />
      {/if}
    </div>
  </div>

  <!-- Editor -->
  {#if selected}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[var(--text-primary)] text-sm font-semibold truncate">{selected.name}</span>
        {#if dirty}
          <span class="text-[10px] text-[var(--warning)] shrink-0 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse-dot"></span>
            unsaved
          </span>
        {/if}
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate mb-3">{selected.path}</div>
      <textarea
        bind:value={editContent}
        oninput={() => { dirty = editContent !== selected?.content; }}
        class="flex-1 min-h-0 w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-4 text-[13px] text-[var(--text-primary)] font-mono outline-none resize-none focus:border-[var(--accent-dim)] leading-relaxed transition-colors"
      ></textarea>
      {#if dirty}
        <div class="flex gap-2 mt-3 animate-fade-in">
          <button onclick={save} class="px-4 py-2 bg-[var(--accent-dim)] hover:bg-[var(--accent)] rounded-lg text-[13px] text-[var(--surface-0)] font-semibold transition-all duration-200 shadow-lg shadow-black/5">Save</button>
          <button onclick={() => { editContent = selected?.content ?? ''; dirty = false; }} class="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Discard</button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a hook</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
