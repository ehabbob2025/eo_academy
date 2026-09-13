import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, MessageCircle, PlayCircle, Send, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type QuizQuestion = { id: string; prompt: string; explanation: string; quiz_options: { id: string; label: string; position: number }[] | null }
type QuizResult = { score: number; passed: boolean; correctCount: number; totalCount: number }
type LessonComment = { id: string; lesson_id: string; user_id: string; author_name: string; body: string; created_at: string }

export function LessonPage({ state }: { state: any }) {
  const { lessonId } = useParams()
  const allLessons: any[] = state?.lessons || []
  const lesson = allLessons.find((item: any) => String(item.id) === String(lessonId))
  
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

  // حالات تتبع وقت مشاهدة المحاضرة وشريط التقدم
  const totalDurationSeconds = Math.max(60, (lesson?.duration_minutes || 10) * 60)
  const [watchedSeconds, setWatchedSeconds] = useState(0)
  const [isWatchedEnough, setIsWatchedEnough] = useState(false)

  const currentIndex = allLessons.findIndex((item: any) => String(item.id) === String(lessonId))
  const nextLesson = currentIndex !== -1 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  // شرط الانتقال للمحاضرة التالية: مشاهدة 85% على الأقل + اجتياز الاختبار (إن وجد)
  const canProceed = isWatchedEnough && (!lesson?.quizEnabled || Boolean(lesson?.quizPassed) || Boolean(result?.passed))

  useEffect(() => {
    setVideoId(lesson?.youtubeVideoId || (lesson?.position === 1 ? '6vmVtWChcoo' : ''))
    setResult(null)
    setSelected({})
    setWatchedSeconds(0)
    setIsWatchedEnough(false)
  }, [lessonId])

  // تحميل تفاصيل الفيديو من جدول lesson_media
  useEffect(() => {
    if (!supabase || !lesson?.id) return
    const loadVideo = async () => {
      const { data } = await supabase.from('lesson_media').select('youtube_video_id').eq('lesson_id', lesson.id).maybeSingle()
      if (data?.youtube_video_id) setVideoId(data.youtube_video_id)
    }
    void loadVideo()
  }, [lesson?.id])

  // تحميل وتتبع وقت المشاهدة والتقدم من قاعدة البيانات
  useEffect(() => {
    if (!supabase || !lesson?.id) return
    let cancelled = false

    const initProgress = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId || cancelled) return
      setCommentUserId(userId)

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('watched_seconds, completed')
        .eq('user_id', userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle()

      if (progressData && !cancelled) {
        const savedSecs = progressData.watched_seconds || 0
        setWatchedSeconds(savedSecs)
        if (savedSecs >= totalDurationSeconds * 0.85 || progressData.completed) {
          setIsWatchedEnough(true)
        }
      }
    }

    void initProgress()
    return () => { cancelled = true }
  }, [lesson?.id, totalDurationSeconds])

  // مؤقت حساب وقت المشاهدة أثناء تواجد الطالب في الصفحة ونشاطه
  useEffect(() => {
    if (!supabase || !commentUserId || !lesson?.id || isWatchedEnough) return

    const interval = window.setInterval(async () => {
      if (document.visibilityState === 'visible') {
        setWatchedSeconds((prev) => {
          const next = prev + 1
          const threshold = totalDurationSeconds * 0.85
          if (next >= threshold && !isWatchedEnough) {
            setIsWatchedEnough(true)
            void supabase.from('lesson_progress').upsert({
              user_id: commentUserId,
              lesson_id: lesson.id,
              watched_seconds: next,
              completed: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' })
          } else if (next % 10 === 0) {
            void supabase.from('lesson_progress').upsert({
              user_id: commentUserId,
              lesson_id: lesson.id,
              watched_seconds: next,
              completed: next >= threshold,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' })
          }
          return next
        })
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [commentUserId, lesson?.id, isWatchedEnough, totalDurationSeconds])

  // تحميل أسئلة الاختبار
  useEffect(() => {
    if (!supabase || !lesson?.id || !lesson?.quizEnabled) return
    const loadQuestions = async () => {
      setQuestionsLoading(true)
      const { data, error } = await supabase.from('quiz_questions').select('id,prompt,explanation,quiz_options(id,label,position)').eq('lesson_id', lesson.id).eq('is_published', true).order('position')
      if (error) setError('تعذر تحميل الاختبار. حاول تحديث الصفحة.')
      else setQuestions((data || []) as QuizQuestion[])
      setQuestionsLoading(false)
    }
    void loadQuestions()
  }, [lesson?.id, lesson?.quizEnabled])

  // تحميل تعليقات المحاضرة
  useEffect(() => {
    if (!supabase || !lesson?.id) return
    let cancelled = false
    const loadComments = async () => {
      setCommentsLoading(true)
      setCommentError('')
      const { data, error: loadError } = await supabase.from('lesson_comments').select('id,lesson_id,user_id,author_name,body,created_at').eq('lesson_id', lesson.id).order('created_at', { ascending: false })
      if (cancelled) return
      if (loadError) setComments([])
      else setComments((data || []) as LessonComment[])
      setCommentsLoading(false)
    }
    void loadComments()
    return () => { cancelled = true }
  }, [lesson?.id])

  if (!lesson) return <Navigate to="/dashboard" replace />

  const submitQuiz = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !questions.length || !lesson?.id) return
    if (questions.some((question) => !selected[question.id])) { setError('جاوب على كل الأسئلة الأول.'); return }
    setError('')
    const answers = Object.fromEntries(questions.map((question) => [question.id, selected[question.id]]))
    const { data, error } = await supabase.rpc('submit_quiz', { p_lesson_id: lesson.id, p_answers: answers })
    if (error || !data) { setError('تعذر تصحيح الاختبار. راجع إجاباتك وجرّب تاني.'); return }
    const quizResult = data as QuizResult
    setResult(quizResult)
    if (quizResult.passed && state?.passLesson) {
      state.passLesson(lesson.id)
    }
  }

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !lesson?.id || !commentUserId || commentSending) return
    const body = commentDraft.trim()
    if (!body) return
    setCommentSending(true)
    const { data: liveProfile } = await supabase.from('profiles').select('full_name').eq('id', commentUserId).single()
    const authorName = liveProfile?.full_name?.trim() || state?.profile?.fullName?.trim() || 'طالب'
    const { data } = await supabase.from('lesson_comments').insert({ lesson_id: lesson.id, user_id: commentUserId, author_name: authorName, body }).select('id,lesson_id,user_id,author_name,body,created_at').single()
    setCommentSending(false)
    if (data) {
      setComments((current) => [data as LessonComment, ...current])
      setCommentDraft('')
    }
  }

  const deleteComment = async (comment: LessonComment) => {
    if (!supabase || commentDeleting || !window.confirm('حذف تعليقك نهائيًا؟')) return
    setCommentDeleting(comment.id)
    await supabase.from('lesson_comments').delete().eq('id', comment.id)
    setCommentDeleting('')
    setComments((current) => current.filter((item) => item.id !== comment.id))
  }

  const currentVideoId = videoId || (lesson?.position === 1 ? '6vmVtWChcoo' : '')
  const progressPercent = Math.min(100, Math.round((watchedSeconds / totalDurationSeconds) * 100))

  return (
    <div className="lesson-page">
      <div className="breadcrumb"><Link to="/dashboard">الرئيسية</Link><ArrowLeft size={15} /><span>المحاضرة {lesson.position}</span></div>
      <header className="lesson-header"><span className="eyebrow">المحاضرة {lesson.position} من {allLessons.length}</span><h1>{lesson.title}</h1><p>{lesson.description}</p></header>

      {/* مشغل الفيديو */}
      {currentVideoId ? (
        <div className="video-frame">
          <iframe
            src={"https://www.youtube.com/embed/" + currentVideoId + "?rel=0&modestbranding=1"}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="video-empty">
          <PlayCircle size={64} />
          <h2>الفيديو لم يُضف بعد</h2>
          <p>الأدمن يضيف لينك YouTube من لوحة الإدارة.</p>
        </div>
      )}

      {/* شريط تقدم مشاهدة المحاضرة (85% لتفعيل الاختبار) */}
      <div className="lesson-progress-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '12px', margin: '20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
          <span>نسبة مشاهدة المحاضرة ({progressPercent}%)</span>
          <span>{isWatchedEnough ? '✅ تم إكمال النسبة المطلوبة (85%)' : 'يجب مشاهدة 85% لفتح الاختبار'}</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: isWatchedEnough ? '#10b981' : '#0e3b2e', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* قسم الاختبار: مقفل حتى تتم مشاهدة 85% من المحاضرة */}
      {lesson.quizEnabled && (
        <section className="quiz-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">اختبار المحاضرة</span>
              <h2>اتأكد إن المعلومة وصلت</h2>
              <p>{isWatchedEnough ? 'اجتز الاختبار لفتح المحاضرة التالية بنجاح.' : '🔒 أكمل مشاهدة 85% من المحاضرة أولاً لفتح الاختبار والتفاعل معه.'}</p>
            </div>
            <span className="score-rule">درجة النجاح 70%</span>
          </div>

          {!isWatchedEnough ? (
            <div className="chat-state" style={{ padding: '30px', textAlign: 'center', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#991b1b' }}>
              <LockKeyhole size={36} style={{ marginBottom: '10px' }} />
              <strong>الاختبار مغلق حالياً</strong>
              <p style={{ marginTop: '5px' }}>فضلاً تابع مشاهدة المحاضرة ليصل مؤشر التقدم إلى 85% ويتم فتح الأسئلة تلقائياً.</p>
            </div>
          ) : questionsLoading ? (
            <div className="chat-state"><Loader2 className="spin"/> جاري تحميل الاختبار...</div>
          ) : questions.length === 0 ? (
            <p className="muted">الاختبار لم يُضف بعد لهذه المحاضرة.</p>
          ) : (
            <form onSubmit={(event) => void submitQuiz(event)}>
              <fieldset disabled={Boolean(result?.passed || lesson?.quizPassed)}>
                {questions.map((question, index) => (
                  <div className="quiz-question" key={question.id}>
                    <legend>{index + 1}. {question.prompt}</legend>
                    <div className="quiz-options">
                      {(question.quiz_options || []).sort((a, b) => a.position - b.position).map((option) => (
                        <label key={option.id} className={selected[question.id] === option.id ? 'selected' : ''}>
                          <input type="radio" name={question.id} value={option.id} checked={selected[question.id] === option.id} onChange={() => setSelected((current) => ({ ...current, [question.id]: option.id }))} />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
              {error && <p className="form-error">{error}</p>}
              {(result?.passed || lesson?.quizPassed) && (
                <div className="result-message success">
                  <CheckCircle2 />
                  <div>
                    <strong>مبروك — تم اجتياز الاختبار بنجاح وفتح المحاضرة التالية!</strong>
                    {result && <span>درجتك {Math.round(result.score)}% — {result.correctCount} من {result.totalCount} صحيحة.</span>}
                  </div>
                </div>
              )}
              {!(result?.passed || lesson?.quizPassed) && <button className="primary-button" type="submit">إرسال الإجابات والتحقق <ArrowLeft size={19} /></button>}
            </form>
          )}
        </section>
      )}

      {/* قسم التعليقات */}
      <section className="lesson-comments" aria-labelledby="lesson-comments-title">
        <div className="comments-heading">
          <div>
            <span className="eyebrow">مجتمع المحاضرة</span>
            <h2 id="lesson-comments-title">آراء وتعليقات الطلاب</h2>
            <p>شارك رأيك أو سؤالك عن المحاضرة باحترام.</p>
          </div>
          <MessageCircle aria-hidden="true" />
        </div>
        <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
          <label htmlFor="lesson-comment">اكتب تعليقك</label>
          <textarea id="lesson-comment" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={3} maxLength={1000} placeholder="إيه أكتر معلومة استفدت منها؟" />
          <div>
            <small>{commentDraft.length} / 1000</small>
            <button className="primary-button" type="submit" disabled={commentSending || !commentDraft.trim()}>
              <Send size={18}/>{commentSending ? 'جاري الإرسال...' : 'نشر التعليق'}
            </button>
          </div>
        </form>
        {commentError && <p className="form-error" role="alert">{commentError}</p>}
        {commentsLoading ? (
          <div className="comments-state"><Loader2 className="spin"/> جاري تحميل التعليقات...</div>
        ) : comments.length === 0 ? (
          <div className="comments-state"><MessageCircle/><strong>كن أول واحد يكتب رأيه</strong><span>تعليقك هيساعد باقي الطلاب وكابتن إيهاب يطوّر المحتوى.</span></div>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <div className="comment-avatar">{comment.author_name.charAt(0) || 'ط'}</div>
                <div className="comment-content">
                  <header>
                    <div>
                      <strong>{comment.author_name}</strong>
                      <time>{new Date(comment.created_at).toLocaleString('ar-EG')}</time>
                    </div>
                    {comment.user_id === commentUserId && (
                      <button type="button" onClick={() => void deleteComment(comment)} disabled={commentDeleting === comment.id} aria-label="حذف التعليق" title="حذف التعليق">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </header>
                  <p>{comment.body}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* زر المحاضرة التالية */}
      <div className="lesson-navigation" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '32px', marginBottom: '20px' }}>
        {nextLesson ? (
          canProceed ? (
            <Link
              to={"/lesson/" + nextLesson.id}
              className="primary-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', backgroundColor: '#0e3b2e', color: '#ffffff', padding: '14px 32px', fontSize: '16px', borderRadius: '12px', fontWeight: '800', boxShadow: '0 4px 15px rgba(14, 59, 46, 0.25)' }}
            >
              <span style={{ color: '#ffffff' }}>المحاضرة التالية</span>
              <ArrowLeft size={18} color="#ffffff" />
            </Link>
          ) : (
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '14px 28px', fontSize: '15px', borderRadius: '12px', cursor: 'not-allowed', fontWeight: '700', border: '1px solid #d1d5db' }}
            >
              <LockKeyhole size={18} color="#6b7280" />
              <span>المحاضرة التالية (يلزم مشاهدة 85% واجتياز الاختبار أولاً)</span>
            </div>
          )
        ) : (
          <Link
            to="/project"
            className="primary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', backgroundColor: '#d4a017', color: '#000000', padding: '14px 32px', fontSize: '16px', borderRadius: '12px', fontWeight: '800', boxShadow: '0 4px 15px rgba(212, 160, 23, 0.25)' }}
          >
            <span style={{ color: '#000000' }}>مشروع التخرج 🎓</span>
            <ArrowLeft size={18} color="#000000" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default LessonPage
