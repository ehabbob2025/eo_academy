import { BarChart3, BookOpen, CheckCircle2, FileCheck2, GraduationCap, LayoutDashboard, LogOut, RotateCcw, Save, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { CourseState } from '../App'

function extractYouTubeId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || ''
    if (url.searchParams.get('v')) return url.searchParams.get('v') || ''
    const parts = url.pathname.split('/').filter(Boolean)
    const marker = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part))
    return marker >= 0 ? parts[marker + 1] || '' : parts.at(-1) || ''
  } catch {
    return trimmed
  }
}

export function AdminPage({ state }: { state: CourseState }) {
  const [active, setActive] = useState('course')
  const [saved, setSaved] = useState('')

  const saveLesson = (event: FormEvent<HTMLFormElement>, lessonId: string) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    state.updateLesson(lessonId, {
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      durationMinutes: Number(form.get('duration') || 0),
      youtubeVideoId: extractYouTubeId(String(form.get('youtubeUrl') || '')),
    })
    setSaved(lessonId)
    window.setTimeout(() => setSaved(''), 1800)
  }

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="brand" to="/"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ADMIN PANEL</small></span></Link>
        <nav>
          <button className={active === 'dashboard' ? 'active' : ''} onClick={() => setActive('dashboard')}><LayoutDashboard /> نظرة عامة</button>
          <button className={active === 'course' ? 'active' : ''} onClick={() => setActive('course')}><BookOpen /> الكورس والمحاضرات</button>
          <button className={active === 'students' ? 'active' : ''} onClick={() => setActive('students')}><Users /> الطلاب</button>
          <button className={active === 'projects' ? 'active' : ''} onClick={() => setActive('projects')}><FileCheck2 /> المشاريع</button>
          <button className={active === 'certificates' ? 'active' : ''} onClick={() => setActive('certificates')}><GraduationCap /> الشهادات</button>
          <button className={active === 'analytics' ? 'active' : ''} onClick={() => setActive('analytics')}><BarChart3 /> التحليلات</button>
          <button className={active === 'settings' ? 'active' : ''} onClick={() => setActive('settings')}><Settings /> الإعدادات</button>
        </nav>
        <Link className="admin-logout" to="/"><LogOut /> الخروج من الإدارة</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-header"><div><span className="eyebrow">لوحة الإدارة</span><h1>{active === 'course' ? 'الكورس والمحاضرات' : 'EO Academy Dashboard'}</h1></div><Link className="secondary-button" to="/dashboard">معاينة كطالب</Link></header>

        <section className="admin-stats">
          <article><span>المسجلون</span><strong>0</strong><small>تظهر بعد ربط Supabase</small></article>
          <article><span>متوسط الإكمال</span><strong>{state.progress}%</strong><small>بيانات المعاينة الحالية</small></article>
          <article><span>مشاريع قيد المراجعة</span><strong>{state.projectStatus === 'submitted' ? 1 : 0}</strong><small>مشروع تجريبي</small></article>
          <article><span>الشهادات</span><strong>{state.projectStatus === 'approved' ? 1 : 0}</strong><small>شهادة تجريبية</small></article>
        </section>

        {active === 'course' ? (
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>المحاضرات الخمسة</h2><p>الصق لينك الفيديو الـUnlisted؛ السيستم هيحفظ الـVideo ID ويعرضه Embedded للطالب.</p></div><span className="status-badge">Dynamic Course</span></div>
            <div className="admin-lessons">
              {state.lessons.map((lesson) => (
                <form key={lesson.id} className="admin-lesson-form" onSubmit={(event) => saveLesson(event, lesson.id)}>
                  <div className="admin-lesson-title"><span>{lesson.position}</span><div><strong>المحاضرة {lesson.position}</strong><small>{lesson.youtubeVideoId ? 'تم ربط فيديو Unlisted' : 'في انتظار لينك الفيديو'}</small></div></div>
                  <label>عنوان المحاضرة<input name="title" defaultValue={lesson.title} required /></label>
                  <label>وصف مختصر<textarea name="description" defaultValue={lesson.description} rows={2} /></label>
                  <div className="form-grid"><label>مدة الفيديو بالدقائق<input name="duration" type="number" min="1" defaultValue={lesson.durationMinutes} /></label><label>درجة النجاح<input value="70%" disabled /></label></div>
                  <label>لينك YouTube Unlisted<input name="youtubeUrl" defaultValue={lesson.youtubeVideoId || ''} placeholder="https://youtu.be/xxxxxxxxxxx" /></label>
                  <button className="primary-button" type="submit">{saved === lesson.id ? <><CheckCircle2 /> تم الحفظ</> : <><Save /> حفظ المحاضرة</>}</button>
                </form>
              ))}
            </div>
          </section>
        ) : active === 'projects' ? (
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>مشاريع التخرج</h2><p>راجع التسليمات واعتمد الشهادة بعد التأكد من التطبيق.</p></div></div>{state.projectStatus === 'submitted' ? <div className="submission-row"><div><strong>{state.profile?.fullName}</strong><span>مشروع تجريبي — قيد المراجعة</span></div><button className="primary-button" onClick={state.approveProject}>اعتماد المشروع وإصدار الشهادة</button></div> : <div className="empty-admin">لا توجد مشاريع قيد المراجعة حاليًا.</div>}</section>
        ) : (
          <section className="admin-panel placeholder-panel"><Settings size={42} /><h2>القسم جاهز للربط بقاعدة البيانات</h2><p>الهيكل الأساسي موجود، وهنفعّل بياناته الحقيقية في المرحلة التالية بعد إنشاء مشروع Supabase.</p></section>
        )}

        <button className="reset-demo" onClick={state.resetDemo}><RotateCcw size={16} /> تصفير بيانات المعاينة</button>
      </main>
    </div>
  )
}
