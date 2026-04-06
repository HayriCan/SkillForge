<script lang="ts">
  import { buildInsightsData } from '../lib/insights';
  import { generateSuggestions, createSuggestion, type Suggestion } from '../lib/suggestions';
  import { claudeDir } from '../lib/fs';
  import { addToast } from '../lib/toast.svelte';
  import { getActiveAdapter } from '../lib/adapters/index';
  import { t } from '../lib/i18n.svelte';

  interface Props { open?: boolean; }
  let { open = $bindable(false) }: Props = $props();

  let suggestions = $state<Suggestion[]>([]);
  let loading = $state(false);
  let step = $state<'idle' | 'insights' | 'analyzing' | 'done'>('idle');
  let creatingName = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function run() {
    const adapter = await getActiveAdapter();
    if (adapter.id !== 'claude') {
      error = t('suggestions.claude_only');
      step = 'done';
      return;
    }
    loading = true;
    error = null;
    suggestions = [];
    try {
      step = 'insights';
      const dir = await claudeDir();
      // Read existing usage data from disk — don't run claude /insights (blocks)
      const data = await buildInsightsData(dir);
      step = 'analyzing';
      suggestions = await generateSuggestions(adapter.id, data, dir);
      step = 'done';
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
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
      addToast(`Hata: ${e}`, 'error');
    } finally {
      creatingName = null;
    }
  }

  // Run automatically when panel opens
  $effect(() => {
    if (open && step === 'idle') run();
    if (!open) { step = 'idle'; suggestions = []; error = null; }
  });
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40 bg-black/20"
    onclick={() => open = false}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
  ></div>

  <!-- Panel (right side drawer) -->
  <div class="fixed top-0 right-0 h-full w-[400px] z-50 bg-[var(--surface-0)] border-l border-[var(--border-default)] flex flex-col shadow-2xl animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-[var(--accent)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 1l1.2 2.8L12 5l-2.8 1.2L8 9 6.8 6.2 4 5l2.8-1.2z"/>
          <path d="M13 9l.7 1.6L15 11l-1.3.4L13 13l-.7-1.6L11 11l1.3-.4z"/>
        </svg>
        <span class="text-[13px] font-semibold text-[var(--text-primary)]">{t('suggestions.panel_title')}</span>
        {#if suggestions.length > 0}
          <span class="text-[10px] font-mono bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full">{suggestions.length}</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        {#if step === 'done' && !loading}
          <button onclick={run} class="text-[11px] text-[var(--text-ghost)] hover:text-[var(--accent)] transition-colors">{t('suggestions.refresh')}</button>
        {/if}
        <button onclick={() => open = false} class="w-6 h-6 flex items-center justify-center rounded text-[var(--text-ghost)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      {#if loading}
        <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div class="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <div class="text-[12px] text-[var(--text-muted)]">
            {step === 'insights' ? t('suggestions.step_insights') : t('suggestions.step_analyzing')}
          </div>
          <div class="text-[10px] text-[var(--text-ghost)]">{t('suggestions.hint')}</div>
        </div>

      {:else if error}
        <div class="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-[12px] text-[var(--danger)]">{error}</div>

      {:else if suggestions.length === 0 && step === 'done'}
        <div class="text-center text-[var(--text-ghost)] text-[12px] py-10">{t('suggestions.empty')}</div>

      {:else}
        {#each suggestions as s}
          <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                  {s.type === 'skill'   ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' :
                   s.type === 'agent'   ? 'bg-purple-500/10 text-purple-400' :
                                         'bg-green-500/10 text-green-400'}">
                  {s.type}
                </span>
                <span class="text-[13px] font-semibold text-[var(--text-primary)]">{s.name}</span>
              </div>
              <button
                onclick={() => quickCreate(s)}
                disabled={!!creatingName}
                class="shrink-0 h-7 px-3 rounded-lg text-[11px] font-medium transition-all
                       {creatingName === s.name
                         ? 'bg-[var(--surface-2)] text-[var(--text-ghost)] cursor-not-allowed'
                         : 'bg-[var(--accent)] text-white hover:opacity-90'}"
              >
                {creatingName === s.name ? '…' : t('suggestions.add')}
              </button>
            </div>
            <p class="text-[12px] text-[var(--text-secondary)] mb-1.5">{s.description}</p>
            <p class="text-[11px] text-[var(--text-ghost)] italic leading-relaxed">{s.rationale}</p>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
