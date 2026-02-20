#!/usr/bin/env node
/**
 * Einmalig: E-Mail eines Auth-Users ändern (z. B. von Arbeits-Mail auf private Mail).
 * Nutzung: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/update-user-email.mjs <USER_ID> <NEUE_EMAIL>
 * USER_ID: aus Supabase Dashboard → Authentication → Users → User anklicken → UID kopieren
 * service_role Key: Supabase Dashboard → Project Settings → API → service_role (geheim halten!)
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.argv[2]
const newEmail = process.argv[3]

if (!url || !serviceRoleKey) {
  console.error('Fehler: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.')
  console.error('Beispiel: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/update-user-email.mjs <USER_ID> <NEUE_EMAIL>')
  process.exit(1)
}

if (!userId || !newEmail) {
  console.error('Nutzung: node scripts/update-user-email.mjs <USER_ID> <NEUE_EMAIL>')
  console.error('USER_ID aus Supabase → Authentication → Users → User → UID kopieren')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data, error } = await supabase.auth.admin.updateUserById(userId, { email: newEmail })

if (error) {
  console.error('Fehler:', error.message)
  process.exit(1)
}

console.log('E-Mail aktualisiert:', data.user?.email)
console.log('User kann sich jetzt mit', newEmail, 'anmelden; Recovery-Mails gehen an diese Adresse.')
