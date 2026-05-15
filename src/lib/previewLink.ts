import { toast } from 'sonner'
import { copyTextInUserGesture } from './copyToClipboard'

/** Public preview URL — anyone with the link can view/approve (post id is the secret). */
export function buildPreviewUrl(postId: string): string {
  return `${window.location.origin}/preview/${postId}`
}

/** Open preview in a new tab (logged-in team view of the public page). */
export function openPostPreview(postId: string): void {
  window.open(buildPreviewUrl(postId), '_blank', 'noopener,noreferrer')
}

export function buildOgPreviewUrl(postId: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) {
    console.warn('VITE_SUPABASE_URL missing — using app preview URL for OG link')
    return buildPreviewUrl(postId)
  }
  return `${base.replace(/\/$/, '')}/functions/v1/preview-og/${postId}`
}

/** Call directly from a click handler (no await before this). */
export function copyPostPreviewLink(
  postId: string,
  opts?: { socialOg?: boolean },
): Promise<boolean> {
  const link = opts?.socialOg ? buildOgPreviewUrl(postId) : buildPreviewUrl(postId)

  return new Promise((resolve) => {
    copyTextInUserGesture(link, (ok) => {
      if (ok) {
        toast.success('Preview-link gekopieerd', { description: link })
        resolve(true)
        return
      }
      toast.error('Kopiëren mislukt', {
        description: link,
        duration: 8000,
      })
      resolve(false)
    })
  })
}
