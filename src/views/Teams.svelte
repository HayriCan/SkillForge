<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, getCreatedAt, deleteFile } from '../lib/fs';
  import { addToast } from '../lib/toast.svelte';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  type Message = {
    from: string;
    text: string;
    timestamp: string;
    read: boolean;
  };

  type Inbox = {
    name: string;
    path: string;
    messages: Message[];
  };

  type Team = {
    id: string;
    path: string;
    inboxes: Inbox[];
    createdAt: Date | null;
  };

  let teams = $state<Team[]>([]);
  let selectedTeam = $state<Team | null>(null);
  let selectedInbox = $state<Inbox | null>(null);
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function formatTimestamp(ts: string): string {
    try {
      return new Date(ts).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return ts; }
  }

  function parseMessageText(text: string): Record<string, unknown> | null {
    try {
      return JSON.parse(text);
    } catch { return null; }
  }

  async function load() {
    try {
      const base = await claudeDir();
      const teamsDir = `${base}/teams`;
      const entries = await listDirFull(teamsDir);
      const result: Team[] = [];

      for (const e of entries.filter((e) => e.isDir)) {
        const teamPath = `${teamsDir}/${e.name}`;
        const createdAt = await getCreatedAt(teamPath);
        const inboxes: Inbox[] = [];

        try {
          const inboxDir = `${teamPath}/inboxes`;
          const inboxEntries = await listDirFull(inboxDir);
          for (const ie of inboxEntries.filter((ie) => !ie.isDir && ie.name.endsWith('.json'))) {
            const inboxPath = `${inboxDir}/${ie.name}`;
            try {
              const content = await readFile(inboxPath);
              const messages = JSON.parse(content) as Message[];
              inboxes.push({
                name: ie.name.replace('.json', ''),
                path: inboxPath,
                messages: Array.isArray(messages) ? messages : [],
              });
            } catch (e) {
              addToast(`Failed to read inbox: ${e}`, 'error');
            }
          }
        } catch (e) {
          addToast(`Failed to load inboxes: ${e}`, 'error');
        }

        inboxes.sort((a, b) => a.name.localeCompare(b.name));
        result.push({ id: e.name, path: teamPath, inboxes, createdAt });
      }

      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      teams = result;
      onCount(result.length);
    } catch (e) {
      console.error('[Teams] Load failed:', e);
      addToast(`Failed to load teams: ${e}`, 'error');
    }
  }

  function totalMessages(team: Team): number {
    return team.inboxes.reduce((sum, inbox) => sum + inbox.messages.length, 0);
  }

  function unreadCount(inbox: Inbox): number {
    return inbox.messages.filter((m) => !m.read).length;
  }

  async function confirmDeleteTeam(team: Team) {
    const ok = await confirmModal?.confirm('Delete Team', `Delete team "${team.id.slice(0, 18)}" and all its inboxes?`);
    if (!ok) return;
    await deleteFile(team.path);
    if (selectedTeam?.id === team.id) { selectedTeam = null; selectedInbox = null; }
    await load();
  }

  function showContextMenu(event: MouseEvent, path: string, deleteAction?: () => void) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(path) },
    ];
    if (deleteAction) {
      ctxItems.push({ label: 'Delete', action: deleteAction, variant: 'danger' });
    }
    ctxMenu?.show(event);
  }

  onMount(load);
</script>

<div class="flex gap-0 h-full min-h-0">
  <!-- Team list -->
  <div class="w-64 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Teams</h2>
    </div>
    <div class="flex-1 overflow-y-auto stagger-list">
      {#each teams as team}
        <button
          onclick={() => { selectedTeam = team; selectedInbox = null; }}
          oncontextmenu={(e) => showContextMenu(e, team.path, () => confirmDeleteTeam(team))}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selectedTeam?.id === team.id ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if selectedTeam?.id === team.id}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <span class="text-[12px] font-mono truncate {selectedTeam?.id === team.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{team.id.slice(0, 18)}</span>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{formatDate(team.createdAt)}</span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] text-[var(--text-ghost)]">{team.inboxes.length} inboxes</span>
            <span class="text-[10px] text-[var(--text-ghost)]">{totalMessages(team)} msgs</span>
          </div>
        </button>
      {/each}
      {#if teams.length === 0}
        <EmptyState
          icon="teams"
          title="No teams yet"
          description="Claude Code teams will appear here"
        />
      {/if}
    </div>
  </div>

  <!-- Inboxes -->
  {#if selectedTeam}
    <div class="w-56 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/20 animate-slide-in-left">
      <div class="px-4 py-3 border-b border-[var(--border-subtle)]">
        <span class="text-[var(--text-muted)] text-[11px] font-mono truncate block">{selectedTeam.id}</span>
      </div>
      <div class="flex-1 overflow-y-auto stagger-list">
        {#each selectedTeam.inboxes as inbox}
          {@const unread = unreadCount(inbox)}
          <button
            onclick={() => selectedInbox = inbox}
            oncontextmenu={(e) => showContextMenu(e, inbox.path)}
            class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                   {selectedInbox?.path === inbox.path ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
          >
            {#if selectedInbox?.path === inbox.path}
              <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
            {/if}
            <div class="flex items-center justify-between gap-2">
              <span class="text-[13px] {selectedInbox?.path === inbox.path ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{inbox.name}</span>
              <div class="flex items-center gap-2 shrink-0">
                {#if unread > 0}
                  <span class="text-[9px] font-semibold text-[var(--warning)] bg-[var(--warning)]/10 px-1.5 py-0.5 rounded-md">{unread} new</span>
                {/if}
                <span class="text-[10px] text-[var(--text-ghost)] font-mono">{inbox.messages.length}</span>
              </div>
            </div>
          </button>
        {/each}
        {#if selectedTeam.inboxes.length === 0}
          <div class="text-[13px] text-[var(--text-ghost)] px-4 py-8 text-center">No inboxes</div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Messages -->
  {#if selectedInbox}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[var(--text-primary)] text-sm font-semibold">{selectedInbox.name}</span>
        <span class="text-[10px] text-[var(--text-ghost)] font-mono">{selectedInbox.messages.length} messages</span>
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate mb-4">{selectedInbox.path}</div>

      <div class="flex-1 overflow-y-auto flex flex-col gap-2 stagger-list">
        {#each selectedInbox.messages as msg}
          {@const parsed = parseMessageText(msg.text)}
          <div class="px-4 py-3 rounded-lg border transition-all duration-200
                      {msg.read
                        ? 'border-[var(--border-subtle)] bg-[var(--surface-1)]'
                        : 'border-[var(--border-accent)] bg-[var(--accent-subtle)]'}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-semibold {msg.read ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}">{msg.from}</span>
                {#if !msg.read}
                  <span class="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse-dot"></span>
                {/if}
              </div>
              <span class="text-[10px] text-[var(--text-ghost)] font-mono">{formatTimestamp(msg.timestamp)}</span>
            </div>
            {#if parsed && parsed.type}
              <div class="text-[10px] text-[var(--text-ghost)] mb-1 font-mono">{parsed.type}</div>
              {#if parsed.subject}
                <div class="text-[13px] text-[var(--text-secondary)] mb-1">{parsed.subject}</div>
              {/if}
              {#if parsed.description}
                <div class="text-[12px] text-[var(--text-muted)]">{parsed.description}</div>
              {/if}
            {:else}
              <div class="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap break-words">{msg.text.slice(0, 500)}</div>
            {/if}
          </div>
        {/each}
        {#if selectedInbox.messages.length === 0}
          <div class="text-[13px] text-[var(--text-ghost)] text-center py-12">No messages</div>
        {/if}
      </div>
    </div>
  {:else if selectedTeam}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select an inbox</span>
      </div>
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a team</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
