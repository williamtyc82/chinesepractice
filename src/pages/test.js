import { getVocabulary, getCompletedVocabulary } from '../lib/supabase.js';
import { createHanziBox } from '../components/HanziBox.js';
import { fireConfetti } from '../effects/confetti.js';

export async function renderTest(container, params) {
  const categoryId = params ? params.get('category') : null;
  
  if (!categoryId) {
    window.location.hash = '#revision';
    return;
  }

  // Only test words the user has already practiced
  const allPracticed = await getCompletedVocabulary();
  const testWords = allPracticed.filter(v => 
    v.chapter == categoryId || (categoryId === 'Uncategorized' && !v.chapter)
  );

  if (testWords.length === 0) {
    container.innerHTML = `
      <div class="flex h-screen w-full flex-col items-center justify-center bg-black p-6 text-center text-white">
        <span class="material-symbols-outlined text-6xl opacity-50 mb-4">menu_book</span>
        <h2 class="text-xl font-display italic mb-2">No practiced words yet</h2>
        <p class="text-white/40 text-sm mb-8 max-w-xs">Practice some words in this lesson first before taking the test.</p>
        <a href="#revision" class="border border-white/30 text-white/70 hover:bg-white hover:text-black px-6 py-3 transition-colors text-xs uppercase tracking-widest font-bold">Return to Revision</a>
      </div>
    `;
    return;
  }

  // State
  let currentWordIndex = 0;
  let currentCharIndex = 0;
  let totalMistakes = 0;
  // Each skipped entry: { char, wordText, wordPinyin, wordIndex, charIndex }
  let skippedChars = [];
  let hanziBox = null;
  let activeCharacters = [];
  let activeCharPinyins = []; // pinyin per character, split from word pinyin

  // Deep Zen Theme HTML
  container.innerHTML = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden bg-[#0A0A0A] text-white">
      <!-- Subtle noise texture -->
      <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>
      
      <!-- Top header -->
      <header class="flex items-center justify-between p-6 z-10">
        <button id="btn-exit" class="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="text-center font-sans tracking-[0.3em] uppercase text-[10px] text-white/50">
          Proficiency Test • ${categoryId === 'Uncategorized' ? 'Uncategorized' : 'Lesson ' + categoryId}
          <div class="mt-2 text-white/30"><span id="word-progress">1</span> / ${testWords.length}</div>
        </div>
        <div class="w-10"></div> <!-- spacer -->
      </header>

      <main class="flex-1 flex flex-col items-center justify-center z-10 px-6 pb-20">
        <!-- Pinyin display -->
        <div id="pinyin-display" class="text-xl font-sans tracking-[0.1em] text-white/70 mb-10 min-h-[30px] transition-opacity duration-300">
          ${testWords[0].pinyin}
        </div>
        
        <button id="btn-listen" class="mb-12 flex items-center justify-center size-20 rounded-full border border-white/10 hover:border-primary/50 text-white/50 hover:text-primary transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] group bg-black/50 backdrop-blur-md">
          <span class="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">campaign</span>
        </button>

        <!-- Canvas Container -->
        <div class="relative w-full max-w-[320px] aspect-square bg-[#111] border border-white/10 flex items-center justify-center shadow-2xl" id="test-canvas-container">
          <!-- Crosshair grid -->
          <div class="absolute inset-0 pointer-events-none opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" stroke-width="1" stroke-dasharray="4 4" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" stroke-width="1" stroke-dasharray="4 4" />
            </svg>
          </div>
        </div>
        
        <div id="character-dots" class="flex gap-2 mt-6">
          <!-- Dots indicating character progress within the current word -->
        </div>

        <!-- Current character pinyin hint -->
        <div id="char-pinyin" class="mt-3 text-base tracking-widest text-white/50 font-sans min-h-[24px] transition-all duration-200"></div>

        <!-- Skip Character button -->
        <button id="btn-skip" class="mt-6 flex items-center gap-2 text-white/30 hover:text-white/60 text-xs uppercase tracking-widest transition-colors">
          <span class="material-symbols-outlined text-sm">skip_next</span>
          Skip Character
        </button>
      </main>

      <!-- Final Test Results Overlay -->
      <div id="results-overlay" class="hidden absolute inset-0 z-50 bg-[#0A0A0A] flex-col items-center justify-start overflow-y-auto p-6 text-center page-enter">
        <h1 class="text-4xl md:text-5xl font-display italic text-white mb-1 tracking-tight mt-8">Test Complete</h1>
        <p class="text-white/50 font-serif tracking-widest text-sm mb-8">Your Proficiency Score</p>
        
        <div class="relative size-40 md:size-52 rounded-full border border-white/10 flex flex-col items-center justify-center bg-[#111] shadow-[0_0_50px_rgba(211,47,47,0.15)] mb-8 flex-shrink-0">
          <div id="final-score" class="text-5xl md:text-6xl font-sans font-black text-white">0%</div>
          <div id="score-message" class="text-[10px] uppercase tracking-widest text-primary mt-2 font-bold px-4"></div>
        </div>

        <!-- Skipped characters summary (only shown if there are skips) -->
        <div id="skipped-summary" class="hidden w-full max-w-md mb-8">
          <div class="border border-white/10 rounded-lg overflow-hidden">
            <div class="bg-white/5 px-4 py-3 flex items-center gap-2 border-b border-white/10">
              <span class="material-symbols-outlined text-sm text-amber-400">report</span>
              <span class="text-xs uppercase tracking-widest text-white/60 font-bold">Characters to Practice</span>
            </div>
            <div id="skipped-list" class="divide-y divide-white/5">
              <!-- Skipped char rows injected here -->
            </div>
          </div>
        </div>
        
        <a href="#revision" class="mb-10 bg-white text-black px-8 py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-colors flex-shrink-0">
          Return to Revision
        </a>
      </div>
    </div>
  `;

  const playAudio = (word) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const loadCharacter = () => {
    const char = activeCharacters[currentCharIndex];
    if (hanziBox) {
      hanziBox.setCharacter(char);
    } else {
      hanziBox = createHanziBox(document.getElementById('test-canvas-container'), char, {
        theme: {
          strokeColor: '#ffffff',
          drawingColor: '#f9a806',
          outlineColor: 'rgba(255,255,255,0.08)',
        },
        writerOptions: {
          showOutline: true,        // MUST be true — powers stroke recognition internally
          showHintAfterMisses: 3,
          leniency: 1.8,            // 1.0 = default strict, higher = more forgiving
          acceptBackwardsStrokes: true, // Accept strokes drawn in reverse direction
          padding: 30
        },
        onMistake: () => {
          totalMistakes++;
        },
        onComplete: () => {
          setTimeout(() => {
            currentCharIndex++;
            updateDots();
            if (currentCharIndex >= activeCharacters.length) {
              setTimeout(advanceWord, 400);
            } else {
              loadCharacter();
            }
          }, 300);
        }
      });

      // CSS-hide the outline SVG layer so the user can't trace it.
      // The paths remain in the DOM for HanziWriter's stroke detection.
      const existingStyle = document.getElementById('hanzi-hide-outline-style');
      if (!existingStyle) {
        const hideStyle = document.createElement('style');
        hideStyle.id = 'hanzi-hide-outline-style';
        hideStyle.textContent = `
          #test-canvas-container svg g:first-child path { opacity: 0 !important; }
          #test-canvas-container svg g:first-child { opacity: 0 !important; }
        `;
        document.head.appendChild(hideStyle);
      }
    }
  };

  const updateDots = () => {
    const dotsContainer = document.getElementById('character-dots');
    dotsContainer.innerHTML = activeCharacters.map((ch, idx) => {
      // Check if this character was skipped
      const wasSkipped = skippedChars.some(
        s => s.wordIndex === currentWordIndex && s.charIndex === idx
      );
      let cls = '';
      if (wasSkipped) cls = 'bg-amber-400/70 ring-1 ring-amber-400/40';
      else if (idx < currentCharIndex) cls = 'bg-green-500';
      else if (idx === currentCharIndex) cls = 'bg-white ring-2 ring-white/30';
      else cls = 'bg-white/20';
      return `<div class="size-2 rounded-full transition-colors duration-300 ${cls}" title="${ch}"></div>`;
    }).join('');

    // Update the per-character pinyin label
    const charPinyinEl = document.getElementById('char-pinyin');
    if (charPinyinEl) {
      const py = activeCharPinyins[currentCharIndex];
      charPinyinEl.innerText = py || '';
    }
  };

  const skipCharacter = () => {
    const wordObj = testWords[currentWordIndex];
    const char = activeCharacters[currentCharIndex];

    // Record the skip
    skippedChars.push({
      char,
      wordText: wordObj.word,
      wordPinyin: wordObj.pinyin,
      wordIndex: currentWordIndex,
      charIndex: currentCharIndex,
    });

    // Cancel quiz and flash canvas
    if (hanziBox) hanziBox.getWriter().cancelQuiz();
    const canvas = document.getElementById('test-canvas-container');
    canvas.style.transition = 'opacity 0.15s';
    canvas.style.opacity = '0.25';
    setTimeout(() => { canvas.style.opacity = '1'; }, 200);

    // Move to next character
    currentCharIndex++;
    updateDots();

    if (currentCharIndex >= activeCharacters.length) {
      setTimeout(advanceWord, 400);
    } else {
      // Need to restart the quiz on the new character
      if (hanziBox) {
        hanziBox.setCharacter(activeCharacters[currentCharIndex]);
      }
    }
  };

  const advanceWord = () => {
    currentWordIndex++;
    if (currentWordIndex >= testWords.length) {
      finishTest();
      return;
    }
    loadWord();
  };

  const loadWord = () => {
    const wordObj = testWords[currentWordIndex];
    activeCharacters = Array.from(wordObj.word);
    // Split pinyin by spaces → one syllable per character
    activeCharPinyins = wordObj.pinyin ? wordObj.pinyin.trim().split(/\s+/) : [];
    currentCharIndex = 0;
    
    document.getElementById('word-progress').innerText = currentWordIndex + 1;
    document.getElementById('pinyin-display').innerText = wordObj.pinyin;
    document.getElementById('pinyin-display').style.opacity = '1';
    
    updateDots(); // also updates char-pinyin label
    loadCharacter();
    
    setTimeout(() => playAudio(wordObj.word), 500);
  };

  const finishTest = () => {
    const resultsOverlay = document.getElementById('results-overlay');
    
    // Score calculation:
    // Total pool = all characters × 8 estimated strokes each
    // Penalty = actual mistakes + (skipped chars × 8 strokes each, i.e. treated as fully wrong)
    const totalCharCount = testWords.reduce((acc, obj) => acc + obj.word.length, 0);
    const estimatedTotalStrokes = totalCharCount * 8;
    const skipPenalty = skippedChars.length * 8;
    const penalisedMistakes = totalMistakes + skipPenalty;

    let rawScore = 100 - (penalisedMistakes / estimatedTotalStrokes) * 100;
    if (rawScore < 0) rawScore = 0;
    const finalScore = Math.min(100, Math.round(rawScore));
    
    document.getElementById('final-score').innerText = finalScore + '%';
    
    const msg = document.getElementById('score-message');
    let msgText = '';
    if (finalScore === 100) msgText = 'Perfect Mastery';
    else if (finalScore >= 80) msgText = 'Excellent';
    else if (finalScore >= 50) msgText = 'Keep Practicing';
    else msgText = 'Needs Review';
    if (skippedChars.length > 0) msgText += ` • ${skippedChars.length} skipped`;
    msg.innerText = msgText;

    // Build skipped summary grouped by word
    if (skippedChars.length > 0) {
      const summaryEl = document.getElementById('skipped-summary');
      const listEl = document.getElementById('skipped-list');
      summaryEl.classList.remove('hidden');

      // Group skips by word
      const grouped = {};
      skippedChars.forEach(s => {
        const key = s.wordIndex;
        if (!grouped[key]) grouped[key] = { word: s.wordText, pinyin: s.wordPinyin, chars: [] };
        grouped[key].chars.push(s.char);
      });

      listEl.innerHTML = Object.values(grouped).map(group => {
        // Highlight the skipped characters within the word
        const wordDisplay = Array.from(group.word).map(ch => {
          const wasSkipped = group.chars.includes(ch);
          return wasSkipped
            ? `<span class="text-amber-400 font-bold underline underline-offset-2">${ch}</span>`
            : `<span class="text-white/60">${ch}</span>`;
        }).join('');

        return `
            <div class="flex flex-col gap-2 px-4 py-3">
            <div class="flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
              <div class="text-2xl tracking-wider leading-none flex flex-wrap">${wordDisplay}</div>
              <div class="text-[11px] text-white/40 tracking-wider ml-2">${group.pinyin}</div>
            </div>
            <div class="flex flex-wrap gap-2 mt-1">
              ${group.chars.map(ch => `
                <div class="flex flex-col items-center">
                  <div class="size-9 rounded border border-amber-400/30 bg-amber-400/10 flex items-center justify-center text-amber-400 text-base font-bold">${ch}</div>
                  <div class="text-[9px] text-white/30 mt-1">skipped</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    resultsOverlay.classList.remove('hidden');
    resultsOverlay.classList.add('flex');
    
    if (finalScore >= 80) fireConfetti();

    // Save best score to localStorage
    const storageKey = `test_score_${categoryId}`;
    const previousScore = parseInt(localStorage.getItem(storageKey) || '0');
    if (finalScore > previousScore) {
      localStorage.setItem(storageKey, finalScore.toString());
    }
  };

  // Event Listeners
  document.getElementById('btn-exit').addEventListener('click', () => {
    window.location.hash = '#revision';
  });

  document.getElementById('btn-listen').addEventListener('click', () => {
    playAudio(testWords[currentWordIndex].word);
  });

  document.getElementById('btn-skip').addEventListener('click', skipCharacter);

  // Start the first word
  loadWord();
}
