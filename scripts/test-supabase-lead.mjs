import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { error } = await sb.from('leads').insert({
  name: 'test-script',
  email: 'test-script@example.com',
  contact_method: 'email',
  total_price: 1,
})

if (error) {
  console.error('FAIL:', error.message)
  if (/row-level security/i.test(error.message) || error.code === '42501') {
    console.error('\n→ Виконайте supabase/setup-leads.sql у Supabase SQL Editor\n')
  }
  process.exit(1)
}

console.log('OK: insert into leads succeeded')
