// Optional end-to-end test against an isolated project or explicitly selected test accounts.
// Creates one uniquely named group; removes it through the normal leave RPCs in finally.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('@next/env').loadEnvConfig(process.cwd())
const { createClient } = require('@supabase/supabase-js')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
assert(url && key, 'Missing Supabase configuration')
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const unwrap = ({ data, error }) => { if (error) throw error; return data }
const anonymous = client()
const authSettings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(r => {
  assert.equal(r.status, 200); return r.json()
})
console.log('PASS Auth endpoint; Google enabled:', authSettings.external.google)
const denied = await anonymous.from('tasks').select('id')
assert(denied.error, 'Anonymous table access should have no grant')
console.log('PASS anonymous access denied')

if (!process.env.GOTAKS_TEST_LEADER_EMAIL || !process.env.GOTAKS_TEST_MEMBER_EMAIL || !process.env.GOTAKS_TEST_PASSWORD) {
  console.log('SKIP authenticated workflow: supply explicit test account environment variables')
  process.exit(0)
}
const leader = client(), member = client()
let group, channel, memberJoined = false
try {
  for (const [c, email] of [[leader, process.env.GOTAKS_TEST_LEADER_EMAIL], [member, process.env.GOTAKS_TEST_MEMBER_EMAIL]]) {
    unwrap(await c.auth.signInWithPassword({ email, password: process.env.GOTAKS_TEST_PASSWORD }))
  }
  group = unwrap(await leader.rpc('buat_grup', { nama_grup: `Verification ${Date.now()}` }))
  unwrap(await member.rpc('gabung_grup', { kode: group.kode_undangan }))
  memberJoined = true
  const task = unwrap(await leader.from('tasks').insert({ group_id: group.id, judul: 'Verification task', deadline: '2099-01-01' }).select().single())
  assert.equal(unwrap(await member.from('tasks').select('id').eq('id', task.id)).length, 0)
  const draftEdit = unwrap(await leader.from('tasks').update({ judul: 'Verified draft edit' }).eq('id', task.id).select().single())
  assert.equal(draftEdit.judul, 'Verified draft edit')
  let resolveEvent
  const eventReceived = new Promise(resolve => { resolveEvent = resolve })
  let resolveReady, rejectReady
  const databaseReady = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
  channel = member.channel(`verify-${group.id}`).on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'tasks', filter: `group_id=eq.${group.id}`,
  }, event => { if (event.new.id === task.id) resolveEvent(event) })
  channel.on('system', {}, payload => {
    if (payload.status === 'ok') resolveReady()
    if (payload.status === 'error') rejectReady(new Error(payload.message))
  })
  const readyTimer = setTimeout(() => rejectReady(new Error('Realtime database subscription timeout')), 15000)
  try {
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') rejectReady(new Error(`Realtime ${status}`))
    })
    await databaseReady
  } finally { clearTimeout(readyTimer) }
  assert.equal(unwrap(await leader.rpc('kirim_tugas', { gid: group.id })), 1)
  // Claim occurs after publication: member now passes SELECT RLS for the update event.
  const claimed = unwrap(await member.rpc('ambil_tugas', { tid: task.id }))
  assert.equal(claimed.status, 'doing')
  let eventTimer
  try {
    await Promise.race([eventReceived, new Promise((_, reject) => { eventTimer = setTimeout(() => reject(new Error('Realtime delivery timeout')), 15000) })])
  } finally { clearTimeout(eventTimer) }
  assert((await member.from('tasks').update({ status: 'done' }).eq('id', task.id)).error)
  const submitted = unwrap(await member.rpc('selesaikan_tugas', { tid: task.id }))
  assert(submitted.submitted_at)
  assert((await member.rpc('setujui_tugas', { tid: task.id })).error)
  assert.equal(unwrap(await leader.rpc('setujui_tugas', { tid: task.id })).status, 'done')
  assert.equal(unwrap(await leader.rpc('ringkasan_grup', { gid: group.id })).done, 1)
  assert.equal(unwrap(await leader.rpc('kontribusi_grup', { gid: group.id })).reduce((sum, r) => sum + r.tugas_selesai, 0), 1)
  assert.equal(unwrap(await member.from('tasks_view').select('*').eq('id', task.id).single()).status, 'done')
  console.log('PASS authenticated REST/RPC, draft edit, RLS, workflow, contribution and live Realtime delivery')
} finally {
  if (channel) await member.removeChannel(channel)
  try {
    if (group && memberJoined) unwrap(await member.rpc('keluar_grup', { gid: group.id }))
    if (group) unwrap(await leader.rpc('keluar_grup', { gid: group.id }))
  } finally {
    await Promise.all([leader.auth.signOut({ scope: 'local' }), member.auth.signOut({ scope: 'local' })])
    await Promise.all([leader.removeAllChannels(), member.removeAllChannels()])
  }
}
