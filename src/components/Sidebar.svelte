<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { exists } from '@tauri-apps/plugin-fs';
  import { getActiveProfile, listProfiles, loadProfile, switchToDefault, createFromTemplate, type Profile } from '../lib/profiles';
  import { estimateCurrentTokens, formatTokens } from '../lib/tokenEstimator';
  import { getTheme, setTheme, type Theme } from '../lib/theme.svelte';
  import { addToast } from '../lib/toast.svelte';
  import { t } from '../lib/i18n.svelte';
  import { getActiveAdapter, CLI_ADAPTERS, detectInstalledClis } from '../lib/adapters/index';
  import { claudeDir, listDirFull } from '../lib/fs';
  import { loadAppConfig, saveAppConfig } from '../lib/app-config';
  import { emojiUrl } from '../lib/emoji';
  import type { CliAdapter, CliId } from '../lib/adapters/types';
  import EmojiPicker from './EmojiPicker.svelte';

  /** Default emoji icons per dir/view id */
  const DEFAULT_ICONS: Record<string, string> = {
    agents:       '🤖',
    commands:     '⚡',
    hooks:        '🔗',
    plans:        '📋',
    plugins:      '🧩',
    skills:       '✨',
    tasks:        '✅',
    teams:        '👥',
    todos:        '📌',
    mcp:          '🔌',
    sessions:     '🕐',
    settings:     '⚙️',
    rules:        '📏',
    'usage-data': '📊',
  };

  /** All predefined dir IDs that have dedicated views */
  const ALL_RESOURCE_DIR_IDS = ['agents','commands','hooks','plans','plugins','skills','tasks','teams','todos'];
  /** Nav items that don't map to a disk directory — always shown when adapter supports them */
  const VIRTUAL_NAV_IDS = new Set<string>();
  /** Dirs that are internal/runtime — never shown in Resources */
  const INTERNAL_DIRS = new Set(['profiles', 'sessions', 'cache', 'log', 'temp', 'tmp', '.git', 'node_modules', 'shell_snapshots']);

  /** Convert dir name to display label: usage-data → Usage Data, session_env → Session Env */
  function prettifyDirName(name: string): string {
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  let appVersion = $state('');
  let activeCliAdapter = $state<CliAdapter | null>(null);
  let installedClis = $state<CliAdapter[]>(CLI_ADAPTERS);
  let cliPickerOpen = $state(false);
  /** Predefined dirs that physically exist. null = not loaded yet. */
  let existingDirs = $state<Set<string> | null>(null);
  /** All subdirs discovered in the CLI config dir (predefined + custom). null = not loaded yet. */
  let discoveredDirs = $state<string[] | null>(null);
  /** User's explicit visibility config for the active CLI. null = use auto-detection. */
  let userResourceDirs = $state<string[] | null>(null);
  /** Draft state for the resource configure panel */
  let resourceConfigOpen = $state(false);
  let resourceConfigDraft = $state<string[]>([]);
  /** Custom emoji icons for nav items: id → emoji. Loaded from AppConfig per CLI. */
  let customIcons = $state<Record<string, string>>({});
  /** Which nav item's emoji picker is currently open */
  let pickerOpenFor = $state<string | null>(null);

  getVersion().then(v => appVersion = v);
  getActiveAdapter().then(a => {
    activeCliAdapter = a;
    activeProfile = getActiveProfile(a.id);
    loadDirConfig(a.id);
  });
  detectInstalledClis().then(clis => { installedClis = clis; });

  async function loadDirConfig(cliId: string): Promise<void> {
    // Load user resource dir preferences from app config
    const config = await loadAppConfig();
    userResourceDirs = config.resourceDirs?.[cliId] ?? null;
    customIcons = config.resourceIcons?.[cliId] ?? {};

    // Check which predefined dirs exist + discover all subdirs
    const base = await claudeDir();
    const predefinedCheck = new Set<string>();
    await Promise.all(ALL_RESOURCE_DIR_IDS.map(async (dir) => {
      if (await exists(`${base}/${dir}`)) predefinedCheck.add(dir);
    }));
    existingDirs = predefinedCheck;

    // Discover all subdirs (for custom dir display in configure panel)
    try {
      const entries = await listDirFull(base);
      discoveredDirs = entries
        .filter(e => e.isDir && e.name && !INTERNAL_DIRS.has(e.name))
        .map(e => e.name);
    } catch {
      discoveredDirs = [];
    }
  }

  async function switchCliFromSidebar(id: CliId): Promise<void> {
    const { setActiveAdapter } = await import('../lib/adapters/index');
    activeCliAdapter = await setActiveAdapter(id);
    cliPickerOpen = false;
    // Restore the profile saved for the new CLI (per-CLI persistence)
    activeProfile = getActiveProfile(id);
    existingDirs = null;
    discoveredDirs = null;
    userResourceDirs = null;
    customIcons = {};
    loadDirConfig(id);
    window.dispatchEvent(new CustomEvent('cli-changed', { detail: { id } }));
  }

  type GearAction = 'about' | 'check-updates' | 'feedback' | 'homepage' | 'preferences' | 'toggle-devtools' | 'export' | 'import';

  const { active, onSelect, counts, onProfileSwitch, profileListVersion, onAction } = $props<{
    active: string;
    onSelect: (view: string) => void;
    counts: Record<string, number>;
    onProfileSwitch?: () => void;
    profileListVersion?: number;
    onAction?: (action: GearAction) => void;
  }>();

  import { onMount } from 'svelte';

  let profiles = $state<Profile[]>([]);
  let activeProfile = $state<string | null>(null);
  let profilesOpen = $state(false);
  let gearOpen = $state(false);
  let switching = $state(false);
  let switchingTo = $state<string | null>(null);
  let currentTokens = $state<number | null>(null);
  let minimalModeLoading = $state(false);
  let gearBtnEl = $state<HTMLButtonElement | null>(null);
  let menuPos = $state({ left: 0, bottom: 0 });
  let menuPortal = $state<HTMLDivElement | null>(null);
  let pickerPortal = $state<HTMLDivElement | null>(null);
  let pickerPos = $state({ left: 0, top: 0 });

  function openGearMenu() {
    if (gearBtnEl) {
      const rect = gearBtnEl.getBoundingClientRect();
      menuPos = { left: rect.left, bottom: window.innerHeight - rect.top + 4 };
    }
    gearOpen = !gearOpen;
  }

  onMount(() => {
    if (menuPortal) document.body.appendChild(menuPortal);
    if (pickerPortal) document.body.appendChild(pickerPortal);

    // Ensure token estimate runs on mount regardless of $effect timing
    refreshProfiles();

    const onCliChange = async (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      activeCliAdapter = await getActiveAdapter();
      activeProfile = getActiveProfile(id);
      await refreshProfiles();
    };
    window.addEventListener('cli-changed', onCliChange);

    return () => {
      if (menuPortal?.parentNode === document.body) document.body.removeChild(menuPortal);
      if (pickerPortal?.parentNode === document.body) document.body.removeChild(pickerPortal);
      window.removeEventListener('cli-changed', onCliChange);
    };
  });

  const themeLabel = $derived(
    getTheme() === 'light' ? 'Light' : getTheme() === 'dark' ? 'Dark' : 'Auto'
  );

  function cycleTheme(): void {
    const order: Theme[] = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(getTheme()) + 1) % order.length];
    setTheme(next);
  }

  async function refreshProfiles(): Promise<void> {
    try {
      profiles = await listProfiles();
    } catch { profiles = []; }
    if (activeCliAdapter) {
      activeProfile = getActiveProfile(activeCliAdapter.id);
    }
    try {
      const est = await estimateCurrentTokens();
      currentTokens = est.total;
    } catch { /* token estimate unavailable */ }
  }

  async function activateMinimalMode(): Promise<void> {
    minimalModeLoading = true;
    profilesOpen = false;
    try {
      const existing = profiles.find((p) => p.name === '__minimal_auto__');
      if (!existing) {
        await createFromTemplate('__minimal_auto__', 'Auto-generated minimal profile', 'minimal');
      }
      await loadProfile('__minimal_auto__');
      activeProfile = '__minimal_auto__';
      addToast('Minimal Mode activated', 'success');
      onProfileSwitch?.();
      await refreshProfiles();
    } catch (e) {
      addToast(`Failed to activate Minimal Mode: ${e}`, 'error');
    } finally {
      minimalModeLoading = false;
    }
  }

  async function switchProfileToDefault(): Promise<void> {
    switching = true;
    switchingTo = 'Default';
    profilesOpen = false;
    const start = Date.now();
    try {
      await switchToDefault();
      activeProfile = null;
      addToast('Switched to Default', 'success');
      onProfileSwitch?.();
    } catch (e) {
      addToast(`Failed to switch: ${e}`, 'error');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      switching = false;
      switchingTo = null;
    }
  }

  async function switchProfile(name: string): Promise<void> {
    switching = true;
    switchingTo = name;
    profilesOpen = false;
    const start = Date.now();
    try {
      await loadProfile(name);
      activeProfile = name;
      addToast(`Switched to "${name}"`, 'success');
      onProfileSwitch?.();
    } catch (e) {
      addToast(`Failed to switch: ${e}`, 'error');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
      switching = false;
      switchingTo = null;
    }
  }

  $effect(() => {
    profileListVersion;
    refreshProfiles();
  });

  const supported = $derived(activeCliAdapter?.supportedViews ?? null);

  function isResourceVisible(id: string): boolean {
    // supportedViews controls CLI-level availability
    if (supported !== null && !supported.includes(id)) return false;
    // User has explicit config → use it
    if (userResourceDirs !== null) return userResourceDirs.includes(id);
    // Auto-detect: hide if dir does not exist (once loaded)
    if (existingDirs !== null) return existingDirs.has(id);
    return true; // dirs not loaded yet — show all to avoid flash of empty
  }

  function isViewVisible(id: string): boolean {
    if (id === 'profiles' || id === 'settings') return true;
    return supported === null || supported.includes(id);
  }

  const mainItems = $derived.by(() => {
    // Explicit reads to ensure Svelte 5 tracks these dependencies
    const sup = supported;
    const uDirs = userResourceDirs;
    const eDirs = existingDirs;

    const all = [
      { id: 'agents',   label: t('nav.agents'),   icon: 'agents',   shortcut: '1' },
      { id: 'commands', label: t('nav.commands'),  icon: 'commands',  shortcut: '2' },
      { id: 'hooks',    label: t('nav.hooks'),     icon: 'hooks',     shortcut: '3' },
      { id: 'plans',    label: t('nav.plans'),     icon: 'plans',     shortcut: '4' },
      { id: 'plugins',  label: t('nav.plugins'),   icon: 'plugins',   shortcut: '5' },
      { id: 'skills',   label: t('nav.skills'),    icon: 'skills',    shortcut: '6' },
      { id: 'tasks',    label: t('nav.tasks'),     icon: 'tasks',     shortcut: '7' },
      { id: 'teams',    label: t('nav.teams'),     icon: 'teams',     shortcut: '8' },
      { id: 'todos',    label: t('nav.todos'),     icon: 'todos',     shortcut: '9' },
    ];

    return all.filter(item => {
      if (sup !== null && !sup.includes(item.id)) return false;
      if (VIRTUAL_NAV_IDS.has(item.id)) return true; // always show virtual views
      if (uDirs !== null) return uDirs.includes(item.id);
      if (eDirs !== null) return eDirs.has(item.id);
      return true;
    });
  });

  const systemItems = $derived([
    { id: 'mcp',      label: t('nav.mcp'),       icon: 'mcp' },
    { id: 'sessions', label: t('nav.sessions'),  icon: 'sessions' },
    { id: 'settings', label: t('nav.settings'),  icon: 'settings' },
  ].filter(item => isViewVisible(item.id)));

  /** Predefined dir IDs supported by the current CLI */
  const configurablePredefinedIds = $derived(
    ALL_RESOURCE_DIR_IDS.filter(id => supported === null || supported.includes(id))
  );

  /** Custom dirs: in userResourceDirs but NOT in predefined list → shown in sidebar nav */
  const customDirItems = $derived.by(() => {
    const uDirs = userResourceDirs;
    return (uDirs ?? []).filter(id => !ALL_RESOURCE_DIR_IDS.includes(id));
  });

  /**
   * Custom dirs shown in configure panel's Custom section.
   * Union of: filesystem-discovered dirs + already-saved user custom dirs + current draft custom items.
   * Reactive via $derived so it updates when draft changes.
   */
  const panelCustomDirs = $derived(
    [...new Set([
      ...(discoveredDirs ?? []).filter(d => !ALL_RESOURCE_DIR_IDS.includes(d)),
      ...(userResourceDirs ?? []).filter(d => !ALL_RESOURCE_DIR_IDS.includes(d)),
      ...resourceConfigDraft.filter(d => !ALL_RESOURCE_DIR_IDS.includes(d)),
    ])]
  );

  function openResourceConfig(): void {
    // Sync draft from persisted state
    resourceConfigDraft = userResourceDirs
      ? [...userResourceDirs]
      : [...(existingDirs ?? new Set())].filter(id => configurablePredefinedIds.includes(id));
    resourceConfigOpen = true;
  }

  /** Persist a custom emoji icon for a nav item */
  async function saveIcon(itemId: string, emoji: string): Promise<void> {
    try {
      const cliId = activeCliAdapter?.id ?? 'claude';
      const config = await loadAppConfig();
      const existing = config.resourceIcons?.[cliId] ?? {};
      const updated = { ...existing, [itemId]: emoji };
      config.resourceIcons = { ...config.resourceIcons, [cliId]: updated };
      await saveAppConfig(config);
      customIcons = updated;
    } catch (e) {
      console.error('[Sidebar] saveIcon failed:', e);
    }
    pickerOpenFor = null;
  }

  /** Persist current draft to disk and update sidebar immediately */
  async function persistResourceDirs(dirs: string[]): Promise<void> {
    try {
      const cliId = activeCliAdapter?.id ?? 'claude';
      const plain = [...dirs];
      const config = await loadAppConfig();
      config.resourceDirs = { ...config.resourceDirs, [cliId]: plain };
      await saveAppConfig(config);
      userResourceDirs = plain;
    } catch (e) {
      console.error('[Sidebar] persistResourceDirs failed:', e);
      addToast(`Failed to save: ${e}`, 'error');
    }
  }

  async function resetResourceConfig(): Promise<void> {
    try {
      const cliId = activeCliAdapter?.id ?? 'claude';
      const config = await loadAppConfig();
      if (config.resourceDirs) {
        delete config.resourceDirs[cliId];
        if (Object.keys(config.resourceDirs).length === 0) delete config.resourceDirs;
      }
      await saveAppConfig(config);
      userResourceDirs = null;
      // Re-sync draft to auto-detect state
      resourceConfigDraft = [...(existingDirs ?? new Set())].filter(id => configurablePredefinedIds.includes(id));
    } catch (e) {
      console.error('[Sidebar] resetResourceConfig failed:', e);
      addToast(`Failed to reset: ${e}`, 'error');
    }
  }

  function toggleDraftDir(id: string): void {
    if (resourceConfigDraft.includes(id)) {
      resourceConfigDraft = resourceConfigDraft.filter(d => d !== id);
    } else {
      resourceConfigDraft = [...resourceConfigDraft, id];
    }
    persistResourceDirs(resourceConfigDraft);
  }

  function handleAction(action: GearAction): void {
    gearOpen = false;
    onAction?.(action);
  }

  function handleGearNav(view: string): void {
    gearOpen = false;
    onSelect(view);
  }
</script>


<aside role="navigation" aria-label="Main navigation" class="w-52 shrink-0 h-screen bg-[var(--surface-2)] border-r border-[var(--border-default)] flex flex-col relative z-50">

  <!-- Brand header -->
  <div class="px-4 pt-4 pb-2 flex items-center gap-2.5">
    <img src="/app-icon.png" alt="Skill Forge" class="w-5 h-5 shrink-0" />
    <span class="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight">Skill Forge</span>
  </div>

  <!-- Profile Switcher -->
  <div class="px-2.5 pb-2">
    <button
      onclick={() => { if (!switching) profilesOpen = !profilesOpen; }}
      disabled={switching}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all duration-150 text-left
             {switching
               ? 'bg-[var(--surface-0)] border-[var(--accent-dim)]/40'
               : profilesOpen
               ? 'bg-[var(--surface-0)] border-[var(--border-accent)] shadow-sm'
               : 'bg-[var(--surface-0)]/60 border-[var(--border-subtle)] hover:bg-[var(--surface-0)] hover:border-[var(--border-default)]'}"
    >
      {#if switching}
        <div class="w-3 h-3 rounded-full border border-transparent border-t-[var(--accent)] animate-spin shrink-0"></div>
      {:else}
        <span class="w-1.5 h-1.5 rounded-full shrink-0 {activeProfile ? 'bg-[var(--success)]' : 'bg-[var(--text-ghost)]'}"></span>
      {/if}
      <span class="flex-1 text-[12px] font-medium truncate {switching ? 'text-[var(--accent-dim)]' : 'text-[var(--text-secondary)]'}">
        {switching ? (switchingTo ?? 'Switching...') : (activeProfile ?? t('default'))}
      </span>
      {#if !switching && currentTokens !== null}
        <span class="text-[9px] font-mono text-[var(--text-ghost)] shrink-0">~{formatTokens(currentTokens)}</span>
      {/if}
      {#if !switching}
        <svg class="w-3 h-3 text-[var(--text-ghost)] transition-transform duration-150 {profilesOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      {/if}
    </button>

    {#if profilesOpen}
      <div class="mt-1 rounded border border-[var(--border-default)] bg-[var(--surface-0)] overflow-hidden animate-fade-in shadow-lg shadow-black/5">
        <!-- Default entry -->
        <button
          onclick={switchProfileToDefault}
          disabled={switching}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 text-left border-b border-[var(--border-subtle)] transition-colors duration-100
                 {activeProfile === null ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}
                 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span class="w-1.5 h-1.5 rounded-full shrink-0 {activeProfile === null ? 'bg-[var(--success)]' : 'bg-[var(--text-ghost)]'}"></span>
          <span class="flex-1 text-[12px] truncate">{t('default')}</span>
          {#if activeProfile === null}
            <span class="text-[9px] font-medium text-[var(--success)]">{t('active')}</span>
          {/if}
        </button>

        {#if profiles.length === 0}
          <div class="px-3 py-2 text-[11px] text-[var(--text-ghost)] text-center">{t('no_profiles')}</div>
        {:else}
          {#each profiles as profile}
            <button
              onclick={() => switchProfile(profile.name)}
              disabled={switching}
              class="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors duration-100
                     {activeProfile === profile.name
                       ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                       : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
            >
              <span class="w-1.5 h-1.5 rounded-full shrink-0 {activeProfile === profile.name ? 'bg-[var(--success)]' : 'bg-[var(--text-ghost)]'}"></span>
              <span class="flex-1 text-[12px] truncate">{profile.name}</span>
              {#if activeProfile === profile.name}
                <span class="text-[9px] font-medium text-[var(--success)]">{t('active')}</span>
              {/if}
            </button>
          {/each}
        {/if}
        <div class="border-t border-[var(--border-subtle)]">
          <div class="flex items-center">
            <button
              onclick={() => { profilesOpen = false; onSelect('profiles'); }}
              class="flex-1 px-2.5 py-1.5 text-[11px] text-[var(--text-ghost)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors duration-100 text-left"
            >
              {t('manage_profiles')}
            </button>
            <button
              onclick={activateMinimalMode}
              disabled={minimalModeLoading}
              title="Activate Minimal Mode — switches to lowest token profile"
              class="px-2 py-1.5 text-[10px] font-medium text-[var(--warning,#f59e0b)] hover:bg-[var(--surface-2)] transition-colors duration-100 disabled:opacity-50 shrink-0"
            >
              {minimalModeLoading ? '...' : '⚡'}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Section label + resource config popover anchor -->
  <div class="px-3 pb-1 pt-2 flex items-center justify-between relative">
    <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.08em]">{t('nav.resources')}</span>
    <button
      onclick={openResourceConfig}
      title="Configure visible resources"
      class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors duration-100"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
      </svg>
    </button>

    {#if resourceConfigOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="fixed inset-0 z-[60]" onclick={() => resourceConfigOpen = false}></div>
      <div class="absolute top-full left-0 w-60 mt-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-0)] shadow-xl shadow-black/15 z-[61] animate-scale-in flex flex-col max-h-[50vh]">
        <!-- Header -->
        <div class="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <span class="text-[11px] font-semibold text-[var(--text-secondary)]">{t('res.visible')}</span>
          <button
            onclick={resetResourceConfig}
            title="Reset to auto-detect (show only existing dirs)"
            class="text-[10px] text-[var(--text-ghost)] hover:text-[var(--accent)] transition-colors duration-100"
          >{t('res.auto')}</button>
        </div>

        <!-- Scrollable checkbox list -->
        <div class="overflow-y-auto overscroll-contain min-h-0 py-1">
          {#if configurablePredefinedIds.length > 0}
            <div class="px-3 py-1">
              <span class="text-[9px] text-[var(--text-ghost)] uppercase tracking-wide font-medium">{t('res.builtin')}</span>
            </div>
          {/if}
          {#each configurablePredefinedIds as id}
            {@const dirExists = existingDirs?.has(id) ?? false}
            <label class="flex items-center gap-2.5 px-3 py-1 cursor-pointer hover:bg-[var(--surface-2)] transition-colors duration-100">
              <input
                type="checkbox"
                class="w-3.5 h-3.5 accent-[var(--accent)]"
                checked={resourceConfigDraft.includes(id)}
                onchange={() => toggleDraftDir(id)}
              />
              <span class="flex-1 text-[12px] text-[var(--text-secondary)] capitalize">{id}</span>
              {#if !dirExists}
                <span class="text-[9px] text-[var(--text-ghost)]" title="Directory does not exist yet">--</span>
              {/if}
            </label>
          {/each}

          <!-- Custom dirs (discovered + draft-added) -->
          {#if panelCustomDirs.length > 0}
            <div class="px-3 py-1 mt-1 border-t border-[var(--border-subtle)]">
              <span class="text-[9px] text-[var(--text-ghost)] uppercase tracking-wide font-medium">{t('res.custom')}</span>
            </div>
            {#each panelCustomDirs as id}
              <label class="flex items-center gap-2.5 px-3 py-1 cursor-pointer hover:bg-[var(--surface-2)] transition-colors duration-100">
                <input
                  type="checkbox"
                  class="w-3.5 h-3.5 accent-[var(--accent)]"
                  checked={resourceConfigDraft.includes(id)}
                  onchange={() => toggleDraftDir(id)}
                />
                <span class="flex-1 text-[12px] text-[var(--text-secondary)]">{prettifyDirName(id)}</span>
              </label>
            {/each}
          {/if}
        </div>

        <!-- All discovered dirs listed above — no manual add needed -->
      </div>
    {/if}
  </div>

  <nav class="flex flex-col gap-px px-2.5 flex-1 overflow-y-auto stagger-list">
    {#each mainItems as item}
      {@render navItem(item)}
    {/each}

    <!-- Custom dir items (user-defined folders) -->
    {#each customDirItems as dirName}
      {@const customEmoji = customIcons[dirName]}
      {@const isPickerOpen = pickerOpenFor === dirName}
      {@const isActive = active === `folder:${dirName}`}
      <div class="group relative flex items-center rounded transition-all duration-150
                  {isActive ? 'bg-[var(--accent)] shadow-sm' : 'hover:bg-[var(--surface-3)]'}">

        <!-- Icon button (toggles picker) -->
        <button
          onclick={(e) => {
            if (isPickerOpen) { pickerOpenFor = null; return; }
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            pickerPos = { left: rect.right + 4, top: rect.top };
            pickerOpenFor = dirName;
          }}
          aria-label="Change icon for {prettifyDirName(dirName)}"
          class="relative shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors
                 {isActive ? 'text-white hover:bg-white/20' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
        >
          <span class="group-hover:opacity-0 transition-opacity flex items-center justify-center w-full h-full">
            {#if customEmoji}
              <img src={emojiUrl(customEmoji)} alt={customEmoji} width="15" height="15" draggable="false" class="select-none" />
            {:else}
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/>
              </svg>
            {/if}
          </span>
          <span class="absolute inset-0 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity
                       {isActive ? 'text-white/80' : 'text-[var(--text-ghost)]'}">✎</span>
        </button>

        <!-- Nav button -->
        <button
          onclick={() => onSelect(`folder:${dirName}`)}
          aria-label={prettifyDirName(dirName)}
          class="flex-1 flex items-center gap-1 pr-2.5 py-[6px] text-left text-[13px] min-w-0
                 {isActive ? 'text-white font-medium' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}"
        >
          <span class="truncate text-[12px]">{prettifyDirName(dirName)}</span>
        </button>
      </div>
    {/each}

    <!-- Divider -->
    <div class="my-1.5 mx-2 h-px bg-[var(--border-subtle)]"></div>

    <!-- System label -->
    <div class="px-2 pb-1">
      <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-[0.08em]">{t('nav.system')}</span>
    </div>

    {#each systemItems as item}
      {@render navItem(item)}
    {/each}
  </nav>

  <!-- CLI Switcher (hidden when only one CLI is installed) -->
  {#if activeCliAdapter && installedClis.length > 1}
    <div class="px-2.5 py-2 border-t border-[var(--border-default)] relative">
      <button
        onclick={() => cliPickerOpen = !cliPickerOpen}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all duration-150 text-left
               {cliPickerOpen
                 ? 'bg-[var(--surface-0)] border-[var(--border-accent)]'
                 : 'bg-[var(--surface-0)]/60 border-[var(--border-subtle)] hover:bg-[var(--surface-0)] hover:border-[var(--border-default)]'}"
      >
        <span class="w-2 h-2 rounded-full shrink-0
          {activeCliAdapter.id === 'claude' ? 'bg-orange-400' : activeCliAdapter.id === 'codex' ? 'bg-green-400' : 'bg-blue-400'}"></span>
        <span class="flex-1 text-[12px] font-medium text-[var(--text-secondary)] truncate">{activeCliAdapter.label}</span>
        <span class="text-[10px] text-[var(--text-ghost)] font-mono shrink-0">{activeCliAdapter.configDirName}</span>
        <svg class="w-3 h-3 text-[var(--text-ghost)] transition-transform duration-150 shrink-0 {cliPickerOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {#if cliPickerOpen}
        <div class="absolute bottom-full left-2.5 right-2.5 mb-1 rounded border border-[var(--border-default)] bg-[var(--surface-0)] shadow-lg shadow-black/10 z-50 overflow-hidden animate-fade-in">
          {#each installedClis as adapter}
            <button
              onclick={() => switchCliFromSidebar(adapter.id)}
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100
                     {activeCliAdapter.id === adapter.id
                       ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                       : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
            >
              <span class="w-2 h-2 rounded-full shrink-0
                {adapter.id === 'claude' ? 'bg-orange-400' : adapter.id === 'codex' ? 'bg-green-400' : 'bg-blue-400'}"></span>
              <div class="flex-1 min-w-0">
                <div class="text-[12px] font-medium truncate">{adapter.label}</div>
                <div class="text-[10px] text-[var(--text-ghost)] font-mono truncate">{adapter.configDirName}</div>
              </div>
              {#if activeCliAdapter.id === adapter.id}
                <svg class="w-3.5 h-3.5 text-[var(--success)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else if activeCliAdapter}
    <!-- Single CLI: just show the badge without dropdown -->
    <div class="px-2.5 py-2 border-t border-[var(--border-default)]">
      <div class="flex items-center gap-2 px-2.5 py-1.5">
        <span class="w-2 h-2 rounded-full shrink-0
          {activeCliAdapter.id === 'claude' ? 'bg-orange-400' : activeCliAdapter.id === 'codex' ? 'bg-green-400' : 'bg-blue-400'}"></span>
        <span class="text-[12px] font-medium text-[var(--text-secondary)] truncate">{activeCliAdapter.label}</span>
        <span class="text-[10px] text-[var(--text-ghost)] font-mono shrink-0">{activeCliAdapter.configDirName}</span>
      </div>
    </div>
  {/if}

  <!-- Footer -->
  <div class="px-3 py-2.5 border-t border-[var(--border-default)] flex items-center justify-between">
    <span class="text-[10px] text-[var(--text-ghost)] font-mono">v{appVersion || '...'}</span>
    <div class="flex items-center gap-0.5">
      <button
        onclick={() => location.reload()}
        class="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-all duration-150"
        title="Reload"
        aria-label="Reload app"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5"/><path stroke-linecap="round" d="M20.49 9A9 9 0 0 0 5.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 0 1 3.51 15"/></svg>
      </button>
      <button
        onclick={cycleTheme}
        class="h-7 px-2 flex items-center gap-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-all duration-150"
        title="Theme: {getTheme()}"
        aria-label="Toggle theme"
      >
        <!-- Sun/Moon SVG icon -->
        {#if getTheme() === 'light'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        {:else if getTheme() === 'dark'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        {:else}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" opacity="0.3"/></svg>
        {/if}
        <span class="text-[10px]">{themeLabel}</span>
      </button>

      <div>
        <button
          bind:this={gearBtnEl}
          onclick={openGearMenu}
          class="w-7 h-7 flex items-center justify-center rounded transition-all duration-150
                 {gearOpen ? 'text-[var(--accent)] bg-[var(--accent-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]'}"
          title="More options"
          aria-label="More options"
          aria-expanded={gearOpen}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</aside>

<!-- Gear menu portal (rendered outside aside to avoid overflow clipping) -->
<div bind:this={menuPortal} class="contents">
  {#if gearOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={() => gearOpen = false}></div>
    <div class="fixed z-[9999] w-52 rounded-md border border-[var(--border-default)] bg-[var(--surface-0)] shadow-xl shadow-black/10 overflow-hidden animate-scale-in py-1"
      style="left: {menuPos.left}px; bottom: {menuPos.bottom}px;">
            <!-- Group 1: Info -->
            <button onclick={() => handleAction('about')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
              {t('menu.about')}
            </button>
            <button onclick={() => handleAction('check-updates')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
              {t('menu.check_updates')}
            </button>
            <button onclick={() => handleAction('feedback')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
              {t('menu.feedback')}
            </button>
            <button onclick={() => handleAction('homepage')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
              {t('menu.homepage')}
            </button>

            <div class="my-1 mx-2 h-px bg-[var(--border-subtle)]"></div>

            <!-- Group 2: Data -->
            <button onclick={() => handleGearNav('backup')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>
              {t('menu.backup')}
            </button>

            <div class="my-1 mx-2 h-px bg-[var(--border-subtle)]"></div>

            <!-- Group 3: App settings -->
            <button onclick={() => handleAction('preferences')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg>
              {t('menu.preferences')}
            </button>
            <button onclick={() => handleAction('toggle-devtools')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/></svg>
              {t('menu.devtools')}
            </button>

            <div class="my-1 mx-2 h-px bg-[var(--border-subtle)]"></div>

            <!-- Group 4: Profiles -->
            <button onclick={() => handleGearNav('profiles')} class="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-100">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg>
              {t('menu.profiles')}
            </button>
    </div>
  {/if}
</div>

<!-- Emoji picker portal (rendered outside aside to avoid overflow clipping) -->
<div bind:this={pickerPortal} class="contents">
  {#if pickerOpenFor !== null}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={() => { pickerOpenFor = null; }}></div>
    <div class="fixed z-[9999]" style="left: {pickerPos.left}px; top: {pickerPos.top}px;">
      <EmojiPicker
        onSelect={(e) => saveIcon(pickerOpenFor!, e)}
        onClose={() => { pickerOpenFor = null; }}
      />
    </div>
  {/if}
</div>

{#snippet navItem(item: { id: string; label: string; icon: string; shortcut?: string })}
  {@const customEmoji = customIcons[item.id]}
  {@const isPickerOpen = pickerOpenFor === item.id}
  {@const isActive = active === item.id}
  <div class="group relative flex items-center rounded transition-all duration-150
              {isActive ? 'bg-[var(--accent)] shadow-sm' : 'hover:bg-[var(--surface-3)]'}">

    <!-- Icon button (toggles picker) -->
    <button
      onclick={(e) => {
        if (isPickerOpen) { pickerOpenFor = null; return; }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pickerPos = { left: rect.right + 4, top: rect.top };
        pickerOpenFor = item.id;
      }}
      aria-label="Change icon for {item.label}"
      class="relative shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors
             {isActive ? 'text-white hover:bg-white/20' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
    >
      <!-- Show custom emoji if set, otherwise SVG -->
      <span class="group-hover:opacity-0 transition-opacity flex items-center justify-center w-full h-full">
        {#if customEmoji}
          <img src={emojiUrl(customEmoji)} alt={customEmoji} width="15" height="15" draggable="false" class="select-none" />
        {:else if item.icon === 'agents'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
        {:else if item.icon === 'commands'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"/></svg>
        {:else if item.icon === 'hooks'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
        {:else if item.icon === 'plans'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/></svg>
        {:else if item.icon === 'plugins'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58z"/></svg>
        {:else if item.icon === 'skills'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>
        {:else if item.icon === 'tasks'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg>
        {:else if item.icon === 'teams'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
        {:else if item.icon === 'todos'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        {:else if item.icon === 'mcp'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/></svg>
        {:else if item.icon === 'sessions'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        {:else if item.icon === 'settings'}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg>
        {:else}
          <!-- Custom/unknown dir: folder icon -->
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
        {/if}
      </span>
      <span class="absolute inset-0 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity
                   {isActive ? 'text-white/80' : 'text-[var(--text-ghost)]'}">✎</span>
    </button>

    <!-- Nav button (label + count) -->
    <button
      onclick={() => onSelect(item.id)}
      aria-label={item.label}
      class="flex-1 flex items-center gap-1 pr-2.5 py-[6px] text-left text-[13px] min-w-0
             {isActive ? 'text-white font-medium' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}"
    >
      <span class="flex-1 truncate">{item.label}</span>
      {#if counts[item.id] !== undefined && counts[item.id] > 0}
        <span class="text-[10px] font-mono tabular-nums shrink-0
                     {isActive ? 'text-white/70' : 'text-[var(--text-ghost)]'}">{counts[item.id]}</span>
      {/if}
    </button>

  </div>
{/snippet}
