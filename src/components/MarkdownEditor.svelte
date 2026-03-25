<script lang="ts">
  import { tick } from 'svelte';
  import { marked, Renderer } from 'marked';
  import { highlight } from '../lib/highlighter';

  let {
    value = $bindable(''),
    readonly = false,
    oninput,
  }: {
    value: string;
    readonly?: boolean;
    oninput?: () => void;
  } = $props();

  let editingIndex = $state<number | null>(null);
  let blockDraft = $state('');
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let previewEl = $state<HTMLDivElement | null>(null);

  const renderer = new Renderer();
  renderer.code = function ({ text, lang }: { text: string; lang?: string | undefined }) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const langAttr = lang ? ` data-lang="${lang}"` : '';
    return `<pre class="shiki-pending"${langAttr}><code>${escaped}</code></pre>`;
  };

  marked.setOptions({ breaks: true, gfm: true, renderer });

  type Block = { raw: string; html: string };

  /**
   * Split markdown into logical blocks for inline editing.
   */
  function splitBlocks(src: string): Block[] {
    const normalized = src.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const rawBlocks: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Frontmatter
      if (i === 0 && line === '---') {
        let end = i + 1;
        while (end < lines.length && lines[end] !== '---') end++;
        rawBlocks.push(lines.slice(i, end + 1).join('\n'));
        i = end + 1;
        continue;
      }

      // Fenced code block
      if (line.startsWith('```')) {
        let end = i + 1;
        while (end < lines.length && !lines[end].startsWith('```')) end++;
        rawBlocks.push(lines.slice(i, end + 1).join('\n'));
        i = end + 1;
        continue;
      }

      // Empty line — skip (acts as separator between blocks)
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Heading
      if (/^#{1,6}\s/.test(line)) {
        rawBlocks.push(line);
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        rawBlocks.push(line);
        i++;
        continue;
      }

      // List block (consecutive list lines, including nested and continuation)
      if (/^(\s*[-*+]\s|\s*\d+[.)]\s)/.test(line)) {
        let end = i + 1;
        while (end < lines.length) {
          const l = lines[end];
          if (/^(\s*[-*+]\s|\s*\d+[.)]\s)/.test(l) || /^\s{2,}/.test(l)) {
            end++;
          } else if (l.trim() === '' && end + 1 < lines.length && /^(\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[end + 1])) {
            end++;
          } else {
            break;
          }
        }
        rawBlocks.push(lines.slice(i, end).join('\n'));
        i = end;
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        let end = i + 1;
        while (end < lines.length && (lines[end].startsWith('>') || (lines[end].trim() !== '' && !lines[end].startsWith('#')))) {
          end++;
        }
        rawBlocks.push(lines.slice(i, end).join('\n'));
        i = end;
        continue;
      }

      // Table (line with pipes)
      if (line.includes('|') && i + 1 < lines.length && /^\|?\s*[-:]+[-|\s:]*$/.test(lines[i + 1])) {
        let end = i + 1;
        while (end < lines.length && lines[end].includes('|')) end++;
        rawBlocks.push(lines.slice(i, end).join('\n'));
        i = end;
        continue;
      }

      // Paragraph — consecutive non-empty, non-special lines
      {
        let end = i + 1;
        while (end < lines.length) {
          const l = lines[end];
          if (l.trim() === '' || /^#{1,6}\s/.test(l) || l.startsWith('```') || /^(\s*[-*+]\s|\s*\d+[.)]\s)/.test(l) || l.startsWith('>') || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) break;
          end++;
        }
        rawBlocks.push(lines.slice(i, end).join('\n'));
        i = end;
      }
    }

    return rawBlocks.map((raw) => {
      // Frontmatter blocks: render as YAML code block
      if (raw.startsWith('---') && raw.indexOf('---', 3) > 0) {
        const inner = raw.slice(4, raw.lastIndexOf('---'));
        const escaped = inner.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return {
          raw,
          html: `<pre class="shiki-pending" data-lang="yaml"><code>${escaped}</code></pre>`,
        };
      }
      return {
        raw,
        html: raw.trim() === '' ? '' : (marked.parse(raw) as string),
      };
    });
  }

  const blocks = $derived(splitBlocks(value));

  /**
   * After blocks render, find pending code blocks and apply shiki highlighting.
   */
  $effect(() => {
    // Subscribe to blocks so this re-runs when content changes
    blocks;
    tick().then(async () => {
      if (!previewEl) return;
      const pending = previewEl.querySelectorAll('pre.shiki-pending');
      for (const pre of pending) {
        const code = pre.querySelector('code');
        if (!code) continue;
        const lang = pre.getAttribute('data-lang') || 'markdown';
        const raw = code.textContent ?? '';
        try {
          const html = await highlight(raw, lang);
          pre.outerHTML = html;
        } catch {
          // If highlighting fails (unsupported lang), leave as-is
          pre.classList.remove('shiki-pending');
        }
      }
    });
  });

  async function enterBlockEdit(index: number) {
    if (readonly) return;
    editingIndex = index;
    blockDraft = blocks[index].raw;
    await tick();
    if (textareaEl) {
      textareaEl.focus({ preventScroll: true });
      autoResize(textareaEl);
    }
  }

  function commitBlock() {
    if (editingIndex === null) return;
    const idx = editingIndex;
    const oldBlocks = splitBlocks(value);
    const blockChanged = blockDraft !== oldBlocks[idx].raw;
    editingIndex = null;
    if (!blockChanged) {
      blockDraft = '';
      return;
    }
    const newBlocks = [...oldBlocks];
    newBlocks[idx] = { raw: blockDraft, html: '' };
    value = newBlocks
      .map((b) => b.raw)
      .filter((raw) => raw.trim() !== '')
      .join('\n\n');
    blockDraft = '';
    oninput?.();
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    blockDraft = el.value;
    autoResize(el);
  }
</script>

<div class="flex-1 min-h-0 flex flex-col">
  <div bind:this={previewEl} class="flex-1 min-h-0 w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-5 overflow-y-auto md-preview">
    {#each blocks as block, i}
      {#if editingIndex === i && !readonly}
        <textarea
          bind:this={textareaEl}
          value={blockDraft}
          oninput={handleInput}
          onkeydown={(e) => { if (e.key === 'Escape') commitBlock(); }}
          onfocusout={commitBlock}
          class="w-full bg-[var(--surface-2)] border border-[var(--accent-dim)]/30 rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono outline-none resize-none leading-relaxed my-0.5 shadow-inner animate-fade-in"
          style="min-height: 1.8em; overflow: hidden;"
        ></textarea>
      {:else}
        <div
          role="textbox"
          tabindex="0"
          aria-readonly={readonly}
          onclick={() => enterBlockEdit(i)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterBlockEdit(i); } }}
          class="rounded-lg px-1.5 -mx-1.5 transition-all duration-200 {readonly ? '' : 'cursor-text hover:bg-[var(--surface-2)]/50'}"
        >
          {@html block.html}
        </div>
      {/if}
    {/each}

    {#if !readonly && blocks.length === 0}
      <div
        role="textbox"
        tabindex="0"
        onclick={() => { value = '\n'; enterBlockEdit(0); }}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); value = '\n'; enterBlockEdit(0); } }}
        class="text-[var(--text-ghost)] text-[13px] cursor-text py-6 flex items-center gap-2"
      >
        <span class="text-[var(--accent-dim)] opacity-50">|</span>
        Click to start writing...
      </div>
    {/if}
  </div>
</div>

<style>
  .md-preview {
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.75;
  }
  .md-preview :global(h1) {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 1.5em;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.6em;
    padding-bottom: 0.4em;
    border-bottom: 1px solid var(--border-subtle);
  }
  .md-preview :global(h2) {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 1.25em;
    font-weight: 600;
    color: var(--text-primary);
    margin: 1.4em 0 0.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border-subtle);
  }
  .md-preview :global(h3) {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 1.1em;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 1.2em 0 0.4em;
  }
  .md-preview :global(h4),
  .md-preview :global(h5),
  .md-preview :global(h6) {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 1em;
    font-weight: 600;
    color: var(--text-muted);
    margin: 1em 0 0.3em;
  }
  .md-preview :global(p) {
    margin: 0 0 0.8em;
  }
  .md-preview :global(p:last-child) {
    margin-bottom: 0;
  }
  .md-preview :global(ul),
  .md-preview :global(ol) {
    margin: 0 0 0.8em;
    padding-left: 1.5em;
  }
  .md-preview :global(li) {
    margin: 0.25em 0;
  }
  .md-preview :global(ul) {
    list-style: disc;
  }
  .md-preview :global(ol) {
    list-style: decimal;
  }
  .md-preview :global(code) {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 0.15em 0.4em;
    font-size: 0.88em;
    color: var(--accent);
  }
  .md-preview :global(pre) {
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 1em 1.2em;
    margin: 0 0 0.8em;
    overflow-x: auto;
  }
  .md-preview :global(pre code) {
    background: none;
    border: none;
    padding: 0;
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.7;
  }
  .md-preview :global(pre.shiki) {
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 1em 1.2em;
    margin: 0 0 0.8em;
    overflow-x: auto;
  }
  .md-preview :global(pre.shiki code) {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.7;
  }
  .md-preview :global(blockquote) {
    border-left: 3px solid var(--accent-dim);
    margin: 0 0 0.8em;
    padding: 0.5em 0 0.5em 1.2em;
    color: var(--text-secondary);
    background: var(--accent-subtle);
    border-radius: 0 8px 8px 0;
  }
  .md-preview :global(a) {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }
  .md-preview :global(a:hover) {
    border-bottom-color: var(--accent);
  }
  .md-preview :global(strong) {
    color: var(--text-primary);
    font-weight: 600;
  }
  .md-preview :global(em) {
    color: var(--text-secondary);
    font-style: italic;
  }
  .md-preview :global(hr) {
    border: none;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--border-subtle), transparent);
    margin: 1.5em 0;
  }
  .md-preview :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 0.8em;
    font-size: 12px;
  }
  .md-preview :global(th) {
    text-align: left;
    padding: 0.6em 1em;
    border-bottom: 2px solid var(--border-default);
    color: var(--text-secondary);
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }
  .md-preview :global(td) {
    padding: 0.5em 1em;
    border-bottom: 1px solid var(--border-subtle);
  }
  .md-preview :global(img) {
    max-width: 100%;
    border-radius: 10px;
  }
  .md-preview :global(input[type="checkbox"]) {
    margin-right: 0.4em;
    accent-color: var(--accent);
  }
  .md-preview :global(hr:first-child) {
    margin-top: 0;
  }
</style>
