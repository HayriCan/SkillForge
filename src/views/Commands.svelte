<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir } from '../lib/fs';
  import MarkdownCrud from '../components/MarkdownCrud.svelte';

  const { onCount, initialSelect = '' } = $props<{ onCount: (n: number) => void; initialSelect?: string }>();
  let dir = $state('');
  onMount(async () => { dir = `${await claudeDir()}/commands`; });
</script>

{#if dir}
  <MarkdownCrud {dir} label="Commands" {onCount} {initialSelect} emptyIcon="commands" emptyTitle="No commands yet" emptyDescription="Create your first command file" emptyActionLabel="Create Command" />
{/if}
