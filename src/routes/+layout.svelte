<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { initTheme } from '../lib/theme.svelte';
  import { initLocale } from '../lib/i18n.svelte';

  let { children } = $props();

  onMount(() => {
    initTheme();
    initLocale();
  });
</script>

{@render children()}
