import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

interface PreviewPost {
  id: string
  client_id: string
  caption: string
  media_url: string | null
  media_urls?: string[] | null
  date: string | null
  type: string
}

export function PostPreview() {
  const { postId } = useParams<{ postId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [post, setPost] = useState<PreviewPost | null>(null)
  const [clientName, setClientName] = useState('Klant')
  const [activeSlide, setActiveSlide] = useState(0)
  const carouselRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    async function loadPreview() {
      if (!postId) return
      setLoading(true)
      setError(null)
      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('id, client_id, caption, media_url, media_urls, date, type')
          .eq('id', postId)
          .single()

        if (postError || !postData) {
          throw new Error('Post niet gevonden.')
        }

        setPost(postData as PreviewPost)
        setActiveSlide(0)

        const { data: clientData } = await supabase
          .from('clients')
          .select('company_name')
          .eq('id', postData.client_id)
          .single()

        if (clientData?.company_name) {
          setClientName(clientData.company_name)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kon preview niet laden.')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [postId])

  const dateLabel = useMemo(() => {
    if (!post?.date) return null
    return format(parseISO(post.date), 'd MMMM yyyy', { locale: nl })
  }, [post?.date])

  const mediaUrls = useMemo(() => {
    if (!post) return []
    if (post.media_urls && post.media_urls.length > 0) return post.media_urls
    return post.media_url ? [post.media_url] : []
  }, [post])

  function goToSlide(index: number) {
    if (!carouselRef.current || mediaUrls.length === 0) return
    const bounded = Math.max(0, Math.min(index, mediaUrls.length - 1))
    const width = carouselRef.current.clientWidth
    carouselRef.current.scrollTo({ left: width * bounded, behavior: 'smooth' })
    setActiveSlide(bounded)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-sm text-text-muted">Preview laden...</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-surface-2 border border-border-subtle rounded-xl p-5 text-center">
          <p className="text-sm font-medium text-red-400">Preview niet beschikbaar</p>
          <p className="text-xs text-text-muted mt-2">{error ?? 'Onbekende fout.'}</p>
        </div>
      </div>
    )
  }

  if (mediaUrls.length === 0) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-surface-2 border border-border-subtle rounded-xl p-5 text-center">
          <p className="text-sm font-medium text-text-primary">Geen foto gevonden</p>
          <p className="text-xs text-text-muted mt-2">Deze preview werkt alleen voor posts met een foto.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-0 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-5">
          <p className="text-xs uppercase tracking-wider text-text-muted">Content preview</p>
          <h1 className="text-base font-semibold text-text-primary mt-1">Voorstel voor {clientName}</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <p className="text-xs text-text-muted mb-3">Caption van deze post:</p>
            <p className="text-sm text-text-secondary whitespace-pre-line break-words">
              {post.caption || 'Geen caption toegevoegd.'}
            </p>
          </aside>

          <div className="max-w-xl w-full mx-auto bg-surface-2 border border-border-subtle rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-accent-blue">
                    {clientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{clientName}</p>
                  <p className="text-xs text-text-muted">Instagram preview</p>
                </div>
              </div>
              <MoreHorizontal size={16} className="text-text-muted" />
            </div>

            <div className="bg-surface-3 relative">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
                onScroll={(e) => {
                  const target = e.currentTarget
                  if (target.clientWidth === 0) return
                  const next = Math.round(target.scrollLeft / target.clientWidth)
                  setActiveSlide(next)
                }}
              >
                {mediaUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="w-full shrink-0 snap-center flex items-center justify-center max-h-[75vh]">
                    <img
                      src={url}
                      alt={`Preview ${index + 1} voor ${clientName}`}
                      className="w-full h-auto max-h-[75vh] object-contain"
                    />
                  </div>
                ))}
              </div>

              {mediaUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goToSlide(activeSlide - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/55 text-white transition-colors"
                    aria-label="Vorige slide"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSlide(activeSlide + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/55 text-white transition-colors"
                    aria-label="Volgende slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {mediaUrls.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => goToSlide(index)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${index === activeSlide ? 'bg-white' : 'bg-white/40'}`}
                        aria-label={`Ga naar slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border-subtle">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 text-text-primary">
                  <Heart size={18} />
                  <MessageCircle size={18} />
                  <Send size={18} />
                </div>
                <Bookmark size={18} className="text-text-primary" />
              </div>

              <p className="text-sm text-text-secondary whitespace-pre-line break-words">
                <span className="font-medium text-text-primary mr-1">{clientName}</span>
                {post.caption || 'Geen caption toegevoegd.'}
              </p>

              {dateLabel && (
                <p className="text-xs text-text-muted mt-3 uppercase tracking-wide">{dateLabel}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
