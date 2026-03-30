<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings, HookEntry, HooksConfig } from '../../lib/settings';

  const { settings } = $props<{ settings: Settings }>();

  const hooks = $derived((settings.hooks ?? {}) as HooksConfig);
  const events = $derived(Object.entries(hooks) as [string, HookEntry[]][]);
  const totalEntries = $derived(events.reduce((sum, [, entries]) => sum + entries.length, 0));
</script>

<Section title="Hooks" count={totalEntries}>
  {#snippet actions()}
    <span class="text-xs text-[var(--text-ghost)] italic">read-only — edit via Hooks view</span>
  {/snippet}

  {#if events.length === 0}
    <div class="text-xs text-[var(--text-ghost)]">No hooks configured</div>
  {:else}
    <div class="flex flex-col gap-2">
      {#each events as [eventName, entries]}
        <div>
          <div class="text-xs font-semibold text-[var(--text-muted)] mb-1">{eventName} <span class="text-[var(--text-ghost)]">({entries.length})</span></div>
          <div class="flex flex-col gap-1 pl-3 border-l border-[var(--border-subtle)]">
            {#each entries as entry}
              <div class="text-xs">
                {#if entry.matcher}
                  <span class="text-[var(--warning)]">matcher:</span>
                  <span class="text-[var(--text-muted)] font-mono">"{entry.matcher}"</span>
                  <span class="text-[var(--surface-4)] mx-1">→</span>
                {/if}
                {#each entry.hooks as hook}
                  <span class="text-[var(--text-muted)] font-mono truncate">{hook.command.split('/').pop()}</span>
                  {#if hook.timeout}
                    <span class="text-[var(--surface-4)] ml-1">({hook.timeout}ms)</span>
                  {/if}
                {/each}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Section>
