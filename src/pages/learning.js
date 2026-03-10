import { createHanziBox } from '../components/HanziBox.js';
import { createNavBar } from '../components/nav.js';
import { getVocabulary, updateUserProgress } from '../lib/supabase.js';
import { fireConfetti } from '../effects/confetti.js';

export async function renderLearningView(container, params) {
  const vocabulary = await getVocabulary();
  
  const wordId = params ? params.get('id') : null;
  const categoryId = params ? params.get('category') : null;

  // Render Category Selection if no specific word or category is chosen
  if (!wordId && !categoryId) {
    // Group vocabulary by chapter/category
    const categories = {};
    vocabulary.forEach(v => {
      const cat = v.chapter || 'Uncategorized';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(v);
    });

    const categoryKeys = Object.keys(categories).sort();

    if (categoryKeys.length === 0) {
      container.innerHTML = `
        <div class="flex h-screen w-full flex-col items-center justify-center bg-background-light p-6 text-center">
          <span class="material-symbols-outlined text-6xl text-ink-light font-variation-fill mb-6">menu_book</span>
          <h2 class="text-2xl font-display italic text-ink mb-3">No phrases found</h2>
          <p class="text-ink-light mb-8 max-w-xs text-sm">Your curriculum is currently empty. Visit the Admin panel to curate new practice material.</p>
          <a href="#admin" class="border border-ink text-ink hover:bg-ink hover:text-surface px-6 py-3 transition-colors btn-elegant text-xs uppercase tracking-widest font-bold">
            Manage Dictionary
          </a>
          <div class="mt-8 w-full absolute bottom-0 left-0">
             ${await createNavBar('practice')}
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light">
        <div class="flex-1 overflow-y-auto px-6 py-10 md:px-12 relative custom-scrollbar">
          <header class="mb-10 border-b border-paper-border pb-6">
            <h1 class="text-3xl font-display font-semibold italic text-ink tracking-tight">Curriculum</h1>
            <p class="text-ink-light mt-2 font-serif text-sm">Select a category to begin practice.</p>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
            ${categoryKeys.map(cat => `
              <a href="#practice?category=${encodeURIComponent(cat)}" class="group block bg-surface border border-paper-border rounded-xl p-6 shadow-sm hover:border-primary transition-all">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-display font-bold text-ink group-hover:text-primary transition-colors">${cat === 'Uncategorized' ? 'Uncategorized' : 'Category ' + cat}</h3>
                  <span class="material-symbols-outlined text-ink-light group-hover:text-primary transition-colors">arrow_forward</span>
                </div>
                <div class="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-light font-bold">
                  <span class="material-symbols-outlined text-[14px]">format_list_bulleted</span>
                  ${categories[cat].length} Phrase${categories[cat].length > 1 ? 's' : ''}
                </div>
              </a>
            `).join('')}
          </div>
        </div>
        ${await createNavBar('practice')}
      </div>
    `;
    return;
  }

  // Filter vocabulary if category is selected
  let activeVocabulary = vocabulary;
  if (categoryId) {
    activeVocabulary = vocabulary.filter(v => (v.chapter == categoryId || (categoryId === 'Uncategorized' && !v.chapter)));
  }

  let phraseData = null;
  if (wordId) {
    phraseData = activeVocabulary.find(v => v.id === wordId);
  }
  if (!phraseData && activeVocabulary.length > 0) {
    phraseData = activeVocabulary[0];
  }

  if (!phraseData) {
    window.location.hash = '#practice';
    return;
  }

  // --- Phrase Logic Setup ---
  // A phrase might be "一片安静". We need to iterate over characters.
  const characters = Array.from(phraseData.word);
  let currentCharIndex = 0;
  let totalMistakesForPhrase = 0;
  
  // Create visually split phrase for highlighting
  const phraseCharsHtml = characters.map((char, i) => `
    <span id="phrase-char-${i}" class="transition-colors duration-300 ${i === 0 ? 'text-primary' : 'text-ink-light'}">${char}</span>
  `).join('');

  container.innerHTML = `
    <!-- Top Header -->
    <header class="flex items-center px-6 py-5 justify-between bg-surface/80 backdrop-blur-md sticky top-0 z-10 border-b border-paper-border/50">
      <button id="btn-close" class="flex items-center justify-center p-2 rounded-full hover:bg-background-light transition-colors group">
        <span class="material-symbols-outlined text-ink group-hover:text-primary transition-colors text-[24px]">arrow_back</span>
      </button>
      <div class="flex-1 px-4 text-center">
        <span class="text-[10px] font-bold tracking-widest uppercase text-ink-light block mb-0.5">${phraseData.chapter ? 'Chapter ' + phraseData.chapter : 'Practice Session'}</span>
        <div class="w-24 h-1 bg-paper-border rounded-full mx-auto overflow-hidden mt-1.5">
          <div id="progress-bar" class="h-full bg-primary transition-all duration-300" style="width: ${(1 / characters.length) * 100}%"></div>
        </div>
      </div>
      <button id="btn-sound" class="flex items-center justify-center p-2 rounded-full hover:bg-background-light transition-colors group">
        <span class="material-symbols-outlined text-ink group-hover:text-primary transition-colors text-[24px]">volume_up</span>
      </button>
    </header>

    <main class="flex-1 overflow-y-auto w-full flex flex-col pt-8 pb-32">
      <!-- Phrase Meta Info -->
      <div class="w-full max-w-sm mx-auto px-6 text-center mb-10 flex flex-col items-center">
        <!-- Pinyin -->
        <span id="pinyin-display" class="text-sm font-sans tracking-widest text-ink-light uppercase mb-3">${phraseData.pinyin}</span>
        
        <!-- Large Interactive Phrase Display -->
        <h1 id="phrase-display" class="text-5xl md:text-6xl font-chinese font-black tracking-widest mb-4 flex gap-1 justify-center leading-tight">
          ${phraseCharsHtml}
        </h1>
        
        <!-- English Meaning -->
        <span id="meaning-display" class="text-sm font-serif italic text-ink-light px-4 py-2 border-y border-paper-border/50">${phraseData.meaning}</span>
      </div>

      <!-- Canvas Area -->
      <div class="w-full flex-1 flex flex-col items-center justify-center px-6 relative">
        <div class="w-full max-w-[320px] aspect-square relative bg-white border shadow-elegant flex items-center justify-center" id="writing-canvas-container" style="border-color: #e5e5e5;">
          
          <!-- Rice paper grid -->
          <div class="absolute inset-0 pointer-events-none opacity-[0.15]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#d32f2f" stroke-width="1.5" stroke-dasharray="8 8" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#d32f2f" stroke-width="1.5" stroke-dasharray="8 8" />
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d32f2f" stroke-width="1" stroke-dasharray="4 4" />
              <line x1="100%" y1="0" x2="0" y2="100%" stroke="#d32f2f" stroke-width="1" stroke-dasharray="4 4" />
              <rect width="100%" height="100%" fill="none" stroke="#d32f2f" stroke-width="6" />
            </svg>
          </div>

          <!-- Active Character Ghost -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <span id="ghost-char" class="text-[14rem] font-chinese font-black text-ink">${characters[0]}</span>
          </div>
          
          <!-- HanziWriter Injection -->
        </div>

        <!-- Toolbar -->
        <div class="flex items-center justify-between w-full max-w-[320px] mt-6">
          <button id="btn-prev-phrase" class="flex items-center justify-center p-2 rounded-full hover:bg-background-light text-ink-light hover:text-primary transition-colors" title="Previous Phrase">
            <span class="material-symbols-outlined text-[20px]">skip_previous</span>
          </button>

          <div class="flex items-center gap-6">
            <button id="btn-show-strokes" class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-light hover:text-primary transition-colors group">
              <span class="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform duration-500">replay</span>
              Guide
            </button>
            <button id="btn-clear" class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-light hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-[16px]">ink_eraser</span>
              Clear
            </button>
          </div>

          <button id="btn-next-skip-phrase" class="flex items-center justify-center p-2 rounded-full hover:bg-background-light text-ink-light hover:text-primary transition-colors" title="Next Phrase">
            <span class="material-symbols-outlined text-[20px]">skip_next</span>
          </button>
        </div>
      </div>
      
      <!-- Done State Overlay (Hidden initially) -->
      <div id="done-state" class="hidden absolute inset-0 bg-surface/90 backdrop-blur-sm z-20 flex-col items-center justify-center p-6 text-center page-enter">
        <div class="size-24 rounded-full border border-paper-border shadow-elegant flex items-center justify-center bg-white mb-6">
          <span class="stamp-effect text-3xl">完</span>
        </div>
        <h2 class="text-3xl font-display italic text-ink mb-2">Mastery Achieved</h2>
        <div id="final-stars" class="flex gap-1 text-primary mb-6"></div>
        <div class="flex gap-3 w-full max-w-xs">
          <button id="btn-practice-again" class="flex-1 py-3 border border-ink-light/30 text-ink-light text-xs font-bold uppercase tracking-widest hover:bg-background-light transition-colors">
            Repeat
          </button>
          <button id="btn-next-phrase" class="flex-1 py-3 bg-ink text-surface text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors btn-elegant">
            Next Phrase
          </button>
        </div>
      </div>
    </main>

    <!-- Bottom Nav Bar -->
    <div class="absolute bottom-0 left-0 w-full z-30">
      ${await createNavBar('practice')}
    </div>
  `;

  // === Logic ===
  const canvasContainer = document.getElementById('writing-canvas-container');
  const progressBar = document.getElementById('progress-bar');
  const ghostChar = document.getElementById('ghost-char');
  const phraseDisplayChars = characters.map((_, i) => document.getElementById(`phrase-char-${i}`));
  const doneState = document.getElementById('done-state');
  const finalStarsContainer = document.getElementById('final-stars');
  
  let hanziBox = null;

  function _calculateStars(mistakes, totalChars) {
    // scale mistakes per character roughly
    const avgMistakes = mistakes / totalChars;
    if (avgMistakes < 1) return 5;
    if (avgMistakes <= 2) return 4;
    if (avgMistakes <= 4) return 3;
    if (avgMistakes <= 6) return 2;
    return 1;
  }

  function advanceToNextCharacter() {
    currentCharIndex++;
    
    if (currentCharIndex >= characters.length) {
      // Phrase completely finished
      handlePhraseComplete();
      return;
    }

    // Update UI for next char
    const pct = ((currentCharIndex + 1) / characters.length) * 100;
    progressBar.style.width = `${pct}%`;
    ghostChar.innerText = characters[currentCharIndex];

    phraseDisplayChars.forEach((el, i) => {
      if (i === currentCharIndex) {
        el.className = "transition-colors duration-300 text-primary scale-110 inline-block";
      } else if (i < currentCharIndex) {
        el.className = "transition-colors duration-300 text-ink"; // Done
      } else {
        el.className = "transition-colors duration-300 text-ink-light"; // Upcoming
      }
    });

    // We do NOT completely recreate HanziBox, we just set Character to avoid re-binding events and breaking the UI
    // BUT HanziBox.js creates a new writer internally when calling startQuiz. Actually HanziWrite setCharacter works.
    if (hanziBox) {
      hanziBox.setCharacter(characters[currentCharIndex]);
    }
  }

  async function handlePhraseComplete() {
    fireConfetti();
    doneState.classList.remove('hidden');
    doneState.classList.add('flex');
    
    const stars = _calculateStars(totalMistakesForPhrase, characters.length);
    finalStarsContainer.innerHTML = Array.from({length: 5}).map((_, i) => 
      `<span class="material-symbols-outlined text-[24px]" ${i < stars ? 'style="font-variation-settings: \\\'FILL\\\' 1"' : ''}>star</span>`
    ).join('');

    try {
      // Save full phrase to supabase
      await updateUserProgress(phraseData.word, totalMistakesForPhrase, stars);
    } catch (e) {
      console.warn("Could not save progress natively", e);
    }
  }

  requestAnimationFrame(() => {
    // Using classic colors for HanziBox
    hanziBox = createHanziBox(canvasContainer, characters[0], {
      theme: {
        strokeColor: '#1c1917',     // ink
        drawingColor: '#d32f2f',    // primary red
        outlineColor: 'rgba(28, 25, 23, 0.1)' 
      },
      // Note: HanziBox internally registers onMistake. We will intercept.
      // Wait, HanziBox overwrites onMistake if we pass it, but it also
      // needs to run its own shakeContainer. 
      // Look at HanziBox.js line 87 it calls: if (options.onMistake) options.onMistake(...)
      onMistake: (data) => {
        totalMistakesForPhrase++;
      },
      onComplete: (data) => {
        // A single character was completed.
        setTimeout(() => advanceToNextCharacter(), 800);
      }
    });
    
    // Ensure the first character gets the right styling
    if (phraseDisplayChars[0]) {
      phraseDisplayChars[0].classList.add('scale-110', 'inline-block');
    }
  });

  document.getElementById('btn-show-strokes')?.addEventListener('click', () => {
    if (hanziBox) hanziBox.showAnimation();
  });

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (hanziBox) {
      hanziBox.reset();
    }
  });

  document.getElementById('btn-practice-again')?.addEventListener('click', () => {
    // Reset state variables
    currentCharIndex = -1;
    totalMistakesForPhrase = 0;
    doneState.classList.add('hidden');
    doneState.classList.remove('flex');
    advanceToNextCharacter(); // advances to index 0
  });

  const navigateToPhrase = (indexOffset) => {
    let newIndex = activeVocabulary.findIndex(v => v.id === phraseData.id) + indexOffset;
    if (newIndex >= activeVocabulary.length) newIndex = 0; // wrap to start
    if (newIndex < 0) newIndex = activeVocabulary.length - 1; // wrap to end

    let hash = `#practice?id=${activeVocabulary[newIndex].id}`;
    if (categoryId) hash += `&category=${encodeURIComponent(categoryId)}`;
    window.location.hash = hash;
  };

  document.getElementById('btn-next-phrase')?.addEventListener('click', () => navigateToPhrase(1));
  document.getElementById('btn-next-skip-phrase')?.addEventListener('click', () => navigateToPhrase(1));
  document.getElementById('btn-prev-phrase')?.addEventListener('click', () => navigateToPhrase(-1));

  document.getElementById('btn-close')?.addEventListener('click', () => {
    window.location.hash = '#practice';
  });
}
