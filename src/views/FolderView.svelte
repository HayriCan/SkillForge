<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, listDirFull, readFile, writeFile, deleteFile, getFileStat } from '../lib/fs';
  import { addToast } from '../lib/toast.svelte';
  import { t } from '../lib/i18n.svelte';
  import MarkdownEditor from '../components/MarkdownEditor.svelte';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';

  const { dirName, onCount } = $props<{ dirName: string; onCount: (n: number) => void }>();

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
  /** 'source' for code editor, 'preview' for rendered HTML */
  let viewMode = $state<'source' | 'preview'>('source');
  /** Resizable list panel width */
  let listWidth = $state(300);
  let resizing = $state(false);
  /** Context menu + confirm modal */
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  const dirty = $derived(selectedFile !== null && editContent !== fileContent);
  const isHtml = $derived(selectedFile !== null && HTML_EXTS.has(selectedFile.ext));
  const isMd = $derived(selectedFile !== null && selectedFile.ext === '.md');

  const currentDir = $derived(
    pathSegments.length === 0 ? baseDir : `${baseDir}/${pathSegments.join('/')}`
  );

  function prettifyName(name: string): string {
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

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

  async function loadDir(): Promise<void> {
    loading = true;
    selectedFile = null;
    fileContent = '';
    editContent = '';
    try {
      const raw = await listDirFull(currentDir);
      const result: Entry[] = [];
      for (const e of raw) {
        const path = `${currentDir}/${e.name}`;
        const st = await getFileStat(path);
        result.push({ name: e.name, isDir: e.isDir, path, size: st.size, modified: st.modified, ext: getExt(e.name) });
      }
      result.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      entries = result;
      onCount(result.length);
    } catch (e) {
      console.error('[FolderView] loadDir failed:', e);
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
    viewMode = isTextFile(entry.name) && HTML_EXTS.has(entry.ext) ? 'preview' : 'source';
    if (isTextFile(entry.name)) {
      loadingContent = true;
      try {
        const content = await readFile(entry.path);
        fileContent = content;
        editContent = content;
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
      await writeFile(selectedFile.path, editContent);
      fileContent = editContent;
      // Update size in entry list
      const st = await getFileStat(selectedFile.path);
      selectedFile = { ...selectedFile, size: st.size, modified: st.modified };
      entries = entries.map(e => e.path === selectedFile!.path ? selectedFile! : e);
      addToast(`Saved ${selectedFile.name}`, 'success');
    } catch (e) {
      addToast(`Failed to save: ${e}`, 'error');
    } finally {
      saving = false;
    }
  }

  function showContextMenu(event: MouseEvent, entry: Entry): void {
    ctxItems = [
      { label: t('folder.copy_path'), action: () => navigator.clipboard.writeText(entry.path) },
      { label: t('delete'), action: () => confirmDelete(entry), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  async function confirmDelete(entry: Entry): Promise<void> {
    const ok = await confirmModal?.confirm(
      'Delete',
      `Are you sure you want to delete "${entry.name}"?${entry.isDir ? ' This will delete all contents.' : ''}`
    );
    if (!ok) return;
    try {
      await deleteFile(entry.path);
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

  function handleKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  }

  function startResize(e: MouseEvent): void {
    e.preventDefault();
    resizing = true;
    const startX = e.clientX;
    const startW = listWidth;

    function onMove(ev: MouseEvent) {
      const newW = startW + (ev.clientX - startX);
      listWidth = Math.max(180, Math.min(newW, 600));
    }
    function onUp() {
      resizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  onMount(async () => {
    const base = await claudeDir();
    baseDir = `${base}/${dirName}`;
    loadDir();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-full flex flex-col overflow-hidden">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-1 px-1 pb-3 text-[12px] shrink-0 flex-wrap">
    <button
      onclick={() => navigateTo(-1)}
      class="px-1.5 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]
             {pathSegments.length === 0 ? 'text-[var(--text-primary)] font-medium' : ''}"
    >
      {prettifyName(dirName)}
    </button>
    {#each pathSegments as seg, i}
      <span class="text-[var(--text-ghost)]">/</span>
      <button
        onclick={() => navigateTo(i)}
        class="px-1.5 py-0.5 rounded hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]
               {i === pathSegments.length - 1 ? 'text-[var(--text-primary)] font-medium' : ''}"
      >
        {seg}
      </button>
    {/each}
    <span class="ml-auto text-[11px] text-[var(--text-ghost)] font-mono">{t('folder.items', { n: String(entries.length) })}</span>
  </div>

  {#if loading}
    <div class="flex-1 flex items-center justify-center text-[var(--text-ghost)] text-[13px]">Loading...</div>
  {:else if entries.length === 0}
    <div class="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-ghost)]">
      <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
      <span class="text-[13px]">{t('folder.empty')}</span>
    </div>
  {:else}
    <div class="flex flex-1 min-h-0 gap-0 rounded-lg border border-[var(--border-default)] overflow-hidden" class:select-none={resizing}>
      <!-- Entry list -->
      <div class="shrink-0 overflow-y-auto bg-[var(--surface-1)]" style="width: {listWidth}px;">
        {#each entries as entry}
          <button
            onclick={() => selectFile(entry)}
            oncontextmenu={(e) => showContextMenu(e, entry)}
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 border-b border-[var(--border-subtle)]
                   {selectedFile?.path === entry.path
                     ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                     : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
          >
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

            <div class="flex-1 min-w-0">
              <div class="text-[12px] truncate">{entry.name}</div>
            </div>

            <div class="flex items-center gap-3 shrink-0 text-[10px] text-[var(--text-ghost)] font-mono">
              {#if !entry.isDir}
                <span>{formatSize(entry.size)}</span>
              {/if}
              <span class="w-[50px] text-right">{formatDate(entry.modified)}</span>
            </div>
          </button>
        {/each}
      </div>

      <!-- Resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        onmousedown={startResize}
        class="w-1 shrink-0 cursor-col-resize hover:bg-[var(--accent)] transition-colors duration-150
               {resizing ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'}"
      ></div>

      <!-- Editor / Preview pane -->
      <div class="flex-1 min-w-0 overflow-hidden bg-[var(--surface-0)] flex flex-col">
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
              <!-- Rich/Raw toggle for .md, Source/Preview for HTML -->
              {#if isMd || isHtml}
                <div class="flex rounded border border-[var(--border-subtle)] overflow-hidden">
                  {#if isMd}
                    <button
                      onclick={() => viewMode = 'source'}
                      class="px-2 py-0.5 text-[10px] font-medium transition-colors
                             {viewMode === 'source'
                               ? 'bg-[var(--accent)] text-white'
                               : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
                    >{t('editor.rich')}</button>
                    <button
                      onclick={() => viewMode = 'preview'}
                      class="px-2 py-0.5 text-[10px] font-medium transition-colors
                             {viewMode === 'preview'
                               ? 'bg-[var(--accent)] text-white'
                               : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
                    >{t('editor.raw')}</button>
                  {:else}
                    <button
                      onclick={() => viewMode = 'source'}
                      class="px-2 py-0.5 text-[10px] font-medium transition-colors
                             {viewMode === 'source'
                               ? 'bg-[var(--accent)] text-white'
                               : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
                    >{t('editor.source')}</button>
                    <button
                      onclick={() => viewMode = 'preview'}
                      class="px-2 py-0.5 text-[10px] font-medium transition-colors
                             {viewMode === 'preview'
                               ? 'bg-[var(--accent)] text-white'
                               : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
                    >{t('editor.preview')}</button>
                  {/if}
                </div>
              {/if}

              <!-- Dirty indicator + Save -->
              {#if dirty}
                <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)]" title="Unsaved changes"></span>
              {/if}
              <button
                onclick={saveFile}
                disabled={!dirty || saving}
                class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors
                       {dirty
                         ? 'bg-[var(--accent)] text-white hover:opacity-90'
                         : 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-default'}"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <!-- Content area -->
          {#if isHtml && viewMode === 'preview'}
            <!-- HTML rendered preview -->
            <iframe
              srcdoc={editContent}
              title="HTML Preview"
              class="flex-1 w-full border-0 bg-white"
              sandbox="allow-scripts"
            ></iframe>
          {:else if isMd && viewMode === 'source'}
            <!-- Markdown Rich editor -->
            <div class="flex-1 overflow-auto">
              <MarkdownEditor bind:value={editContent} oninput={() => {}} />
            </div>
          {:else}
            <!-- Plain text editor for .sh, .json, .toml etc. -->
            {@const lineCount = editContent.split('\n').length}
            <div class="flex flex-1 min-h-0">
              <div class="shrink-0 py-4 pr-0 pl-2 select-none text-right border-r border-[var(--border-subtle)] overflow-hidden" aria-hidden="true">
                {#each Array(lineCount) as _, i}
                  <div class="text-[12px] font-mono leading-relaxed text-[var(--text-ghost)] px-1.5">{i + 1}</div>
                {/each}
              </div>
              <textarea
                bind:value={editContent}
                spellcheck="false"
                class="flex-1 resize-none py-4 px-3 text-[12px] font-mono text-[var(--text-secondary)] leading-relaxed bg-transparent outline-none"
                style="tab-size: 2;"
              ></textarea>
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
