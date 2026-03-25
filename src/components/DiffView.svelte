<script lang="ts">
  const { oldText, newText, onClose } = $props<{
    oldText: string;
    newText: string;
    onClose: () => void;
  }>();

  type DiffLine = {
    type: 'same' | 'add' | 'remove';
    content: string;
    lineNo: number;
  };

  /**
   * Simple Myers-inspired line diff using LCS.
   * Returns diff lines annotated with type.
   */
  function computeDiff(a: string, b: string): DiffLine[] {
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    const m = aLines.length;
    const n = bLines.length;

    // Build LCS table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = aLines[i - 1] === bLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Backtrack
    const result: DiffLine[] = [];
    let i = m, j = n, lineNo = 1;
    const stack: DiffLine[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
        stack.push({ type: 'same', content: aLines[i - 1], lineNo: lineNo++ });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        stack.push({ type: 'add', content: bLines[j - 1], lineNo: lineNo++ });
        j--;
      } else {
        stack.push({ type: 'remove', content: aLines[i - 1], lineNo: lineNo++ });
        i--;
      }
    }

    return stack.reverse();
  }

  const diff = $derived(computeDiff(oldText, newText));
  const stats = $derived({
    added: diff.filter((l) => l.type === 'add').length,
    removed: diff.filter((l) => l.type === 'remove').length,
  });
</script>

<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
  <div role="dialog" aria-label="Review changes" class="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] shadow-2xl overflow-hidden animate-scale-in">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
      <div class="flex items-center gap-3">
        <span class="text-[13px] font-semibold text-[var(--text-primary)]">Review Changes</span>
        {#if stats.added > 0}
          <span class="text-[11px] font-mono text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 px-2 py-0.5 rounded">+{stats.added}</span>
        {/if}
        {#if stats.removed > 0}
          <span class="text-[11px] font-mono text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-2 py-0.5 rounded">-{stats.removed}</span>
        {/if}
        {#if stats.added === 0 && stats.removed === 0}
          <span class="text-[11px] text-[var(--text-ghost)]">No changes</span>
        {/if}
      </div>
      <button
        onclick={onClose}
        aria-label="Close"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all duration-150"
      ><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>

    <!-- Diff content -->
    <div class="flex-1 overflow-y-auto font-mono text-[12px]">
      {#each diff as line}
        <div class="flex items-start group transition-colors duration-100
                    {line.type === 'add' ? 'bg-[var(--success)]/8 hover:bg-[var(--success)]/12' :
                     line.type === 'remove' ? 'bg-[var(--danger)]/8 hover:bg-[var(--danger)]/12' :
                     'hover:bg-[var(--surface-2)]'}">
          <span class="w-6 shrink-0 text-center text-[10px] py-1 select-none
                       {line.type === 'add' ? 'text-[var(--success)]' :
                        line.type === 'remove' ? 'text-[var(--danger)]' :
                        'text-[var(--text-ghost)]'}">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          <span class="flex-1 py-1 pr-4 whitespace-pre-wrap break-all leading-relaxed
                       {line.type === 'add' ? 'text-[var(--success)]' :
                        line.type === 'remove' ? 'text-[var(--danger)]' :
                        'text-[var(--text-muted)]'}">
            {line.content || ' '}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>
