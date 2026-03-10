import { createNavBar } from '../components/nav.js';
import { getSupabaseClient, getCurrentUser, signInUser, signUpUser, signOutUser } from '../lib/supabase.js';

/**
 * Render the Profile page.
 * Displays user progress, global leaderboard (mocked or real), and aesthetic achievements.
 */
export async function renderProfile(container) {
  // Check auth state
  const user = await getCurrentUser();

  if (!user) {
    await renderAuthScreen(container);
    return;
  }

  // 1. Fetch real progress from user_progress table
  const client = getSupabaseClient();
  let progressData = [];
  
  if (client) {
    const { data, error } = await client.from('user_progress').select('*');
    if (!error && data) {
      progressData = data;
    }
  }

  // 2. Compute stats
  // We assume each entry in user_progress is a completed phrase
  const phrasesMastered = progressData.length;
  
  // Total stars (max 5 per phrase)
  const totalStars = progressData.reduce((sum, item) => sum + (item.stars || 0), 0);
  
  // Rank logic
  let rankInfo = { title: 'Novice Scholar', icon: 'history_edu' };
  if (phrasesMastered >= 5) rankInfo = { title: 'Dedicated Student', icon: 'local_library' };
  if (phrasesMastered >= 15) rankInfo = { title: 'Calligraphy Master', icon: 'draw' };
  if (phrasesMastered >= 30) rankInfo = { title: 'Imperial Scribe', icon: 'account_balance' };

  // Calculate generic 'accuracy' (based on stars)
  const maxPossibleStars = phrasesMastered * 5 || 1;
  const accuracyPct = phrasesMastered === 0 ? 0 : Math.round((totalStars / maxPossibleStars) * 100);

  container.innerHTML = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light">
      <div class="flex-1 overflow-y-auto px-6 py-10 md:px-12 relative custom-scrollbar">
        
        <header class="mb-10 flex items-center justify-between border-b border-paper-border pb-6">
          <h1 class="text-3xl font-display font-semibold italic text-ink tracking-tight">Your Progress</h1>
          <button id="btn-signout" class="size-12 rounded-full border border-paper-border flex items-center justify-center bg-surface shadow-sm click-scale active:bg-ink/5">
            <span class="material-symbols-outlined text-ink-light text-2xl">logout</span>
          </button>
        </header>

        <!-- Rank Card -->
        <div class="w-full bg-surface border border-paper-border shadow-elegant rounded-2xl p-8 mb-8 flex flex-col items-center text-center relative overflow-hidden group">
          <div class="absolute -right-4 -top-4 text-[100px] text-primary/5 material-symbols-outlined font-variation-fill pointer-events-none group-hover:scale-110 transition-transform duration-700">${rankInfo.icon}</div>
          
          <span class="material-symbols-outlined text-primary text-5xl mb-4 relative z-10">${rankInfo.icon}</span>
          <h2 class="text-2xl font-display font-bold text-ink mb-1 relative z-10">${rankInfo.title}</h2>
          <p class="text-xs uppercase tracking-widest text-ink-light font-bold mb-6 relative z-10">Current Rank</p>
          
          <div class="w-full h-1.5 bg-background-light rounded-full overflow-hidden relative z-10">
            <div class="h-full bg-primary" style="width: ${Math.min((phrasesMastered / 30) * 100, 100)}%"></div>
          </div>
          <p class="text-[10px] text-ink-light mt-3 uppercase tracking-widest">${30 - phrasesMastered > 0 ? (30 - phrasesMastered) + ' phrases to next rank' : 'Max Rank Reached'}</p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4 mb-10">
          <div class="bg-surface border border-paper-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <span class="material-symbols-outlined text-ink-light text-[20px] mb-4">menu_book</span>
            <div>
              <p class="text-3xl font-sans font-bold text-ink mb-1">${phrasesMastered}</p>
              <p class="text-[10px] uppercase tracking-widest text-ink-light font-bold">Phrases Mastered</p>
            </div>
          </div>
          <div class="bg-surface border border-paper-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <span class="material-symbols-outlined text-ink-light text-[20px] mb-4">analytics</span>
            <div>
              <p class="text-3xl font-sans font-bold text-ink mb-1">${accuracyPct}%</p>
              <p class="text-[10px] uppercase tracking-widest text-ink-light font-bold">Stroke Accuracy</p>
            </div>
          </div>
          <div class="bg-surface border border-paper-border rounded-xl p-5 shadow-sm flex flex-col justify-between col-span-2">
            <div class="flex items-center justify-between mb-2">
              <span class="material-symbols-outlined text-primary text-[20px]">stars</span>
              <span class="text-[10px] uppercase tracking-widest text-primary font-bold">Cumulative Rating</span>
            </div>
            <div class="flex items-end gap-2">
              <p class="text-3xl font-sans font-bold text-ink">${totalStars}</p>
              <p class="text-sm text-ink-light mb-1">Stars</p>
            </div>
          </div>
        </div>

        <!-- History Preview -->
        <div>
          <h3 class="text-xs font-bold text-ink uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px]">history</span>
            Recent Practice
          </h3>
          <div class="space-y-3">
            ${progressData.length === 0 
              ? `<p class="text-ink-light text-sm italic">You haven't hit the books yet.</p>` 
              : progressData.slice(-5).reverse().map(item => `
                <div class="flex items-center justify-between p-4 bg-surface border border-paper-border rounded-lg shadow-sm">
                  <span class="font-chinese font-bold text-xl text-ink">${item.character}</span>
                  <div class="flex gap-0.5 text-primary">
                    ${Array.from({length: item.stars || 0}).map(() => `<span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1">star</span>`).join('')}
                    ${Array.from({length: 5 - (item.stars || 0)}).map(() => `<span class="material-symbols-outlined text-[14px] text-paper-border" style="font-variation-settings: 'FILL' 1">star</span>`).join('')}
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>

      </div>
      
      <!-- Bottom Navigation Bar -->
      ${await createNavBar('profile')}
    </div>
  `;

  // Attach signout listener
  const btnSignout = document.getElementById('btn-signout');
  if (btnSignout) {
    btnSignout.addEventListener('click', async () => {
      try {
        await signOutUser();
        // re-render profile
        renderProfile(container);
      } catch (err) {
        alert('Failed to sign out: ' + err.message);
      }
    });
  }
}

async function renderAuthScreen(container) {
  container.innerHTML = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light">
      <div class="flex-1 overflow-y-auto px-6 py-10 md:px-12 flex flex-col justify-center items-center custom-scrollbar">
        
        <div class="w-full max-w-sm">
          <div class="text-center mb-10">
            <h1 class="text-4xl font-display font-semibold italic text-ink mb-4">Scholar Profile</h1>
            <p class="text-ink-light text-sm">Sign in to track your mastery of characters.</p>
          </div>

          <form id="auth-form" class="space-y-6">
            <div>
              <label class="block text-xs uppercase tracking-widest text-ink font-bold mb-2">Email</label>
              <input type="email" id="auth-email" required class="w-full bg-surface border-b-2 border-paper-border px-4 py-3 text-ink focus:border-primary focus:outline-none transition-colors" placeholder="scholar@example.com">
            </div>
            
            <div>
              <label class="block text-xs uppercase tracking-widest text-ink font-bold mb-2">Password</label>
              <input type="password" id="auth-password" required minlength="6" class="w-full bg-surface border-b-2 border-paper-border px-4 py-3 text-ink focus:border-primary focus:outline-none transition-colors" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;">
            </div>

            <div id="auth-error" class="text-primary text-xs font-bold text-center hidden"></div>

            <div class="pt-4 flex flex-col gap-4">
              <button type="submit" id="btn-login" class="w-full bg-ink text-surface font-bold py-4 rounded-xl click-scale shadow-md tracking-widest text-sm uppercase">Sign In</button>
              <button type="button" id="btn-signup" class="w-full bg-surface border border-paper-border text-ink font-bold py-4 rounded-xl click-scale text-sm uppercase tracking-widest transition-colors hover:bg-background-light">Create Account</button>
            </div>
          </form>
        </div>

      </div>
      
      <!-- Bottom Navigation Bar -->
      ${await createNavBar('profile')}
    </div>
  `;

  const authForm = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const errorDiv = document.getElementById('auth-error');
  const btnSignup = document.getElementById('btn-signup');

  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
  };

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      await signInUser(email, password);
      // Success, re-render
      renderProfile(container);
    } catch (err) {
      showError(err.message || 'Failed to sign in.');
    }
  });

  btnSignup.addEventListener('click', async () => {
    errorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter an email and password to sign up.');
      return;
    }

    try {
      await signUpUser(email, password);
      alert('Signup successful! Check your email to confirm, or login if email confirmation is disabled.');
      // Attempt sign in immediately (usually works if email confirmation is off)
      await signInUser(email, password).catch(() => {});
      renderProfile(container);
    } catch (err) {
      showError(err.message || 'Failed to sign up.');
    }
  });
}
