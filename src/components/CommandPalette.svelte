<script lang="ts">
  import { searchResources, getRecentSearches, addRecentSearch, type SearchResult } from '../lib/search';

  const { open, onClose, onSelect } = $props<{
    open: boolean;
    onClose: () => void;
    onSelect: (viewId: string, fileName: string) => void;
  }>();

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let selectedIndex = $state(0);
  let recentSearches = $state<string[]>([]);
  let searching = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  let showRecent = $derived(query.trim() === '' && recentSearches.length > 0);

  $effect(() => {
    if (open) {
      query = '';
      results = [];
      selectedIndex = 0;
      recentSearches = getRecentSearches();
      // autofocus after DOM update
      requestAnimationFrame(() => inputEl?.focus());
    }
  });

  $effect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      results = [];
      selectedIndex = 0;
      return;
    }
    searching = true;
    searchResources(q).then((r) => {
      results = r;
      selectedIndex = 0;
      searching = false;
    }).catch(() => {
      results = [];
      searching = false;
    });
  });

  function handleSelect(result: SearchResult) {
    addRecentSearch(query.trim());
    onSelect(result.viewId, result.fileName);
    onClose();
  }

  function handleRecentClick(recent: string) {
    query = recent;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    const listLength = results.length;
    if (listLength === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % listLength;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + listLength) % listLength;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[selectedIndex];
      if (selected) handleSelect(selected);
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
    style="background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div role="dialog" aria-label="Command palette" class="w-full max-w-lg rounded-lg border border-[var(--border-default)] bg-[var(--surface-0)] shadow-2xl shadow-black/10 animate-scale-in overflow-hidden">
      <!-- Search input -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
        <svg class="w-4 h-4 text-[var(--text-ghost)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          placeholder="Search resources..."
          aria-label="Search commands"
          class="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder-[var(--text-ghost)] outline-none"
        />
        <kbd class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)] border border-[var(--border-subtle)]">ESC</kbd>
      </div>

      <!-- Results / Recent / Empty -->
      <div class="max-h-80 overflow-y-auto">
        {#if showRecent}
          <div class="px-3 pt-2 pb-1">
            <span class="text-[10px] font-semibold text-[var(--text-ghost)] uppercase tracking-wider">Recent</span>
          </div>
          {#each recentSearches as recent}
            <button
              class="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
              onclick={() => handleRecentClick(recent)}
            >
              <svg class="w-3.5 h-3.5 text-[var(--text-ghost)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="truncate">{recent}</span>
            </button>
          {/each}
        {:else if query.trim() && results.length === 0 && !searching}
          <div class="px-4 py-8 text-center text-sm text-[var(--text-ghost)]">
            No results found
          </div>
        {:else}
          {#each results as result, i}
            <button
              class="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors
                     {i === selectedIndex ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}"
              onclick={() => handleSelect(result)}
              onmouseenter={() => selectedIndex = i}
            >
              <span class="w-4 text-center text-xs shrink-0
                           {i === selectedIndex ? 'text-[var(--accent)]' : 'text-[var(--text-ghost)]'}">
                {result.icon}
              </span>
              <span class="flex-1 truncate">{result.label}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)]">
                {result.viewId}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer hint -->
      {#if results.length > 0}
        <div class="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center gap-3 text-[10px] text-[var(--text-ghost)]">
          <span><kbd class="font-mono">↑↓</kbd> navigate</span>
          <span><kbd class="font-mono">↵</kbd> select</span>
          <span><kbd class="font-mono">esc</kbd> close</span>
        </div>
      {/if}
    </div>
  </div>
{/if}
