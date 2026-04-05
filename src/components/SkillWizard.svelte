<script lang="ts">
  import { writeFile, claudeDir, ensureDir } from '../lib/fs';
  import {
    SKILL_TEMPLATES, TRIGGER_OPTIONS, validateSkillName, toKebabCase,
    generateDescription, generateSkillFile, getSkillDir,
    type SkillDraft, type SkillTemplateId
  } from '../lib/skillTemplates';
  import { addToast } from '../lib/toast.svelte';
  import { t } from '../lib/i18n.svelte';

  const { onClose, onSaved } = $props<{ onClose: () => void; onSaved: (name: string) => void }>();

  let step = $state(1);
  let draft = $state<SkillDraft>({
    name: '', purpose: '', description: '', templateId: 'simple',
    sectionContent: {}, targetCli: 'claude'
  });
  let nameError = $state<string | null>(null);
  let selectedTriggers = $state<string[]>([]);
  let saving = $state(false);
  let nameInput = $state('');

  function handleNameInput(val: string) {
    nameInput = val;
    draft.name = toKebabCase(val);
    nameError = validateSkillName(draft.name);
  }

  function toggleTrigger(id: string) {
    if (selectedTriggers.includes(id)) {
      selectedTriggers = selectedTriggers.filter(t => t !== id);
    } else {
      selectedTriggers = [...selectedTriggers, id];
    }
    if (selectedTriggers.length > 0 && !draft.description) {
      draft.description = generateDescription(selectedTriggers);
    }
  }

  async function save() {
    saving = true;
    try {
      const dir = await claudeDir();
      const skillDir = getSkillDir(dir);
      const skillFolder = `${skillDir}/${draft.name}`;
      await ensureDir(skillFolder);
      const content = generateSkillFile(draft);
      await writeFile(`${skillFolder}/SKILL.md`, content);
      onSaved(draft.name);
    } catch (e) {
      addToast(`Failed to save skill: ${e}`, 'error');
    } finally {
      saving = false;
    }
  }

  const currentTemplate = $derived(SKILL_TEMPLATES.find(t => t.id === draft.templateId)!);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
  <!-- Backdrop -->
  <button
    class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
    aria-label="Close"
    onclick={onClose}
  ></button>

  <!-- Modal -->
  <div role="dialog" aria-modal="true" class="relative bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg shadow-2xl shadow-black/15 p-6 w-[680px] max-h-[85vh] overflow-y-auto animate-scale-in">

    <!-- Stepper -->
    <div class="flex items-center gap-2 mb-6">
      {#each [1,2,3,4,5] as s}
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all
          {s < step ? 'bg-[var(--accent)] text-[var(--surface-0)]' :
           s === step ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)] text-[var(--accent)]' :
           'bg-[var(--surface-3)] text-[var(--text-ghost)]'}">
          {s}
        </div>
        {#if s < 5}<div class="flex-1 h-px bg-[var(--border-subtle)]"></div>{/if}
      {/each}
    </div>

    <!-- Step 1: Basic Info -->
    {#if step === 1}
      <h3 class="text-[15px] font-semibold text-[var(--text-primary)] mb-4">{t('wizard.basic_info')}</h3>

      <div class="space-y-4">
        <div>
          <label class="block text-[12px] text-[var(--text-secondary)] mb-1.5 font-medium">Skill Name</label>
          <input
            type="text"
            value={nameInput}
            oninput={(e) => handleNameInput(e.currentTarget.value)}
            placeholder="my-skill-name"
            class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-dim)] transition-colors"
          />
          {#if draft.name}
            <div class="text-[11px] font-mono text-[var(--text-ghost)] mt-1">{draft.name}</div>
          {/if}
          {#if nameError && nameInput}
            <div class="text-[11px] text-[var(--danger)] mt-1">{nameError}</div>
          {/if}
        </div>

        <div>
          <label class="block text-[12px] text-[var(--text-secondary)] mb-1.5 font-medium">Purpose</label>
          <textarea
            bind:value={draft.purpose}
            placeholder="What does this skill do?"
            rows="3"
            class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none resize-none focus:border-[var(--accent-dim)] transition-colors"
          ></textarea>
        </div>

        <div>
          <label class="block text-[12px] text-[var(--text-secondary)] mb-1.5 font-medium">Target CLI</label>
          <div class="flex gap-2">
            {#each (['claude', 'codex', 'gemini', 'all'] as const) as cli}
              <button
                onclick={() => { draft.targetCli = cli; }}
                class="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border
                  {draft.targetCli === cli
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent-dim)] text-[var(--accent)]'
                    : 'bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}"
              >
                {cli.charAt(0).toUpperCase() + cli.slice(1)}
              </button>
            {/each}
          </div>
        </div>
      </div>

    <!-- Step 2: Trigger Conditions -->
    {:else if step === 2}
      <h3 class="text-[15px] font-semibold text-[var(--text-primary)] mb-4">{t('wizard.triggers')}</h3>

      <div class="grid grid-cols-2 gap-2 mb-4">
        {#each TRIGGER_OPTIONS as trigger}
          <button
            onclick={() => toggleTrigger(trigger.id)}
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors border text-left
              {selectedTriggers.includes(trigger.id)
                ? 'bg-[var(--accent-subtle)] border-[var(--accent-dim)] text-[var(--accent)]'
                : 'bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}"
          >
            <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0
              {selectedTriggers.includes(trigger.id)
                ? 'bg-[var(--accent)] border-[var(--accent)]'
                : 'border-[var(--border-default)]'}">
              {#if selectedTriggers.includes(trigger.id)}
                <svg class="w-3 h-3 text-[var(--surface-0)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              {/if}
            </span>
            {trigger.label}
          </button>
        {/each}
      </div>

      <div>
        <label class="block text-[12px] text-[var(--text-secondary)] mb-1.5 font-medium">Description</label>
        <textarea
          bind:value={draft.description}
          placeholder="Describe when this skill should activate..."
          rows="3"
          class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none resize-none focus:border-[var(--accent-dim)] transition-colors"
        ></textarea>
      </div>

    <!-- Step 3: Choose Template -->
    {:else if step === 3}
      <h3 class="text-[15px] font-semibold text-[var(--text-primary)] mb-4">{t('wizard.template')}</h3>

      <div class="grid grid-cols-2 gap-3">
        {#each SKILL_TEMPLATES as tpl}
          <button
            onclick={() => { draft.templateId = tpl.id; }}
            class="text-left p-4 rounded-lg border transition-all
              {draft.templateId === tpl.id
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-2)] hover:border-[var(--border-default)]'}"
          >
            <div class="text-[13px] font-semibold text-[var(--text-primary)] mb-1">{tpl.label}</div>
            <div class="text-[11px] text-[var(--text-muted)] mb-2">{tpl.description}</div>
            <div class="flex flex-wrap gap-1">
              {#each tpl.sections as section}
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-ghost)]">{section.key}</span>
              {/each}
            </div>
          </button>
        {/each}
      </div>

    <!-- Step 4: Content -->
    {:else if step === 4}
      <h3 class="text-[15px] font-semibold text-[var(--text-primary)] mb-4">{t('wizard.content')}</h3>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-3">
          {#each currentTemplate.sections as section}
            <div>
              <label class="block text-[12px] text-[var(--text-secondary)] mb-1.5 font-medium">{section.label}</label>
              <textarea
                value={draft.sectionContent[section.key] ?? ''}
                oninput={(e) => { draft.sectionContent[section.key] = e.currentTarget.value; }}
                placeholder={section.placeholder}
                rows="4"
                class="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none resize-none focus:border-[var(--accent-dim)] transition-colors"
              ></textarea>
            </div>
          {/each}
        </div>
        <div class="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-4 overflow-auto max-h-[50vh]">
          <div class="text-[10px] text-[var(--text-ghost)] font-medium mb-2 uppercase tracking-wider">Preview</div>
          <pre class="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-words">{generateSkillFile(draft)}</pre>
        </div>
      </div>

    <!-- Step 5: Save -->
    {:else if step === 5}
      <h3 class="text-[15px] font-semibold text-[var(--text-primary)] mb-4">{t('wizard.save')}</h3>

      <div class="mb-4">
        <div class="text-[12px] text-[var(--text-secondary)] mb-2">File will be created at:</div>
        <div class="text-[12px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-3 py-2 rounded-lg">
          ~/.claude/skills/{draft.name}/SKILL.md
        </div>
      </div>

      <div class="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg p-4 overflow-auto max-h-[50vh]">
        <pre class="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-words">{generateSkillFile(draft)}</pre>
      </div>
    {/if}

    <!-- Footer -->
    <div class="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-subtle)]">
      <button
        onclick={onClose}
        class="px-4 py-1.5 rounded text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors"
      >
        {t('cancel')}
      </button>

      <div class="flex gap-2">
        {#if step > 1}
          <button
            onclick={() => { step--; }}
            class="px-4 py-1.5 rounded text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors"
          >
            {t('wizard.back')}
          </button>
        {/if}

        {#if step < 5}
          <button
            onclick={() => { step++; }}
            disabled={step === 1 && (!!nameError || !draft.name)}
            class="px-4 py-1.5 rounded text-[13px] font-medium bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('wizard.next')}
          </button>
        {:else}
          <button
            onclick={save}
            disabled={saving}
            class="px-4 py-1.5 rounded text-[13px] font-medium bg-[var(--accent-dim)] hover:bg-[var(--accent)] text-[var(--surface-0)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : t('wizard.save_skill')}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
