import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log("Signing in with suggested test account...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@test.com',
    password: 'password123'
  });

  if (authErr) {
    console.error("Auth Error:", authErr);
    return;
  }

  const user = authData.user;
  console.log("Logged in as:", user.email, user.id);

  const progressData = {
    character: '测试',
    total_mistakes: 0,
    stars: 5,
    completed_at: new Date().toISOString(),
    user_id: user.id
  };

  console.log("Attempting Upsert...");
  const { data, error } = await supabase
    .from('user_progress')
    .upsert(progressData, {
      onConflict: 'user_id,character',
    })
    .select();

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("SUCCESS! Row upserted:", data);
  }
}

checkTable();
