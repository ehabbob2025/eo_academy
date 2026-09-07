import { ArrowLeft, CheckCircle2, Clock3, FolderCheck, LockKeyhole, PlayCircle, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CourseState } from '../App'
import { course } from '../data/demo'

export function DashboardPage({ state }: { state: CourseState }) {
  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div><span className="eyebrow">أهلًا يا {state.profile?.fullName.split(' ')[0]}</span><h1>كمّل رحلتك التعليمية</h1><p>كل اختبار تنجح فيه بيفتحلك الخطوة اللي بعدها.</p></div>
        <div className="progress-ring" style={{ '--progress': `${state.progress * 3.6}deg` } as React.CSSProperties}><div><strong>{state.progress}%</strong><span>مكتمل</span></div></div>
      </header>

      <section className="course-banner">
        <div><span className="status-badge">الكورس الحالي</span><h2>{course.title}</h2><p>{state.completedCount} من ٥ محاضرات تم اجتيازها</p></div>
        <Trophy size={62} />
      </section>

      <section className="section-heading"><div><h2>المحاضرات</h2><p>شاهد الفيديو ثم اجتز الاختبار لفتح المحاضرة التالية.</p></div></section>
      <div className="lessons-list">
        {state.lessons.map((lesson) => (
          <article className={`lesson-row ${lesson.status}`} key={lesson.id}>
            <div className="lesson-number">{lesson.status === 'completed' ? <CheckCircle2 /> : lesson.status === 'locked' ? <LockKeyhole /> : lesson.position}</div>
            <div className="lesson-info"><span>المحاضرة {lesson.position}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><small><Clock3 size={15} /> {lesson.durationMinutes} دقيقة</small></div>
            {lesson.status === 'locked' ? <span className="locked-label">مغلقة</span> : <Link className="lesson-action" to={`/lesson/${lesson.id}`}>{lesson.status === 'completed' ? 'راجع المحاضرة' : 'ابدأ الآن'} <PlayCircle size={19} /></Link>}
          </article>
        ))}
      </div>

      <section className={`project-teaser ${state.courseCompleted ? 'ready' : ''}`}>
        <FolderCheck size={38} /><div><h2>مشروع التخرج</h2><p>{state.courseCompleted ? 'مبروك، المشروع اتفتح. قدّمه عشان تستحق شهادة الإتمام.' : 'هيتفتح بعد النجاح في اختبارات المحاضرات الخمسة.'}</p></div>
        {state.courseCompleted && <Link className="secondary-button" to="/project">ابدأ المشروع <ArrowLeft size={18} /></Link>}
      </section>
    </div>
  )
}

