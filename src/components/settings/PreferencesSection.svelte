<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { settings, onPatch } = $props<{
    settings: Settings;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  const outputStyles = ['Explanatory', 'Concise', 'Verbose', 'Code-focused'];
  const effortLevels = ['low', 'medium', 'high'];

  const outputStyle = $derived((settings as any).outputStyle ?? '');
  const effortLevel = $derived((settings as any).effortLevel ?? '');
  const statusLine = $derived((settings as any).statusLine ?? {});
  const skipDangerous = $derived((settings as any).skipDangerousModePermissionPrompt ?? false);

  async function setField(key: string, value: unknown) {
    await onPatch((s: any) => { s[key] = value; });
  }
</script>

<Section title="Preferences">
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <span class="w-40 shrink-0 text-[12px] text-[var(--text-muted)]">Output Style</span>
      <select
        value={outputStyle}
        onchange={(e) => setField('outputStyle', e.currentTarget.value)}
        class="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-dim)] transition-colors cursor-pointer"
      >
        {#each outputStyles as style}
          <option value={style}>{style}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-3">
      <span class="w-40 shrink-0 text-[12px] text-[var(--text-muted)]">Effort Level</span>
      <select
        value={effortLevel}
        onchange={(e) => setField('effortLevel', e.currentTarget.value)}
        class="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-dim)] transition-colors cursor-pointer"
      >
        {#each effortLevels as level}
          <option value={level}>{level}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-3">
      <span class="w-40 shrink-0 text-[12px] text-[var(--text-muted)]">Skip Dangerous Prompt</span>
      <button
        onclick={() => setField('skipDangerousModePermissionPrompt', !skipDangerous)}
        aria-label="Toggle skip dangerous mode prompt"
        class="w-9 h-5 rounded-full transition-all duration-300 relative {skipDangerous ? 'bg-[var(--accent)]' : 'bg-[var(--surface-4)]'}"
      >
        <div class="w-3.5 h-3.5 bg-[var(--surface-0)] rounded-full absolute top-[3px] transition-all duration-300 shadow-sm {skipDangerous ? 'left-[18px]' : 'left-[3px]'}"></div>
      </button>
    </div>

    {#if statusLine && typeof statusLine === 'object'}
      <div class="flex items-start gap-3">
        <span class="w-40 shrink-0 text-[12px] text-[var(--text-muted)] pt-0.5">Status Line</span>
        <div class="text-[12px] text-[var(--text-secondary)] font-mono">
          {#if statusLine.type}
            <span class="text-[var(--text-ghost)]">type:</span> {statusLine.type}
          {/if}
          {#if statusLine.command}
            <br/><span class="text-[var(--text-ghost)]">cmd:</span> {statusLine.command}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</Section>
