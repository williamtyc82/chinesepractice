import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    if (data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
    } else {
      console.log("Table is empty, trying to force an error to see column names...");
      // Not easy via Rest API, let's just insert a totally invalid record and read the error
       const { error: insErr } = await supabase.from('user_progress').insert({ non_existent_col: 1 });
       console.log("Insert Error might hint columns:", insErr);
    }
  }
}

checkSchema();
