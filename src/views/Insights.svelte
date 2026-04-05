<script lang="ts">
  import { onMount } from 'svelte';
  import { buildInsightsData, loadSnapshot, saveSnapshot, countHistoryLines, isSnapshotStale, type InsightsData } from '../lib/insights';
  import { formatTokens } from '../lib/tokenEstimator';
  import { claudeDir } from '../lib/fs';
  import { invoke } from '@tauri-apps/api/core';
  import { addToast } from '../lib/toast.svelte';
  import { t } from '../lib/i18n.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  let data = $state<InsightsData | null>(null);
  let loading = $state(false);
  let loadingStep = $state<'idle' | 'generating' | 'parsing' | 'done'>('idle');
  let error = $state<string | null>(null);
  let sortBy = $state<'usage' | 'name' | 'plugin'>('usage');
  let filterUnused = $state(false);

  /** Sorted + filtered skill list */
  function filteredSkills() {
    if (!data) return [];
    let list = [...data.skills];
    if (filterUnused) list = list.filter((s) => s.invokeCount === 0);
    if (sortBy === 'usage') list.sort((a, b) => b.invokeCount - a.invokeCount);
    else if (sortBy === 'name') list.sort((a, b) => a.skillName.localeCompare(b.skillName));
    else if (sortBy === 'plugin') list.sort((a, b) => a.pluginName.localeCompare(b.pluginName) || a.skillName.localeCompare(b.skillName));
    return list;
  }

  /** Used skill count */
  function usedCount(): number {
    if (!data) return 0;
    return data.skills.filter((s) => s.invokeCount > 0).length;
  }

  async function scan() {
    loading = true;
    error = null;
    loadingStep = 'idle';

    try {
      const dir = await claudeDir();
      const snapshot = await loadSnapshot(dir);
      const historyLines = await countHistoryLines(dir);

      // Check staleness
      const needsRefresh = !snapshot || isSnapshotStale(snapshot, snapshot?.pluginCount ?? 0, snapshot?.skillCount ?? 0, historyLines);

      if (needsRefresh) {
        loadingStep = 'generating';
        try {
          await invoke('generate_insights');
        } catch (e) {
          console.warn('generate_insights command failed, continuing with local parse:', e);
        }
      }

      loadingStep = 'parsing';
      data = await buildInsightsData(dir);
      await saveSnapshot(dir, data, {});
      loadingStep = 'done';
      onCount(data.skills.length);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      addToast(error, 'error');
    } finally {
      loading = false;
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return '-'; }
  }

  function usageColor(count: number): string {
    if (count === 0) return 'var(--danger)';
    if (count < 3) return 'var(--warning)';
    return 'var(--success)';
  }

  onMount(scan);
</script>

<div class="h-full min-h-0 flex flex-col max-w-3xl mx-auto w-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">{t('nav.insights')}</h2>
    <button
      onclick={scan}
      disabled={loading}
      class="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
             {loading
               ? 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-not-allowed'
               : 'bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]'}"
    >
      {loading ? t('insights.scanning') : t('insights.scan')}
    </button>
  </div>

  <!-- Loading states -->
  {#if loadingStep === 'generating'}
    <div class="mb-4 px-4 py-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 text-[12px] text-[var(--warning)]">
      {t('insights.generating')}
    </div>
  {:else if loadingStep === 'parsing'}
    <div class="mb-4 px-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[12px] text-[var(--text-muted)]">
      {t('insights.parsing')}
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="mb-4 px-4 py-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[12px] text-[var(--danger)]">
      {error}
    </div>
  {/if}

  <div class="flex-1 overflow-y-auto">
    {#if !data && !loading}
      <EmptyState
        icon="config"
        title={t('insights.empty_title')}
        description={t('insights.empty_desc')}
        actionLabel={t('insights.scan')}
        onAction={scan}
      />
    {:else if data}
      <!-- Summary cards -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <div class="text-[10px] uppercase tracking-[0.15em] text-[var(--text-ghost)] mb-1">{t('insights.plugins')}</div>
          <div class="text-lg font-bold text-[var(--text-primary)]">{data.plugins.length}</div>
        </div>
        <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <div class="text-[10px] uppercase tracking-[0.15em] text-[var(--text-ghost)] mb-1">{t('insights.skills')}</div>
          <div class="text-lg font-bold text-[var(--text-primary)]">{data.skills.length}</div>
        </div>
        <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <div class="text-[10px] uppercase tracking-[0.15em] text-[var(--text-ghost)] mb-1">{t('insights.used')}</div>
          <div class="text-lg font-bold text-[var(--success)]">{usedCount()}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-5">
        <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <div class="text-[10px] uppercase tracking-[0.15em] text-[var(--text-ghost)] mb-1">{t('insights.wasted')}</div>
          <div class="text-lg font-bold text-[var(--danger)]">{formatTokens(data.unusedTokenEstimate)}</div>
        </div>
        <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <div class="text-[10px] uppercase tracking-[0.15em] text-[var(--text-ghost)] mb-1">{t('insights.sessions')}</div>
          <div class="text-lg font-bold text-[var(--text-primary)]">{data.totalSessions}</div>
        </div>
      </div>

      <!-- Plugin breakdown -->
      {#if data.plugins.length > 0}
        <div class="mb-5">
          <div class="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-ghost)] px-4 py-2">{t('insights.plugin_breakdown')}</div>
          {#each data.plugins as plugin}
            <div class="px-4 py-2.5 border-b border-[var(--border-subtle)]">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[12px] font-medium text-[var(--text-primary)]">{plugin.pluginName}</span>
                <span class="text-[10px] font-mono text-[var(--text-ghost)]">{plugin.usagePercent}% used</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  style="width: {plugin.usagePercent}%; background: var(--accent)"
                ></div>
              </div>
              <div class="text-[10px] text-[var(--text-ghost)] mt-1">{plugin.usedSkills} / {plugin.totalSkills} skills</div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Skill table -->
      <div>
        <div class="flex items-center justify-between px-4 py-2">
          <div class="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-ghost)]">{t('insights.skill_table')}</div>
          <div class="flex items-center gap-2">
            <!-- Sort buttons -->
            {#each ['usage', 'name', 'plugin'] as mode}
              <button
                onclick={() => sortBy = mode as 'usage' | 'name' | 'plugin'}
                class="px-2 py-1 rounded text-[10px] font-mono transition-all duration-150
                       {sortBy === mode
                         ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                         : 'text-[var(--text-ghost)] hover:text-[var(--text-muted)]'}"
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            {/each}
            <!-- Unused toggle -->
            <button
              onclick={() => filterUnused = !filterUnused}
              class="px-2 py-1 rounded text-[10px] font-mono transition-all duration-150
                     {filterUnused
                       ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                       : 'text-[var(--text-ghost)] hover:text-[var(--text-muted)]'}"
            >
              Unused only
            </button>
          </div>
        </div>

        <div class="stagger-list">
          {#each filteredSkills() as skill}
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] transition-all duration-200 hover:bg-[var(--surface-2)] {skill.invokeCount === 0 ? 'opacity-50' : ''}">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-[9px] font-mono bg-[var(--surface-3)] text-[var(--text-ghost)] px-1.5 py-0.5 rounded shrink-0">{skill.pluginName}</span>
                <span class="text-[12px] text-[var(--text-primary)] truncate">{skill.skillName}</span>
              </div>
              <div class="flex items-center gap-3 shrink-0 ml-3">
                <span
                  class="text-[11px] font-bold font-mono"
                  style="color: {usageColor(skill.invokeCount)}"
                >
                  {skill.invokeCount}
                </span>
                <span class="text-[10px] text-[var(--text-ghost)] w-16 text-right">{formatDate(skill.lastUsed)}</span>
              </div>
            </div>
          {/each}
        </div>

        {#if filteredSkills().length === 0 && data.skills.length > 0}
          <div class="text-center text-[var(--text-ghost)] text-[12px] py-6">No matching skills</div>
        {/if}
      </div>
    {/if}
  </div>
</div>
