<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { exportBackup, importBackup, listExportCategories, createFullBackup, type ExportCategory } from '../lib/backup';
  import { autoSaveDefault } from '../lib/profiles';
  import { addToast } from '../lib/toast.svelte';
  import { getActiveAdapter } from '../lib/adapters/index';

  let configDirName = $state('');
  let lastCliId = $state('');

  let { initialSection = '' } = $props<{ initialSection?: string }>();
  let exportSectionEl = $state<HTMLElement | null>(null);
  let importSectionEl = $state<HTMLElement | null>(null);

  onMount(async () => {
    // Load current CLI info on mount
    const adapter = await getActiveAdapter();
    configDirName = adapter.configDirName;
    lastCliId = adapter.id;

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
  let selectedItems = $state<Set<string>>(new Set());
  let categoriesLoading = $state(false);
  let scanned = $state(false);
  let showAdditional = $state(false);
  let expandedCategories = $state<Set<string>>(new Set());

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

  /** Get unique top-level items within a category (skill names, agent names, etc.) */
  function getItems(cat: ExportCategory): { name: string; fileCount: number }[] {
    const map = new Map<string, number>();
    for (const f of cat.files) {
      const sep = f.name.indexOf('/');
      const item = sep === -1 ? f.name : f.name.slice(0, sep);
      map.set(item, (map.get(item) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, fileCount]) => ({ name, fileCount }));
  }

  /** Get the item key for selection (e.g. "skills/pptx") */
  function itemKey(catId: string, itemName: string): string {
    return `${catId}/${itemName}`;
  }

  /** Get all file relativePaths for a given item within a category */
  function filesForItem(cat: ExportCategory, itemName: string): string[] {
    return cat.files
      .filter(f => {
        const sep = f.name.indexOf('/');
        const item = sep === -1 ? f.name : f.name.slice(0, sep);
        return item === itemName;
      })
      .map(f => f.relativePath);
  }

  let selectedFileCount = $derived.by(() => {
    let count = 0;
    for (const cat of categories) {
      if (selectedIds.has(cat.id)) {
        count += cat.fileCount;
      } else {
        // Count files from individually selected items
        for (const item of getItems(cat)) {
          if (selectedItems.has(itemKey(cat.id, item.name))) {
            count += item.fileCount;
          }
        }
      }
    }
    return count;
  });

  let capabilityCategories = $derived(categories.filter(c => CAPABILITY_IDS.has(c.id)));
  let additionalCategories = $derived(categories.filter(c => !CAPABILITY_IDS.has(c.id)));
  let allCapabilitiesSelected = $derived(capabilityCategories.every(c => selectedIds.has(c.id)));

  async function scanContents() {
    // Refresh adapter info — CLI may have changed since last scan
    const adapter = await getActiveAdapter();
    if (adapter.id !== lastCliId) {
      // CLI changed — reset state
      lastCliId = adapter.id;
      configDirName = adapter.configDirName;
      categories = [];
      selectedIds = new Set();
      selectedItems = new Set();
      expandedCategories = new Set();
      lastExportPath = '';
      fullBackupResult = null;
    }
    configDirName = adapter.configDirName;

    categoriesLoading = true;
    try {
      const cats = await listExportCategories();
      categories = cats;
      selectedIds = new Set(cats.filter(c => CAPABILITY_IDS.has(c.id)).map(c => c.id));
      selectedItems = new Set();
      scanned = true;
    } catch {
      addToast(`Failed to scan ${configDirName} directory`, 'error');
    } finally {
      categoriesLoading = false;
    }
  }

  function toggleCategory(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Remove individual item selections for this category (category covers all)
      const cat = categories.find(c => c.id === id);
      if (cat) {
        const nextItems = new Set(selectedItems);
        for (const item of getItems(cat)) nextItems.delete(itemKey(id, item.name));
        selectedItems = nextItems;
      }
    }
    selectedIds = next;
  }

  function toggleItem(catId: string, itemName: string) {
    const key = itemKey(catId, itemName);
    const next = new Set(selectedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selectedItems = next;
  }

  function toggleExpandCategory(id: string) {
    const next = new Set(expandedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedCategories = next;
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

  function isCategoryPartiallySelected(cat: ExportCategory): boolean {
    if (selectedIds.has(cat.id)) return false;
    return getItems(cat).some(item => selectedItems.has(itemKey(cat.id, item.name)));
  }

  async function pickFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Skill Forge Backup', extensions: ['sfbackup'] }],
    });
    if (selected) importPath = selected as string;
  }

  async function doExport() {
    const catIds = [...selectedIds];
    // Resolve selected items to their individual file paths
    const filePaths: string[] = [];
    for (const key of selectedItems) {
      const sep = key.indexOf('/');
      if (sep === -1) continue;
      const catId = key.slice(0, sep);
      const itemName = key.slice(sep + 1);
      if (selectedIds.has(catId)) continue; // category already selected
      const cat = categories.find(c => c.id === catId);
      if (cat) filePaths.push(...filesForItem(cat, itemName));
    }
    if (catIds.length === 0 && filePaths.length === 0) return;
    exporting = true;
    try {
      const path = await exportBackup(
        catIds.length > 0 ? catIds : undefined,
        filePaths.length > 0 ? filePaths : undefined,
      );
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
    // Wait for the browser to paint the loading state before the blocking IPC call
    await tick();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));
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
      // Update __default__ snapshot so profile switching reflects the imported data
      await autoSaveDefault(true);
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

{#snippet categoryRow(cat: ExportCategory, indent: boolean)}
  {@const checked = selectedIds.has(cat.id)}
  {@const partial = isCategoryPartiallySelected(cat)}
  {@const expanded = expandedCategories.has(cat.id)}
  <div>
    <div class="flex items-center gap-1 {indent ? 'px-3' : '-mx-5 px-5'}">
      <!-- Expand toggle -->
      {#if cat.files.length > 0}
        <button
          onclick={() => toggleExpandCategory(cat.id)}
          class="w-4 h-4 flex items-center justify-center text-[9px] text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors flex-shrink-0"
        >
          <span class="transition-transform duration-150 {expanded ? 'rotate-90' : ''}">▶</span>
        </button>
      {:else}
        <div class="w-4"></div>
      {/if}

      <button
        onclick={() => toggleCategory(cat.id)}
        class="flex items-center gap-2.5 py-[7px] text-left group transition-colors duration-100 hover:bg-[var(--surface-3)] flex-1 min-w-0 rounded px-1"
      >
        <div class="w-3.5 h-3.5 rounded flex-shrink-0 border transition-all duration-150 flex items-center justify-center
                    {checked ? 'bg-[var(--accent-dim)] border-[var(--accent-dim)]' : partial ? 'border-[var(--accent-dim)] bg-[var(--accent)]/20' : 'border-[var(--border-default)] bg-[var(--surface-1)] group-hover:border-[var(--accent-dim)]'}">
          {#if checked}<span class="text-[var(--surface-0)] text-[8px] font-bold leading-none">✓</span>
          {:else if partial}<span class="text-[var(--accent-dim)] text-[8px] font-bold leading-none">–</span>{/if}
        </div>
        <span class="text-[12px] w-4 text-center leading-none flex-shrink-0 {checked || partial ? 'text-[var(--accent-dim)]' : 'text-[var(--text-ghost)]'}">
          {CATEGORY_ICONS[cat.id] ?? '·'}
        </span>
        <span class="flex-1 min-w-0 text-[12px] font-medium truncate {checked || partial ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} transition-colors">
          {cat.label}
        </span>
        <span
          class="flex-shrink-0 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded {checked || partial ? 'bg-[var(--accent)]/10 text-[var(--accent-dim)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)]'}"
          title="{cat.fileCount} file{cat.fileCount !== 1 ? 's' : ''}"
        >
          {cat.itemCount}{#if cat.fileCount !== cat.itemCount}<span class="text-[8px] opacity-60">/{cat.fileCount}</span>{/if}
        </span>
      </button>
    </div>

    <!-- Expanded item list (skill names, agent names — not individual files) -->
    {#if expanded && cat.files.length > 0}
      <div class="ml-6 {indent ? 'ml-8' : 'ml-5'} border-l border-[var(--border-subtle)] pl-3 py-1">
        {#each getItems(cat) as item}
          {@const key = itemKey(cat.id, item.name)}
          {@const itemChecked = checked || selectedItems.has(key)}
          <button
            onclick={() => { if (!checked) toggleItem(cat.id, item.name); }}
            disabled={checked}
            class="flex items-center gap-2 py-[5px] px-2 w-full text-left rounded transition-colors duration-100
                   {checked ? 'opacity-60 cursor-default' : 'hover:bg-[var(--surface-3)] cursor-pointer'}"
          >
            <div class="w-3 h-3 rounded-sm flex-shrink-0 border transition-all duration-150 flex items-center justify-center
                        {itemChecked ? 'bg-[var(--accent-dim)] border-[var(--accent-dim)]' : 'border-[var(--border-default)] bg-[var(--surface-1)]'}">
              {#if itemChecked}<span class="text-[var(--surface-0)] text-[7px] font-bold leading-none">✓</span>{/if}
            </div>
            <span class="text-[11px] font-mono text-[var(--text-muted)] truncate">{item.name}</span>
            {#if item.fileCount > 1}
              <span class="text-[9px] font-mono text-[var(--text-ghost)] shrink-0">{item.fileCount}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class="h-full overflow-y-auto px-8 py-6 max-w-2xl mx-auto w-full">
  <!-- Header -->
  <div class="mb-5">
    <h2 class="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Backup & Restore</h2>
    <p class="text-[11px] text-[var(--text-ghost)]">
      Export your <code class="font-mono text-[var(--accent-dim)]">{configDirName || '.claude'}</code> config as a portable bundle, or restore from a previous backup.
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
            <code class="font-mono text-[var(--accent-dim)]">~/{configDirName || '.claude'}/</code> directory
          </p>
        </div>
      </div>
      <button
        onclick={doFullBackup}
        disabled={fullBackupRunning}
        class="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5
               {fullBackupRunning
                 ? 'bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-ghost)] cursor-not-allowed pointer-events-none'
                 : 'bg-[var(--success)]/15 border border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/25 shadow-sm shadow-black/5'}"
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

  <!-- Share & Export section -->
  <div bind:this={exportSectionEl} class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] mb-3 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
      <div class="flex items-center gap-2.5">
        <div class="w-6 h-6 rounded-md bg-[var(--accent)]/15 flex items-center justify-center">
          <span class="text-[var(--accent)] text-[11px] font-bold leading-none">↑</span>
        </div>
        <div>
          <h3 class="text-[13px] font-semibold text-[var(--text-primary)]">Share & Export</h3>
          <p class="text-[10px] text-[var(--text-ghost)] mt-0.5">
            Select capabilities or individual files to export as a portable <code class="font-mono text-[var(--accent-dim)]">.sfbackup</code> bundle
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        {#if scanned && categories.length > 0}
          <span class="text-[11px] text-[var(--text-ghost)]">
            {selectedFileCount} file{selectedFileCount !== 1 ? 's' : ''}
          </span>
        {/if}
        {#if !scanned}
          <button
            onclick={scanContents}
            disabled={categoriesLoading}
            class="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5
                   bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]
                   disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-black/5"
          >
            {#if categoriesLoading}
              <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Scanning…
            {:else}
              Scan Contents
            {/if}
          </button>
        {:else}
          <button
            onclick={doExport}
            disabled={exporting || (selectedIds.size === 0 && selectedItems.size === 0)}
            class="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
                   bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]
                   disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-black/5"
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        {/if}
      </div>
    </div>

    <!-- Category list -->
    <div class="px-5 py-3">
      {#if !scanned && !categoriesLoading}
        <div class="flex flex-col items-center gap-2 py-6 text-center">
          <span class="text-[24px] opacity-30">📦</span>
          <p class="text-[11px] text-[var(--text-ghost)]">
            Click <strong class="text-[var(--text-muted)]">Scan Contents</strong> to discover exportable capabilities and files
          </p>
        </div>
      {:else if categoriesLoading}
        <div class="flex items-center gap-2 py-3">
          <span class="text-[11px] text-[var(--text-ghost)] animate-pulse">Scanning {configDirName || 'config'} directory…</span>
        </div>
      {:else if categories.length === 0}
        <p class="text-[11px] text-[var(--text-ghost)] py-3">No exportable content found in {configDirName || 'config'} directory.</p>
      {:else}
        <!-- Transferable Capabilities -->
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-medium text-[var(--text-ghost)] uppercase tracking-wider">Capabilities</span>
          <div class="flex items-center gap-3">
            <button
              onclick={scanContents}
              disabled={categoriesLoading}
              class="text-[10px] text-[var(--text-ghost)] hover:text-[var(--accent-dim)] transition-colors duration-150 flex items-center gap-1"
            >
              {#if categoriesLoading}
                <svg class="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              {/if}
              Rescan
            </button>
            <button
              onclick={toggleAllCapabilities}
              class="text-[10px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors duration-150"
            >
              {allCapabilitiesSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        <div class="flex flex-col divide-y divide-[var(--border-subtle)] max-h-[320px] overflow-y-auto mb-2">
          {#each capabilityCategories as cat}
            {@render categoryRow(cat, false)}
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
                {@render categoryRow(cat, true)}
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

      <!-- Path rewriting info -->
      <p class="text-[10px] text-[var(--text-ghost)] flex items-center gap-1">
        <span class="text-[var(--accent-dim)]">↻</span>
        Paths are automatically adjusted when restoring on a different machine
      </p>

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
