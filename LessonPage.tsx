import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, LockKeyhole, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { CourseState } from '../App'
import { demoQuiz } from '../data/demo'

export function LessonPage({ state }: { state: CourseState }) {
  const { lessonId } = useParams()
  const lesson = state.lessons.find((item) => item.id === lessonId)
  const [watched, setWatched] = useState(Boolean(lesson?.quizPassed))
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState<'idle' | 'passed' | 'failed'>('idle')
  const nextLesson = useMemo(() => state.lessons.find((item) => item.position === (lesson?.position || 0) + 1), [state.lessons, lesson])

  if (!lesson) return <div className="empty-state"><CircleAlert /><h1>المحاضرة غير موجودة</h1><Link to="/dashboard">الرجوع للرئيسية</Link></div>
  if (lesson.status === 'locked') return <div className="empty-state"><LockKeyhole /><h1>المحاضرة لسه مقفولة</h1><p>انجح في اختبار المحاضرة السابقة الأول.</p><Link className="secondary-button" to="/dashboard">الرجوع للرئيسية</Link></div>

  const submitQuiz = (event: FormEvent) => {
    event.preventDefault()
    if (selected === demoQuiz[0].correctOptionId) { setResult('passed'); state.passLesson(lesson.id) }
    else setResult('failed')
  }

  return (
    <div className="lesson-page">
      <div className="breadcrumb"><Link to="/dashboard">الرئيسية</Link><ArrowLeft size={15} /><span>المحاضرة {lesson.position}</span></div>
      <header className="lesson-header"><span className="eyebrow">المحاضرة {lesson.position} من ٥</span><h1>{lesson.title}</h1><p>{lesson.description}</p></header>

      {lesson.youtubeVideoId ? (
        <div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeVideoId}?rel=0&modestbranding=1`} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
      ) : (
        <div className="video-empty"><PlayCircle size={64} /><h2>الفيديو Unlisted لم يُضف بعد</h2><p>الأدمن يضيف Video ID من لوحة الإدارة، ومش هيظهر هنا إلا للطلاب المسجلين.</p></div>
      )}

      <button className="primary-button watched-button" onClick={() => setWatched(true)} disabled={watched}>{watched ? <><CheckCircle2 /> تم إتمام مشاهدة المحاضرة</> : <>أتممت مشاهدة الفيديو <ArrowLeft /></>}</button>

      <section className={`quiz-section ${watched ? '' : 'disabled-section'}`}>
        <div className="section-heading"><div><span className="eyebrow">اختبار المحاضرة</span><h2>اتأكد إن المعلومة وصلت</h2><p>السؤال الحالي تجريبي، والأسئلة الحقيقية هتتضاف من الأدمن.</p></div><span className="score-rule">درجة النجاح 70%</span></div>
        <form onSubmit={submitQuiz}>
          <fieldset disabled={!watched || result === 'passed'}>
            <legend>{demoQuiz[0].prompt}</legend>
            <div className="quiz-options">{demoQuiz[0].options.map((option) => <label key={option.id} className={selected === option.id ? 'selected' : ''}><input type="radio" name="answer" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} /><span>{option.label}</span></label>)}</div>
          </fieldset>
          {result === 'failed' && <div className="result-message error"><CircleAlert /><div><strong>الإجابة مش صحيحة</strong><span>راجع الجزء الخاص بالسؤال وجرب تاني.</span></div></div>}
          {result === 'passed' && <div className="result-message success"><CheckCircle2 /><div><strong>إجابة صحيحة — المحاضرة التالية اتفتحت</strong><span>{demoQuiz[0].explanation}</span></div></div>}
          {result !== 'passed' && <button className="primary-button" type="submit" disabled={!watched || !selected}>إرسال الإجابة <ArrowLeft size={19} /></button>}
        </form>
      </section>

      <div className="lesson-navigation"><Link to="/dashboard"><ArrowRight size={18} /> كل المحاضرات</Link>{result === 'passed' && nextLesson && <Link to={`/lesson/${nextLesson.id}`}>المحاضرة التالية <ArrowLeft size={18} /></Link>}</div>
    </div>
  )
}
