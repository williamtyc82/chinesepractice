import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEdgeFunction() {
  console.log('Fetching a vocabulary word...');
  const { data: vocab, error } = await supabase.from('vocabulary').select('*').limit(1);
  
  if (error || !vocab.length) {
    console.error('Fetch error or no words:', error);
    return;
  }
  
  const word = vocab[0];
  console.log('Testing Edge Function with word:', word.word, '-', word.meaning);
  
  if (!word.meaning || word.meaning.trim() === '') {
      console.log('Word has no meaning, skipping Edge Function test.');
      return;
  }
  
  console.log('Invoking Edge Function generate-vocab-image...');
  
  const { data, error: invokeError } = await supabase.functions.invoke('generate-vocab-image', {
    body: { record: word }
  });
  
  if (invokeError) {
    console.error('\\n❌ Edge Function Error:');
    console.error(JSON.stringify(invokeError, null, 2));
  } else {
    console.log('\\n✅ Edge Function Success!');
    console.log(data);
  }
}

testEdgeFunction();
