<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, readFile, writeFile } from '../lib/fs';
  import { loadAppConfig, saveAppConfig } from '../lib/app-config';
  import { homeDir } from '@tauri-apps/api/path';
  import type { Settings } from '../lib/settings';
  import EnvSection from '../components/settings/EnvSection.svelte';
  import PermissionsSection from '../components/settings/PermissionsSection.svelte';
  import PreferencesSection from '../components/settings/PreferencesSection.svelte';
  import MarketplacesSection from '../components/settings/MarketplacesSection.svelte';
  import UnknownSection from '../components/settings/UnknownSection.svelte';
  import { t } from '../lib/i18n.svelte';
  import { CLI_ADAPTERS, getActiveAdapter } from '../lib/adapters/index';
  import type { CliAdapter } from '../lib/adapters/types';
  import MarkdownEditor from '../components/MarkdownEditor.svelte';
  import { addToast } from '../lib/toast.svelte';
  type FileTab = { label: string; path: string };

  const KNOWN_KEYS = new Set([
    'env', 'permissions', 'hooks',
    'enabledMcpjsonServers', 'disabledMcpjsonServers',
    'enabledPlugins', 'enableAllProjectMcpServers',
    'outputStyle', 'effortLevel', 'statusLine', 'skipDangerousModePermissionPrompt',
    'extraKnownMarketplaces',
  ]);

  let tabs = $state<FileTab[]>([]);
  let activeTab = $state(0);
  let settings = $state<Settings>({});
  let search = $state('');
  let basePath = $state('');
  let claudePath = $state('');
  let defaultPath = $state('');
  let pathEditing = $state(false);
  let pathDraft = $state('');
  let viewMode = $state<'structured' | 'raw'>('structured');
  let rawJson = $state('');
  let rawDirty = $state(false);
  let rawError = $state('');
  let activeAdapter = $state<CliAdapter>(CLI_ADAPTERS[0]);
  let rawFileContent = $state('');
  let rawFileDraft = $state('');
  let rawFileDirty = $state(false);
  let rawFileSaving = $state(false);
  /** Global instructions file (CLAUDE.md, AGENTS.md, etc.) */
  let instrPath = $state('');
  let instrFileName = $state('');
  let instrContent = $state('');
  let instrDraft = $state('');
  let instrRawMode = $state(false);
  let instrSaving = $state(false);
  const instrDirty = $derived(instrDraft !== instrContent);

  async function load() {
    const home = await homeDir();
    const h = home.endsWith('/') || home.endsWith('\\') ? home.slice(0, -1) : home;
    activeAdapter = await getActiveAdapter();
    defaultPath = `${h}/${activeAdapter.configDirName}`;
    const base = await claudeDir();
    claudePath = base;
    basePath = base;
    if (activeAdapter.settingsFileName && activeAdapter.settingsIsJson) {
      tabs = [
        { label: 'Global Settings', path: `${base}/${activeAdapter.settingsFileName}` },
        { label: 'Local Settings', path: `${base}/settings.local.json` },
      ];
      await loadTab(activeTab);
    } else {
      tabs = [];
      settings = {};
      rawJson = '';
      rawFileContent = '';
      rawFileDraft = '';
      rawFileDirty = false;
      if (activeAdapter.settingsFileName) {
        try {
          rawFileContent = await readFile(`${base}/${activeAdapter.settingsFileName}`);
          rawFileDraft = rawFileContent;
        } catch { rawFileContent = ''; rawFileDraft = ''; }
      }
    }
    // Load global instructions file
    instrFileName = activeAdapter.instructionsFileName ?? '';
    if (instrFileName) {
      instrPath = `${base}/${instrFileName}`;
      try {
        instrContent = await readFile(instrPath);
        instrDraft = instrContent;
      } catch { instrContent = ''; instrDraft = ''; }
    } else {
      instrPath = '';
      instrContent = '';
      instrDraft = '';
    }
  }

  async function saveInstructions(): Promise<void> {
    if (!instrPath || !instrDirty) return;
    instrSaving = true;
    try {
      await writeFile(instrPath, instrDraft);
      instrContent = instrDraft;
      addToast(`Saved ${instrFileName}`, 'success');
    } catch (e) {
      addToast(`Failed to save: ${e}`, 'error');
    } finally {
      instrSaving = false;
    }
  }

  async function saveRawFile() {
    if (!activeAdapter.settingsFileName) return;
    rawFileSaving = true;
    try {
      const base = await claudeDir();
      await writeFile(`${base}/${activeAdapter.settingsFileName}`, rawFileDraft);
      rawFileContent = rawFileDraft;
      rawFileDirty = false;
    } catch (e) {
      console.error('[Settings] Failed to save raw file:', e);
    } finally {
      rawFileSaving = false;
    }
  }

  async function savePath() {
    const trimmed = pathDraft.trim();
    const config = await loadAppConfig();
    if (!trimmed || trimmed === defaultPath) {
      delete config.claudeDir;
    } else {
      config.claudeDir = trimmed;
    }
    await saveAppConfig(config);
    pathEditing = false;
    await load();
  }

  async function loadTab(index: number) {
    activeTab = index;
    try {
      const raw = await readFile(tabs[index].path);
      settings = JSON.parse(raw);
      rawJson = JSON.stringify(settings, null, 2);
      rawDirty = false;
      rawError = '';
    } catch {
      settings = {};
      rawJson = '{}';
      rawDirty = false;
      rawError = '';
    }
  }

  async function saveRawJson() {
    try {
      const parsed = JSON.parse(rawJson);
      await writeFile(tabs[activeTab].path, JSON.stringify(parsed, null, 2));
      settings = parsed;
      rawDirty = false;
      rawError = '';
    } catch (e) {
      rawError = `Invalid JSON: ${e}`;
    }
  }

  function handleRawInput(value: string) {
    rawJson = value;
    rawDirty = true;
    rawError = '';
    try { JSON.parse(value); } catch (e) { rawError = `${e}`; }
  }

  async function patchAndReload(fn: (s: Settings) => void) {
    const raw = await readFile(tabs[activeTab].path);
    const current = JSON.parse(raw) as Settings;
    fn(current);
    await writeFile(tabs[activeTab].path, JSON.stringify(current, null, 2));
    settings = current;
  }

  function unknownFields(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (!KNOWN_KEYS.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  function sectionVisible(keywords: string[]): boolean {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return keywords.some((k) => k.toLowerCase().includes(s));
  }

  function envKeywords(): string[] {
    return ['env', 'environment', ...Object.keys(settings.env ?? {}), ...Object.values(settings.env ?? {})];
  }
  function permKeywords(): string[] {
    const p = settings.permissions ?? {};
    return ['permissions', 'allow', 'deny', 'ask', ...(p.allow ?? []), ...(p.deny ?? [])];
  }
  function prefKeywords(): string[] {
    return ['preferences', 'output', 'effort', 'status', 'dangerous', (settings as any).outputStyle ?? '', (settings as any).effortLevel ?? ''];
  }
  function marketKeywords(): string[] {
    return ['marketplace', ...Object.keys((settings as any).extraKnownMarketplaces ?? {})];
  }

  function handleKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (instrDirty) saveInstructions();
    }
  }

  onMount(load);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-full min-h-0 flex flex-col max-w-4xl mx-auto w-full overflow-y-auto">
  <!-- CLI info (switching happens in sidebar) -->

  <!-- Config Directory -->
  <div class="mb-5">
    <div class="flex items-center gap-2.5 mb-2">
      <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em]">Config Directory</span>
      {#if claudePath !== defaultPath}
        <span class="text-[9px] text-[var(--warning)] bg-[var(--warning)]/10 px-1.5 py-0.5 rounded-md font-semibold">custom</span>
      {/if}
    </div>
    {#if pathEditing}
      <div class="flex gap-2 animate-fade-in">
        <input
          bind:value={pathDraft}
          placeholder={defaultPath}
          class="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-dim)] transition-colors"
          onkeydown={(e) => { if (e.key === 'Enter') savePath(); if (e.key === 'Escape') pathEditing = false; }}
        />
        <button onclick={savePath} class="px-3 py-2 bg-[var(--accent-dim)] hover:bg-[var(--accent)] rounded-lg text-[11px] text-[var(--surface-0)] font-semibold transition-colors">Save</button>
        <button onclick={() => pathEditing = false} class="px-3 py-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Cancel</button>
      </div>
      <div class="text-[10px] text-[var(--text-ghost)] mt-1.5">Default: <span class="font-mono">{defaultPath}</span> &middot; Leave empty to reset</div>
    {:else}
      <button
        onclick={() => { pathDraft = claudePath; pathEditing = true; }}
        class="text-[13px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors truncate block max-w-full text-left group"
      >
        <span class="group-hover:border-b group-hover:border-[var(--border-default)] transition-all">{claudePath}</span>
      </button>
    {/if}
  </div>

  <!-- Global Instructions (CLAUDE.md / AGENTS.md) -->
  {#if instrFileName}
    <div class="mb-5">
      <div class="flex items-center gap-2.5 mb-2">
        <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em]">{t('settings.global_instructions')}</span>
        <span class="text-[10px] font-mono text-[var(--text-ghost)]">{instrFileName}</span>
        {#if instrDirty}
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] font-semibold">{t('editor.unsaved')}</span>
        {/if}
        <div class="ml-auto flex items-center gap-2">
          <div class="flex rounded border border-[var(--border-subtle)] overflow-hidden">
            <button
              onclick={() => instrRawMode = false}
              class="px-2 py-0.5 text-[10px] font-medium transition-colors
                     {!instrRawMode
                       ? 'bg-[var(--accent)] text-white'
                       : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
            >{t('editor.rich')}</button>
            <button
              onclick={() => instrRawMode = true}
              class="px-2 py-0.5 text-[10px] font-medium transition-colors
                     {instrRawMode
                       ? 'bg-[var(--accent)] text-white'
                       : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
            >{t('editor.raw')}</button>
          </div>
          <button
            onclick={saveInstructions}
            disabled={!instrDirty || instrSaving}
            class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors
                   {instrDirty
                     ? 'bg-[var(--accent)] text-white hover:opacity-90'
                     : 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-default'}"
          >
            {instrSaving ? t('editor.saving') : t('save')}
          </button>
        </div>
      </div>
      <div class="rounded-lg border border-[var(--border-default)] overflow-hidden max-h-[300px] overflow-y-auto">
        {#if instrRawMode}
          {@const lineCount = instrDraft.split('\n').length}
          <div class="flex min-h-[200px] bg-[var(--surface-1)]">
            <!-- Line numbers -->
            <div class="shrink-0 py-4 pr-0 pl-2 select-none text-right border-r border-[var(--border-subtle)]" aria-hidden="true">
              {#each Array(lineCount) as _, i}
                <div class="text-[12px] font-mono leading-relaxed text-[var(--text-ghost)] px-1.5">{i + 1}</div>
              {/each}
            </div>
            <!-- Editor -->
            <textarea
              bind:value={instrDraft}
              spellcheck="false"
              class="flex-1 min-h-[200px] resize-none py-4 px-3 text-[12px] font-mono text-[var(--text-secondary)] leading-relaxed bg-transparent outline-none"
              style="tab-size: 2;"
            ></textarea>
          </div>
        {:else}
          <MarkdownEditor bind:value={instrDraft} oninput={() => {}} />
        {/if}
      </div>
    </div>
  {/if}

  {#if !activeAdapter.settingsIsJson}
    <!-- Non-JSON settings (e.g. Codex config.toml) — read-only viewer -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.15em]">
          {activeAdapter.settingsFileName ?? 'Config'}
        </span>
        {#if rawFileDirty}
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] font-semibold">unsaved</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-[var(--text-ghost)] font-mono">{activeAdapter.configDirName}/{activeAdapter.settingsFileName}</span>
        {#if rawFileDirty}
          <button
            onclick={saveRawFile}
            disabled={rawFileSaving}
            class="px-2.5 py-1 bg-[var(--accent-dim)] hover:bg-[var(--accent)] rounded text-[11px] text-[var(--surface-0)] font-semibold transition-colors disabled:opacity-50"
          >{rawFileSaving ? 'Saving…' : 'Save'}</button>
          <button
            onclick={() => { rawFileDraft = rawFileContent; rawFileDirty = false; }}
            class="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >Discard</button>
        {/if}
      </div>
    </div>
    {#if rawFileContent !== undefined}
      <textarea
        bind:value={rawFileDraft}
        oninput={() => rawFileDirty = rawFileDraft !== rawFileContent}
        spellcheck={false}
        class="flex-1 w-full resize-none text-[12px] font-mono text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg p-4 leading-relaxed outline-none focus:border-[var(--accent-dim)] transition-colors min-h-[300px]"
      ></textarea>
    {:else}
      <div class="flex items-center justify-center py-12 text-[13px] text-[var(--text-ghost)]">
        {activeAdapter.settingsFileName} not found
      </div>
    {/if}
  {:else}
    <!-- Tab bar -->
    <div class="flex gap-0 border-b border-[var(--border-subtle)] mb-5">
      {#each tabs as tab, i}
        <button
          onclick={() => loadTab(i)}
          class="px-5 py-2.5 text-[13px] transition-all duration-200 border-b-2 -mb-px relative
                 {activeTab === i ? 'text-[var(--text-primary)] border-[var(--accent)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if activeAdapter.settingsIsJson}
  <!-- View mode toggle -->
  <div class="flex items-center gap-3 mb-5">
    <div class="relative flex-1">
      <input
        bind:value={search}
        placeholder={t('settings.search')}
        disabled={viewMode === 'raw'}
        class="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-4 py-2 pl-9 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-dim)] transition-colors disabled:opacity-40"
      />
      <svg class="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-ghost)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    </div>
    <div class="flex rounded border border-[var(--border-subtle)] overflow-hidden">
      <button
        onclick={() => { viewMode = 'structured'; }}
        class="px-3 py-1.5 text-[11px] font-medium transition-colors {viewMode === 'structured' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
      >{t('settings.structured')}</button>
      <button
        onclick={() => { viewMode = 'raw'; rawJson = JSON.stringify(settings, null, 2); rawDirty = false; rawError = ''; }}
        class="px-3 py-1.5 text-[11px] font-medium transition-colors {viewMode === 'raw' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}"
      >{t('settings.raw_json')}</button>
    </div>
  </div>

  <!-- Content -->
  {#if viewMode === 'raw'}
    <div class="flex-1 flex flex-col min-h-0">
      <textarea
        value={rawJson}
        oninput={(e) => handleRawInput(e.currentTarget.value)}
        spellcheck="false"
        class="flex-1 w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-4 py-3 text-[12px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-dim)] transition-colors resize-none leading-relaxed {rawError && rawDirty ? 'border-[var(--danger)]' : ''}"
      ></textarea>
      {#if rawError && rawDirty}
        <p class="text-[11px] text-[var(--danger)] mt-1.5 flex items-center gap-1">
          <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          {rawError}
        </p>
      {/if}
      <div class="flex justify-end gap-2 mt-3">
        <button
          onclick={() => { rawJson = JSON.stringify(settings, null, 2); rawDirty = false; rawError = ''; }}
          disabled={!rawDirty}
          class="px-3 py-1.5 rounded text-[12px] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-30"
        >{t('settings.discard')}</button>
        <button
          onclick={saveRawJson}
          disabled={!rawDirty || !!rawError}
          class="px-3 py-1.5 rounded text-[12px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-30 shadow-sm shadow-black/5"
        >{t('save')}</button>
      </div>
    </div>
  {:else}
    <div class="flex-1 overflow-y-auto space-y-5">
      {#if sectionVisible(envKeywords())}
        <EnvSection {settings} onPatch={patchAndReload} />
      {/if}

      {#if sectionVisible(permKeywords())}
        <PermissionsSection {settings} onPatch={patchAndReload} />
      {/if}

      {#if sectionVisible(prefKeywords())}
        <PreferencesSection {settings} onPatch={patchAndReload} />
      {/if}

      {#if sectionVisible(marketKeywords())}
        <MarketplacesSection {settings} onPatch={patchAndReload} />
      {/if}

      <UnknownSection unknownFields={unknownFields()} onPatch={patchAndReload} />
    </div>
  {/if}
  {/if}
</div>
