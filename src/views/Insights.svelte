<script lang="ts">
  import { onMount } from 'svelte';
  import { buildInsightsData, loadSnapshot, saveSnapshot, isSnapshotRecent, type InsightsData } from '../lib/insights';
  import { generateSuggestions, createSuggestion, type Suggestion } from '../lib/suggestions';
  import { formatTokens } from '../lib/tokenEstimator';
  import { claudeDir } from '../lib/fs';
  import { addToast } from '../lib/toast.svelte';
  import { t } from '../lib/i18n.svelte';
  import { getActiveAdapter } from '../lib/adapters/index';
  import EmptyState from '../components/EmptyState.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  let data = $state<InsightsData | null>(null);
  let loading = $state(false);
  let loadingStep = $state<'idle' | 'parsing' | 'done'>('idle');
  let lastScannedAt = $state<string | null>(null);
  let error = $state<string | null>(null);
  let sortBy = $state<'usage' | 'name' | 'plugin'>('usage');
  let filterUnused = $state(false);

  // AI suggestions
  let suggestions = $state<Suggestion[]>([]);
  let suggestionsLoading = $state(false);
  let suggestStep = $state<'idle' | 'insights' | 'analyzing' | 'done'>('idle');
  let creatingName = $state<string | null>(null);

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

  function usedCount(): number {
    if (!data) return 0;
    return data.skills.filter((s) => s.invokeCount > 0).length;
  }

  async function scan(force = false) {
    loading = true;
    error = null;
    loadingStep = 'idle';
    try {
      const dir = await claudeDir();
      // Use cached data if snapshot is recent (< 30 min) and not forced
      if (!force) {
        const snapshot = await loadSnapshot(dir);
        if (snapshot && isSnapshotRecent(snapshot)) {
          lastScannedAt = snapshot.generatedAt;
          loadingStep = 'parsing';
          data = await buildInsightsData(dir);
          loadingStep = 'done';
          onCount(data.skills.length);
          return;
        }
      }
      loadingStep = 'parsing';
      data = await buildInsightsData(dir);
      await saveSnapshot(dir, data, {});
      lastScannedAt = data.generatedAt;
      loadingStep = 'done';
      onCount(data.skills.length);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      addToast(error, 'error');
    } finally {
      loading = false;
    }
  }

  /** Run /insights then ask Claude for skill/agent recommendations. Claude Code only. */
  async function suggest() {
    const adapter = await getActiveAdapter();
    if (adapter.id !== 'claude') {
      addToast('AI Suggestions are only available for Claude Code', 'info');
      return;
    }
    suggestionsLoading = true;
    suggestStep = 'insights';
    suggestions = [];
    try {
      // Ensure we have insights data (reads from disk, never blocks)
      let insightsData = data;
      if (!insightsData) {
        const dir = await claudeDir();
        insightsData = await buildInsightsData(dir);
        data = insightsData;
        lastScannedAt = insightsData.generatedAt;
        onCount(insightsData.skills.length);
      }
      // Ask Claude for recommendations
      suggestStep = 'analyzing';
      const dir2 = await claudeDir();
      suggestions = await generateSuggestions(adapter.id, insightsData, dir2);
      suggestStep = 'done';
    } catch (e) {
      addToast(`${e}`, 'error');
      suggestStep = 'idle';
    } finally {
      suggestionsLoading = false;
    }
  }

  async function quickCreate(s: Suggestion) {
    if (creatingName) return;
    creatingName = s.name;
    try {
      const dir = await claudeDir();
      await createSuggestion(s, dir);
      addToast(`"${s.name}" oluşturuldu`, 'success');
      suggestions = suggestions.filter((x) => x.name !== s.name);
    } catch (e) {
      addToast(`Oluşturma hatası: ${e}`, 'error');
    } finally {
      creatingName = null;
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return '-'; }
  }

  function timeAgo(iso: string): string {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMin = Math.floor(diffMs / 60_000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `${diffH}h ago`;
      return formatDate(iso);
    } catch { return '-'; }
  }

  function usageColor(count: number): string {
    if (count === 0) return 'var(--danger)';
    if (count < 3) return 'var(--warning)';
    return 'var(--success)';
  }

  // Auto-scan on mount — safe because we only read from disk (no external CLI)
  onMount(() => scan());
</script>

<div class="h-full min-h-0 flex flex-col max-w-3xl mx-auto w-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex flex-col gap-0.5">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold">{t('nav.insights')}</h2>
      {#if lastScannedAt}
        <span class="text-[10px] text-[var(--text-ghost)]">{timeAgo(lastScannedAt)}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <!-- Skill Öner button -->
      <button
        onclick={suggest}
        disabled={suggestionsLoading || loading}
        class="h-7 px-3 rounded-lg text-[11px] font-medium transition-all duration-150 flex items-center gap-1.5
               {suggestionsLoading
                 ? 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-not-allowed'
                 : 'bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'}"
      >
        {#if suggestionsLoading}
          <span class="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block shrink-0"></span>
          {suggestStep === 'insights' ? '/insights çalışıyor…' : 'Analiz ediliyor…'}
        {:else}
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 1l1.2 2.8L12 5l-2.8 1.2L8 9 6.8 6.2 4 5l2.8-1.2z"/>
            <path d="M13 9l.7 1.6L15 11l-1.3.4L13 13l-.7-1.6L11 11l1.3-.4z"/>
          </svg>
          Skill Öner
        {/if}
      </button>
      <!-- Scan button -->
      <button
        onclick={() => scan(true)}
        disabled={loading}
        class="h-7 px-3 rounded-lg text-[11px] font-semibold transition-all duration-150
               {loading
                 ? 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-not-allowed'
                 : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]'}"
      >
        {loading ? t('insights.scanning') : t('insights.scan')}
      </button>
    </div>
  </div>

  <!-- Scan loading state -->
  {#if loadingStep === 'parsing'}
    <div class="mb-4 px-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[12px] text-[var(--text-muted)]">
      {t('insights.parsing')}
    </div>
  {/if}

  {#if error}
    <div class="mb-4 px-4 py-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[12px] text-[var(--danger)]">{error}</div>
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

      <!-- ── Suggestions (shown first when available) ── -->
      {#if suggestions.length > 0 || suggestionsLoading}
        <div class="mb-5 rounded-xl border border-[var(--accent-dim)]/30 bg-[var(--accent-subtle)]/20 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--accent-dim)]/20">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-[var(--accent)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 1l1.2 2.8L12 5l-2.8 1.2L8 9 6.8 6.2 4 5l2.8-1.2z"/>
                <path d="M13 9l.7 1.6L15 11l-1.3.4L13 13l-.7-1.6L11 11l1.3-.4z"/>
              </svg>
              <span class="text-[11px] font-semibold text-[var(--accent)]">Sana Özel Öneriler</span>
              {#if suggestions.length > 0}
                <span class="text-[10px] font-mono bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full">{suggestions.length}</span>
              {/if}
            </div>
            {#if suggestions.length > 0}
              <button
                onclick={suggest}
                disabled={suggestionsLoading}
                class="text-[10px] text-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors"
              >Yenile</button>
            {/if}
          </div>

          {#if suggestionsLoading}
            <div class="px-4 py-6 flex items-center gap-3 text-[12px] text-[var(--text-muted)]">
              <span class="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0"></span>
              {suggestStep === 'insights' ? 'Claude /insights çalıştırılıyor…' : 'Kullanım desenleri analiz ediliyor…'}
            </div>
          {:else}
            <div class="flex flex-col divide-y divide-[var(--accent-dim)]/10">
              {#each suggestions as s}
                <div class="px-4 py-3.5 flex items-start gap-3">
                  <!-- Type badge -->
                  <span class="mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0
                    {s.type === 'skill'   ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' :
                     s.type === 'agent'   ? 'bg-purple-500/10 text-purple-400' :
                                           'bg-green-500/10 text-green-400'}">
                    {s.type}
                  </span>
                  <!-- Text -->
                  <div class="flex-1 min-w-0">
                    <div class="text-[12px] font-semibold text-[var(--text-primary)]">{s.name}</div>
                    <div class="text-[11px] text-[var(--text-secondary)] mt-0.5">{s.description}</div>
                    <div class="text-[10px] text-[var(--text-ghost)] mt-1 italic">{s.rationale}</div>
                  </div>
                  <!-- Ekle button -->
                  <button
                    onclick={() => quickCreate(s)}
                    disabled={!!creatingName}
                    class="shrink-0 h-7 px-3 rounded-lg text-[11px] font-medium transition-all
                           {creatingName === s.name
                             ? 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-not-allowed'
                             : 'bg-[var(--accent)] text-white hover:opacity-90'}"
                  >
                    {creatingName === s.name ? '…' : 'Ekle'}
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- ── Summary cards ── -->
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
                <div class="h-full rounded-full transition-all duration-500" style="width: {plugin.usagePercent}%; background: var(--accent)"></div>
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
            {#each ['usage', 'name', 'plugin'] as mode}
              <button
                onclick={() => sortBy = mode as 'usage' | 'name' | 'plugin'}
                class="px-2 py-1 rounded text-[10px] font-mono transition-all duration-150
                       {sortBy === mode ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-ghost)] hover:text-[var(--text-muted)]'}"
              >{mode.charAt(0).toUpperCase() + mode.slice(1)}</button>
            {/each}
            <button
              onclick={() => filterUnused = !filterUnused}
              class="px-2 py-1 rounded text-[10px] font-mono transition-all duration-150
                     {filterUnused ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'text-[var(--text-ghost)] hover:text-[var(--text-muted)]'}"
            >Unused only</button>
          </div>
        </div>

        <div class="stagger-list">
          {#each filteredSkills() as skill}
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] {skill.invokeCount === 0 ? 'opacity-50' : ''}">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-[9px] font-mono bg-[var(--surface-3)] text-[var(--text-ghost)] px-1.5 py-0.5 rounded shrink-0">{skill.pluginName}</span>
                <span class="text-[12px] text-[var(--text-primary)] truncate">{skill.skillName}</span>
              </div>
              <div class="flex items-center gap-3 shrink-0 ml-3">
                <span class="text-[11px] font-bold font-mono" style="color: {usageColor(skill.invokeCount)}">{skill.invokeCount}</span>
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
