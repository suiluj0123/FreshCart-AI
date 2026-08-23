const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function inspect() {
  const { data: users, error: uErr } = await supabase.from('User').select('id, authId, email, name');
  console.log('--- USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));

  const { data: orders, error: oErr } = await supabase.from('Order').select('id, userId, status, total, createdAt');
  console.log('--- ORDERS IN DB ---');
  console.log(JSON.stringify(orders, null, 2));
}

inspect();