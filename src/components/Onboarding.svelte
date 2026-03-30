<script lang="ts">
  import { onMount } from 'svelte';
  import { exists } from '@tauri-apps/plugin-fs';
  import { claudeDir, listDirFull } from '$lib/fs';
  import { loadAppConfig, saveAppConfig } from '$lib/app-config';

  const { onComplete } = $props<{ onComplete: () => void }>();

  let step = $state(0);
  let dirPath = $state('');
  let dirFound = $state(false);
  let checking = $state(true);
  let customPath = $state('');

  let totalCount = $state(0);

  const features = [
    {
      icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>',
      title: 'Agent & Skill Yönetimi',
      desc: 'Agent, skill ve command dosyalarınızı düzenleyin',
    },
    {
      icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
      title: 'Settings Editor',
      desc: 'settings.json\'u görsel arayüzle yapılandırın',
    },
    {
      icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>',
      title: 'Hook & Plugin',
      desc: 'Hook scriptlerini ve plugin\'leri yönetin',
    },
  ];

  async function checkClaudeDir() {
    checking = true;
    try {
      const dir = await claudeDir();
      dirPath = dir;
      dirFound = await exists(dir);
    } catch {
      dirFound = false;
    }
    checking = false;
  }

  async function saveCustomPath() {
    if (customPath.trim()) {
      await saveAppConfig({ claudeDir: customPath.trim() });
      dirPath = customPath.trim();
      dirFound = await exists(dirPath);
    }
  }

  async function loadCounts() {
    try {
      const dir = dirPath;
      let count = 0;
      const subs = ['agents', 'commands', 'hooks', 'plans', 'skills', 'teams'];
      for (const sub of subs) {
        try {
          if (await exists(`${dir}/${sub}`)) {
            const entries = await listDirFull(`${dir}/${sub}`);
            count += entries.length;
          }
        } catch {}
      }
      totalCount = count;
    } catch {}
  }

  function next() {
    if (step < 3) {
      step += 1;
      if (step === 3) {
        loadCounts();
      }
    }
  }

  onMount(() => {
    checkClaudeDir();
  });
</script>

<!-- Full-screen overlay -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
  <!-- Skip link -->
  <button
    onclick={onComplete}
    class="absolute top-5 right-6 text-[11px] text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer z-10"
  >
    Skip
  </button>

  <!-- Card -->
  <div class="bg-[var(--surface-0)] border border-[var(--border-default)] w-full max-w-xl rounded-lg p-8 relative overflow-hidden">
    <!-- Ambient glow -->
    <div class="absolute -top-24 -right-24 w-48 h-48 bg-[var(--accent)] opacity-[0.04] rounded-full blur-3xl pointer-events-none"></div>

    <!-- Step content -->
    {#key step}
      <div class="animate-fade-in-up">
        {#if step === 0}
          <!-- Step 1: Welcome -->
          <div class="text-center space-y-4">
            <div class="text-4xl font-bold text-[var(--text-primary)] tracking-tight">Skill Forge</div>
            <p class="text-[var(--accent)] text-sm font-medium">
              Claude Code config'lerinizi görsel olarak yönetin
            </p>
            <p class="text-[var(--text-secondary)] text-[13px] leading-relaxed max-w-md mx-auto">
              Agent, skill ve command dosyalarınızı düzenleyin, settings.json'u görsel olarak yapılandırın
              ve hook'larınızı tek bir arayüzden yönetin.
            </p>
            <button
              onclick={next}
              class="mt-4 px-6 py-2.5 rounded-lg bg-[var(--accent-dim)] text-[var(--text-primary)] text-sm font-medium
                     hover:bg-[var(--accent)] transition-colors cursor-pointer"
            >
              Başlayın &rarr;
            </button>
          </div>

        {:else if step === 1}
          <!-- Step 2: Claude Path -->
          <div class="space-y-5">
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">Claude Dizini</h2>

            {#if checking}
              <div class="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                <span class="animate-pulse-dot">●</span> Kontrol ediliyor...
              </div>
            {:else if dirFound}
              <div class="flex items-center gap-2 text-[var(--success)] text-sm">
                <span>&#x2713;</span>
                <span>Dizin bulundu: <span class="font-mono text-[12px]">{dirPath}</span></span>
              </div>
            {:else}
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-[var(--warning)] text-sm">
                  <span>&#x26A0;</span>
                  <span>Dizin bulunamadı</span>
                </div>
                <div class="flex gap-2">
                  <input
                    bind:value={customPath}
                    placeholder="/home/user/.claude"
                    class="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)]
                           text-[var(--text-primary)] text-sm font-mono placeholder:text-[var(--text-ghost)]
                           focus:outline-none focus:border-[var(--accent-dim)]"
                  />
                  <button
                    onclick={saveCustomPath}
                    class="px-4 py-2 rounded-lg bg-[var(--surface-4)] text-[var(--text-secondary)] text-sm
                           hover:text-[var(--text-primary)] transition-colors cursor-pointer border border-[var(--border-subtle)]"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            {/if}

            <button
              onclick={next}
              class="px-6 py-2.5 rounded-lg bg-[var(--accent-dim)] text-[var(--text-primary)] text-sm font-medium
                     hover:bg-[var(--accent)] transition-colors cursor-pointer"
            >
              İleri &rarr;
            </button>
          </div>

        {:else if step === 2}
          <!-- Step 3: Feature Tour -->
          <div class="space-y-5">
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">Neler Yapabilirsiniz</h2>
            <div class="grid grid-cols-3 gap-3 stagger-list">
              {#each features as feature}
                <div class="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--border-subtle)] space-y-2 text-center">
                  <div class="text-[var(--accent)] flex justify-center">{@html feature.icon}</div>
                  <div class="text-[13px] font-semibold text-[var(--text-primary)]">{feature.title}</div>
                  <div class="text-[11px] text-[var(--text-muted)] leading-relaxed">{feature.desc}</div>
                </div>
              {/each}
            </div>
            <button
              onclick={next}
              class="px-6 py-2.5 rounded-lg bg-[var(--accent-dim)] text-[var(--text-primary)] text-sm font-medium
                     hover:bg-[var(--accent)] transition-colors cursor-pointer"
            >
              İleri &rarr;
            </button>
          </div>

        {:else if step === 3}
          <!-- Step 4: Ready -->
          <div class="text-center space-y-4">
            <div class="text-2xl font-bold text-[var(--text-primary)]">Her şey hazır!</div>
            <p class="text-sm text-[var(--text-secondary)]">
              {#if totalCount > 0}
                <span class="font-mono text-[var(--accent)]">{totalCount}</span> kaynak dosyası bulundu
              {:else}
                Yapılandırmaya hazırsınız
              {/if}
            </p>
            <button
              onclick={onComplete}
              class="mt-2 px-8 py-3 rounded-lg bg-[var(--accent-dim)] text-[var(--text-primary)] text-sm font-bold
                     hover:bg-[var(--accent)] transition-colors cursor-pointer animate-glow"
            >
              Başlayalım!
            </button>
          </div>
        {/if}
      </div>
    {/key}

    <!-- Step dots -->
    <div class="flex justify-center gap-2 mt-8">
      {#each [0, 1, 2, 3] as i}
        <div
          class="w-2 h-2 rounded-full transition-all duration-300
                 {step === i
                   ? 'bg-[var(--accent)] scale-125'
                   : 'bg-[var(--surface-4)]'}"
        ></div>
      {/each}
    </div>
  </div>
</div>
