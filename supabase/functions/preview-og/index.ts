import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://app.flitsdigital.nl'

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
    })
  }

  // Extract postId from path: /preview-og/<postId>
  const url = new URL(req.url)
  const postId = url.pathname.split('/').filter(Boolean).pop()

  if (!postId) {
    return new Response('Not found', { status: 404 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [{ data: post }, ] = await Promise.all([
    supabase
      .from('posts')
      .select('id, client_id, caption, media_url, media_urls, date, type')
      .eq('id', postId)
      .single(),
  ])

  if (!post) {
    return new Response('Not found', { status: 404 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', post.client_id)
    .single()

  const clientName: string = client?.company_name ?? 'Klant'
  const imageUrl: string = (post.media_urls?.[0] ?? post.media_url) ?? ''
  const caption: string = post.caption ?? ''
  const shortCaption = caption.length > 200 ? caption.slice(0, 197) + '…' : caption
  const title = `${clientName} — Content voorstel`
  const description = shortCaption || 'Bekijk en keur dit content voorstel goed.'
  const appUrl = `${APP_URL}/preview/${postId}`

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Flits Digital" />
  <meta property="og:url"         content="${esc(appUrl)}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  ${imageUrl ? `<meta property="og:image"       content="${esc(imageUrl)}" />
  <meta property="og:image:width"  content="1080" />
  <meta property="og:image:height" content="1080" />` : ''}

  <!-- Twitter / X card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${imageUrl ? `<meta name="twitter:image" content="${esc(imageUrl)}" />` : ''}

  <!-- Redirect browsers to the React app immediately -->
  <meta http-equiv="refresh" content="0; url=${esc(appUrl)}" />
  <script>window.location.replace(${JSON.stringify(appUrl)})</script>
</head>
<body>
  <p>Doorsturen naar <a href="${esc(appUrl)}">de preview</a>…</p>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
