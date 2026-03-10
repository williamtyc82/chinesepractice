import { createNavBar } from '../components/nav.js';
import { getCompletedVocabulary } from '../lib/supabase.js';

export async function renderRevision(container) {
  const completedVocab = await getCompletedVocabulary();

  // Group by chapter (Lesson)
  const grouped = completedVocab.reduce((acc, v) => {
    const cat = v.chapter || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {});

  const sortedLabels = Object.keys(grouped).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return parseInt(a) - parseInt(b);
  });

  let contentHtml = '';

  if (sortedLabels.length === 0) {
    contentHtml = `
      <div class="flex h-full w-full flex-col items-center justify-center p-6 text-center opacity-50">
        <span class="material-symbols-outlined text-6xl text-ink-light mb-4">history</span>
        <h2 class="text-xl font-display italic text-ink mb-2">No completed phrases yet</h2>
        <p class="text-xs uppercase tracking-widest text-ink-light max-w-xs">Finish practicing some phrases in the Practice tab to see them here.</p>
      </div>
    `;
  } else {
    contentHtml = sortedLabels.map(label => {
      const title = label === 'Uncategorized' ? 'Uncategorized' : 'Lesson ' + label;
      
      const cardsHtml = grouped[label].map(v => `
        <div class="bg-surface border border-paper-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between items-start w-full relative">
          <button data-text="${v.word}" class="btn-pronounce absolute top-4 right-4 p-2 rounded-full text-ink-light group-hover:bg-primary/5 group-hover:text-primary transition-colors flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[20px]">volume_up</span>
          </button>
          
          <div class="pr-10 w-full mb-3">
            <h3 class="text-2xl font-chinese font-bold text-ink mb-1 mr-4">${v.word}</h3>
            <p class="text-[10px] font-sans tracking-widest text-ink-light uppercase break-words">${v.pinyin}</p>
          </div>
          <div class="pt-3 border-t border-paper-border w-full">
            <p class="text-xs font-serif italic text-ink-light break-words">${v.meaning}</p>
          </div>
        </div>
      `).join('');

      const safeLabel = label.toString().replace(/\s+/g, '-');
      return `
        <div class="mb-10">
          <h2 class="text-xs font-bold text-ink uppercase tracking-widest mb-4 flex items-center justify-between border-b border-paper-border pb-2 cursor-pointer group-header transition-colors hover:text-primary group" data-lesson="${safeLabel}">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px] text-primary">bookmark</span>
              <span class="text-ink group-hover:text-primary transition-colors">${title}</span> <span class="text-ink-light font-normal normal-case ml-2">(${grouped[label].length})</span>
            </div>
            <span class="material-symbols-outlined text-[16px] text-ink-light transition-transform duration-200 transform -rotate-90 group-icon">expand_more</span>
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 group-row-${safeLabel} hidden">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light">
      <!-- Scrollable content area -->
      <div class="flex-1 overflow-y-auto px-6 py-10 md:px-12 relative custom-scrollbar pb-32 md:pb-40">
        <header class="mb-8 border-b border-paper-border pb-6">
          <h1 class="text-3xl font-display font-semibold italic text-ink tracking-tight flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-3xl font-variation-fill">history_edu</span>
            Revision
          </h1>
          <p class="text-ink-light mt-2 font-serif text-sm">Review vocabulary phrases you have completed.</p>
        </header>

        ${contentHtml}
      </div>

      <!-- Bottom Nav Bar -->
      <div class="absolute bottom-0 left-0 w-full z-30">
        ${await createNavBar('revision')}
      </div>
    </div>
  `;

  // Attach event listeners for pronunciation
  document.querySelectorAll('.btn-pronounce').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.currentTarget.dataset.text;
      if ('speechSynthesis' in window && text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      } else if (!('speechSynthesis' in window)) {
        console.warn("Speech Synthesis is not supported in this browser.");
      }
    });
  });

  // Collapsible logic
  document.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      const lesson = e.currentTarget.dataset.lesson;
      const content = document.querySelector(`.group-row-${lesson}`);
      const icon = e.currentTarget.querySelector('.group-icon');
      
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.remove('-rotate-90');
      } else {
        content.classList.add('hidden');
        icon.classList.add('-rotate-90');
      }
    });
  });
}
