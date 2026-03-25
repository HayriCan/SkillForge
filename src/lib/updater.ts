import { check } from '@tauri-apps/plugin-updater';
import { addToast } from './toast.svelte';
import { t } from './i18n.svelte';

/**
 * Check for app updates — called silently on startup.
 * Shows a toast only if an update is available.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (update?.available) {
      addToast(t('update.available', { v: update.version }), 'info');
    }
  } catch {
    // silently fail on startup — update check is non-critical
  }
}

/**
 * User-initiated update check — always shows feedback.
 */
export async function checkForUpdatesManual(): Promise<void> {
  try {
    const update = await check();
    if (update?.available) {
      addToast(t('update.available', { v: update.version }), 'info');
    } else {
      addToast(t('update.latest'), 'success');
    }
  } catch (e) {
    const msg = String(e).toLowerCase();
    if (msg.includes('pubkey') || msg.includes('signature') || msg.includes('empty')) {
      addToast(t('update.not_configured'), 'info');
    } else {
      addToast(t('update.error'), 'warning');
    }
  }
}
