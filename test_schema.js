import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking Supabase Schema for sequence_num...");
  const { data, error } = await supabase
    .from('vocabulary')
    .select('sequence_num')
    .limit(1);

  if (error) {
    console.error("ERROR Fetching sequence_num:", error.message);
  } else {
    console.log("SUCCESS! sequence_num column exists and schema cache is fresh.");
  }
}

checkSchema();
