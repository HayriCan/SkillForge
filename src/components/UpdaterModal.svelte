<script lang="ts">
  import {
    checkForUpdatesManual,
    closeUpdaterDialog,
    dismissUpdateForLater,
    downloadAndInstallUpdate,
    restartToUpdate,
    updaterState,
  } from '../lib/updater';
  import { t } from '../lib/i18n.svelte';

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function title(): string {
    if (updaterState.status === 'checking') return t('update.title_checking');
    if (updaterState.status === 'available' || updaterState.status === 'downloading' || updaterState.status === 'installing') return t('update.title_available');
    if (updaterState.status === 'ready_to_restart') return t('update.title_ready');
    if (updaterState.status === 'error') return t('update.title_error');
    if (updaterState.notice === 'latest') return t('update.title_latest');
    return t('update.title_checking');
  }

  function summary(): string {
    if (updaterState.status === 'checking') return t('update.summary_checking');
    if (updaterState.status === 'downloading') return t('update.summary_downloading');
    if (updaterState.status === 'installing') return t('update.summary_installing');
    if (updaterState.status === 'ready_to_restart') return t('update.summary_ready', { v: updaterState.targetVersion || '?' });
    if (updaterState.status === 'error') return updaterState.errorDetail;
    if (updaterState.notice === 'latest') return t('update.latest');
    return t('update.summary_available', {
      current: updaterState.currentVersion || '?',
      next: updaterState.targetVersion || '?',
    });
  }

  const releaseDate = $derived(updaterState.releaseDate ? new Date(updaterState.releaseDate).toLocaleDateString() : '');
  const progressLabel = $derived(
    updaterState.totalBytes && updaterState.totalBytes > 0
      ? `${formatBytes(updaterState.downloadedBytes)} / ${formatBytes(updaterState.totalBytes)}`
      : updaterState.downloadedBytes > 0
        ? `${formatBytes(updaterState.downloadedBytes)}`
        : t('update.progress_unknown')
  );
</script>

{#if updaterState.isDialogOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
    <button
      class="absolute inset-0 bg-black/25 backdrop-blur-sm cursor-default"
      aria-label={t('close')}
      disabled={updaterState.status === 'checking' || updaterState.status === 'downloading' || updaterState.status === 'installing'}
      onclick={closeUpdaterDialog}
    ></button>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="updater-title"
      tabindex="-1"
      class="relative z-10 w-[min(92vw,36rem)] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-0)] shadow-2xl shadow-black/15 animate-scale-in"
      onkeydown={(e) => {
        if (e.key === 'Escape') closeUpdaterDialog();
      }}
    >
      <div class="border-b border-[var(--border-subtle)] bg-[linear-gradient(135deg,var(--surface-1),var(--surface-0))] px-6 py-5">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 16V4m0 12l4-4m-4 4l-4-4M4.75 18.25h14.5" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <h2 id="updater-title" class="text-[15px] font-semibold text-[var(--text-primary)]">{title()}</h2>
            <p class="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{summary()}</p>
          </div>
        </div>
      </div>

      <div class="space-y-4 px-6 py-5">
        {#if updaterState.targetVersion}
          <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-ghost)]">{t('update.version_label')}</p>
                <p class="mt-1 text-[13px] text-[var(--text-primary)]">
                  {updaterState.currentVersion || '?'} <span class="text-[var(--text-ghost)]">→</span> {updaterState.targetVersion}
                </p>
              </div>
              {#if releaseDate}
                <div class="text-right">
                  <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-ghost)]">{t('update.release_date')}</p>
                  <p class="mt-1 text-[12px] text-[var(--text-secondary)]">{releaseDate}</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        {#if updaterState.status === 'downloading' || updaterState.status === 'installing'}
          <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="text-[12px] font-medium text-[var(--text-primary)]">
                {updaterState.status === 'downloading' ? t('update.status_downloading') : t('update.status_installing')}
              </span>
              <span class="text-[11px] text-[var(--text-ghost)]">
                {updaterState.progress !== null ? `${updaterState.progress}%` : t('update.progress_working')}
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                class="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
                style={`width:${updaterState.progress ?? 25}%`}
              ></div>
            </div>
            <p class="mt-2 text-[11px] text-[var(--text-ghost)]">{progressLabel}</p>
          </div>
        {/if}

        {#if updaterState.status === 'error'}
          <div class="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-4 py-3">
            <p class="text-[12px] font-medium text-[var(--danger)]">{t('update.error_label')}</p>
            <p class="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{updaterState.errorDetail}</p>
          </div>
        {/if}

        {#if updaterState.releaseNotes && updaterState.status !== 'error' && updaterState.notice !== 'latest'}
          <div class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-ghost)]">{t('update.release_notes')}</p>
            <pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text-secondary)]">{updaterState.releaseNotes}</pre>
          </div>
        {/if}

        <div class="flex justify-end gap-2">
          {#if updaterState.status === 'available'}
            <button onclick={dismissUpdateForLater} class="rounded-md border border-[var(--border-default)] px-4 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
              {t('update.action_later')}
            </button>
            <button onclick={downloadAndInstallUpdate} class="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              {t('update.action_download_install')}
            </button>
          {:else if updaterState.status === 'ready_to_restart'}
            <button onclick={closeUpdaterDialog} class="rounded-md border border-[var(--border-default)] px-4 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
              {t('close')}
            </button>
            <button onclick={restartToUpdate} class="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              {t('update.action_restart')}
            </button>
          {:else if updaterState.status === 'error'}
            <button onclick={closeUpdaterDialog} class="rounded-md border border-[var(--border-default)] px-4 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
              {t('close')}
            </button>
            <button onclick={checkForUpdatesManual} class="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              {t('update.action_retry')}
            </button>
          {:else if updaterState.status === 'checking' || updaterState.status === 'downloading' || updaterState.status === 'installing'}
            <button disabled class="rounded-md border border-[var(--border-default)] px-4 py-1.5 text-[13px] text-[var(--text-ghost)]">
              {t('update.progress_working')}
            </button>
          {:else}
            <button onclick={closeUpdaterDialog} class="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              {t('close')}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
