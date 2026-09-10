import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2, LockKeyhole, PlayCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { CourseState } from '../App'
import { supabase } from '../lib/supabase'

type QuizQuestion = { id: string; prompt: string; explanation: string; quiz_options: { id: string; label: string; position: number }[] | null }
type QuizResult = { score: number; passed: boolean; correctCount: number; totalCount: number }

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
      <div className="lesson-navigation"><Link to="/dashboard"><ArrowRight size={18} /> كل المحاضرات</Link>{((lesson.quizEnabled && result?.passed) || (!lesson.quizEnabled && watched)) && nextLesson && <Link to={`/lesson/${nextLesson.id}`}>المحاضرة التالية <ArrowLeft size={18} /></Link>}</div>
    </div>
  )
}
