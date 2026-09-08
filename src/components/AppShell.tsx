import { Award, FolderCheck, Home, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import type { StudentProfile } from '../types'
import { SupportChat } from './SupportChat'

export function AppShell({ profile, progress, onLogout }: { profile: StudentProfile | null; progress: number; onLogout: () => void }) {
  return (
    <div className="app-shell" dir="rtl">
      <aside className="sidebar">
        <Link className="brand" to="/dashboard" aria-label="EO Academy">
          <span className="brand-mark">EO</span>
          <span><strong>EHAB OSAMA</strong><small>ACADEMY</small></span>
        </Link>
        <nav className="side-nav" aria-label="التنقل الرئيسي">
          <NavLink to="/dashboard"><Home size={19} /> الرئيسية</NavLink>
          <NavLink to="/project"><FolderCheck size={19} /> مشروع التخرج</NavLink>
          <NavLink to="/certificate"><Award size={19} /> الشهادة</NavLink>
        </nav>
        <div className="sidebar-progress">
          <div><span>تقدمك</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="student-mini">
          <div className="avatar">{profile?.fullName?.charAt(0) || 'ط'}</div>
          <div><strong>{profile?.fullName || 'طالب EO'}</strong><small>{profile?.email}</small></div>
          <button className="student-logout" onClick={onLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut size={18} /></button>
        </div>
      </aside>
      <main className="app-main"><Outlet /></main>
      <SupportChat />
    </div>
  )
}
