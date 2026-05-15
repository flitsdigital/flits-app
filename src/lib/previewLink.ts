import { toast } from 'sonner'
import { copyTextToClipboard } from './copyToClipboard'

/** Public preview URL — anyone with the link can view/approve (post id is the secret). */
export function buildPreviewUrl(postId: string): string {
  return `${window.location.origin}/preview/${postId}`
}

export function buildOgPreviewUrl(postId: string): string {
  const ogBase = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')
  return `${ogBase}/functions/v1/preview-og/${postId}`
}

export async function copyPostPreviewLink(postId: string, opts?: { socialOg?: boolean }): Promise<boolean> {
  const link = opts?.socialOg ? buildOgPreviewUrl(postId) : buildPreviewUrl(postId)

  const copied = await copyTextToClipboard(link)
  if (copied) {
    toast.success('Preview-link gekopieerd')
    return true
  }

  window.prompt('Kopieer deze preview-link (⌘C / Ctrl+C):', link)
  toast.message('Preview-link gegenereerd', {
    description: 'Automatisch kopiëren mislukt — gebruik het venster hierboven.',
  })
  return true
}
