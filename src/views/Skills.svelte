<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, writeFile, deleteFile, ensureDir, getCreatedAt } from '../lib/fs';
  import { pushHistory } from '../lib/history';
  import { parseSkillMd } from '../lib/parser';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import MarkdownEditor from '../components/MarkdownEditor.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount, initialSelect = '' } = $props<{ onCount: (n: number) => void; initialSelect?: string }>();

  type Skill = { name: string; description: string; dir: string; content: string; createdAt: Date | null };

  let skills = $state<Skill[]>([]);
  let selected = $state<Skill | null>(null);
  let editContent = $state('');
  let isNew = $state(false);
  let newName = $state('');
  let loading = $state(true);
  let error = $state('');
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();
  let dirty = $state(false);
  let rawMode = $state(false);

  function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  async function load() {
    error = '';
    try {
      const base = await claudeDir();
      const skillsDir = `${base}/skills`;
      const entries = await listDirFull(skillsDir);
      const result: Skill[] = [];
      for (const entry of entries.filter((e) => e.isDir)) {
        const path = `${skillsDir}/${entry.name}/SKILL.md`;
        try {
          const content = await readFile(path);
          const meta = parseSkillMd(content);
          const createdAt = await getCreatedAt(`${skillsDir}/${entry.name}`);
          result.push({ name: meta.name, description: meta.description, dir: `${skillsDir}/${entry.name}`, content, createdAt });
        } catch (e) {
          console.warn('[Skills] Failed to read:', path, e);
        }
      }
      result.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      skills = result;
      onCount(result.length);
      if (initialSelect) {
        const match = result.find((s) => s.name === initialSelect || s.dir.endsWith(initialSelect));
        if (match) select(match);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load skills';
      console.error('[Skills] Load failed:', e);
    } finally {
      loading = false;
    }
  }

  function select(skill: Skill) {
    selected = skill;
    editContent = skill.content;
    dirty = false;
    isNew = false;
  }

  async function save() {
    if (!selected) return;
    pushHistory(`${selected.dir}/SKILL.md`, selected.content);
    await writeFile(`${selected.dir}/SKILL.md`, editContent);
    selected = { ...selected, content: editContent };
    dirty = false;
    await load();
  }

  async function remove(skill: Skill) {
    await deleteFile(skill.dir);
    selected = null;
    await load();
  }

  async function createNew() {
    if (!newName.trim()) return;
    const base = await claudeDir();
    const dir = `${base}/skills/${newName.trim()}`;
    await ensureDir(dir);
    const stub = `---\nname: "${newName.trim()}"\ndescription: ""\n---\n\n# ${newName.trim()}\n`;
    await writeFile(`${dir}/SKILL.md`, stub);
    newName = '';
    isNew = false;
    await load();
  }

  async function confirmDelete(skill: Skill) {
    const ok = await confirmModal?.confirm('Delete Skill', `Are you sure you want to delete "${skill.name}"?`);
    if (!ok) return;
    await remove(skill);
  }

  function showContextMenu(event: MouseEvent, skill: Skill) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(skill.dir) },
      { label: 'Delete', action: () => confirmDelete(skill), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  onMount(load);
</script>

{#if isNew}
  <button class="fixed inset-0 z-10 cursor-default" aria-label="Close" onclick={() => { isNew = false; newName = ''; }}></button>
{/if}

<div class="flex gap-0 h-full min-h-0">
  <!-- Skill list -->
  <div class="w-72 shrink-0 flex flex-col min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">Skills</h2>
      <button onclick={() => { isNew = true; selected = null; }} class="text-[11px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
        <span class="text-sm leading-none">+</span> New
      </button>
    </div>

    {#if isNew}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="flex gap-2 p-3 border-b border-[var(--border-subtle)] bg-[var(--accent-subtle)] relative z-20 animate-fade-in" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <input bind:value={newName} placeholder="skill-name" class="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors" onkeydown={(e) => { if (e.key === 'Enter') createNew(); if (e.key === 'Escape') { isNew = false; newName = ''; } }} />
        <button onclick={createNew} class="text-[11px] text-[var(--accent)] font-semibold px-2">Add</button>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto stagger-list">
      {#each skills as skill}
        <button
          onclick={() => select(skill)}
          oncontextmenu={(e) => showContextMenu(e, skill)}
          class="group w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-all duration-200 relative
                 {selected?.dir === skill.dir ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
        >
          {#if selected?.dir === skill.dir}
            <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
          {/if}
          <div class="flex items-center justify-between gap-2">
            <span class="text-[13px] truncate min-w-0 {selected?.dir === skill.dir ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">{skill.name}</span>
            <span class="text-[10px] text-[var(--text-ghost)] shrink-0 font-mono">{formatDate(skill.createdAt)}</span>
          </div>
          <div class="text-[10px] text-[var(--text-ghost)] truncate mt-1">{skill.description}</div>
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
      {:else if skills.length === 0 && !isNew}
        <EmptyState
          icon="skills"
          title="No skills yet"
          description="Create your first skill"
          actionLabel="Create Skill"
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
        <div class="flex items-center gap-3 shrink-0">
          {#if dirty}
            <span class="text-[10px] text-[var(--warning)] flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse-dot"></span>
              unsaved
            </span>
          {/if}
          <button
            onclick={() => { rawMode = !rawMode; }}
            class="text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors
                   {rawMode
                     ? 'bg-[var(--accent-subtle)] border-[var(--accent-dim)] text-[var(--accent)]'
                     : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-ghost)] hover:text-[var(--text-muted)] hover:border-[var(--border-default)]'}"
          >
            Raw
          </button>
        </div>
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate mb-3">{selected.dir}</div>
      {#if rawMode}
        <div class="flex-1 min-h-0 flex flex-col">
          <textarea
            bind:value={editContent}
            oninput={() => { dirty = editContent !== selected?.content; }}
            class="flex-1 min-h-0 w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-5 text-[13px] text-[var(--text-primary)] font-mono leading-relaxed outline-none resize-none focus:border-[var(--accent-dim)] transition-colors"
            spellcheck="false"
          ></textarea>
        </div>
      {:else}
        <MarkdownEditor bind:value={editContent} oninput={() => { dirty = editContent !== selected?.content; }} />
      {/if}
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
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"/></svg></div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a skill</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
