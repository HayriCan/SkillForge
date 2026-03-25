<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, writeFile, deleteFile, getCreatedAt } from '../lib/fs';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  type TaskSummary = {
    id: string;
    subject: string;
    description: string;
    status: string;
  };

  type TaskFile = {
    name: string;
    path: string;
    content: string;
    createdAt: Date | null;
    isJson: boolean;
    summary?: TaskSummary;
  };

  type TaskGroup = {
    sessionId: string;
    path: string;
    files: TaskFile[];
    createdAt: Date | null;
  };

  const statusDots: Record<string, string> = {
    completed: 'bg-[var(--success)]',
    in_progress: 'bg-[var(--warning)]',
    pending: 'bg-[var(--text-ghost)]',
  };

  let groups = $state<TaskGroup[]>([]);
  let selectedGroup = $state<TaskGroup | null>(null);
  let selectedFile = $state<TaskFile | null>(null);
  let editContent = $state('');
  let dirty = $state(false);
  let jsonError = $state('');
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function parseTaskSummary(content: string, fallbackId: string): TaskSummary | null {
    try {
      const data = JSON.parse(content) as Record<string, unknown>;
      return {
        id: typeof data.id === 'string' ? data.id : fallbackId,
        subject: typeof data.subject === 'string' ? data.subject : 'Untitled',
        description: typeof data.description === 'string' ? data.description : '',
        status: typeof data.status === 'string' ? data.status : 'pending',
      };
    } catch {
      return null;
    }
  }

  async function load(preserveSessionId?: string, preserveFilePath?: string) {
    try {
      const base = await claudeDir();
      const tasksBaseDir = `${base}/tasks`;
      const entries = await listDirFull(tasksBaseDir);
      const result: TaskGroup[] = [];

      for (const entry of entries.filter((e) => e.isDir)) {
        const groupPath = `${tasksBaseDir}/${entry.name}`;
        const fileEntries = await listDirFull(groupPath);
        const visibleFiles = fileEntries.filter(
          (file) => !file.isDir && !file.name.startsWith('.') && (file.name.endsWith('.json') || file.name.endsWith('.md'))
        );

        if (visibleFiles.length === 0) continue;

        const files: TaskFile[] = [];
        for (const file of visibleFiles) {
          const path = `${groupPath}/${file.name}`;
          try {
            const content = await readFile(path);
            const createdAt = await getCreatedAt(path);
            const isJson = file.name.endsWith('.json');
            files.push({
              name: file.name,
              path,
              content,
              createdAt,
              isJson,
              summary: isJson ? parseTaskSummary(content, file.name) ?? undefined : undefined,
            });
          } catch {}
        }

        if (files.length === 0) continue;

        files.sort((a, b) => {
          const aNum = Number.parseInt(a.name, 10);
          const bNum = Number.parseInt(b.name, 10);
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
          return a.name.localeCompare(b.name);
        });

        const createdAt = await getCreatedAt(groupPath);
        result.push({ sessionId: entry.name, path: groupPath, files, createdAt });
      }

      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      groups = result;
      onCount(result.length);

      if (preserveSessionId) {
        const nextGroup = result.find((group) => group.sessionId === preserveSessionId) ?? null;
        selectedGroup = nextGroup;
        if (nextGroup && preserveFilePath) {
          const nextFile = nextGroup.files.find((file) => file.path === preserveFilePath) ?? null;
          selectFile(nextFile);
        } else {
          selectFile(null);
        }
      }
    } catch (e) {
      console.error('[Tasks] Load failed:', e);
    }
  }

  function selectGroup(group: TaskGroup) {
    selectedGroup = group;
    selectFile(null);
  }

  function validateSelectedFile(content: string): boolean {
    if (!selectedFile?.isJson) {
      jsonError = '';
      return true;
    }

    try {
      JSON.parse(content);
      jsonError = '';
      return true;
    } catch (e) {
      jsonError = e instanceof Error ? e.message : 'Invalid JSON';
      return false;
    }
  }

  function selectFile(file: TaskFile | null) {
    selectedFile = file;
    editContent = file?.content ?? '';
    dirty = false;
    jsonError = '';
    if (file) validateSelectedFile(file.content);
  }

  async function save() {
    if (!selectedGroup || !selectedFile) return;
    if (!validateSelectedFile(editContent)) return;

    await writeFile(selectedFile.path, editContent);
    await load(selectedGroup.sessionId, selectedFile.path);
    dirty = false;
  }

  function discard() {
    if (!selectedFile) return;
    editContent = selectedFile.content;
    dirty = false;
    validateSelectedFile(editContent);
  }

  async function removeGroup(group: TaskGroup) {
    try {
      await deleteFile(group.path);
    } catch (e) {
      console.error('[Tasks] Delete failed:', e);
    }
    selectedGroup = null;
    selectFile(null);
    await load();
  }

  function sessionTasks(group: TaskGroup): TaskSummary[] {
    return group.files
      .filter((file) => file.summary)
      .map((file) => file.summary as TaskSummary);
  }

  function statusLabel(tasks: TaskSummary[]): { text: string; cls: string } | null {
    if (tasks.length === 0) return null;
    if (tasks.every((task) => task.status === 'completed')) return { text: 'done', cls: 'text-[var(--success)] bg-[var(--success)]/10' };
    if (tasks.some((task) => task.status === 'in_progress')) return { text: 'active', cls: 'text-[var(--warning)] bg-[var(--warning)]/10' };
    return null;
  }

  function fileBadge(file: TaskFile): string {
    return file.isJson ? 'J' : 'M';
  }

  function fileSubtitle(file: TaskFile): string {
    if (file.summary) return file.summary.subject;
    return file.name.endsWith('.md') ? 'Markdown file' : 'Task file';
  }

  async function confirmDeleteGroup(group: TaskGroup) {
    const ok = await confirmModal?.confirm('Delete Session', `Delete session "${group.sessionId.slice(0, 18)}" and all its files?`);
    if (!ok) return;
    await removeGroup(group);
  }

  function showGroupContextMenu(event: MouseEvent, group: TaskGroup) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(group.path) },
      { label: 'Delete', action: () => confirmDeleteGroup(group), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  function showFileContextMenu(event: MouseEvent, file: TaskFile) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(file.path) },
    ];
    ctxMenu?.show(event);
  }

  onMount(() => load());
</script>

<div class="flex gap-0 h-full min-h-0">
  <div class="w-64 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Task Sessions</h2>
    </div>
    <div class="flex-1 overflow-y-auto stagger-list">
      {#each groups as group}
        {@const tasks = sessionTasks(group)}
        {@const sl = statusLabel(tasks)}
        <button
          onclick={() => selectGroup(group)}
          oncontextmenu={(e) => showGroupContextMenu(e, group)}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selectedGroup?.sessionId === group.sessionId ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if selectedGroup?.sessionId === group.sessionId}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-1">
            <span class="text-[12px] font-mono truncate {selectedGroup?.sessionId === group.sessionId ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{group.sessionId.slice(0, 18)}</span>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{formatDate(group.createdAt)}</span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] text-[var(--text-ghost)]">{group.files.length} files</span>
            {#if sl}
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded-md {sl.cls}">{sl.text}</span>
            {/if}
          </div>
        </button>
      {/each}
      {#if groups.length === 0}
        <EmptyState
          icon="tasks"
          title="No task sessions yet"
          description="Claude Code tasks will appear here"
        />
      {/if}
    </div>
  </div>

  {#if selectedGroup}
    <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/20 animate-slide-in-left">
      <div class="px-4 py-3 border-b border-[var(--border-subtle)]">
        <span class="text-[var(--text-muted)] text-[11px] font-mono truncate block">{selectedGroup.sessionId}</span>
      </div>

      <div class="flex-1 overflow-y-auto stagger-list">
        {#each selectedGroup.files as file}
          <button
            onclick={() => selectFile(file)}
            oncontextmenu={(e) => showFileContextMenu(e, file)}
            class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                   {selectedFile?.path === file.path ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
          >
            {#if selectedFile?.path === file.path}
              <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
            {/if}
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-5 h-5 rounded-md text-center shrink-0 text-[10px] font-semibold flex items-center justify-center
                           {file.isJson ? 'text-amber-400 bg-amber-400/10' : 'text-blue-400 bg-blue-400/10'}">{fileBadge(file)}</span>
              <span class="text-[13px] truncate min-w-0 {selectedFile?.path === file.path ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{file.name}</span>
            </div>
            <div class="flex items-center justify-between gap-2 mt-1">
              <span class="text-[10px] text-[var(--text-ghost)] truncate">{fileSubtitle(file)}</span>
              {#if file.summary}
                <span class="w-2 h-2 rounded-full shrink-0 {statusDots[file.summary.status] ?? 'bg-[var(--text-ghost)]'} {file.summary.status === 'in_progress' ? 'animate-pulse-dot' : ''}"></span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if selectedFile}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-[var(--text-primary)] text-sm font-semibold truncate">{selectedFile.name}</span>
          <span class="text-[10px] text-[var(--text-ghost)] truncate font-mono">{selectedGroup?.sessionId}</span>
          {#if dirty}
            <span class="text-[10px] text-[var(--warning)] shrink-0 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse-dot"></span>
              unsaved
            </span>
          {/if}
        </div>
      </div>

      {#if jsonError}
        <div class="text-[13px] text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-2.5 rounded-lg mb-3 animate-fade-in">{jsonError}</div>
      {/if}

      <textarea
        bind:value={editContent}
        oninput={() => {
          dirty = editContent !== selectedFile?.content;
          validateSelectedFile(editContent);
        }}
        class="flex-1 min-h-0 w-full bg-[var(--surface-1)] border {jsonError ? 'border-[var(--danger)]/40' : 'border-[var(--border-subtle)]'} rounded-lg p-4 text-[13px] text-[var(--text-primary)] font-mono outline-none resize-none focus:border-[var(--accent-dim)] leading-relaxed transition-colors"
      ></textarea>
      <div class="flex gap-2 mt-3">
        <button onclick={save} disabled={!dirty || !!jsonError} class="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 {dirty && !jsonError ? 'bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] shadow-lg shadow-black/5' : 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-default'}">Save</button>
        <button onclick={discard} disabled={!dirty} class="px-4 py-2 text-[13px] transition-colors {dirty ? 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]' : 'text-[var(--text-ghost)] cursor-default'}">Discard</button>
      </div>
    </div>
  {:else if selectedGroup}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a file</span>
      </div>
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a session</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
