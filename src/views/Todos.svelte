<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, getCreatedAt, deleteFile } from '../lib/fs';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  type TodoItem = {
    content: string;
    status: string;
    activeForm?: string;
  };

  type TodoFile = {
    name: string;
    path: string;
    sessionId: string;
    items: TodoItem[];
    createdAt: Date | null;
  };

  const statusDots: Record<string, string> = {
    completed: 'bg-[var(--success)]',
    in_progress: 'bg-[var(--warning)]',
    pending: 'bg-[var(--text-ghost)]',
  };

  const statusLabels: Record<string, string> = {
    completed: 'done',
    in_progress: 'active',
    pending: 'pending',
  };

  let files = $state<TodoFile[]>([]);
  let selected = $state<TodoFile | null>(null);
  let filterStatus = $state<string>('all');
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  function parseSessionId(name: string): string {
    const match = name.match(/^([0-9a-f-]{36})/);
    return match ? match[1].slice(0, 8) : name.replace('.json', '');
  }

  async function load() {
    try {
      const base = await claudeDir();
      const dir = `${base}/todos`;
      const entries = await listDirFull(dir);
      const result: TodoFile[] = [];

      for (const e of entries.filter((e) => !e.isDir && e.name.endsWith('.json'))) {
        const path = `${dir}/${e.name}`;
        try {
          const content = await readFile(path);
          const items = JSON.parse(content) as TodoItem[];
          if (!Array.isArray(items) || items.length === 0) continue;
          const createdAt = await getCreatedAt(path);
          result.push({
            name: e.name,
            path,
            sessionId: parseSessionId(e.name),
            items,
            createdAt,
          });
        } catch {}
      }

      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      files = result;
      onCount(result.length);
    } catch (e) {
      console.error('[Todos] Load failed:', e);
    }
  }

  function summary(file: TodoFile): { done: number; total: number } {
    const done = file.items.filter((i) => i.status === 'completed').length;
    return { done, total: file.items.length };
  }

  function overallStatus(file: TodoFile): string {
    if (file.items.every((i) => i.status === 'completed')) return 'completed';
    if (file.items.some((i) => i.status === 'in_progress')) return 'in_progress';
    return 'pending';
  }

  function filteredFiles(): TodoFile[] {
    if (filterStatus === 'all') return files;
    return files.filter((f) => overallStatus(f) === filterStatus);
  }

  function progressPercent(file: TodoFile): number {
    const s = summary(file);
    return s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
  }

  async function confirmDelete(file: TodoFile) {
    const ok = await confirmModal?.confirm('Delete Todo', `Delete todo list "${file.sessionId}"?`);
    if (!ok) return;
    await deleteFile(file.path);
    if (selected?.path === file.path) selected = null;
    await load();
  }

  function showContextMenu(event: MouseEvent, file: TodoFile) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(file.path) },
      { label: 'Delete', action: () => confirmDelete(file), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  onMount(load);
</script>

<div class="flex gap-0 h-full min-h-0">
  <!-- List -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Todos</h2>
      <select
        bind:value={filterStatus}
        class="bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-dim)] transition-colors cursor-pointer"
      >
        <option value="all">All</option>
        <option value="in_progress">Active</option>
        <option value="completed">Done</option>
        <option value="pending">Pending</option>
      </select>
    </div>

    <div class="flex-1 overflow-y-auto stagger-list">
      {#each filteredFiles() as file}
        {@const s = summary(file)}
        {@const status = overallStatus(file)}
        {@const pct = progressPercent(file)}
        <button
          onclick={() => selected = file}
          oncontextmenu={(e) => showContextMenu(e, file)}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selected?.path === file.path ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if selected?.path === file.path}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-1.5 h-1.5 rounded-full shrink-0 {statusDots[status] ?? 'bg-[var(--text-ghost)]'} {status === 'in_progress' ? 'animate-pulse-dot' : ''}"></span>
              <span class="text-[12px] font-mono truncate {selected?.path === file.path ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{file.sessionId}</span>
            </div>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{s.done}/{s.total}</span>
          </div>
          <!-- Progress bar -->
          <div class="mt-2 h-1 rounded-full bg-[var(--surface-4)] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 {pct === 100 ? 'bg-[var(--success)]' : 'bg-[var(--accent-dim)]'}"
              style="width: {pct}%"
            ></div>
          </div>
          <div class="text-[10px] text-[var(--text-ghost)] truncate mt-1.5">
            {file.items[0]?.content ?? ''}
          </div>
        </button>
      {/each}
      {#if filteredFiles().length === 0}
        <EmptyState
          icon="todos"
          title="No todos yet"
          description="Claude Code todos will appear here"
        />
      {/if}
    </div>
  </div>

  <!-- Detail -->
  {#if selected}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[var(--text-primary)] text-sm font-semibold">{selected.sessionId}</span>
        <span class="text-[10px] text-[var(--text-muted)] font-mono">{summary(selected).done}/{summary(selected).total} completed</span>
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate mb-4">{selected.path}</div>

      <div class="flex-1 overflow-y-auto">
        <div class="flex flex-col gap-1.5 stagger-list">
          {#each selected.items as item}
            <div class="flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200
                        {item.status === 'in_progress'
                          ? 'bg-[var(--warning)]/5 border border-[var(--warning)]/15'
                          : item.status === 'completed'
                            ? 'bg-[var(--surface-2)]/50'
                            : 'bg-[var(--surface-1)] border border-[var(--border-subtle)]'}">
              <span class="w-2 h-2 rounded-full shrink-0 mt-1.5 {statusDots[item.status] ?? 'bg-[var(--text-ghost)]'} {item.status === 'in_progress' ? 'animate-pulse-dot' : ''}"></span>
              <div class="min-w-0 flex-1">
                <div class="text-[13px] leading-relaxed {item.status === 'completed' ? 'text-[var(--text-ghost)] line-through' : 'text-[var(--text-primary)]'}">{item.content}</div>
                {#if item.status !== 'completed' && item.activeForm}
                  <div class="text-[10px] text-[var(--text-ghost)] mt-1">{item.activeForm}</div>
                {/if}
              </div>
              <span class="text-[10px] shrink-0 font-mono px-2 py-0.5 rounded-md
                           {item.status === 'completed'
                             ? 'text-[var(--success)] bg-[var(--success)]/10'
                             : item.status === 'in_progress'
                               ? 'text-[var(--warning)] bg-[var(--warning)]/10'
                               : 'text-[var(--text-ghost)]'}">
                {statusLabels[item.status] ?? item.status}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a todo list</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
