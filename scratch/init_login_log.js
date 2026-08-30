const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function init() {
  console.log('Testing UserLoginLog table...');
  const { data, error } = await supabase.from('UserLoginLog').select('*').limit(1);
  if (error) {
    console.log('Table UserLoginLog query error:', error.message);
  } else {
    console.log('UserLoginLog table is accessible! Found rows:', data.length);
  }
}

init();
