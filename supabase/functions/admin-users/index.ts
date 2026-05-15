import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: caller } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json() as {
      action: 'create' | 'update' | 'delete'
      email?: string
      password?: string
      userId?: string
      name?: string | null
      role?: string
      allowed_pages?: string[]
      allowed_features?: string[]
    }

    if (body.action === 'create') {
      if (!body.email || !body.password) return json({ error: 'email and password required' }, 400)
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { name: body.name ?? undefined },
      })
      if (error) return json({ error: error.message }, 400)

      const { error: profileErr } = await admin.from('profiles').update({
        name: body.name ?? null,
        role: body.role ?? 'default',
        allowed_pages: body.role === 'admin' ? [] : (body.allowed_pages ?? ['content']),
        allowed_features: body.role === 'admin' ? [] : (body.allowed_features ?? []),
        updated_at: new Date().toISOString(),
      }).eq('id', data.user.id)

      if (profileErr) return json({ error: profileErr.message }, 500)
      return json({ userId: data.user.id })
    }

    if (body.action === 'update') {
      if (!body.userId) return json({ error: 'userId required' }, 400)

      const { error: profileErr } = await admin.from('profiles').update({
        name: body.name ?? null,
        role: body.role ?? 'default',
        allowed_pages: body.role === 'admin' ? [] : (body.allowed_pages ?? ['content']),
        allowed_features: body.role === 'admin' ? [] : (body.allowed_features ?? []),
        updated_at: new Date().toISOString(),
      }).eq('id', body.userId)

      if (profileErr) return json({ error: profileErr.message }, 500)

      if (body.password) {
        const { error: pwErr } = await admin.auth.admin.updateUserById(body.userId, {
          password: body.password,
        })
        if (pwErr) return json({ error: pwErr.message }, 400)
      }

      return json({ ok: true })
    }

    if (body.action === 'delete') {
      if (!body.userId) return json({ error: 'userId required' }, 400)
      const { error } = await admin.auth.admin.deleteUser(body.userId)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500)
  }
})
