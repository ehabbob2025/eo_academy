import { BarChart3, BookOpen, CheckCircle2, FileCheck2, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Plus, RefreshCw, Save, Send, Settings, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CourseState } from '../App'
import { supabase } from '../lib/supabase'

type DbLesson = { id: string; position: number; title: string; description: string; duration_minutes: number; is_published: boolean; lesson_media: { youtube_video_id: string }[] | null }
type Thread = { id: string; user_id: string; status: string; last_message_at: string; profiles: { full_name: string; phone: string } | null }
type ChatMessage = { id: string; sender_id: string; body: string; read_at: string | null; created_at: string }
type DbStudent = { id: string; full_name: string; phone: string; audience_role: string; goal: string; created_at: string; enrollments: { status: string; enrolled_at: string; completed_at: string | null }[] | null }

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
  const [unreadCount, setUnreadCount] = useState(0)
  const [replyDraft, setReplyDraft] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [addingLesson, setAddingLesson] = useState(false)
  const [saved, setSaved] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const refreshUnreadCount = async (uid = adminId) => {
    if (!supabase || !uid) return
    const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true }).neq('sender_id', uid).is('read_at', null)
    setUnreadCount(count || 0)
  }

  const loadDashboard = async () => {
    if (!supabase) return
    setLoading(true)
    const [{ data: auth }, { data: dbLessons }, { data: dbThreads }, { data: dbStudents, count }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('lessons').select('id,position,title,description,duration_minutes,is_published,lesson_media(youtube_video_id)').order('position'),
      supabase.from('support_threads').select('id,user_id,status,last_message_at,profiles(full_name,phone)').order('last_message_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,phone,audience_role,goal,created_at,enrollments(status,enrolled_at,completed_at)', { count: 'exact' }).eq('role', 'student').order('created_at', { ascending: false }),
    ])
    setAdminId(auth.user?.id || '')
    void refreshUnreadCount(auth.user?.id || '')
    setLessons((dbLessons || []) as unknown as DbLesson[])
    setThreads((dbThreads || []) as unknown as Thread[])
    setStudentCount(count || 0)
    setStudents((dbStudents || []) as unknown as DbStudent[])
    setLoading(false)
  }

  useEffect(() => { void loadDashboard() }, [])
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

  const saveLesson = async (event: FormEvent<HTMLFormElement>, lessonId: string) => {
    event.preventDefault(); if (!supabase) return
    const form = new FormData(event.currentTarget)
    const youtubeVideoId = extractYouTubeId(String(form.get('youtubeUrl') || ''))
    const { error } = await supabase.from('lessons').update({ title: String(form.get('title') || '').trim(), description: String(form.get('description') || '').trim(), duration_minutes: Number(form.get('duration') || 0), is_published: form.get('published') === 'on' }).eq('id', lessonId)
    const mediaResult = youtubeVideoId ? await supabase.from('lesson_media').upsert({ lesson_id: lessonId, youtube_video_id: youtubeVideoId }) : await supabase.from('lesson_media').delete().eq('lesson_id', lessonId)
    if (error || mediaResult.error) { setNotice('الحفظ فشل، راجع صلاحية حساب الإدارة.'); return }
    setSaved(lessonId); setNotice('تم حفظ المحاضرة وظهرت للطلاب.'); await loadDashboard(); window.setTimeout(() => setSaved(''), 1800)
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
  const sectionTitle: Record<string, string> = { dashboard: 'نظرة عامة', course: 'الكورس والمحاضرات', messages: 'رسائل الطلاب', students: 'الطلاب', projects: 'المشاريع', certificates: 'الشهادات', analytics: 'التحليلات', settings: 'الإعدادات' }

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
        {active === 'course' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>إدارة المحاضرات</h2><p>أضف أو احذف محاضرات، والصق لينك YouTube الـUnlisted ثم احفظ.</p></div><div><button className="primary-button" type="button" onClick={() => void addLesson()} disabled={addingLesson}><Plus/> {addingLesson ? 'جاري الإضافة...' : 'إضافة محاضرة'}</button> <span className="status-badge">Supabase Live</span></div></div><div className="admin-lessons">{lessons.map((lesson) => <form key={lesson.id} className="admin-lesson-form" onSubmit={(event) => void saveLesson(event, lesson.id)}><div className="admin-lesson-title"><span>{lesson.position}</span><div><strong>المحاضرة {lesson.position}</strong><small>{lesson.lesson_media?.[0]?.youtube_video_id ? 'تم ربط الفيديو' : 'في انتظار الفيديو'}</small></div></div><label>العنوان<input name="title" defaultValue={lesson.title} required /></label><label>الوصف<textarea name="description" defaultValue={lesson.description} rows={2}/></label><div className="form-grid"><label>المدة بالدقائق<input name="duration" type="number" min="1" defaultValue={lesson.duration_minutes}/></label><label className="publish-check"><input name="published" type="checkbox" defaultChecked={lesson.is_published}/> منشورة للطلاب</label></div><label>لينك YouTube Unlisted<input name="youtubeUrl" defaultValue={lesson.lesson_media?.[0]?.youtube_video_id || ''} placeholder="https://youtu.be/xxxxxxxxxxx"/></label><div className="lesson-actions"><button className="primary-button" type="submit">{saved === lesson.id ? <><CheckCircle2/> تم الحفظ</> : <><Save/> حفظ المحاضرة</>}</button><button className="danger-button" type="button" onClick={() => void deleteLesson(lesson)}><Trash2/> حذف</button></div></form>)}</div></section>}
        {active === 'messages' && <section className="admin-panel chat-admin"><aside className="thread-list"><h2>المحادثات</h2>{threads.length === 0 ? <p className="muted">مفيش أسئلة لسه.</p> : threads.map((thread) => <button key={thread.id} className={selectedThread === thread.id ? 'active' : ''} onClick={() => setSelectedThread(thread.id)}><span className="thread-avatar">{thread.profiles?.full_name?.charAt(0) || 'ط'}</span><span><strong>{thread.profiles?.full_name || 'طالب'}</strong><small>{new Date(thread.last_message_at).toLocaleString('ar-EG')}</small></span></button>)}</aside><div className="admin-conversation">{!selectedThread ? <div className="chat-state"><MessageCircle/><strong>اختار محادثة</strong><span>رسائل الطالب هتظهر هنا.</span></div> : <><div className="admin-message-list">{messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_id === adminId ? 'mine' : 'admin'}`}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleString('ar-EG')}</time></div>)}</div><form onSubmit={(event) => void sendReply(event)}><input name="message" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} required maxLength={2000} placeholder="اكتب ردك للطالب..."/><button className="primary-button" disabled={sendingReply || !replyDraft.trim()}><Send size={18}/> {sendingReply ? 'جاري الإرسال...' : 'إرسال'}</button></form></>}</div></section>}
        {active === 'students' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>الطلاب المسجلون</h2><p>بيانات حقيقية من الحسابات المسجلة في المنصة.</p></div><strong>{students.length} طالب</strong></div>{students.length === 0 ? <div className="chat-state"><Users/><strong>لسه مفيش طلاب مسجلين</strong><span>أول ما طالب يعمل حساب، بياناته هتظهر هنا تلقائيًا.</span></div> : <div className="student-table-wrap"><table className="student-table"><thead><tr><th>الطالب</th><th>الهاتف</th><th>الصفة / الهدف</th><th>حالة الاشتراك</th><th>تاريخ التسجيل</th></tr></thead><tbody>{students.map((student) => { const enrollment = student.enrollments?.[0]; return <tr key={student.id}><td><strong>{student.full_name || 'بدون اسم'}</strong></td><td dir="ltr">{student.phone || '—'}</td><td>{[student.audience_role, student.goal].filter(Boolean).join(' — ') || '—'}</td><td><span className="status-badge">{enrollment?.status === 'completed' ? 'مكتمل' : enrollment?.status === 'suspended' ? 'موقوف' : enrollment ? 'نشط' : 'لم يبدأ'}</span></td><td>{new Date(student.created_at).toLocaleDateString('ar-EG')}</td></tr> })}</tbody></table></div>}</section>}
        {active !== 'dashboard' && active !== 'course' && active !== 'messages' && active !== 'students' && <section className="admin-panel placeholder-panel"><Settings size={42}/><h2>القسم جاهز للمرحلة التالية</h2><p>هنفعّل بياناته الحقيقية بعد تثبيت الإدارة والشات وتجربتهم.</p></section>}
      </>}
    </main>
  </div>
}
