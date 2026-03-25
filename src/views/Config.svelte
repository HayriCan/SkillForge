<script lang="ts">
  import { onMount } from 'svelte';
  import { claudeDir, readFile, writeFile, getCreatedAt, findFiles, deleteFile } from '../lib/fs';
  import { pushHistory } from '../lib/history';
  import ContextMenu from '../components/ContextMenu.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';
  import MarkdownEditor from '../components/MarkdownEditor.svelte';

  const { onCount } = $props<{ onCount: (n: number) => void }>();

  type ConfigFile = {
    name: string;
    path: string;
    content: string;
    createdAt: Date | null;
    relativePath?: string;
  };

  let selected = $state<ConfigFile | null>(null);
  let editContent = $state('');
  let dirty = $state(false);
  let ctxMenu = $state<ReturnType<typeof ContextMenu>>();
  let ctxItems = $state<{ label: string; action: () => void; variant?: 'danger' }[]>([]);
  let confirmModal = $state<ReturnType<typeof ConfirmModal>>();

  // --- Tree ---
  type TreeNode = {
    name: string;
    fullPath?: string;
    relativePath?: string;
    children: TreeNode[];
    isFile: boolean;
    fileType?: 'claude' | 'memory';
    counts?: {
      claude: number;
      memory: number;
      total: number;
    };
  };

  let treeRoot = $state<TreeNode[]>([]);
  let treeLoading = $state(false);
  let expandedPaths = $state<Set<string>>(new Set());

  function buildTree(filePaths: { name: string; path: string; relativePath: string }[]): TreeNode[] {
    const root: TreeNode = { name: '', children: [], isFile: false };

    for (const file of filePaths) {
      const parts = file.relativePath.split('/');
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        if (isLast) {
          current.children.push({
            name: part,
            fullPath: file.path,
            relativePath: file.relativePath,
            children: [],
            isFile: true,
            fileType: part === 'CLAUDE.md' ? 'claude' : 'memory',
          });
        } else {
          let child = current.children.find((c) => !c.isFile && c.name === part);
          if (!child) {
            child = { name: part, children: [], isFile: false };
            current.children.push(child);
          }
          current = child;
        }
      }
    }

    function sortNodes(nodes: TreeNode[]) {
      nodes.sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (!node.isFile) sortNodes(node.children);
      }
    }

    function attachCounts(node: TreeNode): { claude: number; memory: number; total: number } {
      if (node.isFile) {
        const claude = node.fileType === 'claude' ? 1 : 0;
        const memory = node.fileType === 'memory' ? 1 : 0;
        const counts = { claude, memory, total: 1 };
        node.counts = counts;
        return counts;
      }

      let claude = 0;
      let memory = 0;
      let total = 0;

      for (const child of node.children) {
        const childCounts = attachCounts(child);
        claude += childCounts.claude;
        memory += childCounts.memory;
        total += childCounts.total;
      }

      const counts = { claude, memory, total };
      node.counts = counts;
      return counts;
    }

    sortNodes(root.children);
    for (const node of root.children) attachCounts(node);
    return root.children;
  }

  function toggleExpand(path: string) {
    const next = new Set(expandedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    expandedPaths = next;
  }

  async function selectFile(path: string, name: string, relativePath?: string) {
    try {
      const content = await readFile(path);
      const createdAt = await getCreatedAt(path);
      selected = { name, path, content, createdAt, relativePath };
      editContent = content;
      dirty = false;
    } catch (e) {
      console.error('[Config] Failed to read:', e);
    }
  }

  async function save() {
    if (!selected) return;
    pushHistory(selected.path, selected.content);
    await writeFile(selected.path, editContent);
    selected = { ...selected, content: editContent };
    dirty = false;
  }

  function discard() {
    if (selected) editContent = selected.content;
    dirty = false;
  }

  async function removeFile(path: string, label: string) {
    const ok = await confirmModal?.confirm('Delete File', `Are you sure you want to delete "${label}"?`);
    if (!ok) return;
    try {
      await deleteFile(path);
      if (selected?.path === path) {
        selected = null;
        editContent = '';
        dirty = false;
      }
      await loadTree();
    } catch (e) {
      console.error('[Config] Delete failed:', e);
    }
  }

  async function loadTree() {
    treeLoading = true;
    try {
      const base = await claudeDir();
      const found = await findFiles(base, ['CLAUDE.md', 'MEMORY.md']);
      treeRoot = buildTree(found);
      onCount(found.length);
      const toExpand = new Set<string>();
      for (const node of treeRoot) {
        if (!node.isFile) {
          toExpand.add(node.name);
          for (const child of node.children) {
            if (!child.isFile) toExpand.add(`${node.name}/${child.name}`);
          }
        }
      }
      expandedPaths = toExpand;
    } catch (e) {
      console.error('[Config] Tree load failed:', e);
    }
    treeLoading = false;
  }

  function showContextMenu(event: MouseEvent, path: string, label?: string) {
    ctxItems = [
      { label: 'Copy Path', action: () => navigator.clipboard.writeText(path) },
      { label: 'Delete', action: () => removeFile(path, label ?? path), variant: 'danger' },
    ];
    ctxMenu?.show(event);
  }

  onMount(loadTree);
</script>

<div class="flex gap-0 h-full min-h-0">
  <!-- Tree panel -->
  <div class="shrink-0 flex flex-col min-h-0 min-w-[220px] max-w-[50%] border-r border-[var(--border-subtle)] bg-[var(--surface-1)]/30">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
      <h2 class="text-[var(--text-secondary)] text-[13px] font-semibold whitespace-nowrap">CLAUDE.md / MEMORY.md</h2>
      <button onclick={loadTree} class="text-[10px] text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors">Refresh</button>
    </div>
    <div class="flex-1 overflow-y-auto">
      {#if treeLoading}
        <div class="text-[13px] text-[var(--text-ghost)] px-4 py-6 text-center animate-pulse-dot">Scanning...</div>
      {:else if treeRoot.length === 0}
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in-up">
          <div class="text-2xl text-[var(--text-ghost)] mb-3 opacity-50">⚙</div>
          <div class="text-[13px] text-[var(--text-ghost)]">No config files found</div>
        </div>
      {:else}
        <div class="stagger-list">
          {#snippet treeNodes(nodes: TreeNode[], depth: number, parentPath: string[])}
            {#each nodes as node}
              {@const nodePath = [...parentPath, node.name].join('/')}
              {#if node.isFile}
                <button
                  onclick={() => selectFile(node.fullPath!, node.name, node.relativePath)}
                  oncontextmenu={(e) => showContextMenu(e, node.fullPath!, node.relativePath ?? node.name)}
                  class="group min-w-full w-max text-left py-2 pr-4 border-b border-[var(--border-subtle)] transition-all duration-200 flex items-center gap-2 relative
                         {selected?.path === node.fullPath ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'}"
                  style="padding-left: {depth * 16 + 12}px"
                >
                  {#if selected?.path === node.fullPath}
                    <div class="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent)]"></div>
                  {/if}
                  <span class="w-5 h-5 rounded-md text-center shrink-0 text-[10px] font-semibold flex items-center justify-center
                               {node.fileType === 'claude'
                                 ? 'text-blue-400 bg-blue-400/10'
                                 : 'text-emerald-400 bg-emerald-400/10'}">
                    {node.fileType === 'claude' ? 'C' : 'M'}
                  </span>
                  <span class="text-[12px] whitespace-nowrap {selected?.path === node.fullPath ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}">
                    {node.name}
                  </span>
                </button>
              {:else}
                {@const isExpanded = expandedPaths.has(nodePath)}
                <button
                  onclick={() => toggleExpand(nodePath)}
                  class="min-w-full w-max text-left py-2 pr-4 border-b border-[var(--border-subtle)] transition-all duration-200 flex items-center gap-2 hover:bg-[var(--surface-2)]"
                  style="padding-left: {depth * 16 + 12}px"
                >
                  <span class="w-4 text-center shrink-0 text-[10px] text-[var(--text-ghost)] transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}">&#9656;</span>
                  <span class="text-[12px] whitespace-nowrap text-[var(--text-muted)]">{node.name}</span>
                  <span class="shrink-0 flex items-center gap-2 text-[9px] ml-2">
                    {#if (node.counts?.claude ?? 0) > 0}
                      <span class="text-blue-400/70 bg-blue-400/5 px-1.5 py-0.5 rounded">C {node.counts?.claude}</span>
                    {/if}
                    {#if (node.counts?.memory ?? 0) > 0}
                      <span class="text-emerald-400/70 bg-emerald-400/5 px-1.5 py-0.5 rounded">M {node.counts?.memory}</span>
                    {/if}
                  </span>
                </button>
                {#if isExpanded}
                  {@render treeNodes(node.children, depth + 1, [...parentPath, node.name])}
                {/if}
              {/if}
            {/each}
          {/snippet}
          {@render treeNodes(treeRoot, 0, [])}
        </div>
      {/if}
    </div>
  </div>

  <!-- Editor -->
  {#if selected}
    <div class="flex-1 min-w-0 flex flex-col min-h-0 px-5 py-4 animate-fade-in">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-[var(--text-primary)] text-sm font-semibold truncate">{selected.name}</span>
          <span class="text-[10px] text-[var(--text-ghost)] truncate font-mono">{selected.relativePath ?? selected.name}</span>
          {#if dirty}
            <span class="text-[10px] text-[var(--warning)] shrink-0 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse-dot"></span>
              unsaved
            </span>
          {/if}
        </div>
      </div>
      <MarkdownEditor bind:value={editContent} oninput={() => { dirty = editContent !== selected?.content; }} />
      {#if dirty}
        <div class="flex gap-2 mt-3 animate-fade-in">
          <button onclick={save} class="px-4 py-2 bg-[var(--accent-dim)] hover:bg-[var(--accent)] rounded-lg text-[13px] text-[var(--surface-0)] font-semibold transition-all duration-200 shadow-lg shadow-teal-900/20">Save</button>
          <button onclick={discard} class="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Discard</button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center animate-fade-in-up">
        <div class="text-3xl text-[var(--text-ghost)] mb-3 opacity-50">⚙</div>
        <span class="text-[13px] text-[var(--text-ghost)]">Select a config file</span>
      </div>
    </div>
  {/if}
</div>

<ContextMenu bind:this={ctxMenu} items={ctxItems} />
<ConfirmModal bind:this={confirmModal} />
