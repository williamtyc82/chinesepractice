import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRows() {
  console.log("Fetching vocabulary...");

  const { data, error } = await supabase
    .from('vocabulary')
    .select('*');

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log(`SUCCESS! Found ${data.length} rows.`);
    console.log(data);
  }
}

checkRows();
