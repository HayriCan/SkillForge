<script lang="ts">
  import Section from './Section.svelte';
  import type { Settings } from '../../lib/settings';

  const { unknownFields, onPatch } = $props<{
    unknownFields: Record<string, unknown>;
    onPatch: (fn: (s: Settings) => void) => Promise<void>;
  }>();

  let editContent = $state('');
  let jsonError = $state('');

  $effect(() => {
    editContent = JSON.stringify(unknownFields, null, 2);
    jsonError = '';
  });

  function validate() {
    try {
      JSON.parse(editContent);
      jsonError = '';
      return true;
    } catch (e: any) {
      jsonError = e.message;
      return false;
    }
  }

  async function save() {
    if (!validate()) return;
    const parsed = JSON.parse(editContent);
    await onPatch((s: any) => {
      for (const key of Object.keys(unknownFields)) {
        delete s[key];
      }
      Object.assign(s, parsed);
    });
  }

  const count = $derived(Object.keys(unknownFields).length);
</script>

{#if count > 0}
  <Section title="Other Fields" count={count}>
    {#if jsonError}
      <div class="text-[13px] text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-2.5 rounded-lg mb-3 animate-fade-in">{jsonError}</div>
    {/if}
    <textarea
      bind:value={editContent}
      oninput={validate}
      class="w-full min-h-32 bg-[var(--surface-2)] border {jsonError ? 'border-[var(--danger)]/40' : 'border-[var(--border-subtle)]'} rounded-lg p-3 text-[12px] text-[var(--text-primary)] font-mono outline-none resize-none focus:border-[var(--accent-dim)] transition-colors leading-relaxed"
    ></textarea>
    <div class="flex gap-2 mt-3">
      <button onclick={save} disabled={!!jsonError} class="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 {!jsonError ? 'bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)]' : 'bg-[var(--surface-3)] text-[var(--text-ghost)] cursor-default'}">Save</button>
      <button onclick={() => { editContent = JSON.stringify(unknownFields, null, 2); jsonError = ''; }} class="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Reset</button>
    </div>
  </Section>
{/if}
