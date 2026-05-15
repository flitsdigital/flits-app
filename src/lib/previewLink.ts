import { toast } from 'sonner'
import { copyTextToClipboard, copyTextToClipboardSync } from './copyToClipboard'

/** Public preview URL — anyone with the link can view/approve (post id is the secret). */
export function buildPreviewUrl(postId: string): string {
  return `${window.location.origin}/preview/${postId}`
}

export function buildOgPreviewUrl(postId: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) {
    console.warn('VITE_SUPABASE_URL missing — using app preview URL for OG link')
    return buildPreviewUrl(postId)
  }
  return `${base.replace(/\/$/, '')}/functions/v1/preview-og/${postId}`
}

export async function copyPostPreviewLink(
  postId: string,
  opts?: { socialOg?: boolean },
): Promise<boolean> {
  const link = opts?.socialOg ? buildOgPreviewUrl(postId) : buildPreviewUrl(postId)

  // Sync copy in click handler tick (dropdown/dialog safe)
  if (copyTextToClipboardSync(link)) {
    toast.success('Preview-link gekopieerd', { description: link })
    return true
  }

  const copied = await copyTextToClipboard(link)
  if (copied) {
    toast.success('Preview-link gekopieerd', { description: link })
    return true
  }

  toast.error('Kopiëren mislukt', {
    description: link,
    duration: 8000,
  })
  return false
}
