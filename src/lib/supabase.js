import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

/**
 * Get or create the Supabase client instance.
 */
export function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

/**
 * Sign up a new user
 */
export async function signUpUser(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in an existing user
 */
export async function signInUser(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: { user } } = await client.auth.getUser();
  return user;
}

// --- Admin Configuration ---
// Add the exact email address you want to use for the Admin account here
const ADMIN_EMAILS = [
  'williamtyc82@gmail.com', // Replace with real admin email
  'test@test.com'      // Temporary test admin
];

/**
 * Check if the currently logged-in user is an administrator.
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email);
}
/**
 * Update user progress after completing a character trace.
 * Upserts into the `user_progress` table.
 *
 * @param {string} character - The Chinese character that was completed.
 * @param {number} totalMistakes - Total mistakes made during the quiz.
 * @param {number} stars - Star rating (1–5).
 */
export async function updateUserProgress(character, totalMistakes, stars) {
  const client = getSupabaseClient();

  if (!client) {
    console.warn('[Supabase] Client not initialized — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    return null;
  }

  // Get current user (if auth is set up)
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    console.warn('[Supabase] User not logged in, skipping progress save.');
    return null;
  }

  const progressData = {
    character,
    total_mistakes: totalMistakes,
    stars,
    completed_at: new Date().toISOString(),
    user_id: user.id
  };

  try {
    // Check for existing progress manually to avoid relying on a UNIQUE constraint
    // which the user might have missed when creating the schema manually.
    const { data: existing } = await client
      .from('user_progress')
      .select('id, stars, total_mistakes')
      .eq('user_id', user.id)
      .eq('character', character)
      .maybeSingle();

    let result;
    if (existing) {
      // Keep best performance on repeat practice
      const bestStars = Math.max(existing.stars || 0, stars);
      const bestMistakes = Math.min(existing.total_mistakes || 0, totalMistakes);

      result = await client
        .from('user_progress')
        .update({
          ...progressData,
          stars: bestStars,
          total_mistakes: bestMistakes
        })
        .eq('id', existing.id)
        .select();
    } else {
      result = await client
        .from('user_progress')
        .insert([progressData])
        .select();
    }

    if (result.error) throw result.error;
    console.log('[Supabase] Progress saved:', result.data);
    return result.data;
  } catch (err) {
    console.error('[Supabase] Failed to update progress:', err);
  }
}

// ==========================================
// VOCABULARY CRUD OPERATIONS
// ==========================================

/**
 * Fetch all vocabulary words ordered by newest first.
 */
export async function getVocabulary() {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('vocabulary')
    .select('*')
    .order('sequence_num', { ascending: true });

  if (error) {
    console.error('[Supabase] Fetch vocabulary error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch all completed vocabulary for the current user.
 */
export async function getCompletedVocabulary() {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  const { data: progressData, error: progressError } = await client
    .from('user_progress')
    .select('character, stars, completed_at')
    .eq('user_id', user.id);

  if (progressError || !progressData || progressData.length === 0) return [];

  const completedWords = progressData.map(p => p.character);

  const { data: vocabData, error: vocabError } = await client
    .from('vocabulary')
    .select('*')
    .in('word', completedWords)
    .order('sequence_num', { ascending: true });

  if (vocabError) return [];

  // Combine to inject stars
  const combined = vocabData.map(v => {
    const prog = progressData.find(p => p.character === v.word);
    return {
      ...v,
      stars: prog ? prog.stars : 0,
      completed_at: prog ? prog.completed_at : null
    };
  });

  return combined;
}

/**
 * Add a single new vocabulary word.
 */
export async function addVocabularyWord(word, pinyin, meaning, chapter, sequence_num = 1) {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('vocabulary')
    .insert([{ word, pinyin, meaning, chapter, sequence_num }])
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Add word error:', error);
    throw error;
  }
  return data;
}

/**
 * Add multiple vocabulary words in batch (from OCR).
 */
export async function addVocabularyBatch(wordsList) {
  const client = getSupabaseClient();
  if (!client) return null;

  // Clean payload for DB (remove temp UI IDs)
  const payload = wordsList.map(({ word, pinyin, meaning, chapter, sequence_num }) => ({
    word, pinyin, meaning, chapter, sequence_num
  }));

  const { data, error } = await client
    .from('vocabulary')
    .insert(payload)
    .select();

  if (error) {
    console.error('[Supabase] Batch add error:', error);
    throw error;
  }
  return data;
}

/**
 * Update an existing vocabulary word.
 */
export async function updateVocabularyWord(id, updates) {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('vocabulary')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Update word error:', error);
    throw error;
  }
  return data;
}

/**
 * Delete a vocabulary word by ID.
 */
export async function deleteVocabularyWord(id) {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('vocabulary')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Delete word error:', error);
    return false;
  }
  return true;
}

/**
 * Subscribe to real-time changes on the vocabulary table.
 * @param {Function} callback - Fired when an insert/update/delete occurs
 */
export function subscribeToVocabulary(callback) {
  const client = getSupabaseClient();
  if (!client) return null;

  const channel = client.channel('vocabulary-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vocabulary' },
      (payload) => callback(payload)
    )
    .subscribe();

  return channel;
}

