<script lang="ts">
  import { onMount } from 'svelte';
  import { listDirFull, readFile, writeFile, deleteFile, getCreatedAt } from '../lib/fs';
  import { pushHistory, getFileHistory } from '../lib/history';
  import ContextMenu from './ContextMenu.svelte';
  import ConfirmModal from './ConfirmModal.svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import EmptyState from './EmptyState.svelte';
  import DiffView from './DiffView.svelte';
  import { validateFileName } from '../lib/validation';

  const { dir, label, onCount, emptyIcon = '◇', emptyTitle, emptyDescription, emptyActionLabel, initialSelect = '' } = $props<{
    dir: string;
    label: string;
    onCount: (n: number) => void;
    emptyIcon?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyActionLabel?: string;
    initialSelect?: string;
  }>();

  type Item = { name: string; path: string; content: string; createdAt: Date | null };

  let items = $state<Item[]>([]);
  let selected = $state<Item | null>(null);
  let editContent = $state('');
  let newName = $state('');
  let isNew = $state(false);
  let loading = $state(true);
  let error = $state('');
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();
  let dirty = $state(false);
  let selectMode = $state(false);
  let selectedPaths = $state<Set<string>>(new Set());
  let showDiff = $state(false);
  let showHistory = $state(false);
  let nameError = $state('');
  let historyEntries = $state<ReturnType<typeof getFileHistory>>([]);

  function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  async function load() {
    error = '';
    try {
      const entries = await listDirFull(dir);
      const result: Item[] = [];
      for (const e of entries.filter((e) => !e.isDir && e.name.endsWith('.md'))) {
        const path = `${dir}/${e.name}`;
        const content = await readFile(path);
        const createdAt = await getCreatedAt(path);
        result.push({ name: e.name.replace('.md', ''), path, content, createdAt });
      }
      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      items = result;
      onCount(result.length);
      if (initialSelect) {
        const match = result.find((i) => i.name === initialSelect.replace('.md', '') || i.path.endsWith(initialSelect));
        if (match) select(match);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load items';
      console.error(`[${label}] Load failed:`, e);
    } finally {
      loading = false;
    }
  }

  function select(item: Item) {
    selected = item;
    editContent = item.content;
    dirty = false;
    isNew = false;
    showHistory = false;
    historyEntries = getFileHistory(item.path);
  }

  function openHistory() {
    if (!selected) return;
    historyEntries = getFileHistory(selected.path);
    showHistory = true;
  }

  function restoreFromHistory(content: string) {
    editContent = content;
    dirty = editContent !== selected?.content;
    showHistory = false;
  }

  async function save() {
    if (!selected) return;
    pushHistory(selected.path, selected.content);
    await writeFile(selected.path, editContent);
    selected = { ...selected, content: editContent };
    dirty = false;
    await load();
  }

  async function remove(item: Item) {
    await deleteFile(item.path);
    selected = null;
    await load();
  }

  async function createNew() {
    const err = validateFileName(newName);
    if (err) {
      nameError = err;
      return;
    }
    const path = `${dir}/${newName.trim()}.md`;
    await writeFile(path, `# ${newName.trim()}\n`);
    newName = '';
    nameError = '';
    isNew = false;
    await load();
  }

  function contentPreview(content: string): string {
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
    return lines[0]?.slice(0, 60) ?? '';
  }

  async function confirmDelete(item: Item) {
    const ok = await confirmModal?.confirm('Delete Item', `Are you sure you want to delete "${item.name}"?`);
    if (!ok) return;
    await remove(item);
  }

  function toggleSelectMode() {
    selectMode = !selectMode;
    selectedPaths = new Set();
    if (selectMode) selected = null;
  }

  function togglePath(path: string) {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    selectedPaths = next;
  }

  function selectAll() {
    if (selectedPaths.size === items.length) {
      selectedPaths = new Set();
    } else {
      selectedPaths = new Set(items.map((i) => i.path));
    }
  }

  async function bulkDelete() {
    if (selectedPaths.size === 0) return;
    const count = selectedPaths.size;
    const ok = await confirmModal?.confirm('Delete Selected', `Delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.`);
    if (!ok) return;
    for (const path of selectedPaths) {
      try { await deleteFile(path); } catch {}
    }
    selectedPaths = new Set();
    selectMode = false;
    selected = null;
    await load();
  }

  function showContextMenu(event: MouseEvent, item: Item) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(item.path) },
      { label: 'Delete', action: () => confirmDelete(item), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  onMount(load);
</script>

{#if isNew}
  <button class="fixed inset-0 z-10 cursor-default" aria-label="Close" onclick={() => { isNew = false; newName = ''; }}></button>
{/if}

<div class="flex gap-0 h-full min-h-0">
  <!-- List panel -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
      {#if selectMode}
        <!-- Select mode toolbar -->
        <button
          onclick={selectAll}
          class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150
                 {selectedPaths.size === items.length
                   ? 'bg-[var(--accent)] text-[var(--surface-0)]'
                   : 'border border-[var(--border-default)] text-transparent hover:border-[var(--text-muted)]'}"
          title={selectedPaths.size === items.length ? 'Deselect all' : 'Select all'}
        >
          <span class="text-[10px] font-bold">✓</span>
        </button>
        <span class="text-[11px] text-[var(--text-muted)] font-mono">{selectedPaths.size} selected</span>
        <div class="flex items-center gap-1">
          <button
            onclick={bulkDelete}
            disabled={selectedPaths.size === 0}
            class="h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all duration-150
                   {selectedPaths.size > 0
                     ? 'bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25'
                     : 'text-[var(--text-ghost)] cursor-default'}"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M5.3 4V2.7a1 1 0 011-1h3.4a1 1 0 011 1V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9a1.5 1.5 0 001.5 1.3h4.6a1.5 1.5 0 001.5-1.3l.7-9"/></svg> Delete
          </button>
          <button
            onclick={toggleSelectMode}
            class="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150"
            title="Cancel"
          >
            ✕
          </button>
        </div>
      {:else}
        <!-- Normal toolbar -->
        <span class="text-[10px] text-[var(--text-ghost)] font-mono tracking-wide">{items.length} items</span>
        <div class="flex items-center gap-1">
          {#if items.length > 1}
            <button
              onclick={toggleSelectMode}
              class="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-ghost)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all duration-150"
              title="Bulk delete"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M5.3 4V2.7a1 1 0 011-1h3.4a1 1 0 011 1V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9a1.5 1.5 0 001.5 1.3h4.6a1.5 1.5 0 001.5-1.3l.7-9"/></svg>
            </button>
          {/if}
          <button
            onclick={() => { isNew = true; selected = null; }}
            class="h-7 px-2.5 rounded-md text-[11px] font-medium text-[var(--accent-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-150 flex items-center gap-1"
          >
            <span class="text-sm leading-none">+</span> New
          </button>
        </div>
      {/if}
    </div>

    {#if isNew}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="flex flex-col p-3 border-b border-[var(--border-subtle)] bg-[var(--accent-subtle)] relative z-20 animate-fade-in" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <div class="flex gap-2">
          <input
            bind:value={newName}
            placeholder="name"
            class="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
            onkeydown={(e) => { if (e.key === 'Enter') createNew(); if (e.key === 'Escape') { isNew = false; newName = ''; nameError = ''; } }}
            oninput={() => { nameError = ''; }}
          />
          <button onclick={createNew} disabled={!!nameError} class="text-[11px] text-[var(--accent)] hover:text-[var(--accent)] font-semibold px-2">Add</button>
        </div>
        {#if nameError}<p class="text-[11px] text-[var(--danger)] mt-1">{nameError}</p>{/if}
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto stagger-list">
      {#each items as item}
        <button
          onclick={() => { if (selectMode) togglePath(item.path); else select(item); }}
          oncontextmenu={(e) => { if (!selectMode) showContextMenu(e, item); }}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selectMode && selectedPaths.has(item.path) ? 'bg-[var(--danger)]/5' : selected?.path === item.path ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if !selectMode && selected?.path === item.path}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              {#if selectMode}
                <div class="w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] transition-all duration-150
                            {selectedPaths.has(item.path)
                              ? 'bg-[var(--danger)] border-[var(--danger)] text-white'
                              : 'border-[var(--border-default)] text-transparent'}">
                  ✓
                </div>
              {/if}
              <span class="text-[13px] truncate min-w-0 {selected?.path === item.path && !selectMode ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{item.name}</span>
            </div>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{formatDate(item.createdAt)}</span>
          </div>
          {#if contentPreview(item.content)}
            <div class="text-[11px] text-[var(--text-ghost)] truncate mt-1 {selectMode ? 'ml-[26px]' : ''}">{contentPreview(item.content)}</div>
          {/if}
        </button>
      {/each}
      {#if error}
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in-up">
          <div class="text-2xl text-[var(--danger)] mb-3">!</div>
          <div class="text-[13px] text-[var(--danger)] mb-1">{error}</div>
          <button
            onclick={load}
            class="mt-3 text-[11px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors"
          >
            Retry
          </button>
        </div>
      {:else if loading}
        <div class="flex items-center justify-center py-12">
          <span class="text-[13px] text-[var(--text-ghost)] animate-pulse-dot">Loading...</span>
        </div>
      {:else if items.length === 0 && !isNew}
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle ?? `No ${label.toLowerCase()}`}
          description={emptyDescription ?? `Create your first ${label.toLowerCase().replace(/s$/, '')}`}
          actionLabel={emptyActionLabel ?? `Create ${label.toLowerCase().replace(/s$/, '')}`}
          onAction={() => { isNew = true; selected = null; }}
        />
      {/if}
    </div>
  </div>

  <!-- Editor panel -->
  {#if selected}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in relative">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[var(--text-primary)] text-sm font-semibold truncate">{selected.name}</span>
        <div class="flex items-center gap-2 shrink-0">
          {#if dirty}
            <span class="text-[10px] text-[var(--warning)] flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse-dot"></span>
              unsaved
            </span>
          {/if}
          {#if historyEntries.length > 0}
            <button
              onclick={openHistory}
              class="text-[11px] px-2 py-0.5 rounded-md text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150 font-mono"
              title="View history"
            ><svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg> {historyEntries.length}</button>
          {/if}
        </div>
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate mb-3">{selected.path}</div>
      <MarkdownEditor bind:value={editContent} oninput={() => { dirty = editContent !== selected?.content; }} />
      {#if dirty}
        <div class="flex gap-2 mt-3 animate-fade-in">
          <button onclick={save} class="px-4 py-2 bg-[var(--accent-dim)] hover:bg-[var(--accent)] rounded-lg text-[13px] text-[var(--surface-0)] font-semibold transition-all duration-200 shadow-lg shadow-black/5">Save</button>
          <button
            onclick={() => { showDiff = true; }}
            class="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] rounded-lg transition-all duration-150"
          >Review Changes</button>
          <button onclick={() => { editContent = selected?.content ?? ''; dirty = false; }} class="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Discard</button>
        </div>
      {/if}

      <!-- History panel -->
      {#if showHistory}
        <div class="absolute inset-y-0 right-0 w-72 bg-[var(--surface-1)] border-l border-[var(--border-subtle)] flex flex-col animate-fade-in z-10">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <span class="text-[12px] font-semibold text-[var(--text-primary)]">Version History</span>
            <button onclick={() => { showHistory = false; }} aria-label="Close history" class="text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="flex-1 overflow-y-auto">
            {#each historyEntries as entry}
              <button
                onclick={() => restoreFromHistory(entry.content)}
                class="w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors group"
              >
                <div class="text-[11px] text-[var(--text-secondary)] font-mono mb-1">
                  {new Date(entry.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div class="text-[10px] text-[var(--text-ghost)] truncate">{entry.content.split('\n')[0]?.slice(0, 50) ?? '(empty)'}</div>
                <div class="text-[10px] text-[var(--accent-dim)] opacity-0 group-hover:opacity-100 mt-0.5 transition-opacity">Click to restore</div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select an item to edit</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />

{#if showDiff && selected}
  <DiffView
    oldText={selected.content}
    newText={editContent}
    onClose={() => { showDiff = false; }}
  />
{/if}
