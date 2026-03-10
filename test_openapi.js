import fetch from 'node-fetch';

const supabaseUrl = 'https://bsejwuxomavudaeqigiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWp3dXhvbWF2dWRhZXFpZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzk1MjgsImV4cCI6MjA4ODYxNTUyOH0.csB8rZTbPyqTsQ6MrFTCshvp-gBo--TqmO3Yc7ompBg';

async function getSpec() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const spec = await res.json();
  const table = spec.definitions.user_progress;
  if (table) {
    console.log("Found user_progress columns:");
    console.log(Object.keys(table.properties));
  } else {
    console.log("user_progress table not found in OpenAPI spec.");
  }
}

getSpec();
