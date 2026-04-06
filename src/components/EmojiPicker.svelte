<script lang="ts">
  import { emojiUrl } from '$lib/emoji';

  const { onSelect, onClose } = $props<{
    onSelect: (emoji: string) => void;
    onClose: () => void;
  }>();

  const EMOJIS: { label: string; items: string[] }[] = [
    {
      label: 'Tech',
      items: ['🤖','⚡','🔗','📋','🧩','✨','✅','👥','📌','🔌','🕐','⚙️','📏','📊','💻','🖥️','🖱️','⌨️','📱','🔧','🔨','🛠️','⚗️','🧪','🔬','🔭'],
    },
    {
      label: 'Files',
      items: ['📁','📂','📄','📃','📑','📝','🗒️','🗃️','🗂️','📦','🗄️','💾','💿','📀','🗑️','📎','📐','✂️'],
    },
    {
      label: 'Actions',
      items: ['🚀','🎯','🏁','🔄','↩️','↪️','⏩','⏪','▶️','⏹️','🔍','🔎','🔐','🔑','🔒','🔓','🛡️','⚠️','🚫','✔️','❌','➕','➖'],
    },
    {
      label: 'Symbols',
      items: ['⭐','🌟','💫','✴️','❇️','🎖️','🏆','🥇','💎','💡','🔆','🌈','🎨','🎭','🎪','🎬','🎤','🎵','🎶','🔔','🔕','📣','📢'],
    },
    {
      label: 'Nature',
      items: ['🌱','🌿','🍃','🌲','🌴','🌵','🍀','🌺','🌸','🌻','🌼','🍁','🍂','🐾','🦋','🌊','⛰️','🌍'],
    },
    {
      label: 'Objects',
      items: ['📚','📖','🗺️','🧭','🏠','🏗️','🏛️','🏟️','🎒','👜','🧳','🎁','🎀','🛒','💰','💳','📡','🧲','🪄'],
    },
  ];

  const NAMES: Record<string, string> = {
    '🤖':'robot','⚡':'lightning bolt','🔗':'link','📋':'clipboard','🧩':'puzzle','✨':'sparkles',
    '✅':'check','👥':'people','📌':'pin','🔌':'plug','🕐':'clock','⚙️':'gear','📏':'ruler',
    '📊':'chart','💻':'laptop','🖥️':'desktop','🖱️':'mouse','⌨️':'keyboard','📱':'phone',
    '🔧':'wrench','🔨':'hammer','🛠️':'tools','⚗️':'flask','🧪':'test tube','🔬':'microscope',
    '🔭':'telescope','📁':'folder','📂':'open folder','📄':'document','📃':'page','📑':'bookmark',
    '📝':'memo','🗒️':'notepad','🗃️':'card','🗂️':'tabs','📦':'package','🗄️':'cabinet','💾':'disk',
    '💿':'cd','📀':'dvd','🗑️':'trash','📎':'paperclip','📐':'triangle','✂️':'scissors',
    '🚀':'rocket','🎯':'target','🏁':'flag','🔄':'refresh','↩️':'back','↪️':'forward',
    '⏩':'fast forward','⏪':'rewind','▶️':'play','⏹️':'stop','🔍':'search','🔎':'magnify',
    '🔐':'lock key','🔑':'key','🔒':'lock','🔓':'unlock','🛡️':'shield','⚠️':'warning',
    '🚫':'no','✔️':'tick','❌':'cross','➕':'plus','➖':'minus','⭐':'star','🌟':'glowing star',
    '💫':'dizzy','✴️':'eight pointed','❇️':'sparkle','🎖️':'medal','🏆':'trophy','🥇':'gold',
    '💎':'gem','💡':'bulb','🔆':'brightness','🌈':'rainbow','🎨':'palette','🎭':'masks',
    '🎪':'circus','🎬':'clapper','🎤':'mic','🎵':'note','🎶':'notes','🔔':'bell','🔕':'no bell',
    '📣':'megaphone','📢':'speaker','🌱':'seedling','🌿':'herb','🍃':'leaves','🌲':'tree',
    '🌴':'palm','🌵':'cactus','🍀':'clover','🌺':'hibiscus','🌸':'blossom','🌻':'sunflower',
    '🌼':'flower','🍁':'maple','🍂':'fallen','🐾':'paw','🦋':'butterfly','🌊':'wave',
    '⛰️':'mountain','🌍':'earth','📚':'books','📖':'book','🗺️':'map','🧭':'compass',
    '🏠':'house','🏗️':'construction','🏛️':'building','🏟️':'stadium','🎒':'backpack',
    '👜':'bag','🧳':'luggage','🎁':'gift','🎀':'ribbon','🛒':'cart','💰':'money','💳':'card',
    '📡':'satellite','🧲':'magnet','🪄':'wand',
  };

  let search = $state('');

  const visibleEmojis = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EMOJIS;
    return EMOJIS.map(g => ({
      label: g.label,
      items: g.items.filter(e => (NAMES[e] ?? '').includes(q)),
    })).filter(g => g.items.length > 0);
  });

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role="dialog"
  aria-label="Emoji picker"
  onkeydown={handleKeydown}
  class="w-52 rounded-xl shadow-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] flex flex-col overflow-hidden"
  style="max-height: 280px;"
>
  <!-- Search -->
  <div class="px-2 pt-2 pb-1 shrink-0">
    <!-- svelte-ignore a11y_autofocus -->
    <input
      autofocus
      type="text"
      bind:value={search}
      placeholder="Search…"
      class="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:border-[var(--accent-dim)] transition-colors"
    />
  </div>

  <!-- Grid -->
  <div class="overflow-y-auto flex-1 px-1.5 pb-2">
    {#each visibleEmojis as group}
      <div class="mt-1.5">
        <div class="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-ghost)] px-1 mb-0.5">{group.label}</div>
        <div class="grid grid-cols-7 gap-0.5">
          {#each group.items as emoji}
            <button
              onclick={() => onSelect(emoji)}
              title={NAMES[emoji] ?? emoji}
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-3)] transition-colors"
            >
              <img src={emojiUrl(emoji)} alt={emoji} width="16" height="16" draggable="false" />
            </button>
          {/each}
        </div>
      </div>
    {/each}
    {#if visibleEmojis.length === 0}
      <p class="text-center text-[11px] text-[var(--text-ghost)] py-4">No results</p>
    {/if}
  </div>
</div>
