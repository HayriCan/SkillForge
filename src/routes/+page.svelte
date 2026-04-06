<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getVersion } from '@tauri-apps/api/app';
  import Sidebar from '../components/Sidebar.svelte';
  import Toast from '../components/Toast.svelte';
  import UpdaterModal from '../components/UpdaterModal.svelte';
  import { addToast } from '../lib/toast.svelte';
  import CommandPalette from '../components/CommandPalette.svelte';
  import Onboarding from '../components/Onboarding.svelte';
  import { registerShortcuts, isMac, increaseFontSize, decreaseFontSize, setFontSize, getFontSize } from '../lib/shortcuts';
  import Plugins from '../views/Plugins.svelte';
  import Sessions from '../views/Sessions.svelte';
  import Settings from '../views/Settings.svelte';
  import Insights from '../views/Insights.svelte';
  import UnifiedResourceView from '../components/UnifiedResourceView.svelte';
  import SuggestionPanel from '../components/SuggestionPanel.svelte';
  import { resourceConfigs } from '../lib/resource-config';
  import Tasks from '../views/Tasks.svelte';
  import Teams from '../views/Teams.svelte';
  import Todos from '../views/Todos.svelte';
  import Profiles from '../views/Profiles.svelte';
  import McpServers from '../views/McpServers.svelte';
  import Backup from '../views/Backup.svelte';
  import { claudeDir, listDirFull, readFile } from '../lib/fs';
  import { getActiveAdapter, detectInstalledClis } from '../lib/adapters/index';
  import type { CliAdapter } from '../lib/adapters/types';
  import { loadSettings } from '../lib/settings';
  import { listProfiles, autoSaveDefault } from '../lib/profiles';
  import { loadMcpConfig } from '../lib/mcp';
  import { checkForUpdates, checkForUpdatesManual } from '../lib/updater';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { invoke } from '@tauri-apps/api/core';
  import { getTheme, setTheme, type Theme } from '../lib/theme.svelte';
  import { t, getLocale, setLocale, LANGUAGES, type Locale } from '../lib/i18n.svelte';
  import { loadAppConfig, saveAppConfig } from '../lib/app-config';
  import { homeDir } from '@tauri-apps/api/path';

  let activeView = $state('agents');
  let counts = $state<Record<string, number>>({});
  let viewKey = $state(0);
  let profileListVersion = $state(0);

  /** Keys that change when a profile is switched — cleared immediately to avoid stale badges */
  const PROFILE_COUNT_KEYS = ['agents', 'commands', 'hooks', 'plans', 'skills', 'mcp'];

  function handleProfileSwitch() {
    const cleared = { ...counts };
    for (const k of PROFILE_COUNT_KEYS) delete cleared[k];
    counts = cleared;
    viewKey++;
    loadAllCounts();
    profileListVersion++;
  }

  function handleCliChange() {
    counts = {};
    viewKey++;
    loadAllCounts();
  }
  let showPalette = $state(false);
  let showSuggestPanel = $state(false);
  let showOnboarding = $state(false);
  let showAbout = $state(false);
  let appVersion = $state('');
  let showPreferences = $state(false);
  let initialSelect = $state('');
  let prefClaudeDir = $state('');
  let prefDefaultDir = $state('');
  let prefHomePath = $state('');
  let prefInstalledClis = $state<CliAdapter[]>([]);
  let prefActiveAdapter = $state<CliAdapter | null>(null);
  let prefCliDirs = $state<Record<string, string>>({});
  let backupSection = $state('');
  let showLangDropdown = $state(false);

  async function handleAction(action: string) {
    switch (action) {
      case 'about':
        showAbout = true;
        break;
      case 'check-updates':
        await checkForUpdatesManual();
        break;
      case 'feedback':
        await openUrl('https://github.com/HayriCan/SkillForge/issues');
        break;
      case 'homepage':
        await openUrl('https://github.com/HayriCan/SkillForge');
        break;
      case 'preferences': {
        const h = (await homeDir()).replace(/[/\\]$/, '');
        prefHomePath = h;
        prefActiveAdapter = await getActiveAdapter();
        prefDefaultDir = `${h}/${prefActiveAdapter.configDirName}`;
        prefClaudeDir = (await claudeDir());
        prefInstalledClis = await detectInstalledClis();
        const cfg = await loadAppConfig();
        // Build per-CLI dir map: override or default
        const dirs: Record<string, string> = {};
        for (const cli of prefInstalledClis) {
          dirs[cli.id] = cfg.cliDirs?.[cli.id] ?? `${h}/${cli.configDirName}`;
        }
        prefCliDirs = dirs;
        showPreferences = true;
        break;
      }
      case 'export':
        backupSection = 'export';
        activeView = 'backup';
        viewKey++;
        break;
      case 'import':
        backupSection = 'import';
        activeView = 'backup';
        viewKey++;
        break;
      case 'toggle-devtools':
        await invoke('toggle_devtools');
        break;
    }
  }

  async function savePreferences() {
    showPreferences = false;
    showLangDropdown = false;
    try {
      const config = await loadAppConfig();
      // Save per-CLI directory overrides
      const cliDirs: Record<string, string> = {};
      let hasOverrides = false;
      for (const cli of prefInstalledClis) {
        const val = prefCliDirs[cli.id]?.trim() ?? '';
        const defaultDir = `${prefHomePath}/${cli.configDirName}`;
        if (val && val !== defaultDir) {
          cliDirs[cli.id] = val;
          hasOverrides = true;
        }
      }
      if (hasOverrides) {
        config.cliDirs = cliDirs;
      } else {
        delete config.cliDirs;
      }
      // Clean up legacy claudeDir
      delete config.claudeDir;
      await saveAppConfig(config);
      addToast(t('toast.preferences_saved'), 'success');
      loadAllCounts();
    } catch (e) {
      addToast(`Error: ${e}`, 'error');
    }
  }

  function handleViewChange(v: string) {
    activeView = v;
    initialSelect = '';
    backupSection = '';
    viewKey++;
  }

  /** Convert dir name to display label: usage-data → Usage Data */
  function prettifyDirName(name: string): string {
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function handleCountUpdate(view: string, count: number) {
    counts = { ...counts, [view]: count };
  }

  async function loadAllCounts() {
    try {
      const base = await claudeDir();

      const countDir = async (sub: string, filter?: (e: { name: string; isDir: boolean }) => boolean) => {
        try {
          const entries = await listDirFull(`${base}/${sub}`);
          return filter ? entries.filter(filter).length : entries.length;
        } catch { return 0; }
      };

      const countTaskSessions = async () => {
        try {
          const dirs = await listDirFull(`${base}/tasks`);
          let count = 0;
          for (const d of dirs.filter((e) => e.isDir)) {
            try {
              const files = await listDirFull(`${base}/tasks/${d.name}`);
              if (files.some((f) => !f.isDir && f.name.endsWith('.json'))) count++;
            } catch {}
          }
          return count;
        } catch { return 0; }
      };

      const countTodos = async () => {
        try {
          const entries = await listDirFull(`${base}/todos`);
          return entries.filter((e) => !e.isDir && e.name.endsWith('.json')).length;
        } catch { return 0; }
      };

      const countTeams = async () => {
        try {
          const entries = await listDirFull(`${base}/teams`);
          return entries.filter((e) => e.isDir).length;
        } catch { return 0; }
      };

      const countSessions = async () => {
        try {
          const entries = await listDirFull(`${base}/sessions`);
          return entries.filter((e) => !e.isDir).length;
        } catch { return 0; }
      };

      const [skills, agents, commands, hooks, tasks, plans, todos, teams, sessions, profiles, mcpConfig] = await Promise.all([
        countDir('skills', (e) => e.isDir),
        countDir('agents', (e) => !e.isDir && e.name.endsWith('.md')),
        countDir('commands', (e) => !e.isDir && e.name.endsWith('.md')),
        countDir('hooks', (e) => !e.isDir),
        countTaskSessions(),
        countDir('plans', (e) => !e.isDir && e.name.endsWith('.md')),
        countTodos(),
        countTeams(),
        countSessions(),
        listProfiles().then((p) => p.length).catch(() => 0),
        loadMcpConfig().then((c) => Object.keys(c.mcpServers).length).catch(() => 0),
      ]);

      let pluginCount = 0;
      try {
        const s = await loadSettings();
        const enabledKeys = new Set(Object.keys(s.enabledPlugins ?? {}));
        try {
          const installedRaw = await readFile(`${base}/plugins/installed_plugins.json`);
          const installedData = JSON.parse(installedRaw) as { plugins?: Record<string, unknown> };
          if (installedData.plugins) {
            for (const key of Object.keys(installedData.plugins)) enabledKeys.add(key);
          }
        } catch {}
        pluginCount = enabledKeys.size;
      } catch {}

      counts = { skills, agents, commands, hooks, plugins: pluginCount, tasks, plans, todos, teams, sessions, profiles, mcp: mcpConfig };
    } catch (e) {
      console.error('[Counts] Failed to load:', e);
    }
  }

  onMount(() => {
    autoSaveDefault(); // capture pre-cc-manager state on first ever launch
    loadAllCounts();
    checkForUpdates();
    getVersion().then(v => appVersion = v);
    setFontSize(getFontSize());
    if (!localStorage.getItem('sf-onboarded')) {
      showOnboarding = true;
    }
    window.addEventListener('cli-changed', handleCliChange);
    return () => window.removeEventListener('cli-changed', handleCliChange);
  });

  const cleanupShortcuts = registerShortcuts({
    'ctrl+k': () => { showPalette = !showPalette; },
    'escape': () => { showPalette = false; },
    '1': () => handleViewChange('agents'),
    '2': () => handleViewChange('commands'),
    '3': () => handleViewChange('hooks'),
    '4': () => handleViewChange('plans'),
    '5': () => handleViewChange('plugins'),
    '6': () => handleViewChange('skills'),
    '7': () => handleViewChange('tasks'),
    '8': () => handleViewChange('teams'),
    '9': () => handleViewChange('todos'),
    'ctrl+=': () => increaseFontSize(),
    'ctrl+-': () => decreaseFontSize(),
  });

  onDestroy(() => { cleanupShortcuts(); });

  function handlePaletteSelect(viewId: string, fileName: string) {
    activeView = viewId;
    initialSelect = fileName;
    viewKey++;
    showPalette = false;
    addToast(`${fileName} açıldı`, 'info');
  }

  function handleOnboardingComplete() {
    localStorage.setItem('sf-onboarded', 'true');
    showOnboarding = false;
    addToast(t('toast.welcome'), 'success');
  }
</script>

<div class="flex h-screen overflow-hidden">
  <Sidebar active={activeView} onSelect={handleViewChange} {counts} onProfileSwitch={handleProfileSwitch} {profileListVersion} onAction={handleAction} />

  <main class="flex-1 min-w-0 overflow-hidden bg-[var(--surface-0)]">
    <!-- View header bar — SwitchHosts-style clean top bar -->
    <div class="h-10 border-b border-[var(--border-default)] flex items-center px-5 bg-[var(--surface-0)]">
      <h1 class="text-[13px] font-semibold text-[var(--text-primary)] capitalize">
        {activeView.startsWith('folder:') ? prettifyDirName(activeView.slice(7)) : activeView}
      </h1>
      {#if counts[activeView] !== undefined && counts[activeView] > 0}
        <span class="ml-2 text-[10px] font-mono text-[var(--text-ghost)] bg-[var(--surface-2)] px-1.5 py-px rounded">
          {counts[activeView]}
        </span>
      {/if}
      <div class="ml-auto flex items-center gap-2">
        <!-- Skill Öner -->
        <button
          onclick={() => showSuggestPanel = true}
          class="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-150"
          title={t('suggestions.button')}
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 1l1.2 2.8L12 5l-2.8 1.2L8 9 6.8 6.2 4 5l2.8-1.2z"/>
            <path d="M13 9l.7 1.6L15 11l-1.3.4L13 13l-.7-1.6L11 11l1.3-.4z"/>
          </svg>
          <span>{t('suggestions.button')}</span>
        </button>
        <!-- Search -->
        <button
          onclick={() => showPalette = true}
          class="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-all duration-150"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <span>{t('search')}</span>
          <kbd class="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-ghost)]">{isMac ? '⌘' : 'Ctrl+'}K</kbd>
        </button>
      </div>
    </div>

    <!-- View content -->
    {#key viewKey}
      <div class="h-[calc(100vh-2.5rem)] overflow-hidden px-5 py-4 animate-fade-in">
        {#if resourceConfigs[activeView]}
          <UnifiedResourceView config={resourceConfigs[activeView]} activeCli={prefActiveAdapter?.id} onCount={(n) => handleCountUpdate(activeView, n)} {initialSelect} />
        {:else if activeView.startsWith('folder:')}
          <UnifiedResourceView dirName={activeView.slice(7)} activeCli={prefActiveAdapter?.id} onCount={(n) => handleCountUpdate(activeView, n)} />
        {:else if activeView === 'plugins'}
          <Plugins onCount={(n) => handleCountUpdate('plugins', n)} />
        {:else if activeView === 'insights'}
          <Insights onCount={(n) => handleCountUpdate('insights', n)} />
        {:else if activeView === 'sessions'}
          <Sessions onCount={(n) => handleCountUpdate('sessions', n)} />
        {:else if activeView === 'settings'}
          <Settings />
        {:else if activeView === 'tasks'}
          <Tasks onCount={(n) => handleCountUpdate('tasks', n)} />
        {:else if activeView === 'teams'}
          <Teams onCount={(n) => handleCountUpdate('teams', n)} />
        {:else if activeView === 'todos'}
          <Todos onCount={(n) => handleCountUpdate('todos', n)} />
        {:else if activeView === 'profiles'}
          <Profiles onCount={(n) => handleCountUpdate('profiles', n)} onProfileSwitch={handleProfileSwitch} onProfilesChange={() => profileListVersion++} />
        {:else if activeView === 'mcp'}
          <McpServers onCount={(n) => handleCountUpdate('mcp', n)} />
        {:else if activeView === 'backup'}
          <Backup initialSection={backupSection} />
        {/if}
      </div>
    {/key}
  </main>

  <Toast />
  <UpdaterModal />

  <CommandPalette
    open={showPalette}
    onClose={() => showPalette = false}
    onSelect={handlePaletteSelect}
  />

  <SuggestionPanel bind:open={showSuggestPanel} />

  {#if showOnboarding}
    <Onboarding onComplete={handleOnboardingComplete} />
  {/if}

  <!-- About Modal -->
  {#if showAbout}
    <div class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" onclick={() => showAbout = false}></div>
      <div role="dialog" aria-modal="true" class="relative z-10 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg shadow-2xl shadow-black/10 p-8 w-[380px] text-center animate-scale-in"
        onkeydown={(e) => { if (e.key === 'Escape') showAbout = false; }}>
        <img src="/app-icon.png" alt="Skill Forge" class="w-16 h-16 mx-auto mb-4" />
        <h2 class="text-[16px] font-semibold text-[var(--text-primary)]">Skill Forge</h2>
        <p class="text-[12px] text-[var(--text-ghost)] mt-1">v{appVersion || '...'}</p>
        <p class="text-[12px] text-[var(--text-muted)] mt-3">{t('about.description')}</p>
        <div class="flex gap-3 justify-center mt-3">
          <button onclick={() => openUrl('https://github.com/HayriCan/SkillForge')} class="text-[12px] text-[var(--accent)] hover:underline">{t('about.homepage')}</button>
          <button onclick={() => openUrl('https://github.com/HayriCan/SkillForge')} class="text-[12px] text-[var(--accent)] hover:underline">{t('about.source')}</button>
        </div>
        <div class="mt-5">
          <button onclick={() => showAbout = false} class="px-5 py-1.5 rounded text-[13px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">{t('about.close')}</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Preferences Modal -->
  {#if showPreferences}
    <div class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" onclick={() => { showLangDropdown = false; showPreferences = false; }}></div>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div role="dialog" aria-modal="true" class="relative z-10 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg shadow-2xl shadow-black/10 w-[480px] animate-scale-in"
        onclick={() => showLangDropdown = false}
        onkeydown={(e) => { if (e.key === 'Escape') showPreferences = false; }}>
        <!-- Header -->
        <div class="flex items-center gap-2 px-5 pt-5 pb-3">
          <svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg>
          <h2 class="text-[15px] font-semibold text-[var(--text-primary)]">{t('pref.title')}</h2>
        </div>

        <div class="px-5 pb-5 space-y-5">
          <!-- Theme -->
          <div class="flex items-center justify-between">
            <label class="text-[13px] text-[var(--text-secondary)]" for="pref-theme">{t('pref.theme')}</label>
            <div class="flex gap-1">
              {#each (['auto', 'light', 'dark'] as const) as option}
                <button
                  onclick={() => setTheme(option)}
                  class="px-3 py-1 rounded text-[12px] font-medium capitalize transition-all duration-150
                         {getTheme() === option
                           ? 'bg-[var(--accent)] text-white'
                           : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'}"
                >
                  {t('theme.' + option)}
                </button>
              {/each}
            </div>
          </div>

          <!-- Language -->
          <div class="flex items-center justify-between">
            <label class="text-[13px] text-[var(--text-secondary)]">{t('pref.language')}</label>
            <div class="relative">
              <button
                onclick={(e) => { e.stopPropagation(); showLangDropdown = !showLangDropdown; }}
                class="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded px-3 py-1 text-[12px] text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors min-w-[120px] text-left"
              >
                <span class="flex-1">{LANGUAGES.find(l => l.code === getLocale())?.label ?? 'English'}</span>
                <svg class="w-3 h-3 text-[var(--text-ghost)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              {#if showLangDropdown}
                <div class="absolute right-0 top-8 z-10 w-[160px] rounded-md border border-[var(--border-default)] bg-[var(--surface-0)] shadow-lg shadow-black/10 py-1 animate-scale-in">
                  {#each LANGUAGES as lang}
                    <button
                      onclick={() => { setLocale(lang.code); showLangDropdown = false; }}
                      class="w-full text-left px-3 py-1.5 text-[12px] transition-colors duration-100
                             {getLocale() === lang.code
                               ? 'bg-[var(--accent)] text-white'
                               : 'text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white'}"
                    >{lang.label}</button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- CLI Directories -->
          <div>
            <label class="text-[13px] text-[var(--text-secondary)] block mb-2">CLI Directories</label>
            <div class="flex flex-col gap-3">
              {#each prefInstalledClis as cli}
                {@const defaultDir = `${prefHomePath}/${cli.configDirName}`}
                {@const isCustom = prefCliDirs[cli.id] !== defaultDir}
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="w-2 h-2 rounded-full shrink-0
                      {cli.id === 'claude' ? 'bg-orange-400' : cli.id === 'codex' ? 'bg-green-400' : 'bg-blue-400'}"></span>
                    <span class="text-[12px] font-medium text-[var(--text-secondary)]">{cli.label}</span>
                    {#if prefActiveAdapter?.id === cli.id}
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)] font-semibold">active</span>
                    {/if}
                    {#if isCustom}
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] font-semibold">custom</span>
                    {/if}
                  </div>
                  <input
                    bind:value={prefCliDirs[cli.id]}
                    placeholder={defaultDir}
                    class="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[11px] text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <p class="text-[9px] text-[var(--text-ghost)] mt-0.5">Default: {defaultDir}</p>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-5 py-3 border-t border-[var(--border-subtle)]">
          <button onclick={() => { showLangDropdown = false; showPreferences = false; }} class="px-4 py-1.5 rounded text-[13px] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors">{t('pref.cancel')}</button>
          <button onclick={() => { showLangDropdown = false; savePreferences(); }} class="px-4 py-1.5 rounded text-[13px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors">{t('pref.ok')}</button>
        </div>
      </div>
    </div>
  {/if}
</div>
