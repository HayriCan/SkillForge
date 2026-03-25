<script lang="ts">
  import { onMount } from 'svelte';

  type MenuItem = {
    label: string;
    action: () => void;
    variant?: 'danger';
  };

  let {
    items = [],
  }: {
    items: MenuItem[];
  } = $props();

  let visible = $state(false);
  let x = $state(0);
  let y = $state(0);
  let portalEl: HTMLDivElement | undefined = $state();

  const MENU_H = 100;
  const MENU_W = 170;

  /**
   * Show the context menu at the given position.
   */
  export function show(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    let fx = event.clientX;
    let fy = event.clientY;

    if (fx + MENU_W > window.innerWidth) fx = fx - MENU_W;
    if (fy + MENU_H > window.innerHeight) fy = fy - MENU_H;
    if (fx < 4) fx = 4;
    if (fy < 4) fy = 4;

    x = fx;
    y = fy;
    visible = true;
  }

  function hide() {
    visible = false;
  }

  function handleClick(action: () => void) {
    action();
    hide();
  }

  onMount(() => {
    // Portal: move element to body so it escapes overflow/transform ancestors
    if (portalEl) {
      document.body.appendChild(portalEl);
    }

    const onClick = () => { if (visible) hide(); };
    const onContext = () => { if (visible) hide(); };
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContext, true);

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContext, true);
      if (portalEl && portalEl.parentNode === document.body) {
        document.body.removeChild(portalEl);
      }
    };
  });
</script>

<div bind:this={portalEl} class="contents">
  {#if visible}
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      class="fixed inset-0 z-[9999]"
      onclick={() => hide()}
      oncontextmenu={(e) => { e.preventDefault(); hide(); }}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      role="menu"
      tabindex="-1"
      class="fixed z-[10000] min-w-[160px] border border-[var(--border-default)] rounded-md bg-[var(--surface-0)] shadow-xl shadow-black/10 py-1 animate-scale-in"
      style="left:{x}px; top:{y}px;"
      onclick={(e) => e.stopPropagation()}
      oncontextmenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      {#each items as item, i}
        {#if i > 0 && item.variant === 'danger'}
          <div class="my-1 mx-2 h-px bg-[var(--border-subtle)]"></div>
        {/if}
        <button
          onclick={() => handleClick(item.action)}
          class="w-full text-left px-3 py-1.5 text-[13px] transition-colors duration-100
                 {item.variant === 'danger'
                   ? 'text-[var(--danger)] hover:bg-[var(--danger)]/8'
                   : 'text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white'}"
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
