<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, getCreatedAt, deleteFile } from '../lib/fs';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import MarkdownEditor from '../components/MarkdownEditor.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  type Session = {
    name: string;
    path: string;
    content: string;
    createdAt: Date | null;
    isJson: boolean;
    meta?: {
      pid?: number;
      sessionId?: string;
      cwd?: string;
      startedAt?: number;
    };
  };

  let sessions = $state<Session[]>([]);
  let selected = $state<Session | null>(null);
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  function displayName(session: Session): string {
    if (session.isJson && session.meta?.cwd) {
      const parts = session.meta.cwd.split('/');
      return parts[parts.length - 1] || session.name;
    }
    return session.name.replace('.json', '').replace('.tmp', '');
  }

  async function load() {
    try {
      const base = await claudeDir();
      const dir = `${base}/sessions`;
      const entries = await listDirFull(dir);
      const result: Session[] = [];

      for (const e of entries.filter((e) => !e.isDir)) {
        const path = `${dir}/${e.name}`;
        try {
          const content = await readFile(path);
          const createdAt = await getCreatedAt(path);
          const isJson = e.name.endsWith('.json');
          let meta: Session['meta'];
          if (isJson) {
            try { meta = JSON.parse(content); } catch {}
          }
          result.push({ name: e.name, path, content, createdAt, isJson, meta });
        } catch {}
      }

      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      sessions = result;
      onCount(result.length);
    } catch (e) {
      console.error('[Sessions] Load failed:', e);
    }
  }

  async function confirmDelete(session: Session) {
    const ok = await confirmModal?.confirm('Delete Session', `Delete "${session.name}"?`);
    if (!ok) return;
    await deleteFile(session.path);
    if (selected?.path === session.path) selected = null;
    await load();
  }

  function showContextMenu(event: MouseEvent, session: Session) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(session.path) },
      { label: 'Delete', action: () => confirmDelete(session), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  onMount(load);
</script>

<div class="flex gap-0 h-full min-h-0">
  <!-- List -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Sessions</h2>
      <span class="text-[10px] text-[var(--text-ghost)] font-mono">{sessions.length}</span>
    </div>

    <div class="flex-1 overflow-y-auto stagger-list">
      {#each sessions as session}
        <button
          onclick={() => selected = session}
          oncontextmenu={(e) => showContextMenu(e, session)}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selected?.path === session.path ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if selected?.path === session.path}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <span class="text-[13px] truncate min-w-0 {selected?.path === session.path ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{displayName(session)}</span>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{formatDate(session.createdAt)}</span>
          </div>
          {#if session.isJson && session.meta?.cwd}
            <div class="text-[10px] text-[var(--text-ghost)] truncate mt-1 font-mono">{session.meta.cwd}</div>
          {:else if !session.isJson}
            <div class="text-[10px] text-[var(--text-ghost)] truncate mt-1">Session notes</div>
          {/if}
        </button>
      {/each}
      {#if sessions.length === 0}
        <EmptyState
          icon="sessions"
          title="No sessions yet"
          description="Claude Code sessions will appear here"
        />
      {/if}
    </div>
  </div>

  <!-- Detail -->
  {#if selected}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[var(--text-primary)] text-sm font-semibold truncate">{displayName(selected)}</span>
        <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono px-2 py-0.5 rounded-md bg-[var(--surface-3)]">{selected.isJson ? 'JSON' : 'Notes'}</span>
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate mb-4">{selected.path}</div>

      {#if selected.isJson && selected.meta}
        <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-5 px-1 animate-fade-in">
          {#if selected.meta.sessionId}
            <span class="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider">Session ID</span>
            <span class="text-[12px] text-[var(--text-secondary)] font-mono">{selected.meta.sessionId}</span>
          {/if}
          {#if selected.meta.pid}
            <span class="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider">PID</span>
            <span class="text-[12px] text-[var(--text-secondary)] font-mono">{selected.meta.pid}</span>
          {/if}
          {#if selected.meta.cwd}
            <span class="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider">Working Dir</span>
            <span class="text-[12px] text-[var(--text-secondary)] font-mono truncate">{selected.meta.cwd}</span>
          {/if}
          {#if selected.meta.startedAt}
            <span class="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider">Started</span>
            <span class="text-[12px] text-[var(--text-secondary)]">{formatTimestamp(selected.meta.startedAt)}</span>
          {/if}
        </div>
      {/if}

      {#if !selected.isJson}
        <MarkdownEditor value={selected.content} readonly />
      {:else}
        <textarea
          readonly
          value={selected.content}
          class="flex-1 min-h-0 w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-4 text-[13px] text-[var(--text-primary)] font-mono outline-none resize-none leading-relaxed"
        ></textarea>
      {/if}
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a session</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
