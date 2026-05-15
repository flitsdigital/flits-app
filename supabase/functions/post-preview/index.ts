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

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json() as {
      action: 'get' | 'approve'
      postId: string
    }

    const { action, postId } = body
    if (!postId) return json({ error: 'postId required' }, 400)

    if (action === 'get') {
      const { data: row, error: postErr } = await admin
        .from('posts')
        .select(
          'id, client_id, caption, media_url, media_urls, date, type, status, clients ( company_name )',
        )
        .eq('id', postId)
        .single()

      if (postErr || !row) return json({ error: 'Post not found' }, 404)

      const clientJoin = row.clients as { company_name?: string } | { company_name?: string }[] | null
      const clientName = Array.isArray(clientJoin)
        ? clientJoin[0]?.company_name
        : clientJoin?.company_name

      const { clients: _c, ...post } = row as Record<string, unknown>

      return json({
        post,
        clientName: clientName ?? 'Klant',
      })
    }

    if (action === 'approve') {
      const { data: existing } = await admin
        .from('posts')
        .select('status')
        .eq('id', postId)
        .single()

      if (!existing) return json({ error: 'Post not found' }, 404)
      if (existing.status === 'approved') {
        return json({ ok: true, alreadyApproved: true })
      }

      const { error: updErr } = await admin
        .from('posts')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', postId)

      if (updErr) return json({ error: updErr.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500)
  }
})
