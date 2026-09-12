import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2, LockKeyhole, MessageCircle, PlayCircle, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { CourseState } from '../App'
import { supabase } from '../lib/supabase'

type QuizQuestion = { id: string; prompt: string; explanation: string; quiz_options: { id: string; label: string; position: number }[] | null }
type QuizResult = { score: number; passed: boolean; correctCount: number; totalCount: number }
type LessonComment = { id: string; lesson_id: string; user_id: string; author_name: string; body: string; created_at: string }

export function LessonPage({ state }: { state: CourseState }) {
  const { lessonId } = useParams()
  const lesson = state.lessons.find((item) => item.id === lessonId)
  const [watchedSeconds, setWatchedSeconds] = useState(0)
  const [displayWatchedSeconds, setDisplayWatchedSeconds] = useState(0)
  const [trackingActive, setTrackingActive] = useState(false)
  const [requiredSeconds, setRequiredSeconds] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(Math.max(lesson?.durationMinutes || 1, 1) * 60)
  const [videoId, setVideoId] = useState(lesson?.youtubeVideoId || '')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState('')
  const [comments, setComments] = useState<LessonComment[]>([])
  const [commentUserId, setCommentUserId] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentSending, setCommentSending] = useState(false)
  const [commentDeleting, setCommentDeleting] = useState('')
  const [commentError, setCommentError] = useState('')
  const nextLesson = useMemo(() => state.lessons.find((item) => item.position === (lesson?.position || 0) + 1), [state.lessons, lesson])

  useEffect(() => {
    const initialWatchedSeconds = lesson?.quizPassed ? Math.max(lesson.durationMinutes, 1) * 60 : 0
    setWatchedSeconds(initialWatchedSeconds)
    setDisplayWatchedSeconds(initialWatchedSeconds)
    setTrackingActive(false)
    setRequiredSeconds(Math.ceil(Math.max(lesson?.durationMinutes || 1, 1) * 60 * .85))
    setDurationSeconds(Math.max(lesson?.durationMinutes || 1, 1) * 60)
    setVideoId(lesson?.youtubeVideoId || '')
    setResult(null)
    setSelected({})
  }, [lesson?.id])

  const watched = watchedSeconds >= requiredSeconds && requiredSeconds > 0

  useEffect(() => {
    if (lesson && watched && !lesson.quizEnabled && lesson.status !== 'completed') {
      state.completeLesson(lesson.id)
    }
  }, [lesson?.id, lesson?.quizEnabled, lesson?.status, watched])

  useEffect(() => {
    if (!supabase || !lesson) return
    const client = supabase
    const loadProgress = async () => {
      const { data } = await client.from('lesson_progress').select('watched_seconds').eq('lesson_id', lesson.id).maybeSingle()
      if (typeof data?.watched_seconds === 'number') {
        setWatchedSeconds(data.watched_seconds)
        setDisplayWatchedSeconds(data.watched_seconds)
      }
    }
    void loadProgress()
  }, [lesson?.id])

  useEffect(() => {
    if (!supabase || !lesson || !videoId || watched) return
    const client = supabase
    const recordWatch = async () => {
      if (document.visibilityState !== 'visible') return
      const { data, error: watchError } = await client.rpc('record_lesson_watch', { p_lesson_id: lesson.id, p_increment_seconds: 10 })
      if (watchError || !data) {
        setTrackingActive(false)
        return
      }
      const progress = data as { watchedSeconds: number; durationSeconds: number; requiredSeconds: number }
      setWatchedSeconds(progress.watchedSeconds)
      setDisplayWatchedSeconds((current) => Math.max(current, progress.watchedSeconds))
      setDurationSeconds(progress.durationSeconds)
      setRequiredSeconds(progress.requiredSeconds)
      setTrackingActive(true)
    }
    void recordWatch()
    const timer = window.setInterval(() => { void recordWatch() }, 10000)
    return () => window.clearInterval(timer)
  }, [lesson?.id, videoId, watched])

  useEffect(() => {
    if (!lesson || !videoId || !trackingActive || watched) return
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setDisplayWatchedSeconds((current) => Math.min(current + 1, durationSeconds))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lesson?.id, videoId, trackingActive, watched, durationSeconds])

  useEffect(() => {
    if (!supabase || !lesson) return
    const client = supabase
    const loadVideo = async () => {
      const { data } = await client.from('lesson_media').select('youtube_video_id').eq('lesson_id', lesson.id).maybeSingle()
      if (data?.youtube_video_id) setVideoId(data.youtube_video_id)
    }
    void loadVideo()
  }, [lesson?.id])

  useEffect(() => {
    if (!supabase || !lesson || !lesson.quizEnabled || !watched) return
    const client = supabase
    const loadQuestions = async () => {
      setQuestionsLoading(true)
      const { data, error } = await client.from('quiz_questions').select('id,prompt,explanation,quiz_options(id,label,position)').eq('lesson_id', lesson.id).eq('is_published', true).order('position')
      if (error) setError('تعذر تحميل الاختبار. حاول تحديث الصفحة.')
      else setQuestions((data || []) as QuizQuestion[])
      setQuestionsLoading(false)
    }
    void loadQuestions()
  }, [lesson?.id, lesson?.quizEnabled, watched])

  useEffect(() => {
    if (!supabase || !lesson) return
    const client = supabase
    let cancelled = false
    const loadComments = async () => {
      setCommentsLoading(true)
      setCommentError('')
      const [{ data: auth }, { data, error: loadError }] = await Promise.all([
        client.auth.getUser(),
        client.from('lesson_comments').select('id,lesson_id,user_id,author_name,body,created_at').eq('lesson_id', lesson.id).order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setCommentUserId(auth.user?.id || '')
      if (loadError) {
        setComments([])
        setCommentError('تعذر تحميل التعليقات. تأكد من تشغيل كود تحديث التعليقات في Supabase.')
      } else {
        setComments((data || []) as LessonComment[])
      }
      setCommentsLoading(false)
    }
    void loadComments()
    return () => { cancelled = true }
  }, [lesson?.id])

  if (!lesson) return <Navigate to="/dashboard" replace />
  if (lesson.status === 'locked') return <div className="empty-state"><LockKeyhole /><h1>المحاضرة لسه مقفولة</h1><p>أكمل 85% من المحاضرة السابقة، واجتز اختبارها إن كان مفعّلًا.</p><Link className="secondary-button" to="/dashboard">الرجوع للرئيسية</Link></div>

  const submitQuiz = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !questions.length) return
    if (questions.some((question) => !selected[question.id])) { setError('جاوب على كل الأسئلة الأول.'); return }
    setError('')
    const answers = Object.fromEntries(questions.map((question) => [question.id, selected[question.id]]))
    const { data, error } = await supabase.rpc('submit_quiz', { p_lesson_id: lesson.id, p_answers: answers })
    if (error || !data) { setError('تعذر تصحيح الاختبار. راجع إجاباتك وجرّب تاني.'); return }
    const quizResult = data as QuizResult
    setResult(quizResult)
    if (quizResult.passed) state.passLesson(lesson.id)
  }

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !lesson || !commentUserId || commentSending) return
    const body = commentDraft.trim()
    if (!body) { setCommentError('اكتب تعليقك الأول.'); return }
    setCommentSending(true)
    setCommentError('')
    const { data: liveProfile } = await supabase.from('profiles').select('full_name').eq('id', commentUserId).single()
    const authorName = liveProfile?.full_name?.trim() || state.profile?.fullName?.trim() || ''
    if (!authorName) {
      setCommentSending(false)
      setCommentError('اسم الطالب غير موجود. سجّل الدخول من جديد ثم جرّب.')
      return
    }
    const { data, error: sendError } = await supabase.from('lesson_comments').insert({ lesson_id: lesson.id, user_id: commentUserId, author_name: authorName, body }).select('id,lesson_id,user_id,author_name,body,created_at').single()
    setCommentSending(false)
    if (sendError || !data) {
      setCommentError('تعذر إرسال التعليق. جرّب تاني أو تأكد من تشغيل تحديث Supabase.')
      return
    }
    setComments((current) => [data as LessonComment, ...current])
    setCommentDraft('')
  }

  const deleteComment = async (comment: LessonComment) => {
    if (!supabase || commentDeleting || !window.confirm('حذف تعليقك نهائيًا؟')) return
    setCommentDeleting(comment.id)
    setCommentError('')
    const { error: deleteError } = await supabase.from('lesson_comments').delete().eq('id', comment.id)
    setCommentDeleting('')
    if (deleteError) { setCommentError('تعذر حذف التعليق. جرّب تاني.'); return }
    setComments((current) => current.filter((item) => item.id !== comment.id))
  }

  return (
    <div className="lesson-page">
      <div className="breadcrumb"><Link to="/dashboard">الرئيسية</Link><ArrowLeft size={15} /><span>المحاضرة {lesson.position}</span></div>
      <header className="lesson-header"><span className="eyebrow">المحاضرة {lesson.position} من {state.lessons.length}</span><h1>{lesson.title}</h1><p>{lesson.description}</p></header>

      {videoId ? <div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div> : <div className="video-empty"><PlayCircle size={64} /><h2>الفيديو لم يُضف بعد</h2><p>الأدمن يضيف لينك YouTube من لوحة الإدارة.</p></div>}

      <section className="lesson-watch-progress" aria-live="polite"><div><strong>{watched ? 'أكملت الحد المطلوب للمشاهدة' : `تقدم المشاهدة ${Math.min(100, Math.floor((displayWatchedSeconds / Math.max(durationSeconds, 1)) * 100))}%`}</strong><span>{watched ? (lesson.quizEnabled ? 'الاختبار مفتوح الآن.' : 'تم إكمال المحاضرة، والمحاضرة التالية متاحة الآن.') : (lesson.quizEnabled ? 'يلزم إكمال 85% لفتح الاختبار والمحاضرة التالية.' : 'يلزم إكمال 85% لفتح المحاضرة التالية.')}</span></div><div className="watch-track"><i style={{ width: `${Math.min(100, (displayWatchedSeconds / Math.max(durationSeconds, 1)) * 100)}%` }} /></div></section>

      {lesson.quizEnabled && <section className={`quiz-section ${watched ? '' : 'disabled-section'}`}>
        <div className="section-heading"><div><span className="eyebrow">اختبار المحاضرة</span><h2>اتأكد إن المعلومة وصلت</h2><p>الاختبار بيتعدل من لوحة الإدارة ونتيجته محفوظة في حسابك.</p></div><span className="score-rule">درجة النجاح 70%</span></div>
        {questionsLoading ? <div className="chat-state"><Loader2 className="spin"/> جاري تحميل الاختبار...</div> : !watched ? <p className="muted">الاختبار مقفل حتى تصل إلى 85% من مدة المحاضرة.</p> : questions.length === 0 ? <p className="muted">الاختبار لم يُضف بعد لهذه المحاضرة.</p> : <form onSubmit={(event) => void submitQuiz(event)}>
          <fieldset disabled={Boolean(result?.passed)}>
            {questions.map((question, index) => <div className="quiz-question" key={question.id}><legend>{index + 1}. {question.prompt}</legend><div className="quiz-options">{(question.quiz_options || []).sort((a, b) => a.position - b.position).map((option) => <label key={option.id} className={selected[question.id] === option.id ? 'selected' : ''}><input type="radio" name={question.id} value={option.id} checked={selected[question.id] === option.id} onChange={() => setSelected((current) => ({ ...current, [question.id]: option.id }))} /><span>{option.label}</span></label>)}</div></div>)}
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          {result && <div className={`result-message ${result.passed ? 'success' : 'error'}`}>{result.passed ? <CheckCircle2 /> : <CircleAlert />}<div><strong>{result.passed ? 'مبروك — المحاضرة التالية اتفتحت' : 'لسه محتاج مراجعة بسيطة'}</strong><span>درجتك {Math.round(result.score)}% — {result.correctCount} من {result.totalCount} صحيحة.</span></div></div>}
          {!result?.passed && <button className="primary-button" type="submit">إرسال الإجابات <ArrowLeft size={19} /></button>}
        </form>}
      </section>}

      <section className="lesson-comments" aria-labelledby="lesson-comments-title">
        <div className="comments-heading"><div><span className="eyebrow">مجتمع المحاضرة</span><h2 id="lesson-comments-title">آراء وتعليقات الطلاب</h2><p>شارك رأيك أو سؤالك عن المحاضرة باحترام.</p></div><MessageCircle aria-hidden="true" /></div>
        <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
          <label htmlFor="lesson-comment">اكتب تعليقك</label>
          <textarea id="lesson-comment" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={3} maxLength={1000} placeholder="إيه أكتر معلومة استفدت منها؟" />
          <div><small>{commentDraft.length} / 1000</small><button className="primary-button" type="submit" disabled={commentSending || !commentDraft.trim()}><Send size={18}/>{commentSending ? 'جاري الإرسال...' : 'نشر التعليق'}</button></div>
        </form>
        {commentError && <p className="form-error" role="alert">{commentError}</p>}
        {commentsLoading ? <div className="comments-state"><Loader2 className="spin"/> جاري تحميل التعليقات...</div> : comments.length === 0 ? <div className="comments-state"><MessageCircle/><strong>كن أول واحد يكتب رأيه</strong><span>تعليقك هيساعد باقي الطلاب وكابتن إيهاب يطوّر المحتوى.</span></div> : <div className="comments-list">{comments.map((comment) => <article className="comment-card" key={comment.id}><div className="comment-avatar">{comment.author_name.charAt(0) || 'ط'}</div><div className="comment-content"><header><div><strong>{comment.author_name}</strong><time>{new Date(comment.created_at).toLocaleString('ar-EG')}</time></div>{comment.user_id === commentUserId && <button type="button" onClick={() => void deleteComment(comment)} disabled={commentDeleting === comment.id} aria-label="حذف التعليق" title="حذف التعليق"><Trash2 size={16}/></button>}</header><p>{comment.body}</p></div></article>)}</div>}
      </section>

      {/* شريط التنقل: زر كل المحاضرات + زر المحاضرة التالية ظاهر دائماً دون شروط حجب */}
      <div className="lesson-navigation">
        <Link to="/dashboard"><ArrowRight size={18} /> كل المحاضرات</Link>
        {nextLesson && <Link to={`/lesson/${nextLesson.id}`}>المحاضرة التالية <ArrowLeft size={18} /></Link>}
      </div>
    </div>
  )
}
