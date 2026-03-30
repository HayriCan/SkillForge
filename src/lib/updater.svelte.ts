import { relaunch } from '@tauri-apps/plugin-process';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';
import { addToast } from './toast.svelte';
import { t } from './i18n.svelte';
import { classifyUpdaterError, type UpdateErrorKind } from './updater-errors';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'ready_to_restart'
  | 'error';

type CheckSource = 'startup' | 'manual';
type UpdaterNotice = 'latest' | 'available' | 'ready' | 'error' | null;

type UpdaterState = {
  status: UpdateStatus;
  source: CheckSource;
  notice: UpdaterNotice;
  isDialogOpen: boolean;
  currentVersion: string;
  targetVersion: string;
  releaseDate: string;
  releaseNotes: string;
  progress: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
  errorKind: UpdateErrorKind | null;
  errorDetail: string;
  update: Update | null;
};

export const updaterState = $state<UpdaterState>({
  status: 'idle',
  source: 'startup',
  notice: null,
  isDialogOpen: false,
  currentVersion: '',
  targetVersion: '',
  releaseDate: '',
  releaseNotes: '',
  progress: null,
  downloadedBytes: 0,
  totalBytes: null,
  errorKind: null,
  errorDetail: '',
  update: null,
});

let activeCheck: Promise<void> | null = null;

function resetProgress(): void {
  updaterState.progress = null;
  updaterState.downloadedBytes = 0;
  updaterState.totalBytes = null;
}

async function releaseUpdate(): Promise<void> {
  const current = updaterState.update;
  updaterState.update = null;
  if (!current) return;

  try {
    await current.close();
  } catch {
    // Resource cleanup is best-effort only.
  }
}

function hydrateUpdate(update: Update | null): void {
  updaterState.update = update;
  updaterState.currentVersion = update?.currentVersion ?? updaterState.currentVersion;
  updaterState.targetVersion = update?.version ?? '';
  updaterState.releaseDate = update?.date ?? '';
  updaterState.releaseNotes = update?.body?.trim() ?? '';
}

function openDialog(notice: UpdaterNotice): void {
  updaterState.notice = notice;
  updaterState.isDialogOpen = true;
}

function describeError(kind: UpdateErrorKind): string {
  switch (kind) {
    case 'signature':
      return t('update.error_signature');
    case 'network':
      return t('update.error_network');
    case 'metadata':
      return t('update.error_metadata');
    case 'permission':
      return t('update.error_permission');
    case 'notarization':
      return t('update.error_notarization');
    default:
      return t('update.error_generic');
  }
}

function handleDownloadEvent(event: DownloadEvent): void {
  if (event.event === 'Started') {
    updaterState.totalBytes = event.data.contentLength ?? null;
    updaterState.downloadedBytes = 0;
    updaterState.progress = event.data.contentLength ? 0 : null;
    return;
  }

  if (event.event === 'Progress') {
    updaterState.downloadedBytes += event.data.chunkLength;
    if (updaterState.totalBytes && updaterState.totalBytes > 0) {
      updaterState.progress = Math.min(100, Math.round((updaterState.downloadedBytes / updaterState.totalBytes) * 100));
    }
    return;
  }

  updaterState.progress = 100;
}

async function runUpdateCheck(source: CheckSource): Promise<void> {
  if (updaterState.status === 'available' || updaterState.status === 'ready_to_restart') {
    updaterState.source = source;
    if (source === 'manual') openDialog(updaterState.notice);
    return;
  }

  if (updaterState.status === 'checking' || updaterState.status === 'downloading' || updaterState.status === 'installing') {
    updaterState.source = source;
    if (source === 'manual') {
      openDialog(updaterState.notice);
      addToast(t('update.progress_working'), 'info');
    }
    return;
  }

  if (activeCheck) {
    updaterState.source = source;
    if (source === 'manual') openDialog(updaterState.notice);
    return activeCheck;
  }

  const task = (async () => {
    updaterState.source = source;
    updaterState.status = 'checking';
    updaterState.errorKind = null;
    updaterState.errorDetail = '';
    resetProgress();
    if (source === 'manual') openDialog(null);

    try {
      const update = await check();
      if (update) {
        await releaseUpdate();
        hydrateUpdate(update);
        updaterState.status = 'available';
        openDialog('available');
      } else {
        await releaseUpdate();
        hydrateUpdate(null);
        updaterState.status = 'idle';
        if (source === 'manual') {
          openDialog('latest');
        } else {
          updaterState.isDialogOpen = false;
        }
      }
    } catch (error) {
      await releaseUpdate();
      hydrateUpdate(null);
      if (source === 'startup') {
        updaterState.status = 'idle';
        updaterState.isDialogOpen = false;
        return;
      }

      updaterState.status = 'error';
      updaterState.errorKind = classifyUpdaterError(error);
      updaterState.errorDetail = describeError(updaterState.errorKind);
      openDialog('error');
    }
  })();

  activeCheck = task;
  try {
    await task;
  } finally {
    activeCheck = null;
  }
}

export async function checkForUpdates(): Promise<void> {
  try {
    await runUpdateCheck('startup');
  } catch {
    // Startup checks stay non-blocking.
  }
}

export async function checkForUpdatesManual(): Promise<void> {
  await runUpdateCheck('manual');
}

export async function downloadAndInstallUpdate(): Promise<void> {
  const update = updaterState.update;
  if (!update || updaterState.status === 'downloading' || updaterState.status === 'installing') return;

  updaterState.status = 'downloading';
  updaterState.errorKind = null;
  updaterState.errorDetail = '';
  openDialog('available');

  try {
    await update.download(handleDownloadEvent);
    updaterState.status = 'installing';
    await update.install();
    await releaseUpdate();
    updaterState.status = 'ready_to_restart';
    openDialog('ready');
  } catch (error) {
    updaterState.status = 'error';
    updaterState.errorKind = classifyUpdaterError(error);
    updaterState.errorDetail = describeError(updaterState.errorKind);
    openDialog('error');
  }
}

export async function restartToUpdate(): Promise<void> {
  updaterState.isDialogOpen = false;

  try {
    await relaunch();
  } catch (error) {
    updaterState.status = 'error';
    updaterState.errorKind = classifyUpdaterError(error);
    updaterState.errorDetail = describeError(updaterState.errorKind);
    openDialog('error');
  }
}

export function closeUpdaterDialog(): void {
  if (updaterState.status === 'checking' || updaterState.status === 'downloading' || updaterState.status === 'installing') return;
  updaterState.isDialogOpen = false;
}

export function dismissUpdateForLater(): void {
  updaterState.isDialogOpen = false;
  if (updaterState.status === 'available') {
    addToast(t('update.remind_me_later'), 'info');
  }
}
