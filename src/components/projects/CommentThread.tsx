import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MentionTextarea } from '../MentionTextarea'
import { UserAvatar } from '../UserAvatar'
import type { TaskComment } from '../../lib/projectsDb'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import type { UserProfile } from '../../types'

interface Props {
  comments: TaskComment[]
  newComment: string
  onNewCommentChange: (v: string) => void
  onAddComment: () => void
  currentProfile: UserProfile | null
  allProfiles: UserProfileLite[]
  submitting?: boolean
}

export function CommentThread({
  comments,
  newComment,
  onNewCommentChange,
  onAddComment,
  currentProfile,
  allProfiles,
  submitting = false,
}: Props) {
  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => {
            const name = c.authorName ?? c.authorEmail.split('@')[0]
            const commenterProfile = allProfiles.find((p) => p.email === c.authorEmail)
            return (
              <div key={c.id} className="flex gap-2.5">
                <UserAvatar
                  profile={commenterProfile ?? { email: c.authorEmail, name: c.authorName }}
                  size="w-6 h-6"
                  textSize="text-[9px]"
                  className="shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-medium text-text-primary">{name}</span>
                    <span className="text-[10px] text-text-muted">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: nl })}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 items-start">
        <UserAvatar profile={currentProfile} size="w-6 h-6" textSize="text-[9px]" className="shrink-0 mt-0.5" />
        <div className="flex-1 relative">
          <MentionTextarea
            value={newComment}
            onChange={onNewCommentChange}
            placeholder="Schrijf een opmerking... gebruik @ om iemand te taggen"
            rows={2}
            className="px-2.5 py-1.5 bg-white/[0.04] border border-border-subtle rounded-md placeholder-zinc-700 focus:border-zinc-600 transition-colors text-sm w-full"
          />
          {newComment.trim() && (
            <Button
              size="icon"
              className="absolute right-1.5 bottom-1.5 h-6 w-6"
              onClick={onAddComment}
              disabled={submitting}
            >
              <Send size={11} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
