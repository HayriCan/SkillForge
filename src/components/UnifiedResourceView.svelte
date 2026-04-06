<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, writeFile, deleteFile, ensureDir, getFileStat } from '../lib/fs';
  import { pushHistory, getFileHistory } from '../lib/history';
  import { addToast } from '../lib/toast.svelte';
  import { t } from '../lib/i18n.svelte';
  import { validateFileName } from '../lib/validation';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import ConfirmModal from './ConfirmModal.svelte';
  import EmptyState from './EmptyState.svelte';
  import DiffView from './DiffView.svelte';
  import SkillWizard from './SkillWizard.svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { isMac } from '../lib/shortcuts';
  import type { ResourceConfig } from '../lib/resource-config';
  import { defaultFolderConfig } from '../lib/resource-config';

  const {
    config: configProp,
    dirName: dirNameProp,
    activeCli = 'claude',
    onCount,
    initialSelect = '',
  } = $props<{
    config?: ResourceConfig;
    dirName?: string;
    activeCli?: string;
    onCount: (n: number) => void;
    initialSelect?: string;
  }>();

  /** Resolved config: explicit config takes precedence, otherwise build defaults from dirName */
  const config = $derived(configProp ?? defaultFolderConfig(dirNameProp ?? ''));

  // Feature flags with defaults
  const enableHistory = $derived(config.enableHistory !== false);
  const enableBulkDelete = $derived(config.enableBulkDelete !== false);
  const hasCreate = $derived(!!config.createTemplate);
  const canNavigate = $derived(!config.hideDirs);
  const hasWizard = $derived(!!config.enableWizard);

  /** Known text file extensions */
  const TEXT_EXTS = new Set([
    '.md', '.txt', '.json', '.toml', '.yaml', '.yml', '.sh', '.bash', '.zsh',
    '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.py', '.rb', '.go',
    '.rs', '.xml', '.cfg', '.conf', '.ini', '.log', '.env', '.csv', '.sql',
    '.mjs', '.cjs', '.svelte', '.vue', '.c', '.h', '.cpp', '.java', '.kt',
    '.swift', '.ps1', '.bat', '.cmd', '.fish', '.lua', '.r', '.m',
    '.jsonl', '.ndjson', '.properties', '.gradle', '.dockerfile', '.makefile',
  ]);
  const HTML_EXTS = new Set(['.html', '.htm', '.svg']);

  type Entry = {
    name: string;
    isDir: boolean;
    path: string;
    size: number;
    modified: Date | null;
    ext: string;
    content?: string;
  };

  let baseDir = $state('');
  let pathSegments = $state<string[]>([]);
  let entries = $state<Entry[]>([]);
  let selectedFile = $state<Entry | null>(null);
  let fileContent = $state('');
  let editContent = $state('');
  let loading = $state(true);
  let loadingContent = $state(false);
  let saving = $state(false);
  let viewMode = $state<'source' | 'preview'>('source');
  let listWidth = $state(300);
  let resizing = $state(false);
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();
  // New item creation
  let isNew = $state(false);
  let newName = $state('');
  let nameError = $state('');
  // Bulk delete
  let selectMode = $state(false);
  let selectedPaths = $state<Set<string>>(new Set());
  // Editor state
  let rawMode = $state(false);
  let showDiff = $state(false);
  let showWizard = $state(false);
  // AI prompt panel
  let aiPrompt = $state('');
  let aiRunning = $state(false);
  let aiMode = $state<'edit' | 'ask'>('edit');
  let aiResponse = $state<string | null>(null);
  let showHistory = $state(false);
  let historyEntries = $state<ReturnType<typeof getFileHistory>>([]);

  const dirty = $derived(selectedFile !== null && editContent !== fileContent);
  const isHtml = $derived(selectedFile !== null && HTML_EXTS.has(selectedFile.ext));
  const isMd = $derived(selectedFile !== null && selectedFile.ext === '.md');
  const currentDir = $derived(
    pathSegments.length === 0 ? baseDir : `${baseDir}/${pathSegments.join('/')}`
  );

  function getExt(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot).toLowerCase() : '';
  }

  function isTextFile(name: string): boolean {
    const ext = getExt(name);
    if (TEXT_EXTS.has(ext)) return true;
    if (name.startsWith('.') && !ext) return true;
    if (!ext) return true;
    return false;
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(d: Date | null): string {
    if (!d) return '--';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function fileIcon(entry: Entry): string {
    if (entry.isDir) return 'folder';
    const ext = entry.ext;
    if (['.md', '.txt'].includes(ext)) return 'text';
    if (['.json', '.toml', '.yaml', '.yml', '.ini', '.cfg', '.conf'].includes(ext)) return 'config';
    if (['.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.fish'].includes(ext)) return 'script';
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp'].includes(ext)) return 'code';
    if (['.html', '.htm', '.css', '.scss', '.svelte', '.vue', '.xml'].includes(ext)) return 'web';
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'].includes(ext)) return 'image';
    return 'file';
  }

  function prettifyName(name: string): string {
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function contentPreview(content?: string): string {
    if (!content) return '';
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
    return lines[0]?.slice(0, 60) ?? '';
  }

  async function loadDir(): Promise<void> {
    loading = true;
    selectedFile = null;
    fileContent = '';
    editContent = '';
    try {
      const raw = await listDirFull(currentDir);
      const result: Entry[] = [];
      for (const e of raw) {
        if (e.isDir && config.hideDirs) continue;
        if (!e.isDir && config.fileExtensions) {
          const ext = getExt(e.name);
          if (!config.fileExtensions.includes(ext)) continue;
        }
        const path = `${currentDir}/${e.name}`;
        const st = await getFileStat(path);
        const entry: Entry = {
          name: e.name,
          isDir: e.isDir,
          path,
          size: st.size,
          modified: st.modified,
          ext: getExt(e.name),
        };
        if (!e.isDir && isTextFile(e.name) && config.hideDirs) {
          try {
            entry.content = await readFile(path);
          } catch {}
        }
        result.push(entry);
      }
      result.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      entries = result;
      // Only update sidebar badge when at root — subfolder navigation shouldn't change the count
      if (pathSegments.length === 0) onCount(result.length);
      if (initialSelect) {
        const match = result.find((e) =>
          e.name === initialSelect ||
          e.name === initialSelect.replace('.md', '') ||
          e.path.endsWith(initialSelect)
        );
        if (match && !match.isDir) selectFile(match);
      }
    } catch (e) {
      console.error(`[UnifiedResourceView] loadDir failed:`, e);
      entries = [];
      onCount(0);
    } finally {
      loading = false;
    }
  }

  function navigateInto(dirEntry: Entry): void {
    pathSegments = [...pathSegments, dirEntry.name];
    loadDir();
  }

  function navigateTo(index: number): void {
    pathSegments = index < 0 ? [] : pathSegments.slice(0, index + 1);
    loadDir();
  }

  async function selectFile(entry: Entry): Promise<void> {
    if (entry.isDir) { navigateInto(entry); return; }
    selectedFile = entry;
    fileContent = '';
    editContent = '';
    rawMode = false;
    showHistory = false;
    showDiff = false;
    aiResponse = null;
    viewMode = isTextFile(entry.name) && HTML_EXTS.has(entry.ext) ? 'preview' : 'source';
    if (isTextFile(entry.name)) {
      loadingContent = true;
      try {
        if (entry.content !== undefined) {
          fileContent = entry.content;
          editContent = entry.content;
        } else {
          const content = await readFile(entry.path);
          fileContent = content;
          editContent = content;
        }
        if (enableHistory) {
          historyEntries = getFileHistory(entry.path);
        }
      } catch (e) {
        fileContent = `[Error reading file: ${e}]`;
        editContent = fileContent;
      } finally {
        loadingContent = false;
      }
    }
  }

  async function saveFile(): Promise<void> {
    if (!selectedFile || !dirty) return;
    saving = true;
    try {
      if (enableHistory) {
        pushHistory(selectedFile.path, fileContent);
      }
      await writeFile(selectedFile.path, editContent);
      fileContent = editContent;
      const st = await getFileStat(selectedFile.path);
      selectedFile = { ...selectedFile, size: st.size, modified: st.modified, content: editContent };
      entries = entries.map((e) => e.path === selectedFile!.path ? selectedFile! : e);
      addToast(`Saved ${selectedFile.name}`, 'success');
    } catch (e) {
      addToast(`Failed to save: ${e}`, 'error');
    } finally {
      saving = false;
    }
  }

  /** Strip wrapping markdown code fences that some CLIs add despite instructions */
  function stripCodeFences(text: string): string {
    return text
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();
  }

  async function runAiPrompt(): Promise<void> {
    if (!selectedFile || !aiPrompt.trim() || aiRunning) return;
    if (aiMode === 'ask') { await runAiAsk(); return; }
    aiRunning = true;
    try {
      // Include parent dir name for context (e.g. "debug-helper/SKILL.md")
      const pathParts = selectedFile.path.replace(/\\/g, '/').split('/');
      const displayName = pathParts.length >= 2
        ? `${pathParts[pathParts.length - 2]}/${selectedFile.name}`
        : selectedFile.name;
      const result = await invoke<string>('run_cli_on_file', {
        cliId: activeCli,
        fileName: displayName,
        fileContent: editContent,
        userPrompt: aiPrompt.trim(),
      });
      editContent = stripCodeFences(result);
      aiPrompt = '';
      showDiff = true;
      addToast(t('editor.ai_applied'), 'success');
    } catch (e) {
      addToast(`AI error: ${e}`, 'error');
    } finally {
      aiRunning = false;
    }
  }

  async function runAiAsk(): Promise<void> {
    if (!selectedFile || !aiPrompt.trim() || aiRunning) return;
    aiRunning = true;
    aiResponse = null;
    try {
      const pathParts = selectedFile.path.replace(/\\/g, '/').split('/');
      const displayName = pathParts.length >= 2
        ? `${pathParts[pathParts.length - 2]}/${selectedFile.name}`
        : selectedFile.name;
      const prompt = `File: ${displayName}\n\nContent:\n${editContent}\n\nQuestion: ${aiPrompt.trim()}\n\nAnswer concisely. If you have change suggestions, explain what to change and why — do not output the full file.`;
      const result = await invoke<string>('run_cli_prompt', { cliId: activeCli, prompt });
      aiResponse = result.trim();
      aiPrompt = '';
    } catch (e) {
      addToast(`AI error: ${e}`, 'error');
    } finally {
      aiRunning = false;
    }
  }

  async function confirmDelete(entry: Entry): Promise<void> {
    const ok = await confirmModal?.confirm(
      'Delete',
      `Are you sure you want to delete "${entry.name}"?${entry.isDir ? ' This will delete all contents.' : ''}`
    );
    if (!ok) return;
    try {
      await deleteFile(entry.path);
      if (config.onAfterDelete) await config.onAfterDelete(entry.path);
      if (selectedFile?.path === entry.path) {
        selectedFile = null;
        fileContent = '';
        editContent = '';
      }
      await loadDir();
      addToast(`Deleted ${entry.name}`, 'success');
    } catch (e) {
      addToast(`Failed to delete: ${e}`, 'error');
    }
  }

  async function createNew(): Promise<void> {
    if (!config.createTemplate) return;
    const err = validateFileName(newName);
    if (err) { nameError = err; return; }
    const tmpl = config.createTemplate;
    const createdName = tmpl.type === 'directory' && tmpl.entryFile
      ? newName.trim()
      : `${newName.trim()}${tmpl.ext}`;
    try {
      if (tmpl.type === 'directory' && tmpl.entryFile) {
        const dir = `${currentDir}/${newName.trim()}`;
        await ensureDir(dir);
        const filePath = `${dir}/${tmpl.entryFile}`;
        await writeFile(filePath, tmpl.stub(newName.trim()));
        if (config.onAfterCreate) await config.onAfterCreate(filePath);
      } else {
        const filePath = `${currentDir}/${newName.trim()}${tmpl.ext}`;
        await writeFile(filePath, tmpl.stub(newName.trim()));
        if (config.onAfterCreate) await config.onAfterCreate(filePath);
      }
      isNew = false;
      newName = '';
      nameError = '';
      await loadDir();
      // Auto-select the newly created file
      const created = entries.find(e => e.name === createdName);
      if (created && !created.isDir) {
        await selectFile(created);
      }
    } catch (e) {
      addToast(`Failed to create: ${e}`, 'error');
    }
  }

  function toggleSelectMode(): void {
    selectMode = !selectMode;
    selectedPaths = new Set();
    if (selectMode) selectedFile = null;
  }

  function togglePath(path: string): void {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    selectedPaths = next;
  }

  function selectAll(): void {
    if (selectedPaths.size === entries.length) {
      selectedPaths = new Set();
    } else {
      selectedPaths = new Set(entries.map((e) => e.path));
    }
  }

  async function bulkDelete(): Promise<void> {
    if (selectedPaths.size === 0) return;
    const count = selectedPaths.size;
    const ok = await confirmModal?.confirm('Delete Selected', `Delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.`);
    if (!ok) return;
    for (const path of selectedPaths) {
      try {
        await deleteFile(path);
        if (config.onAfterDelete) await config.onAfterDelete(path);
      } catch {}
    }
    selectedPaths = new Set();
    selectMode = false;
    selectedFile = null;
    await loadDir();
  }

  function openHistory(): void {
    if (!selectedFile) return;
    historyEntries = getFileHistory(selectedFile.path);
    showHistory = true;
  }

  function restoreFromHistory(content: string): void {
    editContent = content;
    showHistory = false;
  }

  function showContextMenu(event: MouseEvent, entry: Entry): void {
    ctxItems = [
      { label: t('folder.copy_path'), action: () => navigator.clipboard.writeText(entry.path) },
      { label: t('delete'), action: () => confirmDelete(entry), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  function startResize(e: MouseEvent): void {
    e.preventDefault();
    resizing = true;
    const startX = e.clientX;
    const startW = listWidth;
    function onMove(ev: MouseEvent) {
      listWidth = Math.max(180, Math.min(startW + (ev.clientX - startX), 600));
    }
    function onUp() {
      resizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  }

  onMount(async () => {
    const base = await claudeDir();
    baseDir = `${base}/${config.dirName}`;
    loadDir();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isNew}
  <button class="fixed inset-0 z-10 cursor-default" aria-label="Close" onclick={() => { isNew = false; newName = ''; nameError = ''; }}></button>
{/if}

<div class="h-full flex flex-col overflow-hidden">
  {#if loading}
    <div class="flex-1 flex items-center justify-center text-[var(--text-ghost)] text-[13px]">Loading...</div>
  {:else if entries.length === 0 && !isNew && pathSegments.length === 0}
    <EmptyState
      icon={config.emptyIcon ?? '◇'}
      title={config.emptyTitle ?? `No ${config.label.toLowerCase()}`}
      description={config.emptyDescription ?? `Create your first ${config.label.toLowerCase().replace(/s$/, '')}`}
      actionLabel={hasCreate ? `Create ${config.label.toLowerCase().replace(/s$/, '')}` : undefined}
      onAction={hasCreate ? () => { isNew = true; } : undefined}
    />
  {:else}
    <div class="flex flex-1 min-h-0 gap-0 rounded-lg border border-[var(--border-default)] overflow-hidden" class:select-none={resizing}>
      <!-- Left pane: entry list -->
      <div class="shrink-0 flex flex-col overflow-hidden bg-[var(--surface-1)]" style="width: {listWidth}px;">
        <!-- Toolbar -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] shrink-0">
          {#if selectMode}
            <button onclick={selectAll} class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150 {selectedPaths.size === entries.filter(e => !e.isDir).length ? 'bg-[var(--accent)] text-[var(--surface-0)]' : 'border border-[var(--border-default)] text-transparent hover:border-[var(--text-muted)]'}" title="Select all">
              <span class="text-[10px] font-bold">✓</span>
            </button>
            <span class="text-[11px] text-[var(--text-muted)] font-mono">{selectedPaths.size} selected</span>
            <div class="flex items-center gap-1">
              <button onclick={bulkDelete} disabled={selectedPaths.size === 0} class="h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all duration-150 {selectedPaths.size > 0 ? 'bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25' : 'text-[var(--text-ghost)] cursor-default'}">
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M5.3 4V2.7a1 1 0 011-1h3.4a1 1 0 011 1V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9a1.5 1.5 0 001.5 1.3h4.6a1.5 1.5 0 001.5-1.3l.7-9"/></svg> Delete
              </button>
              <button onclick={toggleSelectMode} class="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150" title="Cancel">✕</button>
            </div>
          {:else}
            <span class="text-[10px] text-[var(--text-ghost)] font-mono tracking-wide">{entries.length} items</span>
            <div class="flex items-center gap-1">
              {#if enableBulkDelete && entries.filter(e => !e.isDir).length > 1}
                <button onclick={toggleSelectMode} class="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-ghost)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all duration-150" title="Bulk delete">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M5.3 4V2.7a1 1 0 011-1h3.4a1 1 0 011 1V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9a1.5 1.5 0 001.5 1.3h4.6a1.5 1.5 0 001.5-1.3l.7-9"/></svg>
                </button>
              {/if}
              {#if hasWizard}
                <button onclick={() => { showWizard = true; }} class="h-7 px-2.5 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150 flex items-center gap-1" title="Skill Wizard">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4z"/><path d="M12 10l1 2M4 10l-1 2"/></svg>
                  Wizard
                </button>
              {/if}
              {#if hasCreate}
                <button onclick={() => { isNew = true; selectedFile = null; }} class="h-7 px-2.5 rounded-md text-[11px] font-medium text-[var(--accent-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-150 flex items-center gap-1">
                  <span class="text-sm leading-none">+</span> New
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- New item form -->
        {#if isNew}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="flex flex-col p-3 border-b border-[var(--border-subtle)] bg-[var(--accent-subtle)] relative z-20 animate-fade-in" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <div class="flex gap-2">
              <input
                bind:value={newName}
                placeholder={config.createTemplate?.placeholder ?? 'name'}
                class="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
                onkeydown={(e) => { if (e.key === 'Enter') createNew(); if (e.key === 'Escape') { isNew = false; newName = ''; nameError = ''; } }}
                oninput={() => { nameError = ''; }}
              />
              <button onclick={createNew} disabled={!!nameError} class="text-[11px] text-[var(--accent)] hover:text-[var(--accent)] font-semibold px-2">Add</button>
            </div>
            {#if nameError}<p class="text-[11px] text-[var(--danger)] mt-1">{nameError}</p>{/if}
          </div>
        {/if}

        <!-- Breadcrumb (only when navigating into subdirs) -->
        {#if canNavigate && pathSegments.length > 0}
          <div class="flex items-center gap-1 px-3 py-1.5 text-[12px] shrink-0 flex-wrap border-b border-[var(--border-subtle)]">
            <button onclick={() => navigateTo(-1)} class="px-1.5 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {prettifyName(config.dirName)}
            </button>
            {#each pathSegments as seg, i}
              <span class="text-[var(--text-ghost)]">/</span>
              <button onclick={() => navigateTo(i)} class="px-1.5 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors {i === pathSegments.length - 1 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}">
                {seg}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Entry list -->
        <div class="flex-1 overflow-y-auto stagger-list">
          {#each entries as entry}
            <button
              onclick={() => { if (selectMode) togglePath(entry.path); else selectFile(entry); }}
              oncontextmenu={(e) => { if (!selectMode) showContextMenu(e, entry); }}
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 border-b border-[var(--border-subtle)] relative
                     {selectMode && selectedPaths.has(entry.path) ? 'bg-[var(--danger)]/5' : selectedFile?.path === entry.path ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
            >
              {#if !selectMode && selectedFile?.path === entry.path}
                <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
              {/if}

              {#if selectMode}
                <div class="w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] transition-all duration-150 {selectedPaths.has(entry.path) ? 'bg-[var(--danger)] border-[var(--danger)] text-white' : 'border-[var(--border-default)] text-transparent'}">✓</div>
              {:else}
                <!-- File type icon -->
                <span class="w-4 shrink-0 text-center">
                  {#if fileIcon(entry) === 'folder'}
                    <svg class="w-4 h-4 inline-block text-[var(--warning,#f59e0b)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                  {:else if fileIcon(entry) === 'script'}
                    <svg class="w-4 h-4 inline-block text-[var(--success,#22c55e)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"/></svg>
                  {:else if fileIcon(entry) === 'config'}
                    <svg class="w-4 h-4 inline-block text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {:else if fileIcon(entry) === 'code'}
                    <svg class="w-4 h-4 inline-block text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/></svg>
                  {:else if fileIcon(entry) === 'web'}
                    <svg class="w-4 h-4 inline-block text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>
                  {:else if fileIcon(entry) === 'image'}
                    <svg class="w-4 h-4 inline-block text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>
                  {:else if fileIcon(entry) === 'text'}
                    <svg class="w-4 h-4 inline-block text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                  {:else}
                    <svg class="w-4 h-4 inline-block text-[var(--text-ghost)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                  {/if}
                </span>
              {/if}

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[12px] truncate">{entry.isDir ? entry.name : entry.name}</span>
                  <div class="flex items-center gap-3 shrink-0 text-[10px] text-[var(--text-ghost)] font-mono">
                    {#if !entry.isDir}
                      <span>{formatSize(entry.size)}</span>
                    {/if}
                    <span class="w-[50px] text-right">{formatDate(entry.modified)}</span>
                  </div>
                </div>
                {#if !entry.isDir && contentPreview(entry.content)}
                  <div class="text-[11px] text-[var(--text-ghost)] truncate mt-0.5">{contentPreview(entry.content)}</div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div onmousedown={startResize} class="w-1 shrink-0 cursor-col-resize hover:bg-[var(--accent)] transition-colors duration-150 {resizing ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'}"></div>

      <!-- Right pane: editor -->
      <div class="flex-1 min-w-0 overflow-hidden bg-[var(--surface-0)] flex flex-col relative">
        {#if !selectedFile}
          <div class="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-ghost)]">
            <svg class="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            <span class="text-[13px]">{t('folder.select')}</span>
          </div>
        {:else if loadingContent}
          <div class="h-full flex items-center justify-center text-[var(--text-ghost)] text-[13px]">Loading...</div>
        {:else if isTextFile(selectedFile.name)}
          <!-- Toolbar -->
          <div class="px-4 py-1.5 border-b border-[var(--border-subtle)] flex items-center gap-2 shrink-0">
            <span class="text-[12px] font-medium text-[var(--text-primary)] truncate">{selectedFile.name}</span>
            <span class="text-[10px] font-mono text-[var(--text-ghost)]">{formatSize(selectedFile.size)}</span>

            <div class="ml-auto flex items-center gap-1.5">
              {#if dirty}
                <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)]" title="Unsaved changes"></span>
              {/if}

              {#if enableHistory && historyEntries.length > 0}
                <button onclick={openHistory} class="text-[11px] px-2 py-0.5 rounded-md text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150 font-mono" title="View history">
                  <svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg> {historyEntries.length}
                </button>
              {/if}

              <!-- Rich/Raw toggle for .md, Source/Preview for HTML -->
              {#if isMd}
                <button onclick={() => { rawMode = !rawMode; }} class="text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors {rawMode ? 'bg-[var(--accent-subtle)] border-[var(--accent-dim)] text-[var(--accent)]' : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-ghost)] hover:text-[var(--text-muted)] hover:border-[var(--border-default)]'}">Raw</button>
              {:else if isHtml}
                <div class="flex rounded border border-[var(--border-subtle)] overflow-hidden">
                  <button onclick={() => viewMode = 'source'} class="px-2 py-0.5 text-[10px] font-medium transition-colors {viewMode === 'source' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}">{t('editor.source')}</button>
                  <button onclick={() => viewMode = 'preview'} class="px-2 py-0.5 text-[10px] font-medium transition-colors {viewMode === 'preview' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}">{t('editor.preview')}</button>
                </div>
              {/if}

              <button onclick={saveFile} disabled={!dirty || saving} class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors {dirty ? 'bg-[var(--accent)] text-white hover:opacity-90' : 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-default'}">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <!-- Content area -->
          {#if isHtml && viewMode === 'preview'}
            <iframe srcdoc={editContent} title="HTML Preview" class="flex-1 w-full border-0 bg-white" sandbox="allow-scripts"></iframe>
          {:else if isMd && !rawMode}
            <div class="flex-1 overflow-auto">
              <MarkdownEditor bind:value={editContent} oninput={() => {}} />
            </div>
          {:else if isMd && rawMode}
            <div class="flex-1 min-h-0 flex flex-col p-3">
              <textarea bind:value={editContent} oninput={() => {}} class="flex-1 min-h-0 w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-4 text-[13px] text-[var(--text-primary)] font-mono leading-relaxed outline-none resize-none focus:border-[var(--accent-dim)] transition-colors" spellcheck="false"></textarea>
            </div>
          {:else}
            <!-- Plain text editor with line numbers -->
            {@const lineCount = editContent.split('\n').length}
            <div class="flex flex-1 min-h-0">
              <div class="shrink-0 py-4 pr-0 pl-2 select-none text-right border-r border-[var(--border-subtle)] overflow-hidden" aria-hidden="true">
                {#each Array(lineCount) as _, i}
                  <div class="text-[12px] font-mono leading-relaxed text-[var(--text-ghost)] px-1.5">{i + 1}</div>
                {/each}
              </div>
              <textarea bind:value={editContent} spellcheck="false" class="flex-1 resize-none py-4 px-3 text-[12px] font-mono text-[var(--text-secondary)] leading-relaxed bg-transparent outline-none" style="tab-size: 2;"></textarea>
            </div>
          {/if}

          <!-- AI prompt panel — only visible when a text file is open -->
          {#if selectedFile && !selectedFile.isDir && isTextFile(selectedFile.name)}
            <!-- Divider with AI label -->
            <div class="shrink-0 flex items-center gap-2 px-3 pt-2 pb-0" style="border-top: 2px solid var(--accent-dim, #6366f1)20;">
              <div style="height:1px;flex:1;background:linear-gradient(to right,var(--accent-dim,#6366f1)30,transparent);opacity:0.3;"></div>
              <span class="text-[9px] font-mono uppercase tracking-widest px-1.5" style="color:var(--accent-dim,#6366f1);opacity:0.7;letter-spacing:.12em;">AI Assistant</span>
              <div style="height:1px;flex:1;background:linear-gradient(to left,var(--accent-dim,#6366f1)30,transparent);opacity:0.3;"></div>
            </div>
            <!-- AI response panel (Ask mode) -->
            {#if aiResponse}
              <div class="shrink-0 mx-3 mb-1.5 rounded-lg overflow-hidden animate-fade-in" style="background:color-mix(in srgb,var(--accent,#6366f1) 6%,var(--surface-1));border:1px solid color-mix(in srgb,var(--accent-dim,#6366f1) 25%,transparent);">
                <div class="flex items-center justify-between px-3 py-1.5" style="border-bottom:1px solid color-mix(in srgb,var(--accent-dim,#6366f1) 15%,transparent);">
                  <span class="text-[9px] font-mono uppercase tracking-widest" style="color:var(--accent-dim,#6366f1);">{activeCli} response</span>
                  <button onclick={() => aiResponse = null} class="text-[10px] text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors">✕</button>
                </div>
                <div class="px-3 py-2 max-h-40 overflow-y-auto">
                  <p class="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                </div>
              </div>
            {/if}
            <div class="shrink-0 px-3 pb-2.5 pt-1 flex gap-2 items-end" style="background:color-mix(in srgb,var(--accent,#6366f1) 4%,var(--surface-1));border-top:1px solid color-mix(in srgb,var(--accent-dim,#6366f1) 12%,transparent);">
              <div class="flex-1 flex flex-col gap-1.5">
                <div class="flex items-center gap-1.5">
                  <svg class="w-3 h-3 text-[var(--accent-dim)] shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 1l1.2 2.8L12 5l-2.8 1.2L8 9 6.8 6.2 4 5l2.8-1.2z"/>
                    <path d="M13 9l.7 1.6L15 11l-1.3.4L13 13l-.7-1.6L11 11l1.3-.4z"/>
                  </svg>
                  <span class="text-[10px] text-[var(--text-ghost)] font-mono uppercase tracking-wide">{activeCli}</span>
                  <!-- Mode toggle -->
                  <div class="ml-auto flex items-center rounded overflow-hidden border border-[var(--border-subtle)]">
                    <button
                      onclick={() => { aiMode = 'edit'; aiResponse = null; }}
                      class="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors
                             {aiMode === 'edit' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-ghost)] hover:text-[var(--text-muted)]'}"
                    >Edit</button>
                    <button
                      onclick={() => aiMode = 'ask'}
                      class="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors
                             {aiMode === 'ask' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-ghost)] hover:text-[var(--text-muted)]'}"
                    >Ask</button>
                  </div>
                </div>
                <!-- svelte-ignore a11y_autofocus -->
                <textarea
                  bind:value={aiPrompt}
                  autofocus
                  rows="2"
                  placeholder={aiMode === 'edit'
                    ? 'e.g. Add error handling, translate to English, add YAML frontmatter…'
                    : 'e.g. What does this skill do? Any improvements?'}
                  class="w-full rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none resize-none transition-colors font-sans" style="background:color-mix(in srgb,var(--accent,#6366f1) 6%,var(--surface-2));border:1px solid color-mix(in srgb,var(--accent-dim,#6366f1) 20%,var(--border-subtle));"
                  onfocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'color-mix(in srgb,var(--accent-dim,#6366f1) 50%,transparent)'; }}
                  onblur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'color-mix(in srgb,var(--accent-dim,#6366f1) 20%,var(--border-subtle))'; }}
                  onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runAiPrompt(); } }}
                ></textarea>
              </div>
              <div class="flex flex-col gap-1.5 shrink-0">
                <button
                  onclick={runAiPrompt}
                  disabled={!aiPrompt.trim() || aiRunning}
                  class="h-9 px-3 text-[11px] font-medium rounded-lg transition-all {aiPrompt.trim() && !aiRunning ? 'bg-[var(--accent)] text-white hover:opacity-90' : 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-default'}"
                >
                  {#if aiRunning}
                    <span class="flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block"></span>
                      {aiMode === 'ask' ? 'Asking…' : 'Running…'}
                    </span>
                  {:else}
                    {aiMode === 'ask' ? 'Ask' : 'Run'} {isMac ? '⌘' : 'Ctrl+'}↵
                  {/if}
                </button>
              </div>
            </div>
          {/if}

          <!-- Dirty action bar -->
          {#if dirty}
            <div class="flex gap-2 px-4 py-2 border-t border-[var(--border-subtle)] animate-fade-in shrink-0">
              <button onclick={() => { showDiff = true; }} class="px-3 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] rounded-lg transition-all duration-150">Review Changes</button>
              <button onclick={() => { editContent = fileContent; }} class="px-3 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Discard</button>
            </div>
          {/if}

          <!-- History panel (slide-in overlay) -->
          {#if showHistory}
            <div class="absolute inset-y-0 right-0 w-72 bg-[var(--surface-1)] border-l border-[var(--border-subtle)] flex flex-col animate-fade-in z-10">
              <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                <span class="text-[12px] font-semibold text-[var(--text-primary)]">Version History</span>
                <button onclick={() => { showHistory = false; }} aria-label="Close history" class="text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <div class="flex-1 overflow-y-auto">
                {#each historyEntries as entry}
                  <button onclick={() => restoreFromHistory(entry.content)} class="w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors group">
                    <div class="text-[11px] text-[var(--text-secondary)] font-mono mb-1">{new Date(entry.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="text-[10px] text-[var(--text-ghost)] truncate">{entry.content.split('\n')[0]?.slice(0, 50) ?? '(empty)'}</div>
                    <div class="text-[10px] text-[var(--accent-dim)] opacity-0 group-hover:opacity-100 mt-0.5 transition-opacity">Click to restore</div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {:else}
          <!-- Binary/unknown file type -->
          <div class="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-ghost)]">
            <svg class="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            <div class="text-center">
              <div class="text-[13px] font-medium text-[var(--text-secondary)]">{selectedFile.name}</div>
              <div class="text-[11px] mt-1">{formatSize(selectedFile.size)} &middot; {selectedFile.ext || 'No extension'}</div>
              <div class="text-[11px] mt-0.5">{t('folder.binary')}</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />

{#if showDiff && selectedFile}
  <DiffView
    oldText={fileContent}
    newText={editContent}
    onClose={() => { showDiff = false; }}
  />
{/if}

{#if showWizard}
  <SkillWizard
    onClose={() => { showWizard = false; }}
    onSaved={(name: string) => { showWizard = false; addToast(`Skill "${name}" created`, 'success'); loadDir(); }}
  />
{/if}
