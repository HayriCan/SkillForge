<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir } from '../lib/fs';
  import MarkdownCrud from '../components/MarkdownCrud.svelte';

  const { onCount, initialSelect = '' } = $props<{ onCount: (n: number) => void; initialSelect?: string }>();
  let dir = $state('');
  onMount(async () => { dir = `${await claudeDir()}/plans`; });
</script>

{#if dir}
  <MarkdownCrud {dir} label="Plans" {onCount} {initialSelect} emptyIcon="plans" emptyTitle="No plans yet" emptyDescription="Create your first plan" emptyActionLabel="Create Plan" />
{/if}
