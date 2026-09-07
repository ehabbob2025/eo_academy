import { ArrowLeft, Check, PlayCircle, Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { CourseState } from '../App'

export function SocialGatePage({ state }: { state: CourseState }) {
  const navigate = useNavigate()
  const [youtubeClicked, setYoutubeClicked] = useState(false)
  const [instagramClicked, setInstagramClicked] = useState(false)
  const [youtubeConfirmed, setYoutubeConfirmed] = useState(false)
  const [instagramConfirmed, setInstagramConfirmed] = useState(false)
  if (!state.profile) return <Navigate to="/register" replace />
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_CHANNEL_URL || 'https://www.youtube.com/'
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/nutritionist_ehab_osama/'
  return (
    <div className="auth-page" dir="rtl"><div className="auth-card social-card">
      <span className="eyebrow">قبل ما نبدأ</span><h1>خليك جزء من مجتمع EO</h1><p className="muted">المتابعة بتضمن إن توصلك المحاضرات والتحديثات المجانية الجديدة.</p>
      <div className="social-actions">
        <a className={`social-action ${youtubeClicked ? 'done' : ''}`} href={youtubeUrl} target="_blank" rel="noreferrer" onClick={() => setYoutubeClicked(true)}><span className="social-icon youtube"><PlayCircle /></span><span><strong>اشترك في قناة يوتيوب</strong><small>افتح القناة واضغط Subscribe</small></span>{youtubeClicked ? <Check /> : <ArrowLeft />}</a>
        <a className={`social-action ${instagramClicked ? 'done' : ''}`} href={instagramUrl} target="_blank" rel="noreferrer" onClick={() => setInstagramClicked(true)}><span className="social-icon instagram"><Users /></span><span><strong>تابعنا على إنستجرام</strong><small>@nutritionist_ehab_osama</small></span>{instagramClicked ? <Check /> : <ArrowLeft />}</a>
      </div>
      <label className="confirmation-check"><input type="checkbox" disabled={!youtubeClicked} checked={youtubeConfirmed} onChange={(event) => setYoutubeConfirmed(event.target.checked)} /><span>أؤكد إني اشتركت في قناة يوتيوب</span></label>
      <label className="confirmation-check"><input type="checkbox" disabled={!instagramClicked} checked={instagramConfirmed} onChange={(event) => setInstagramConfirmed(event.target.checked)} /><span>أؤكد إني تابعت حساب إنستجرام</span></label>
      <button className="primary-button full-button" disabled={!youtubeConfirmed || !instagramConfirmed} onClick={() => { state.setSocialGateDone(true); navigate('/dashboard') }}>دخول الكورس <ArrowLeft size={20} /></button>
      <p className="privacy-note">مش بنطلب صلاحية الدخول لحسابك على Google أو إنستجرام.</p>
    </div></div>
  )
}
