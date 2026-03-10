import { getVocabulary, addVocabularyWord, addVocabularyBatch, deleteVocabularyWord, updateVocabularyWord, subscribeToVocabulary, isAdmin } from '../lib/supabase.js';
import { extractVocabularyFromImage } from '../lib/ocr.js';
import { processVocabularyList, getMeaning } from '../lib/dictionary.js';
import { createNavBar } from '../components/nav.js';
import { pinyin } from 'pinyin-pro';

/**
 * Admin Dashboard Page.
 * Manages vocabulary via manual entry, batch OCR upload, and displays real-time table.
 */
export async function renderAdmin(container, params) {
  // SECURITY CHECK: Only allow admins to see this page
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    console.warn('[Admin] Unauthorized access attempt blocked. Redirecting to practice.');
    window.location.hash = '#practice';
    return;
  }

  let vocabulary = [];
  let reviewList = [];
  let isSaving = false;
  let isOcrProcessing = false;

  container.innerHTML = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden">
      <!-- Scrollable content area -->
      <div class="flex-1 overflow-y-auto px-6 pt-10 pb-32 md:px-12 md:pb-40 relative custom-scrollbar">
        <div class="max-w-5xl mx-auto w-full">
        
        <header class="mb-12 border-b border-paper-border pb-6">
          <h1 class="text-3xl font-display font-semibold italic text-ink tracking-tight flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-3xl font-variation-fill">book_4</span>
            Dictionary Management
          </h1>
          <p class="text-ink-light mt-2 font-serif text-sm">Curate phrases and sentences for practice.</p>
        </header>

        <!-- Input Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:gap-10 md:gap-6 gap-10 mb-16">
          
          <!-- Manual Entry -->
          <div class="flex flex-col">
            <h2 class="text-xs font-bold text-ink uppercase tracking-widest mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">edit_square</span>
              Manual Input
            </h2>
            
            <form id="manual-form" class="space-y-6 flex-1 bg-surface p-6 rounded-xl border border-paper-border shadow-sm">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-ink-light uppercase tracking-widest mb-2">Chinese Phrase</label>
                  <input type="text" id="manual-word" required class="w-full bg-transparent border-b border-paper-border text-ink px-2 py-2 focus:border-primary outline-none transition-colors font-chinese text-xl placeholder-ink/20" placeholder="一片安静" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-ink-light uppercase tracking-widest mb-2">Pinyin</label>
                  <input type="text" id="manual-pinyin" required class="w-full bg-transparent border-b border-paper-border text-ink px-2 py-2 focus:border-primary outline-none transition-colors placeholder-ink/20" placeholder="yī piàn ān jìng" />
                </div>
              </div>
              
              <div>
                <label class="block text-[10px] font-bold text-ink-light uppercase tracking-widest mb-2">Meaning / Translation (Optional)</label>
                <input type="text" id="manual-meaning" class="w-full bg-transparent border-b border-paper-border text-ink px-2 py-2 focus:border-primary outline-none transition-colors placeholder-ink/20" placeholder="A piece of quiet / completely silent" />
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-ink-light uppercase tracking-widest mb-2">Lesson or Chapter</label>
                  <input type="text" id="manual-chapter" class="w-full bg-transparent border-b border-paper-border text-ink px-2 py-2 focus:border-primary outline-none transition-colors placeholder-ink/20" placeholder="Ch 1" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-ink-light uppercase tracking-widest mb-2">Sequence</label>
                  <input type="number" id="manual-sequence" value="1" min="1" class="w-full bg-transparent border-b border-paper-border text-ink px-2 py-2 focus:border-primary outline-none transition-colors placeholder-ink/20" placeholder="1" />
                </div>
              </div>

              <div class="pt-4 mt-auto">
                <button type="submit" id="btn-submit-manual" class="w-full border border-primary text-primary hover:bg-primary hover:text-white font-bold tracking-widest uppercase text-xs py-3 px-6 rounded transition-colors flex items-center justify-center gap-2 btn-elegant">
                  <span class="material-symbols-outlined text-[18px]">add</span>
                  Save Phrase
                </button>
              </div>
            </form>
          </div>

          <!-- Batch OCR Upload -->
          <div class="flex flex-col">
            <h2 class="text-xs font-bold text-ink uppercase tracking-widest mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">document_scanner</span>
              Batch OCR Scan
            </h2>
            
            <div class="bg-surface p-6 rounded-xl border border-paper-border shadow-sm flex flex-col flex-1">
              <p class="text-xs text-ink-light mb-6 leading-relaxed">Extract textbook or worksheet phrases via image upload.</p>
              
              <!-- Upload Dropzone -->
              <div id="dropzone" class="border border-dashed border-paper-border hover:border-primary bg-background-light/50 transition-colors p-8 text-center cursor-pointer flex flex-col items-center justify-center flex-1 rounded-lg">
                <span class="material-symbols-outlined text-3xl text-ink-light mb-3">upload_file</span>
                <p class="font-serif font-medium text-ink mb-2">Click to browse or drop an image</p>
                <p class="text-[10px] text-ink-light uppercase tracking-widest">PNG, JPG (Max 5MB)</p>
                <input type="file" id="file-upload" accept="image/png, image/jpeg" class="hidden" />
              </div>

              <!-- OCR Progress -->
              <div id="ocr-progress-container" class="hidden w-full my-auto flex-col items-center justify-center py-8">
                <span class="material-symbols-outlined text-primary text-4xl animate-spin mb-4">refresh</span>
                <p id="ocr-progress-text" class="text-xs font-bold text-ink-light uppercase tracking-widest">Scanning Document... 0%</p>
              </div>

              <!-- Review List Container -->
              <div id="review-list-container" class="hidden flex-col w-full h-full my-auto">
                <div class="flex justify-between items-end mb-3 pb-3 border-b border-paper-border">
                  <div class="flex items-center gap-2">
                    <h3 class="text-[10px] font-bold text-ink uppercase tracking-widest">Review Extracted Data</h3>
                    <span id="review-count" class="text-primary text-[10px] font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full inline-block"></span>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <label for="batch-seq-input" class="text-[10px] font-bold text-ink-light uppercase tracking-widest cursor-pointer">Batch Seq Start:</label>
                      <input type="number" id="batch-seq-input" class="w-16 bg-surface border border-paper-border rounded px-2 py-1 text-xs text-ink focus:border-primary outline-none transition-colors text-center" value="1" />
                    </div>
                    <div class="flex items-center gap-2">
                      <label for="batch-category-input" class="text-[10px] font-bold text-ink-light uppercase tracking-widest cursor-pointer">Batch Cat:</label>
                      <input type="text" id="batch-category-input" class="w-16 bg-surface border border-paper-border rounded px-2 py-1 text-xs text-ink focus:border-primary outline-none transition-colors text-center" placeholder="1" />
                    </div>
                  </div>
                </div>
                
                <div class="overflow-y-auto max-h-[300px] lg:max-h-[400px] pr-2 custom-scrollbar space-y-3" id="review-items"></div>
                
                <div class="flex gap-4 mt-6 pt-4 border-t border-paper-border">
                  <button id="btn-cancel-batch" class="px-4 py-2 border border-ink-light/30 text-ink-light hover:bg-background-light text-xs font-bold uppercase tracking-widest rounded transition-colors">
                    Cancel
                  </button>
                  <button id="btn-save-batch" class="flex-1 bg-ink text-surface hover:bg-black font-bold tracking-widest uppercase text-xs py-2 px-4 rounded transition-colors flex justify-center items-center gap-2 btn-elegant">
                    Save Batch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dictionary Table -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <h2 class="text-xs font-bold text-ink uppercase tracking-widest flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">menu_book</span>
                Lexicon
              </h2>
              <button id="btn-delete-selected" class="hidden text-primary border border-primary hover:bg-primary hover:text-surface transition-colors px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded btn-elegant">
                Delete Selected (<span id="selected-count">0</span>)
              </button>
            </div>
            <button id="btn-refresh-table" class="text-ink-light hover:text-primary transition-colors p-1" aria-label="Refresh Data">
              <span class="material-symbols-outlined text-[18px] block">sync</span>
            </button>
          </div>

          <div class="overflow-x-auto border-y border-paper-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-background-light text-[10px] font-bold uppercase text-ink-light tracking-widest border-b border-paper-border">
                <tr>
                  <th class="px-4 py-4 font-normal w-10 text-center"><input type="checkbox" id="select-all-vocab" class="accent-primary w-4 h-4 cursor-pointer" /></th>
                  <th class="px-4 py-4 font-normal">Phrase & Pīnyīn</th>
                  <th class="px-4 py-4 font-normal hidden lg:table-cell">Meaning</th>
                  <th class="px-4 py-4 font-normal">Cat</th>
                  <th class="px-4 py-4 font-normal text-center">Seq</th>
                  <th class="px-4 py-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="vocab-table-body" class="divide-y divide-paper-border bg-surface">
                <tr>
                  <td colspan="5" class="px-4 py-12 text-center text-ink-light text-xs uppercase tracking-widest">
                    Loading Lexicon...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
      
      </div>
      
      <!-- Bottom Navigation Bar -->
      ${await createNavBar('admin')}

      <!-- Edit Modal Overlay -->
      <div id="edit-modal-overlay" class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 px-4">
        <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md border border-paper-border overflow-hidden transform scale-95 transition-transform duration-300" id="edit-modal-content">
          <div class="px-6 py-5 border-b border-paper-border flex justify-between items-center bg-background-light">
            <h3 class="font-display font-semibold italic text-xl text-ink">Edit Phrase</h3>
            <button id="close-edit-modal" class="text-ink-light hover:text-ink transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <input type="hidden" id="edit-id" />
            <div>
              <label class="block text-[10px] font-bold text-ink uppercase tracking-widest mb-2 pb-1 border-b border-paper border-dotted">Phrase</label>
              <input type="text" id="edit-word" class="w-full bg-paper border border-paper-border rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-chinese text-lg" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-ink uppercase tracking-widest mb-2 pb-1 border-b border-paper border-dotted">Pīnyīn</label>
              <input type="text" id="edit-pinyin" class="w-full bg-paper border border-paper-border rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-ink uppercase tracking-widest mb-2 pb-1 border-b border-paper border-dotted">Meaning (Optional)</label>
              <input type="text" id="edit-meaning" class="w-full bg-paper border border-paper-border rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-serif italic" />
            </div>
            <div class="grid grid-cols-2 gap-4">
               <div>
                  <label class="block text-[10px] font-bold text-ink uppercase tracking-widest mb-2 pb-1 border-b border-paper border-dotted">Lesson (Optional)</label>
                  <input type="text" id="edit-chapter" class="w-full bg-paper border border-paper-border rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm uppercase" />
               </div>
               <div>
                  <label class="block text-[10px] font-bold text-ink uppercase tracking-widest mb-2 pb-1 border-b border-paper border-dotted">Sequence</label>
                  <input type="number" id="edit-sequence" class="w-full bg-paper border border-paper-border rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm text-center" />
               </div>
            </div>
          </div>
          <div class="px-6 py-4 bg-background-light border-t border-paper-border flex flex-col gap-3 sm:flex-row sm:justify-between items-center">
            <button id="btn-delete-phrase" class="w-full sm:w-auto px-5 py-2 rounded-full font-bold text-sm tracking-wide text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
               <span class="material-symbols-outlined text-[16px]">delete</span> Delete
            </button>
            <div class="flex gap-3 w-full sm:w-auto">
              <button id="cancel-edit-btn" class="flex-1 sm:flex-none px-5 py-2 rounded-full font-bold text-sm tracking-wide text-ink-light hover:text-ink hover:bg-paper transition-all">Cancel</button>
              <button id="save-edit-btn" class="flex-1 sm:flex-none px-5 py-2 rounded-full font-bold text-sm tracking-wide bg-primary text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Utility Functions ---

  function openEditModal(data) {
    document.getElementById('edit-id').value = data.id;
    document.getElementById('edit-word').value = data.word;
    document.getElementById('edit-pinyin').value = data.pinyin || '';
    document.getElementById('edit-meaning').value = data.meaning || '';
    document.getElementById('edit-chapter').value = data.chapter || '';
    document.getElementById('edit-sequence').value = data.sequence_num || 1;
    
    const overlay = document.getElementById('edit-modal-overlay');
    const content = document.getElementById('edit-modal-content');
    
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    content.classList.remove('scale-95');
  }

  function closeEditModal() {
    const overlay = document.getElementById('edit-modal-overlay');
    const content = document.getElementById('edit-modal-content');
    
    overlay.classList.add('opacity-0', 'pointer-events-none');
    content.classList.add('scale-95');
  }

  // --- Setup Global Listeners ---
  const formManual = document.getElementById('manual-form');
  const btnSubmitManual = document.getElementById('btn-submit-manual');
  
  const dropzone = document.getElementById('dropzone');
  const fileUpload = document.getElementById('file-upload');
  const progressContainer = document.getElementById('ocr-progress-container');
  const progressText = document.getElementById('ocr-progress-text');
  
  const reviewContainer = document.getElementById('review-list-container');
  const reviewItems = document.getElementById('review-items');
  const btnSaveBatch = document.getElementById('btn-save-batch');
  const btnCancelBatch = document.getElementById('btn-cancel-batch');
  const reviewCount = document.getElementById('review-count');
  
  const tableBody = document.getElementById('vocab-table-body');
  const btnRefreshTable = document.getElementById('btn-refresh-table');
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  const selectAllVocab = document.getElementById('select-all-vocab');
  const selectedCountSpan = document.getElementById('selected-count');

  const updateSelectedState = () => {
    const checkboxes = document.querySelectorAll('.vocab-checkbox');
    const checked = document.querySelectorAll('.vocab-checkbox:checked');
    
    if (checked.length > 0) {
      btnDeleteSelected.classList.remove('hidden');
      selectedCountSpan.innerText = checked.length;
    } else {
      btnDeleteSelected.classList.add('hidden');
    }
    
    selectAllVocab.checked = checked.length > 0 && checked.length === checkboxes.length;
  };

  btnDeleteSelected.addEventListener('click', async () => {
    const checked = Array.from(document.querySelectorAll('.vocab-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${checked.length} phrase(s)?`)) {
      btnDeleteSelected.disabled = true;
      btnDeleteSelected.innerHTML = '<span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Deleting...';
      try {
        // Run deletions sequentially or via an optimized Supabase RPC if we had one.
        // Sequential is fine for typical small batches.
        for (const id of checked) {
          await deleteVocabularyWord(id);
        }
        vocabulary = vocabulary.filter(v => !checked.includes(v.id));
        selectAllVocab.checked = false;
        loadData();
      } catch (err) {
        alert('Error during bulk deletion: ' + err.message);
      } finally {
        btnDeleteSelected.disabled = false;
        btnDeleteSelected.innerHTML = `Delete Selected (<span id="selected-count">0</span>)`;
        updateSelectedState();
      }
    }
  });

  selectAllVocab.addEventListener('change', (e) => {
    document.querySelectorAll('.vocab-checkbox').forEach(cb => {
      cb.checked = e.target.checked;
    });
    updateSelectedState();
  });

  const renderTable = () => {
    if (vocabulary.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-12 text-center text-ink-light italic text-sm">No phrases found. Add some above.</td></tr>';
      updateSelectedState();
      return;
    }

    const grouped = vocabulary.reduce((acc, v) => {
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

    let html = '';
    
    sortedLabels.forEach(label => {
      const safeLabel = label.toString().replace(/\s+/g, '-');
      html += `
        <tr class="bg-background-light hover:bg-paper-border/30 border-y border-paper-border cursor-pointer group-header transition-colors" data-lesson="${safeLabel}">
          <td class="px-4 py-3 text-center w-10" onclick="event.stopPropagation();">
            <input type="checkbox" class="group-checkbox accent-primary w-4 h-4 cursor-pointer" data-lesson="${safeLabel}" />
          </td>
          <td colspan="5" class="px-4 py-3 text-[10px] font-bold text-ink uppercase tracking-widest">
            <div class="flex items-center justify-between">
              <span>${label === 'Uncategorized' ? 'Uncategorized' : 'Lesson ' + label} <span class="text-ink-light font-normal text-xs normal-case ml-2">(${grouped[label].length})</span></span>
              <span class="material-symbols-outlined text-[16px] text-ink-light transition-transform duration-200 transform -rotate-90 group-icon">expand_more</span>
            </div>
          </td>
        </tr>
      `;
      
      html += grouped[label].map(v => `
        <tr class="hover:bg-background-light/50 transition-colors group group-row-${safeLabel} hidden cursor-pointer edit-row-trigger" 
            data-id="${v.id}" data-word="${v.word}" data-pinyin="${v.pinyin || ''}" data-meaning="${v.meaning || ''}" data-chapter="${v.chapter || ''}" data-seq="${v.sequence_num || 1}">
          <td class="px-4 py-4 text-center" onclick="event.stopPropagation();">
            <input type="checkbox" class="vocab-checkbox accent-primary w-4 h-4 cursor-pointer" value="${v.id}" data-lesson="${safeLabel}" />
          </td>
          <td class="px-4 py-4">
            <div class="flex flex-col gap-1 min-w-[120px]">
              <span class="font-chinese font-bold text-lg text-ink group-hover:text-primary transition-colors">${v.word}</span>
              <span class="font-sans text-xs text-ink-light">${v.pinyin || '-'}</span>
            </div>
          </td>
          <td class="px-4 py-4 hidden lg:table-cell">
             <span class="font-serif italic text-xs text-ink-light line-clamp-2">${v.meaning || '-'}</span>
          </td>
          <td class="px-4 py-4 text-ink-light text-[10px] uppercase tracking-widest">${v.chapter || '-'}</td>
          <td class="px-4 py-4 text-center" onclick="event.stopPropagation();">
            <input type="number" class="w-12 bg-transparent border-b border-transparent focus:border-primary text-center text-ink text-xs outline-none transition-colors seq-input" data-id="${v.id}" value="${v.sequence_num || 1}" />
          </td>
        </tr>
      `).join('');
    });

    tableBody.innerHTML = html;

    // Group checkbox logic
    document.querySelectorAll('.group-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const lesson = e.currentTarget.dataset.lesson;
        const rows = document.querySelectorAll(`.group-row-${lesson} .vocab-checkbox`);
        rows.forEach(rowCb => {
          rowCb.checked = e.target.checked;
        });
        updateSelectedState();
      });
    });

    // Sub-item logic to update group checkboxes optionally
    document.querySelectorAll('.vocab-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const lesson = e.target.dataset.lesson;
        const allInLesson = document.querySelectorAll(`.group-row-${lesson} .vocab-checkbox`);
        const allChecked = Array.from(allInLesson).every(c => c.checked);
        const groupCb = document.querySelector(`.group-checkbox[data-lesson="${lesson}"]`);
        if (groupCb) {
          groupCb.checked = allChecked;
        }
        updateSelectedState();
      });
    });

    // Collapsible logic
    document.querySelectorAll('.group-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const lesson = e.currentTarget.dataset.lesson;
        const rows = document.querySelectorAll(`.group-row-${lesson}`);
        const icon = e.currentTarget.querySelector('.group-icon');
        
        const isHidden = rows[0] && rows[0].classList.contains('hidden');
        if (isHidden) {
          rows.forEach(r => r.classList.remove('hidden'));
          icon.classList.remove('-rotate-90');
        } else {
          rows.forEach(r => r.classList.add('hidden'));
          icon.classList.add('-rotate-90');
        }
      });
    });
  
    // Modal Edit listener
    document.querySelectorAll('.edit-row-trigger').forEach(row => {
      row.addEventListener('click', (e) => {
        const dataset = e.currentTarget.dataset;
        openEditModal({
          id: dataset.id,
          word: dataset.word,
          pinyin: dataset.pinyin,
          meaning: dataset.meaning,
          chapter: dataset.chapter,
          sequence_num: dataset.seq
        });
      });
    });

    document.querySelectorAll('.seq-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = e.currentTarget.dataset.id;
        const newSeq = parseInt(e.target.value, 10) || 1;
        try {
          await updateVocabularyWord(id, { sequence_num: newSeq });
          loadData(); // Re-sort table if needed
        } catch (err) {
          console.error('Failed to update sequence', err);
        }
      });
    });

    document.querySelectorAll('.vocab-checkbox').forEach(cb => {
      cb.addEventListener('change', updateSelectedState);
    });
    
    updateSelectedState();
  };

  const loadData = async () => {
    btnRefreshTable.classList.add('animate-spin', 'text-primary');
    vocabulary = await getVocabulary();
    renderTable();
    setTimeout(() => btnRefreshTable.classList.remove('animate-spin', 'text-primary'), 500);
  };

  loadData();

  const subscription = subscribeToVocabulary((payload) => {
    loadData();
  });

  // Auto-complete Pinyin and Meaning
  const manualWordInput = document.getElementById('manual-word');
  const manualPinyinInput = document.getElementById('manual-pinyin');
  const manualMeaningInput = document.getElementById('manual-meaning');
  let userEditedPinyin = false;
  let userEditedMeaning = false;

  manualPinyinInput.addEventListener('input', () => {
    userEditedPinyin = true;
  });
  manualMeaningInput.addEventListener('input', () => {
    userEditedMeaning = true;
  });

  let meaningTimeout;

  manualWordInput.addEventListener('input', (e) => {
    const text = e.target.value.trim();
    if (text) {
      if (!userEditedPinyin || manualPinyinInput.value.trim() === '') {
        manualPinyinInput.value = pinyin(text);
        userEditedPinyin = false;
      }
      
      clearTimeout(meaningTimeout);
      meaningTimeout = setTimeout(async () => {
        if (!userEditedMeaning || manualMeaningInput.value.trim() === '') {
          const meaningText = await getMeaning(text);
          if (meaningText) {
            manualMeaningInput.value = meaningText;
            userEditedMeaning = false;
          }
        }
      }, 500);
    } else {
      manualPinyinInput.value = '';
      userEditedPinyin = false;
      manualMeaningInput.value = '';
      userEditedMeaning = false;
    }
  });

  // Manual Form Submit
  formManual.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSubmitManual.disabled = true;
    btnSubmitManual.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Saving...';

    const word = document.getElementById('manual-word').value.trim();
    const pinyin = document.getElementById('manual-pinyin').value.trim();
    const meaning = document.getElementById('manual-meaning').value.trim();
    let chapterRaw = document.getElementById('manual-chapter').value.trim();
    
    // Convert chapter string to integer for supabase matching
    let chapter = parseInt(chapterRaw.replace(/\\D/g, ''), 10);
    if (isNaN(chapter)) chapter = null;
    
    let sequence = parseInt(document.getElementById('manual-sequence').value, 10);
    if (isNaN(sequence)) sequence = 1;
    
    try {
      await addVocabularyWord(word, pinyin, meaning, chapter, sequence);
      formManual.reset();
      document.getElementById('manual-word').focus();
      loadData(); // Refresh table
    } catch (err) {
      alert('Error saving phrase: ' + err.message);
    } finally {
      btnSubmitManual.disabled = false;
      btnSubmitManual.innerHTML = '<span class="material-symbols-outlined text-[18px]">add</span> Save Phrase';
    }
  });

  // OCR Logic
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    dropzone.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressContainer.classList.add('flex');
    reviewContainer.classList.add('hidden');
    isOcrProcessing = true;
    progressText.innerText = 'Analyzing Image... 0%';

    try {
      const extractedWords = await extractVocabularyFromImage(file, (progress) => {
        const pct = Math.round(progress * 100);
        progressText.innerText = `Analyzing Image... ${pct}%`;
      });
      
      progressText.innerText = 'Resolving Dictionary Definitions...';
      reviewList = await processVocabularyList(extractedWords);
      
      progressContainer.classList.add('hidden');
      progressContainer.classList.remove('flex');
      reviewContainer.classList.remove('hidden');
      renderReviewList();
      
    } catch (err) {
      alert(err.message);
      progressContainer.classList.add('hidden');
      progressContainer.classList.remove('flex');
      dropzone.classList.remove('hidden');
    } finally {
      isOcrProcessing = false;
      fileUpload.value = ''; 
    }
  };

  // Review List Render
  const renderReviewList = () => {
    document.getElementById('review-count').innerText = `${reviewList.length}`;
    document.getElementById('batch-category-input').value = '';
    
    if (reviewList.length === 0) {
      reviewItems.innerHTML = '<div class="text-center text-xs text-ink-light py-4">No characters recognized.</div>';
      btnSaveBatch.disabled = true;
      btnSaveBatch.classList.add('opacity-50', 'cursor-not-allowed');
      return;
    }
    
    btnSaveBatch.disabled = false;
    btnSaveBatch.classList.remove('opacity-50', 'cursor-not-allowed');

    reviewItems.innerHTML = reviewList.map((item, i) => `
      <div class="flex flex-col gap-3 p-5 bg-surface border border-paper-border/50 rounded-lg relative group shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
        <button class="review-delete absolute right-3 top-3 text-ink-light/50 hover:text-primary transition-colors focus:outline-none" data-id="${item.id}">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <input type="text" data-id="${item.id}" data-field="word" class="review-input bg-transparent font-chinese font-bold text-3xl text-ink outline-none md:w-1/3 border-b border-transparent focus:border-primary transition-colors p-1" value="${item.word}" placeholder="Phrase / Word" />
          <div class="flex flex-col gap-2 w-full">
            <input type="text" data-id="${item.id}" data-field="pinyin" class="review-input w-full bg-transparent text-sm text-ink font-serif outline-none placeholder-ink-light/50 border-b border-transparent focus:border-primary transition-colors p-1" value="${item.pinyin}" placeholder="pīnyīn" />
            <input type="text" data-id="${item.id}" data-field="meaning" class="review-input w-full bg-transparent text-xs text-ink-light outline-none border-b border-transparent focus:border-primary transition-colors p-1" value="${item.meaning}" placeholder="Enter meaning" />
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.review-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const field = e.target.dataset.field;
        const index = reviewList.findIndex(item => item.id === id);
        if (index > -1) {
          reviewList[index][field] = e.target.value;
        }
      });
    });

    document.querySelectorAll('.review-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        reviewList = reviewList.filter(item => item.id !== id);
        renderReviewList();
      });
    });
  };

  dropzone.addEventListener('click', () => fileUpload.click());
  fileUpload.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileUpload(e.target.files[0]);
  });
  
  dropzone.addEventListener('dragover', (e) => e.preventDefault());
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
  });

  btnCancelBatch.addEventListener('click', () => {
    reviewContainer.classList.add('hidden');
    dropzone.classList.remove('hidden');
    reviewList = [];
  });

  btnSaveBatch.addEventListener('click', async () => {
    if (reviewList.length === 0) return;
    
    const isValid = reviewList.every(item => item.word.trim() && item.pinyin.trim());
    if (!isValid) {
      alert('Please ensure all phrases have characters and pinyin.');
      return;
    }

    btnSaveBatch.disabled = true;
    btnSaveBatch.innerHTML = '<span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Saving...';

    // Get the global batch chapter
    let batchChapterRaw = document.getElementById('batch-category-input').value.trim();
    let batchChapter = parseInt(batchChapterRaw.replace(/\\D/g, ''), 10);
    if (isNaN(batchChapter)) batchChapter = null;

    let batchSeqRaw = document.getElementById('batch-seq-input').value;
    let batchSeq = parseInt(batchSeqRaw, 10);
    if (isNaN(batchSeq)) batchSeq = 1;

    const payload = reviewList.map((item, index) => ({
      word: item.word,
      pinyin: item.pinyin,
      meaning: item.meaning,
      chapter: batchChapter,
      sequence_num: batchSeq + index
    }));

    try {
      await addVocabularyBatch(payload);
      reviewContainer.classList.add('hidden');
      dropzone.classList.remove('hidden');
      reviewList = [];
      loadData(); // Refresh table
    } catch (err) {
      alert('Failed to save batch: ' + err.message);
    } finally {
      btnSaveBatch.disabled = false;
      btnSaveBatch.innerHTML = 'Save Batch';
    }
  });
  
  // Modal Listeners
  const modalCloseBtn = document.getElementById('close-edit-modal');
  const modalCancelBtn = document.getElementById('cancel-edit-btn');
  const modalSaveBtn = document.getElementById('save-edit-btn');
  const modalDeleteBtn = document.getElementById('btn-delete-phrase');
  const modalOverlay = document.getElementById('edit-modal-overlay');

  const closeHandler = () => closeEditModal();
  modalCloseBtn.addEventListener('click', closeHandler);
  modalCancelBtn.addEventListener('click', closeHandler);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeEditModal();
  });

  modalSaveBtn.addEventListener('click', async () => {
    const id = document.getElementById('edit-id').value;
    let chapterRaw = document.getElementById('edit-chapter').value.trim();
    let chapter = parseInt(chapterRaw.replace(/\D/g, ''), 10);
    if (isNaN(chapter)) chapter = null;

    const updates = {
      word: document.getElementById('edit-word').value.trim(),
      pinyin: document.getElementById('edit-pinyin').value.trim(),
      meaning: document.getElementById('edit-meaning').value.trim(),
      chapter: chapter,
      sequence_num: parseInt(document.getElementById('edit-sequence').value) || 1
    };

    if (!updates.word) return;

    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = 'Saving...';
    try {
      await updateVocabularyWord(id, updates);
      await loadData();
      closeEditModal();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes: ' + e.message);
    } finally {
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = 'Save Changes';
    }
  });

  modalDeleteBtn.addEventListener('click', async () => {
    const id = document.getElementById('edit-id').value;
    if (confirm('Delete this phrase from the lexicon?')) {
      modalDeleteBtn.disabled = true;
      modalDeleteBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Deleting...';
      try {
        await deleteVocabularyWord(id);
        await loadData();
        closeEditModal();
      } catch (e) {
        console.error(e);
        alert('Failed to delete.');
      } finally {
        modalDeleteBtn.disabled = false;
        modalDeleteBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">delete</span> Delete';
      }
    }
  });
}
