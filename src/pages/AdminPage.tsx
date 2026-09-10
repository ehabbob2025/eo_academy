import { BarChart3, BookOpen, CheckCircle2, FileCheck2, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Pencil, Plus, RefreshCw, Save, Send, Settings, Trash2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CourseState } from '../App'
import { supabase } from '../lib/supabase'

type DbLesson = { id: string; position: number; title: string; description: string; duration_minutes: number; is_published: boolean; lesson_media: { youtube_video_id: string }[] | null }
type Thread = { id: string; user_id: string; status: string; last_message_at: string; profiles: { full_name: string; phone: string } | null }
type ChatMessage = { id: string; sender_id: string; body: string; read_at: string | null; created_at: string }
type DbQuizQuestion = { id: string; position: number; prompt: string; explanation: string; is_published: boolean; quiz_options: { id: string; position: number; label: string }[] | null; quiz_answer_keys: { correct_option_id: string }[] | null }
type DbStudent = { id: string; full_name: string; phone: string; audience_role: string; goal: string; created_at: string; is_archived: boolean; enrollments: { status: string; enrolled_at: string; completed_at: string | null }[] | null }
type DbEnrollment = { user_id: string; status: string; enrolled_at: string; completed_at: string | null }
type QuizAttempt = { id: string; lesson_id: string; score: number; passed: boolean; correct_count: number; total_count: number; created_at: string }

function extractYouTubeId(value: string) {
  const trimmed = value.trim(); if (!trimmed) return ''
  try { const url = new URL(trimmed); if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || ''; if (url.searchParams.get('v')) return url.searchParams.get('v') || ''; const parts = url.pathname.split('/').filter(Boolean); const marker = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part)); return marker >= 0 ? parts[marker + 1] || '' : parts.at(-1) || '' } catch { return trimmed }
}

export function AdminPage({ state: _state }: { state: CourseState }) {
  const navigate = useNavigate()
  const [active, setActive] = useState('dashboard')
  const [lessons, setLessons] = useState<DbLesson[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [adminId, setAdminId] = useState('')
  const [studentCount, setStudentCount] = useState(0)
  const [students, setStudents] = useState<DbStudent[]>([])
  const [studentAttempts, setStudentAttempts] = useState<QuizAttempt[]>([])
  const [resultsFor, setResultsFor] = useState<DbStudent | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [replyDraft, setReplyDraft] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [addingLesson, setAddingLesson] = useState(false)
  const [quizLesson, setQuizLesson] = useState<DbLesson | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<DbQuizQuestion[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [saved, setSaved] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const autoSaveTimers = useRef<Record<string, number>>({})

  const queueAutoSave = (kind: 'lesson' | 'quiz', id: string, form: HTMLFormElement) => {
    const key = kind + '-' + id
    window.clearTimeout(autoSaveTimers.current[key])
    setNotice('جاري الحفظ التلقائي...')
    autoSaveTimers.current[key] = window.setTimeout(() => {
      const event = { preventDefault: () => undefined, currentTarget: form } as unknown as FormEvent<HTMLFormElement>
      if (kind === 'lesson') void saveLesson(event, id)
      else {
        const question = quizQuestions.find((item) => item.id === id)
        if (question) void saveQuizQuestion(event, question)
      }
    }, 850)
  }

  const refreshUnreadCount = async (uid = adminId) => {
    if (!supabase || !uid) return
    const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true }).neq('sender_id', uid).is('read_at', null)
    setUnreadCount(count || 0)
  }

  const loadDashboard = async () => {
    if (!supabase) return
    setLoading(true)
    const [{ data: auth }, { data: dbLessons }, { data: dbMedia }, { data: dbThreads }, { data: dbProfiles }, { data: dbEnrollments }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('lessons').select('id,position,title,description,duration_minutes,is_published').order('position'),
      supabase.from('lesson_media').select('lesson_id,youtube_video_id'),
      supabase.from('support_threads').select('id,user_id,status,last_message_at,profiles(full_name,phone)').order('last_message_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,phone,audience_role,goal,created_at,role,is_archived').order('created_at', { ascending: false }),
      supabase.from('enrollments').select('user_id,status,enrolled_at,completed_at'),
    ])
    setAdminId(auth.user?.id || '')
    void refreshUnreadCount(auth.user?.id || '')
    const mediaByLesson = new Map((dbMedia || []).map((media) => [media.lesson_id, media.youtube_video_id]))
    setLessons((dbLessons || []).map((lesson) => ({ ...lesson, lesson_media: mediaByLesson.has(lesson.id) ? [{ youtube_video_id: mediaByLesson.get(lesson.id) || '' }] : null })) as DbLesson[])
    setThreads((dbThreads || []) as unknown as Thread[])
    const enrollmentByUser = new Map((dbEnrollments || []).map((enrollment) => [enrollment.user_id, enrollment as DbEnrollment]))
    const liveStudents = (dbProfiles || []).filter((profile) => profile.role !== 'admin' && !profile.is_archived).map((profile) => ({ ...profile, enrollments: enrollmentByUser.has(profile.id) ? [enrollmentByUser.get(profile.id)!] : [] })) as DbStudent[]
    setStudentCount(liveStudents.length)
    setStudents(liveStudents)
    setLoading(false)
  }

  useEffect(() => { void loadDashboard() }, [])
  useEffect(() => { if (!selectedThread && threads.length) setSelectedThread(threads[0].id) }, [threads, selectedThread])
  useEffect(() => {
    if (!supabase || !selectedThread) { setMessages([]); return }
    const client = supabase
    const load = async () => { const { data } = await client.from('support_messages').select('id,sender_id,body,read_at,created_at').eq('thread_id', selectedThread).order('created_at'); setMessages((data || []) as ChatMessage[])
      if (adminId) {
        await client.from('support_messages').update({ read_at: new Date().toISOString() }).eq('thread_id', selectedThread).neq('sender_id', adminId).is('read_at', null)
        void refreshUnreadCount(adminId)
      } }
    void load()
    const channel = client.channel(`admin-${selectedThread}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${selectedThread}` }, (payload) => setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new as ChatMessage])).subscribe()
    return () => { void client.removeChannel(channel) }
  }, [selectedThread])

  const addLesson = async () => {
    if (!supabase || addingLesson) return
    setAddingLesson(true); setNotice('')
    const position = (lessons.reduce((max, lesson) => Math.max(max, lesson.position), 0) || 0) + 1
    const { error } = await supabase.from('lessons').insert({ course_id: '11111111-1111-4111-8111-111111111111', position, title: `المحاضرة ${position}`, description: '', duration_minutes: 10, is_published: false })
    setAddingLesson(false)
    if (error) { setNotice('تعذرت إضافة المحاضرة. راجع صلاحية حساب الإدارة.'); return }
    setNotice('تمت إضافة محاضرة جديدة. أضف عنوانها ولينك الفيديو ثم احفظ.'); await loadDashboard()
  }

  const deleteLesson = async (lesson: DbLesson) => {
    if (!supabase) return
    if (!window.confirm(`حذف «${lesson.title}» نهائيًا؟ لن يمكن استرجاع الفيديو أو بيانات المحاضرة.`)) return
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id)
    if (error) { setNotice('الحذف فشل. راجع صلاحية حساب الإدارة.'); return }
    setNotice('تم حذف المحاضرة.'); await loadDashboard()
  }

  const loadQuiz = async (lesson: DbLesson) => {
    if (!supabase) return
    setQuizLesson(lesson); setActive('quiz'); setQuizLoading(true)
    const { data, error } = await supabase.from('quiz_questions').select('id,position,prompt,explanation,is_published,quiz_options(id,position,label),quiz_answer_keys(correct_option_id)').eq('lesson_id', lesson.id).order('position')
    if (error) setNotice('تعذر تحميل الاختبار.')
    setQuizQuestions((data || []) as unknown as DbQuizQuestion[])
    setQuizLoading(false)
  }

  const addQuizQuestion = async () => {
    if (!supabase || !quizLesson) return
    const position = (quizQuestions.reduce((max, question) => Math.max(max, question.position), 0) || 0) + 1
    const { data: question, error } = await supabase.from('quiz_questions').insert({ lesson_id: quizLesson.id, position, prompt: 'سؤال جديد', explanation: '', is_published: true }).select('id').single()
    if (error || !question) { setNotice('تعذرت إضافة السؤال.'); return }
    const labels = ['اختيار 1', 'اختيار 2', 'اختيار 3', 'اختيار 4']
    const { data: options, error: optionsError } = await supabase.from('quiz_options').insert(labels.map((label, index) => ({ question_id: question.id, position: index + 1, label }))).select('id,position,label')
    if (optionsError || !options?.length) { setNotice('تم إنشاء السؤال لكن تعذر إضافة الاختيارات.'); return }
    await supabase.from('quiz_answer_keys').upsert({ question_id: question.id, correct_option_id: options[0].id })
    await loadQuiz(quizLesson)
  }

  const persistQuizQuestion = async (formElement: HTMLFormElement, question: DbQuizQuestion) => {
    if (!supabase) return false
    const client = supabase
    const form = new FormData(formElement)
    const { error: questionError } = await client.from('quiz_questions').update({ prompt: String(form.get('prompt') || '').trim(), explanation: String(form.get('explanation') || '').trim(), is_published: form.get('published') === 'on' }).eq('id', question.id)
    const options = question.quiz_options || []
    const updates = await Promise.all(options.map((option) => client.from('quiz_options').update({ label: String(form.get(`option-${option.id}`) || '').trim() }).eq('id', option.id)))
    const answerId = String(form.get('answer') || '')
    const { error: keyError } = await client.from('quiz_answer_keys').upsert({ question_id: question.id, correct_option_id: answerId })
    return !(questionError || updates.some((result) => result.error) || keyError)
  }

  const saveQuizQuestion = async (event: FormEvent<HTMLFormElement>, question: DbQuizQuestion) => {
    event.preventDefault()
    if (!quizLesson) return
    const succeeded = await persistQuizQuestion(event.currentTarget, question)
    if (!succeeded) { setNotice('حفظ السؤال فشل. راجع البيانات وحاول تاني.'); return }
    setNotice('تم حفظ السؤال.'); await loadQuiz(quizLesson)
  }

  const saveEntireQuiz = async () => {
    if (!supabase || !quizLesson || savingQuiz || quizQuestions.length === 0) return
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form.quiz-admin-form'))
    setSavingQuiz(true)
    setNotice('جاري حفظ الاختبار بالكامل...')
    const results = await Promise.all(quizQuestions.map((question) => {
      const form = forms.find((item) => item.dataset.questionId === question.id)
      return form ? persistQuizQuestion(form, question) : Promise.resolve(false)
    }))
    setSavingQuiz(false)
    if (results.some((succeeded) => !succeeded)) {
      setNotice('تعذر حفظ بعض الأسئلة. راجع البيانات وحاول تاني.')
      return
    }
    setNotice(`تم حفظ الاختبار بالكامل (${quizQuestions.length} سؤال).`)
    await loadQuiz(quizLesson)
  }

  const deleteQuizQuestion = async (question: DbQuizQuestion) => {
    if (!supabase || !quizLesson) return
    if (!window.confirm('حذف السؤال بكل اختياراته نهائيًا؟')) return
    const { error } = await supabase.from('quiz_questions').delete().eq('id', question.id)
    if (error) { setNotice('الحذف فشل.'); return }
    await loadQuiz(quizLesson)
  }

  const editStudentName = async (student: DbStudent) => {
    if (!supabase) return
    const fullName = window.prompt('اكتب الاسم الجديد للطالب:', student.full_name || '')?.trim()
    if (!fullName || fullName === student.full_name) return
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', student.id)
    if (error) { setNotice('تعذر تعديل الاسم. راجع صلاحية الإدارة.'); return }
    setNotice('تم تعديل اسم الطالب.'); await loadDashboard()
  }

  const archiveStudent = async (student: DbStudent) => {
    if (!supabase || !window.confirm(`حذف «${student.full_name || 'هذا الطالب'}» من قائمة الطلاب؟ بياناته ونتائجه ستبقى محفوظة.`)) return
    const { error } = await supabase.from('profiles').update({ is_archived: true }).eq('id', student.id)
    if (error) { setNotice('تعذر حذف الطالب من القائمة.'); return }
    if (resultsFor?.id === student.id) { setResultsFor(null); setStudentAttempts([]) }
    setNotice('تم حذف الطالب من القائمة مع الاحتفاظ بسجله.'); await loadDashboard()
  }

  const viewStudentResults = async (student: DbStudent) => {
    if (!supabase) return
    setResultsFor(student); setStudentAttempts([])
    const { data, error } = await supabase.from('quiz_attempts').select('id,lesson_id,score,passed,correct_count,total_count,created_at').eq('user_id', student.id).order('created_at', { ascending: false })
    if (error) { setNotice('تعذر تحميل نتائج الاختبارات.'); return }
    setStudentAttempts((data || []) as QuizAttempt[])
  }

  const saveLesson = async (event: FormEvent<HTMLFormElement>, lessonId: string) => {
    event.preventDefault(); if (!supabase) return
    const form = new FormData(event.currentTarget)
    const youtubeVideoId = extractYouTubeId(String(form.get('youtubeUrl') || ''))
    const { error } = await supabase.from('lessons').update({ title: String(form.get('title') || '').trim(), description: String(form.get('description') || '').trim(), duration_minutes: Number(form.get('duration') || 0), is_published: form.get('published') === 'on' }).eq('id', lessonId)
    const mediaResult = youtubeVideoId ? await supabase.from('lesson_media').upsert({ lesson_id: lessonId, youtube_video_id: youtubeVideoId }) : await supabase.from('lesson_media').delete().eq('lesson_id', lessonId)
    if (error || mediaResult.error) { setNotice('الحفظ فشل، راجع صلاحية حساب الإدارة.'); return }
    setLessons((current) => current.map((lesson) => lesson.id === lessonId ? { ...lesson, lesson_media: youtubeVideoId ? [{ youtube_video_id: youtubeVideoId }] : null } : lesson))
    setSaved(lessonId); setNotice('تم حفظ المحاضرة والفيديو.'); await loadDashboard(); window.setTimeout(() => setSaved(''), 1800)
  }

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase || !selectedThread || !adminId) return
    const body = replyDraft.trim(); if (!body || sendingReply) return
    setSendingReply(true)
    const { error } = await supabase.from('support_messages').insert({ thread_id: selectedThread, sender_id: adminId, body })
    setSendingReply(false)
    if (!error) setReplyDraft(''); else setNotice('الرد متبعتش، جرّب تاني.')
  }

  const logout = async () => { await supabase?.auth.signOut(); navigate('/admin-login') }
  const sectionTitle: Record<string, string> = { dashboard: 'نظرة عامة', course: 'الكورس والمحاضرات', quiz: 'تعديل الاختبار', messages: 'رسائل الطلاب', students: 'الطلاب', projects: 'المشاريع', certificates: 'الشهادات', analytics: 'التحليلات', settings: 'الإعدادات' }

  return <div className="admin-shell" dir="rtl">
    <aside className="admin-sidebar"><Link className="brand" to="/"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ADMIN PANEL</small></span></Link><nav>
      <button className={active === 'dashboard' ? 'active' : ''} onClick={() => setActive('dashboard')}><LayoutDashboard /> نظرة عامة</button>
      <button className={active === 'course' ? 'active' : ''} onClick={() => setActive('course')}><BookOpen /> الكورس والمحاضرات</button>
      <button className={active === 'messages' ? 'active' : ''} onClick={() => setActive('messages')}><MessageCircle /> الرسائل {unreadCount > 0 && <b className="nav-count">{unreadCount}</b>}</button>
      <button className={active === 'students' ? 'active' : ''} onClick={() => setActive('students')}><Users /> الطلاب</button>
      <button className={active === 'projects' ? 'active' : ''} onClick={() => setActive('projects')}><FileCheck2 /> المشاريع</button>
      <button className={active === 'certificates' ? 'active' : ''} onClick={() => setActive('certificates')}><GraduationCap /> الشهادات</button>
      <button className={active === 'analytics' ? 'active' : ''} onClick={() => setActive('analytics')}><BarChart3 /> التحليلات</button>
      <button className={active === 'settings' ? 'active' : ''} onClick={() => setActive('settings')}><Settings /> الإعدادات</button>
    </nav><button className="admin-logout" onClick={logout}><LogOut /> تسجيل الخروج</button></aside>
    <main className="admin-main"><header className="admin-header"><div><span className="eyebrow">لوحة الإدارة المؤمّنة</span><h1>{sectionTitle[active]}</h1></div><div className="admin-header-actions"><button className="secondary-button" onClick={loadDashboard}><RefreshCw size={17}/> تحديث</button><Link className="secondary-button" to="/dashboard">معاينة كطالب</Link></div></header>
      {notice && <div className="admin-notice">{notice}</div>}
      {loading ? <div className="admin-panel empty-admin">جاري تحميل بيانات المنصة...</div> : <>
        {active === 'dashboard' && <><section className="admin-stats"><article><span>المسجلون</span><strong>{studentCount}</strong><small>حساب طالب</small></article><article><span>المحاضرات المنشورة</span><strong>{lessons.filter(x => x.is_published).length}</strong><small>من أصل {lessons.length}</small></article><article><span>المحادثات</span><strong>{threads.length}</strong><small>رسائل دعم داخلية</small></article><article><span>حالة الإدارة</span><strong>مؤمّن</strong><small>bobhendam@gmail.com</small></article></section><section className="admin-panel placeholder-panel"><LayoutDashboard size={42}/><h2>أهلًا يا كابتن إيهاب</h2><p>من هنا هتدير المحتوى، الطلاب، الرسائل، المشاريع والشهادات.</p></section></>}
        {active === 'course' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>إدارة المحاضرات</h2><p>أضف أو احذف محاضرات، والصق لينك YouTube الـUnlisted ثم احفظ.</p></div><div><button className="primary-button" type="button" onClick={() => void addLesson()} disabled={addingLesson}><Plus/> {addingLesson ? 'جاري الإضافة...' : 'إضافة محاضرة'}</button> <span className="status-badge">Supabase Live</span></div></div><div className="admin-lessons">{lessons.map((lesson) => <form key={lesson.id} className="admin-lesson-form" onChange={(event) => queueAutoSave("lesson", lesson.id, event.currentTarget)} onSubmit={(event) => void saveLesson(event, lesson.id)}><div className="admin-lesson-title"><span>{lesson.position}</span><div><strong>المحاضرة {lesson.position}</strong><small>{lesson.lesson_media?.[0]?.youtube_video_id ? 'تم ربط الفيديو' : 'في انتظار الفيديو'}</small></div></div><label>العنوان<input name="title" defaultValue={lesson.title} required /></label><label>الوصف<textarea name="description" defaultValue={lesson.description} rows={2}/></label><div className="form-grid"><label>المدة بالدقائق<input name="duration" type="number" min="1" defaultValue={lesson.duration_minutes}/></label><label className="publish-check"><input name="published" type="checkbox" defaultChecked={lesson.is_published}/> منشورة للطلاب</label></div><label>لينك YouTube Unlisted<input name="youtubeUrl" defaultValue={lesson.lesson_media?.[0]?.youtube_video_id || ''} placeholder="https://youtu.be/xxxxxxxxxxx"/></label><div className="lesson-actions"><button className="primary-button" type="submit">{saved === lesson.id ? <><CheckCircle2/> تم الحفظ</> : <><Save/> حفظ المحاضرة</>}</button><button className="secondary-button" type="button" onClick={() => void loadQuiz(lesson)}>تعديل الاختبار</button><button className="danger-button" type="button" onClick={() => void deleteLesson(lesson)}><Trash2/> حذف</button></div></form>)}</div></section>}
        {active === 'quiz' && quizLesson && <section className="admin-panel quiz-manager"><div className="admin-panel-heading"><div><h2>اختبار: {quizLesson.title}</h2><p>أضف أسئلة، عدّل الاختيارات، وحدد الإجابة الصحيحة.</p></div><div><button className="primary-button" type="button" onClick={() => void addQuizQuestion()}><Plus/> إضافة سؤال</button><button className="secondary-button" type="button" onClick={() => void saveEntireQuiz()} disabled={savingQuiz || quizQuestions.length === 0}><Save/> {savingQuiz ? 'جاري الحفظ...' : 'حفظ الاختبار بالكامل'}</button><button className="secondary-button" type="button" onClick={() => { setQuizLesson(null); setActive('course') }}>العودة للمحاضرات</button></div></div>{quizLoading ? <div className="chat-state">جاري تحميل الأسئلة...</div> : quizQuestions.length === 0 ? <div className="chat-state"><strong>لا توجد أسئلة بعد</strong><span>اضغط إضافة سؤال لبدء الاختبار.</span></div> : <div className="quiz-admin-list">{quizQuestions.map((question, number) => <form key={question.id} data-question-id={question.id} className="admin-lesson-form quiz-admin-form" onSubmit={(event) => void saveQuizQuestion(event, question)}><div className="admin-lesson-title"><span>{number + 1}</span><strong>السؤال {number + 1}</strong></div><label>نص السؤال<input name="prompt" defaultValue={question.prompt} required /></label><label>تفسير الإجابة بعد التصحيح<textarea name="explanation" defaultValue={question.explanation} rows={2}/></label><div className="quiz-option-fields">{(question.quiz_options || []).sort((x, y) => x.position - y.position).map((option, index) => <label key={option.id}>اختيار {index + 1}<input name={`option-${option.id}`} defaultValue={option.label} required /></label>)}</div><div className="form-grid"><label>الإجابة الصحيحة<select name="answer" defaultValue={question.quiz_answer_keys?.[0]?.correct_option_id || question.quiz_options?.[0]?.id}>{(question.quiz_options || []).sort((x, y) => x.position - y.position).map((option, index) => <option key={option.id} value={option.id}>اختيار {index + 1}</option>)}</select></label><label className="publish-check"><input name="published" type="checkbox" defaultChecked={question.is_published}/> ظاهر للطلاب</label></div><div className="lesson-actions"><button className="primary-button" type="submit"><Save/> حفظ السؤال</button><button className="danger-button" type="button" onClick={() => void deleteQuizQuestion(question)}><Trash2/> حذف السؤال</button></div></form>)}</div>}</section>}
        {active === 'messages' && <section className="admin-panel chat-admin"><aside className="thread-list"><h2>المحادثات</h2>{threads.length === 0 ? <p className="muted">مفيش أسئلة لسه.</p> : threads.map((thread) => <button key={thread.id} className={selectedThread === thread.id ? 'active' : ''} onClick={() => setSelectedThread(thread.id)}><span className="thread-avatar">{thread.profiles?.full_name?.charAt(0) || 'ط'}</span><span><strong>{thread.profiles?.full_name || 'طالب'}</strong><small>{new Date(thread.last_message_at).toLocaleString('ar-EG')}</small></span></button>)}</aside><div className="admin-conversation">{!selectedThread ? <div className="chat-state"><MessageCircle/><strong>اختار محادثة</strong><span>رسائل الطالب هتظهر هنا.</span></div> : <><div className="conversation-title"><strong>{threads.find((thread) => thread.id === selectedThread)?.profiles?.full_name || 'طالب'}</strong><small>{threads.find((thread) => thread.id === selectedThread)?.profiles?.phone || ''}</small></div><div className="admin-message-list">{messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_id === adminId ? 'mine' : 'admin'}`}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleString('ar-EG')}</time></div>)}</div><form onSubmit={(event) => void sendReply(event)}><input name="message" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} required maxLength={2000} placeholder="اكتب ردك للطالب..."/><button className="primary-button" disabled={sendingReply || !replyDraft.trim()}><Send size={18}/> {sendingReply ? 'جاري الإرسال...' : 'إرسال'}</button></form></>}</div></section>}
        {active === 'students' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>الطلاب المسجلون</h2><p>عدّل الاسم، احذف الطالب من القائمة، أو راجع كل محاولات الاختبار.</p></div><strong>{students.length} طالب</strong></div>{students.length === 0 ? <div className="chat-state"><Users/><strong>لسه مفيش طلاب مسجلين</strong><span>أول ما طالب يعمل حساب، بياناته هتظهر هنا تلقائيًا.</span></div> : <div className="student-table-wrap"><table className="student-table"><thead><tr><th>الطالب</th><th>الهاتف</th><th>الصفة / الهدف</th><th>حالة الاشتراك</th><th>تاريخ التسجيل</th><th>إجراءات</th></tr></thead><tbody>{students.map((student) => { const enrollment = student.enrollments?.[0]; return <tr key={student.id}><td><strong>{student.full_name || 'بدون اسم'}</strong></td><td dir="ltr">{student.phone || '—'}</td><td>{[student.audience_role, student.goal].filter(Boolean).join(' — ') || '—'}</td><td><span className="status-badge">{enrollment?.status === 'completed' ? 'مكتمل' : enrollment?.status === 'suspended' ? 'موقوف' : enrollment ? 'نشط' : 'لم يبدأ'}</span></td><td>{new Date(student.created_at).toLocaleDateString('ar-EG')}</td><td><div className="student-actions"><button className="secondary-button compact-button" type="button" onClick={() => void editStudentName(student)}><Pencil size={15}/> تعديل</button><button className="secondary-button compact-button" type="button" onClick={() => void viewStudentResults(student)}>النتائج</button><button className="danger-button compact-button" type="button" onClick={() => void archiveStudent(student)}><Trash2 size={15}/> حذف</button></div></td></tr> })}</tbody></table></div>}{resultsFor && <section className="quiz-results"><div className="admin-panel-heading"><div><h2>نتائج اختبارات: {resultsFor.full_name || 'الطالب'}</h2><p>كل محاولة محفوظة باسم المحاضرة والدرجة وعدد الإجابات الصحيحة.</p></div><button className="secondary-button" type="button" onClick={() => { setResultsFor(null); setStudentAttempts([]) }}>إغلاق</button></div>{studentAttempts.length === 0 ? <p className="muted">لم يرسل هذا الطالب أي اختبار حتى الآن.</p> : <div className="student-table-wrap"><table className="student-table"><thead><tr><th>المحاضرة</th><th>النتيجة</th><th>الإجابات الصحيحة</th><th>الحالة</th><th>وقت المحاولة</th></tr></thead><tbody>{studentAttempts.map((attempt) => <tr key={attempt.id}><td>{lessons.find((lesson) => lesson.id === attempt.lesson_id)?.title || 'محاضرة محذوفة'}</td><td>{Math.round(attempt.score)}%</td><td>{attempt.correct_count} من {attempt.total_count}</td><td><span className="status-badge">{attempt.passed ? 'ناجح' : 'لم يجتز'}</span></td><td>{new Date(attempt.created_at).toLocaleString('ar-EG')}</td></tr>)}</tbody></table></div>}</section>}</section>}
        {active !== 'dashboard' && active !== 'course' && active !== 'messages' && active !== 'students' && active !== 'quiz' && <section className="admin-panel placeholder-panel"><Settings size={42}/><h2>القسم جاهز للمرحلة التالية</h2><p>هنفعّل بياناته الحقيقية بعد تثبيت الإدارة والشات وتجربتهم.</p></section>}
      </>}
    </main>
  </div>
}
