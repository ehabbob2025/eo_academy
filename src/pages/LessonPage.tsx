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
  const [watched, setWatched] = useState(Boolean(lesson?.quizPassed))
  const [watching, setWatching] = useState(false)
  const [videoId, setVideoId] = useState(lesson?.youtubeVideoId || '')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState('')
  const nextLesson = useMemo(() => state.lessons.find((item) => item.position === (lesson?.position || 0) + 1), [state.lessons, lesson])

  useEffect(() => {
    setWatched(Boolean(lesson?.quizPassed))
    setVideoId(lesson?.youtubeVideoId || '')
    setResult(null)
    setSelected({})
  }, [lesson?.id])

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
    if (!supabase || !lesson || !watched) return
    const client = supabase
    const loadQuestions = async () => {
      setQuestionsLoading(true)
      const { data, error } = await client.from('quiz_questions').select('id,prompt,explanation,quiz_options(id,label,position)').eq('lesson_id', lesson.id).eq('is_published', true).order('position')
      if (error) setError('تعذر تحميل الاختبار. حاول تحديث الصفحة.')
      else setQuestions((data || []) as QuizQuestion[])
      setQuestionsLoading(false)
    }
    void loadQuestions()
  }, [lesson?.id, watched])

  if (!lesson) return <Navigate to="/dashboard" replace />
  if (lesson.status === 'locked') return <div className="empty-state"><LockKeyhole /><h1>المحاضرة لسه مقفولة</h1><p>انجح في اختبار المحاضرة السابقة الأول.</p><Link className="secondary-button" to="/dashboard">الرجوع للرئيسية</Link></div>

  const markWatched = async () => {
    if (watched || watching) return
    if (!supabase) { setError('إعدادات المنصة غير مكتملة.'); return }
    setWatching(true); setError('')
    const { error } = await supabase.rpc('mark_lesson_watched', { p_lesson_id: lesson.id })
    setWatching(false)
    if (error) { setError('تعذر تسجيل المشاهدة. تأكد إنك مسجل دخول ثم جرّب مرة أخرى.'); return }
    setWatched(true)
  }

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

      <button className="primary-button watched-button" onClick={() => void markWatched()} disabled={watched || watching}>{watching ? <><Loader2 className="spin"/> جاري الحفظ...</> : watched ? <><CheckCircle2 /> تم إتمام مشاهدة المحاضرة</> : <>أتممت مشاهدة الفيديو <ArrowLeft /></>}</button>

      <section className={`quiz-section ${watched ? '' : 'disabled-section'}`}>
        <div className="section-heading"><div><span className="eyebrow">اختبار المحاضرة</span><h2>اتأكد إن المعلومة وصلت</h2><p>الاختبار بيتعدل من لوحة الإدارة ونتيجته محفوظة في حسابك.</p></div><span className="score-rule">درجة النجاح 70%</span></div>
        {questionsLoading ? <div className="chat-state"><Loader2 className="spin"/> جاري تحميل الاختبار...</div> : !watched ? <p className="muted">أكمل مشاهدة المحاضرة أولًا لفتح الاختبار.</p> : questions.length === 0 ? <p className="muted">الاختبار لم يُضف بعد لهذه المحاضرة.</p> : <form onSubmit={(event) => void submitQuiz(event)}>
          <fieldset disabled={Boolean(result?.passed)}>
            {questions.map((question, index) => <div className="quiz-question" key={question.id}><legend>{index + 1}. {question.prompt}</legend><div className="quiz-options">{(question.quiz_options || []).sort((a, b) => a.position - b.position).map((option) => <label key={option.id} className={selected[question.id] === option.id ? 'selected' : ''}><input type="radio" name={question.id} value={option.id} checked={selected[question.id] === option.id} onChange={() => setSelected((current) => ({ ...current, [question.id]: option.id }))} /><span>{option.label}</span></label>)}</div></div>)}
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          {result && <div className={`result-message ${result.passed ? 'success' : 'error'}`}>{result.passed ? <CheckCircle2 /> : <CircleAlert />}<div><strong>{result.passed ? 'مبروك — المحاضرة التالية اتفتحت' : 'لسه محتاج مراجعة بسيطة'}</strong><span>درجتك {Math.round(result.score)}% — {result.correctCount} من {result.totalCount} صحيحة.</span></div></div>}
          {!result?.passed && <button className="primary-button" type="submit">إرسال الإجابات <ArrowLeft size={19} /></button>}
        </form>}
      </section>
      <div className="lesson-navigation"><Link to="/dashboard"><ArrowRight size={18} /> كل المحاضرات</Link>{result?.passed && nextLesson && <Link to={`/lesson/${nextLesson.id}`}>المحاضرة التالية <ArrowLeft size={18} /></Link>}</div>
    </div>
  )
}