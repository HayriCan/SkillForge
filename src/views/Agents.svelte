<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir } from '../lib/fs';
  import MarkdownCrud from '../components/MarkdownCrud.svelte';

  const { onCount, initialSelect = '' } = $props<{ onCount: (n: number) => void; initialSelect?: string }>();
  let dir = $state('');
  onMount(async () => { dir = `${await claudeDir()}/agents`; });
</script>

{#if dir}
  <MarkdownCrud {dir} label="Agents" {onCount} {initialSelect} emptyIcon="agents" emptyTitle="No agents yet" emptyDescription="Create your first agent file" emptyActionLabel="Create Agent" />
{/if}
