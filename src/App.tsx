import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { course } from './data/demo'
import { useCourseState } from './hooks/useCourseState'
import { isSupabaseConfigured, isRecoveryRedirect, supabase } from './lib/supabase'
import { AdminPage } from './pages/AdminPage'
import { AdminLoginPage, PasswordResetPage } from './pages/AdminLoginPage'
import { CertificatePage } from './pages/CertificatePage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { LessonPage } from './pages/LessonPage'
import { ProjectPage } from './pages/ProjectPage'
import { RegisterPage } from './pages/RegisterPage'
import { SocialGatePage } from './pages/SocialGatePage'
import OnboardingModal from './components/OnboardingModal'
import ChatWidget from './components/ChatWidget'
import './App.css'

export type CourseState = ReturnType<typeof useCourseState>

function StudentGuard({ state, children }: { state: CourseState; children: React.ReactNode }) {
  if (!state.profile) return <Navigate to="/register" replace />
  if (!state.socialGateDone) return <Navigate to="/follow" replace />
  return children
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')
  useEffect(() => {
    if (!supabase) { setStatus('denied'); return }
    const client = supabase
    const check = async () => {
      const { data: auth } = await client.auth.getUser()
      if (!auth.user) { setStatus('denied'); return }
      const { data } = await client.from('profiles').select('role').eq('id', auth.user.id).single()
      setStatus(data?.role === 'admin' ? 'allowed' : 'denied')
    }
    void check()
  }, [])
  if (status === 'loading') return <div className="route-loading" dir="rtl">جاري التحقق من صلاحية الإدارة...</div>
  if (status === 'denied') return <Navigate to="/admin-login" replace />
  return children
}

function App() {
  const state = useCourseState()
  const logoutStudent = async () => {
    await supabase?.auth.signOut({ scope: 'local' })
    state.resetDemo()
  }
  const [recovering, setRecovering] = useState(isRecoveryRedirect)
  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => subscription?.data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !state.profile) return
    const client = supabase

    const syncProfile = async () => {
      const { data } = await client.auth.getSession()
      if (!data.session?.user) return
      await client.from('profiles').upsert({
        id: data.session.user.id,
        full_name: state.profile?.fullName,
        phone: state.profile?.phone,
        audience_role: state.profile?.audienceRole,
        goal: state.profile?.goal,
      })
      await client.from('enrollments').upsert(
        { user_id: data.session.user.id, course_id: '11111111-1111-4111-8111-111111111111', status: 'active' },
        { onConflict: 'user_id,course_id' },
      )
    }
    void syncProfile()
  }, [state.profile])

  return (
    <BrowserRouter>
      {recovering ? <PasswordResetPage onComplete={() => setRecovering(false)} /> : <Routes>
        <Route path="/" element={<LandingPage course={course} />} />
        <Route path="/register" element={<RegisterPage state={state} />} />
        <Route path="/follow" element={<SocialGatePage state={state} />} />
        <Route element={<StudentGuard state={state}><AppShell profile={state.profile} progress={state.progress} onLogout={() => void logoutStudent()} /></StudentGuard>}>
          <Route path="/dashboard" element={<DashboardPage state={state} />} />
          <Route path="/lesson/:lessonId" element={<LessonPage state={state} />} />
          <Route path="/project" element={<ProjectPage state={state} />} />
          <Route path="/certificate" element={<CertificatePage state={state} />} />
        </Route>
        <Route path="/reset-password" element={<PasswordResetPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminGuard><AdminPage state={state} /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>}
      {!isSupabaseConfigured && <div className="demo-ribbon">وضع المعاينة — اربط Supabase لتفعيل الحسابات الحقيقية</div>}

      {/* نافذة المتابعة الإلزامية */}
      {state.profile && !(state.profile as any)?.is_onboarded && (
        <OnboardingModal
          userId={(state.profile as any)?.id}
          onComplete={() => window.location.reload()}
        />
      )}

      {/* زر المساعد الذكي */}
      {state.profile && <ChatWidget userId={(state.profile as any)?.id} />}
    </BrowserRouter>
  )
}

export default App
