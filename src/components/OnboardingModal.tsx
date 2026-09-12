import { useState } from 'react'
import { supabase } from '../lib/supabase'

const PLATFORMS = [
  { id: 'youtube', name: 'قناة اليوتيوب', url: 'https://www.youtube.com/@EhabOsama142', icon: '📺' },
  { id: 'facebook', name: 'صفحة فيسبوك', url: 'https://www.facebook.com/elbob.ehab.94', icon: '📘' },
  { id: 'instagram', name: 'حساب إنستغرام', url: 'https://www.instagram.com/nutritionist_ehab_osama/', icon: '📸' },
  { id: 'tiktok', name: 'حساب تيك توك', url: 'https://www.tiktok.com/@nutritionist_ehab.osama', icon: '🎵' },
]

export default function OnboardingModal({ userId, onComplete }: { userId?: string; onComplete?: () => void }) {
  // فحص ما إذا كان الطالب قد أتم المتابعة مسبقاً في هذا المتصفح
  const localKey = userId ? `eo_onboarded_${userId}` : 'eo_onboarded'
  const isAlreadyDone = typeof window !== 'undefined' && localStorage.getItem(localKey) === 'true'

  const [isOpen, setIsOpen] = useState(!isAlreadyDone)
  const [visited, setVisited] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  // إذا كان الطالب قد أتمها، لا تعرض أي شيء نهائياً
  if (!isOpen) return null

  const handleVisit = (id: string, url: string) => {
    window.open(url, '_blank')
    setVisited((prev) => ({ ...prev, [id]: true }))
  }

  const allVisited = PLATFORMS.every((p) => visited[p.id])
  const completedCount = PLATFORMS.filter((p) => visited[p.id]).length

  const handleFinish = async () => {
    if (!allVisited) return
    setLoading(true)

    // 1. إغلاق النافذة فوراً وحفظ الحالة في ذاكرة المتصفح
    localStorage.setItem(localKey, 'true')
    localStorage.setItem('eo_onboarded', 'true')
    setIsOpen(false)

    // 2. تحديث قاعدة البيانات في سوبابيز بالخلفية
    try {
      if (supabase && userId) {
        await supabase
          .from('profiles')
          .update({ is_onboarded: true })
          .eq('id', userId)
      }
    } catch (e) {
      console.error(e)
    }

    if (onComplete) {
      onComplete()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#0d1f18',
          border: '1px solid #1a4535',
          borderRadius: '24px',
          padding: '30px',
          color: '#ffffff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
          مرحباً بك في EO Academy!
        </h2>
        <p style={{ color: '#a0b3aa', fontSize: '13px', lineHeight: '1.6', marginBottom: '22px' }}>
          لفتح المحاضرات والبدء في رحلتك التعليمية، يجب متابعة منصاتنا الرسمية أولاً:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {PLATFORMS.map((platform) => {
            const isDone = visited[platform.id]
            return (
              <div
                key={platform.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: isDone ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{platform.icon}</span>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff' }}>{platform.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleVisit(platform.id, platform.url)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isDone ? '#10b981' : '#1e3d31',
                    color: '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  {isDone ? '✓ تم التحقق' : 'متابعة'}
                </button>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={!allVisited || loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '800',
            border: 'none',
            cursor: allVisited && !loading ? 'pointer' : 'not-allowed',
            backgroundColor: allVisited ? '#10b981' : '#162e24',
            color: allVisited ? '#000000' : '#4e6d60',
            transition: 'all 0.2s',
            boxShadow: allVisited ? '0 8px 24px rgba(16, 185, 129, 0.35)' : 'none',
          }}
        >
          {loading
            ? 'جاري تفعيل الحساب...'
            : allVisited
            ? 'تأكيد ودخول المحاضرات 🚀'
            : `يرجى متابعة كافة المنصات (${completedCount} من ${PLATFORMS.length})`}
        </button>
      </div>
    </div>
  )
}
