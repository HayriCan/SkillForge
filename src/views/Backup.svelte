<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { exportBackup, importBackup, listExportCategories, createFullBackup, type ExportCategory } from '../lib/backup';
  import { addToast } from '../lib/toast.svelte';

  let { initialSection = '' } = $props<{ initialSection?: string }>();
  let exportSectionEl = $state<HTMLElement | null>(null);
  let importSectionEl = $state<HTMLElement | null>(null);

  onMount(async () => {
    if (initialSection) {
      await tick();
      const target = initialSection === 'import' ? importSectionEl : exportSectionEl;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Categories that represent transferable capabilities (selected by default)
  const CAPABILITY_IDS = new Set(['agents', 'commands', 'hooks', 'plugins', 'skills', 'teams', '__root__', '__home__']);

  // Export state
  let exporting = $state(false);
  let lastExportPath = $state('');
  let categories = $state<ExportCategory[]>([]);
  let selectedIds = $state<Set<string>>(new Set());
  let categoriesLoading = $state(true);
  let showAdditional = $state(false);

  // Full backup state
  let fullBackupRunning = $state(false);
  let fullBackupResult = $state<{ path: string; size: string } | null>(null);

  // Import state
  let importing = $state(false);
  let importPath = $state('');
  let importMode = $state<'merge' | 'overwrite'>('merge');
  let importResult = $state<{ restored: number; skipped: number } | null>(null);
  let progress = $state(0);
  let progressTotal = $state(0);

  let progressPct = $derived(progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0);
  let selectedFileCount = $derived(
    categories.filter(c => selectedIds.has(c.id)).reduce((sum, c) => sum + c.fileCount, 0)
  );
  let capabilityCategories = $derived(categories.filter(c => CAPABILITY_IDS.has(c.id)));
  let additionalCategories = $derived(categories.filter(c => !CAPABILITY_IDS.has(c.id)));
  let allCapabilitiesSelected = $derived(capabilityCategories.every(c => selectedIds.has(c.id)));

  // Load categories on mount — default: only capabilities selected
  $effect(() => {
    listExportCategories().then(cats => {
      categories = cats;
      selectedIds = new Set(cats.filter(c => CAPABILITY_IDS.has(c.id)).map(c => c.id));
      categoriesLoading = false;
    }).catch(() => {
      categoriesLoading = false;
    });
  });

  function toggleCategory(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function toggleAllCapabilities() {
    const next = new Set(selectedIds);
    if (allCapabilitiesSelected) capabilityCategories.forEach(c => next.delete(c.id));
    else capabilityCategories.forEach(c => next.add(c.id));
    selectedIds = next;
  }

  function toggleAllAdditional() {
    const next = new Set(selectedIds);
    const allAdditionalSelected = additionalCategories.every(c => next.has(c.id));
    if (allAdditionalSelected) additionalCategories.forEach(c => next.delete(c.id));
    else additionalCategories.forEach(c => next.add(c.id));
    selectedIds = next;
  }

  async function pickFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Skill Forge Backup', extensions: ['sfbackup'] }],
    });
    if (selected) importPath = selected as string;
  }

  async function doExport() {
    if (selectedIds.size === 0) return;
    exporting = true;
    try {
      const path = await exportBackup([...selectedIds]);
      lastExportPath = path;
      addToast(`Backup exported to ${path}`, 'success');
    } catch (e) {
      addToast(`Export failed: ${e}`, 'error');
    } finally {
      exporting = false;
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function doFullBackup() {
    fullBackupRunning = true;
    fullBackupResult = null;
    try {
      const { path, sizeBytes } = await createFullBackup();
      fullBackupResult = { path, size: formatSize(sizeBytes) };
      addToast(`Full backup created (${formatSize(sizeBytes)})`, 'success');
    } catch (e) {
      addToast(`Full backup failed: ${e}`, 'error');
    } finally {
      fullBackupRunning = false;
    }
  }

  async function doImport() {
    if (!importPath.trim()) return;
    importing = true;
    importResult = null;
    progress = 0;
    progressTotal = 0;
    try {
      const result = await importBackup(importPath.trim(), importMode, (current, total) => {
        progress = current;
        progressTotal = total;
      });
      importResult = result;
      addToast(`Restored ${result.restored} files${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}. Reloading…`, 'success');
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      addToast(`Import failed: ${e}`, 'error');
    } finally {
      importing = false;
    }
  }

  const CATEGORY_ICONS: Record<string, string> = {
    agents: 'A',
    skills: 'S',
    hooks: 'H',
    commands: 'C',
    plans: 'P',
    todos: 'T',
    teams: 'G',
    plugins: 'X',
    memories: 'M',
    memory: 'M',
    __root__: 'R',
    __home__: 'H',
  };
</script>

<div class="h-full overflow-y-auto px-8 py-6 max-w-2xl mx-auto w-full">
  <!-- Header -->
  <div class="mb-5">
    <h2 class="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Backup & Restore</h2>
    <p class="text-[11px] text-[var(--text-ghost)]">
      Export your <code class="font-mono text-[var(--accent-dim)]">.claude</code> config as a portable bundle, or restore from a previous backup.
    </p>
  </div>

  <!-- Full Backup section -->
  <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] mb-3 overflow-hidden">
    <div class="flex items-center justify-between px-5 py-4">
      <div class="flex items-center gap-2.5">
        <div class="w-6 h-6 rounded-md bg-[var(--success)]/15 flex items-center justify-center">
          <span class="text-[var(--success)] text-[11px] font-bold leading-none">⛨</span>
        </div>
        <div>
          <h3 class="text-[13px] font-semibold text-[var(--text-primary)]">Full Backup</h3>
          <p class="text-[10px] text-[var(--text-ghost)] mt-0.5">
            Creates a <code class="font-mono text-[var(--accent-dim)]">.tar.gz</code> of the entire
            <code class="font-mono text-[var(--accent-dim)]">~/.claude/</code> directory and
            <code class="font-mono text-[var(--accent-dim)]">~/.claude.json</code>
          </p>
        </div>
      </div>
      <button
        onclick={doFullBackup}
        disabled={fullBackupRunning}
        class="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5
               bg-[var(--success)]/15 border border-[var(--success)]/30 text-[var(--success)]
               hover:bg-[var(--success)]/25 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-black/5"
      >
        {#if fullBackupRunning}
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Creating…
        {:else}
          Create Backup
        {/if}
      </button>
    </div>
    {#if fullBackupResult}
      <div class="mx-5 mb-4 flex items-center gap-2 p-2.5 rounded-lg bg-[var(--success)]/8 border border-[var(--success)]/20 animate-fade-in">
        <span class="text-[var(--success)] text-[11px]">✓</span>
        <span class="text-[11px] font-mono text-[var(--text-ghost)] truncate flex-1">{fullBackupResult.path}</span>
        <span class="text-[10px] font-mono text-[var(--text-ghost)] shrink-0">{fullBackupResult.size}</span>
      </div>
    {/if}
  </div>

  <!-- Export section -->
  <div bind:this={exportSectionEl} class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] mb-3 overflow-hidden">
    <!-- Export header -->
    <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
      <div class="flex items-center gap-2.5">
        <div class="w-6 h-6 rounded-md bg-[var(--accent)]/15 flex items-center justify-center">
          <span class="text-[var(--accent)] text-[11px] font-bold leading-none">↑</span>
        </div>
        <h3 class="text-[13px] font-semibold text-[var(--text-primary)]">Export Backup</h3>
      </div>
      <div class="flex items-center gap-3">
        {#if !categoriesLoading && categories.length > 0}
          <span class="text-[11px] text-[var(--text-ghost)]">
            {selectedFileCount} file{selectedFileCount !== 1 ? 's' : ''} selected
          </span>
        {/if}
        <button
          onclick={doExport}
          disabled={exporting || selectedIds.size === 0}
          class="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
                 bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]
                 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-black/5"
        >
          {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
    </div>

    <!-- Category list -->
    <div class="px-5 py-3">
      {#if categoriesLoading}
        <div class="flex items-center gap-2 py-3">
          <span class="text-[11px] text-[var(--text-ghost)] animate-pulse">Scanning .claude directory…</span>
        </div>
      {:else if categories.length === 0}
        <p class="text-[11px] text-[var(--text-ghost)] py-3">No exportable content found in .claude directory.</p>
      {:else}
        <!-- Transferable Capabilities -->
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-medium text-[var(--text-ghost)] uppercase tracking-wider">Capabilities</span>
          <button
            onclick={toggleAllCapabilities}
            class="text-[10px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors duration-150"
          >
            {allCapabilitiesSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div class="flex flex-col divide-y divide-[var(--border-subtle)] max-h-[240px] overflow-y-auto mb-2">
          {#each capabilityCategories as cat}
            {@const checked = selectedIds.has(cat.id)}
            <button
              onclick={() => toggleCategory(cat.id)}
              class="flex items-center gap-2.5 py-[7px] text-left group transition-colors duration-100 hover:bg-[var(--surface-3)] -mx-5 px-5"
            >
              <div class="w-3.5 h-3.5 rounded flex-shrink-0 border transition-all duration-150 flex items-center justify-center
                          {checked ? 'bg-[var(--accent-dim)] border-[var(--accent-dim)]' : 'border-[var(--border-default)] bg-[var(--surface-1)] group-hover:border-[var(--accent-dim)]'}">
                {#if checked}<span class="text-[var(--surface-0)] text-[8px] font-bold leading-none">✓</span>{/if}
              </div>
              <span class="text-[12px] w-4 text-center leading-none flex-shrink-0 {checked ? 'text-[var(--accent-dim)]' : 'text-[var(--text-ghost)]'}">
                {CATEGORY_ICONS[cat.id] ?? '·'}
              </span>
              <span class="flex-1 min-w-0 text-[12px] font-medium truncate {checked ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} transition-colors">
                {cat.label}
              </span>
              <span class="flex-shrink-0 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded {checked ? 'bg-[var(--accent)]/10 text-[var(--accent-dim)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)]'}">
                {cat.fileCount}
              </span>
            </button>
          {/each}
        </div>

        <!-- Additional Files (collapsible) -->
        {#if additionalCategories.length > 0}
          <button
            onclick={() => { showAdditional = !showAdditional; }}
            class="flex items-center gap-1.5 w-full py-1 mb-1 text-left group"
          >
            <span class="text-[10px] text-[var(--text-ghost)] transition-transform duration-200 {showAdditional ? 'rotate-90' : ''}">▶</span>
            <span class="text-[10px] font-medium text-[var(--text-ghost)] uppercase tracking-wider group-hover:text-[var(--text-muted)] transition-colors">
              Additional
            </span>
            <span class="text-[10px] text-[var(--text-ghost)] ml-1">
              ({additionalCategories.filter(c => selectedIds.has(c.id)).length}/{additionalCategories.length})
            </span>
          </button>

          {#if showAdditional}
            <div class="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden mb-1">
              {#each additionalCategories as cat}
                {@const checked = selectedIds.has(cat.id)}
                <button
                  onclick={() => toggleCategory(cat.id)}
                  class="flex items-center gap-2.5 py-[7px] px-3 text-left group transition-colors duration-100 hover:bg-[var(--surface-3)]"
                >
                  <div class="w-3.5 h-3.5 rounded flex-shrink-0 border transition-all duration-150 flex items-center justify-center
                              {checked ? 'bg-[var(--accent-dim)] border-[var(--accent-dim)]' : 'border-[var(--border-default)] bg-[var(--surface-1)] group-hover:border-[var(--accent-dim)]'}">
                    {#if checked}<span class="text-[var(--surface-0)] text-[8px] font-bold leading-none">✓</span>{/if}
                  </div>
                  <span class="text-[12px] w-4 text-center leading-none flex-shrink-0 {checked ? 'text-[var(--accent-dim)]' : 'text-[var(--text-ghost)]'}">
                    {CATEGORY_ICONS[cat.id] ?? '·'}
                  </span>
                  <span class="flex-1 min-w-0 text-[12px] font-medium truncate {checked ? 'text-[var(--text-secondary)]' : 'text-[var(--text-ghost)]'} transition-colors">
                    {cat.label}
                  </span>
                  <span class="flex-shrink-0 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded {checked ? 'bg-[var(--accent)]/10 text-[var(--accent-dim)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)]'}">
                    {cat.fileCount}
                  </span>
                </button>
              {/each}
            </div>
            <div class="flex justify-end">
              <button
                onclick={toggleAllAdditional}
                class="text-[10px] text-[var(--text-ghost)] hover:text-[var(--accent-dim)] transition-colors duration-150"
              >
                {additionalCategories.every(c => selectedIds.has(c.id)) ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          {/if}
        {/if}
      {/if}
    </div>

    <!-- Export success -->
    {#if lastExportPath}
      <div class="mx-5 mb-4 flex items-center gap-2 p-2.5 rounded-lg bg-[var(--success)]/8 border border-[var(--success)]/20 animate-fade-in">
        <span class="text-[var(--success)] text-[11px]">✓</span>
        <span class="text-[11px] font-mono text-[var(--text-ghost)] truncate">{lastExportPath}</span>
      </div>
    {/if}
  </div>

  <!-- Import section -->
  <div bind:this={importSectionEl} class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] overflow-hidden">
    <!-- Import header -->
    <div class="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
      <div class="w-6 h-6 rounded-md bg-[var(--warning)]/15 flex items-center justify-center">
        <span class="text-[var(--warning)] text-[11px] font-bold leading-none">↓</span>
      </div>
      <h3 class="text-[13px] font-semibold text-[var(--text-primary)]">Import Backup</h3>
    </div>

    <div class="px-5 py-4 flex flex-col gap-3">
      <!-- File picker row -->
      <div class="flex items-center gap-2">
        <button
          onclick={pickFile}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)]
                 text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-dim)] hover:text-[var(--text-primary)]
                 transition-all duration-150 flex-shrink-0"
        >
          <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
          <span>Choose <code class="font-mono text-[var(--accent-dim)]">.sfbackup</code></span>
        </button>
        <div class="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)]">
          {#if importPath}
            <span class="text-[11px] font-mono text-[var(--text-secondary)] truncate block">{importPath.split('/').pop()}</span>
          {:else}
            <span class="text-[11px] text-[var(--text-ghost)]">No file selected</span>
          {/if}
        </div>
      </div>

      <!-- Mode toggle + Restore button row -->
      <div class="flex items-center gap-3">
        <div class="flex rounded-lg overflow-hidden border border-[var(--border-default)] bg-[var(--surface-1)]">
          {#each [['merge', 'Merge'], ['overwrite', 'Overwrite']] as [val, label]}
            <button
              onclick={() => { importMode = val as 'merge' | 'overwrite'; }}
              class="px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150
                     {importMode === val
                       ? 'bg-[var(--accent-dim)] text-[var(--surface-0)]'
                       : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}"
            >{label}</button>
          {/each}
        </div>
        <span class="text-[10px] text-[var(--text-ghost)] flex-1">
          {importMode === 'merge' ? 'keeps existing files' : 'replaces all files'}
        </span>
        <button
          onclick={doImport}
          disabled={!importPath.trim() || importing}
          class="px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
                 {importPath.trim() && !importing
                   ? 'bg-[var(--warning)]/15 border border-[var(--warning)]/30 text-[var(--warning)] hover:bg-[var(--warning)]/25'
                   : 'bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-ghost)] cursor-not-allowed'}"
        >
          {importing ? 'Restoring…' : 'Restore'}
        </button>
      </div>

      <!-- Progress bar -->
      {#if importing && progressTotal > 0}
        <div class="flex flex-col gap-1 animate-fade-in">
          <div class="w-full h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              class="h-full rounded-full bg-[var(--warning)] transition-all duration-150"
              style="width: {progressPct}%"
            ></div>
          </div>
          <span class="text-[10px] text-[var(--text-ghost)] font-mono">{progress}/{progressTotal} — {progressPct}%</span>
        </div>
      {/if}

      <!-- Import result -->
      {#if importResult}
        <div class="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--success)]/8 border border-[var(--success)]/20 animate-fade-in">
          <span class="text-[var(--success)] text-[11px]">✓</span>
          <span class="text-[11px] text-[var(--text-secondary)]">
            Restored <strong class="text-[var(--success)]">{importResult.restored}</strong> files
            {#if importResult.skipped > 0}
              — <strong class="text-[var(--warning)]">{importResult.skipped}</strong> skipped
            {/if}
          </span>
        </div>
      {/if}
    </div>
  </div>
</div>
