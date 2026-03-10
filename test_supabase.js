import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  // 1. Fetch
  console.log('\\n--- FETCHING VOCABULARY ---');
  let { data: vocab, error: fetchErr } = await supabase
    .from('vocabulary')
    .select('*')
    .limit(5);

  if (fetchErr) {
    console.error('Fetch Error:', fetchErr);
    if (fetchErr.message.includes('relation "public.vocabulary" does not exist')) {
        console.error('\\n❌ TABLE MISSING: The vocabulary table has not been created in this Supabase project.');
        console.error('Please run the `supabase_vocabulary_migration.sql` in the Supabase Dashboard SQL Editor.');
        process.exit(1);
    }
  } else {
    console.log('Fetch Success! Found', vocab.length, 'records.');
    console.log(vocab);
  }

  // 2. Insert
  console.log('\\n--- INSERTING VOCABULARY ---');
  const testWord = {
      word: '测',
      pinyin: 'cè',
      meaning: 'test'
      // Omitted chapter to avoid schema conflict
  };
  
  const { data: inserted, error: insertErr } = await supabase
    .from('vocabulary')
    .insert([testWord])
    .select();
    
  if (insertErr) {
      console.error('Insert Error:', insertErr);
      if (insertErr.message.includes('new row violates row-level security policy')) {
          console.error('\\n❌ RLS ERROR: Row-Level Security is preventing inserts.');
          console.error('Ensure that anon/public insert policies are configured, or use the service role key for admin tasks.');
      }
  } else {
      console.log('Insert Success!', inserted);
      
      // 3. Delete
      console.log('\\n--- DELETING TEST WORD ---');
      const { error: deleteErr } = await supabase
        .from('vocabulary')
        .delete()
        .eq('id', inserted[0].id);
        
      if (deleteErr) {
          console.error('Delete Error:', deleteErr);
      } else {
          console.log('Delete Success!');
      }
  }
}

testSupabase();
