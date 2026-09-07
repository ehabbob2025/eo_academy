import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { course } from './data/demo'
import { useCourseState } from './hooks/useCourseState'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { AdminPage } from './pages/AdminPage'
import { CertificatePage } from './pages/CertificatePage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { LessonPage } from './pages/LessonPage'
import { ProjectPage } from './pages/ProjectPage'
import { RegisterPage } from './pages/RegisterPage'
import { SocialGatePage } from './pages/SocialGatePage'
import './App.css'

export type CourseState = ReturnType<typeof useCourseState>

function StudentGuard({ state, children }: { state: CourseState; children: React.ReactNode }) {
  if (!state.profile) return <Navigate to="/register" replace />
  if (!state.socialGateDone) return <Navigate to="/follow" replace />
  return children
}

function App() {
  const state = useCourseState()

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
      <Routes>
        <Route path="/" element={<LandingPage course={course} />} />
        <Route path="/register" element={<RegisterPage state={state} />} />
        <Route path="/follow" element={<SocialGatePage state={state} />} />
        <Route element={<StudentGuard state={state}><AppShell profile={state.profile} progress={state.progress} /></StudentGuard>}>
          <Route path="/dashboard" element={<DashboardPage state={state} />} />
          <Route path="/lesson/:lessonId" element={<LessonPage state={state} />} />
          <Route path="/project" element={<ProjectPage state={state} />} />
          <Route path="/certificate" element={<CertificatePage state={state} />} />
        </Route>
        <Route path="/admin" element={<AdminPage state={state} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isSupabaseConfigured && <div className="demo-ribbon">وضع المعاينة — اربط Supabase لتفعيل الحسابات الحقيقية</div>}
    </BrowserRouter>
  )
}

export default App
