import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as DemoData from '../data/demo'

export function LessonPage({ state }: { state: any }) {
  const { lessonId } = useParams<{ lessonId: string }>()

  // جلب المحاضرات وتحديد المحاضرة الحالية والتالية
  const allLessons: any[] = (DemoData as any)?.lessons || (DemoData as any)?.course?.lessons || (state as any)?.lessons || []
  const currentIndex = allLessons.findIndex((l: any) => String(l?.id) === String(lessonId))
  const validIndex = currentIndex !== -1 ? currentIndex : 0
  const lesson: any = allLessons[validIndex] || allLessons[0] || {}
  const nextLesson: any = validIndex < allLessons.length - 1 ? allLessons[validIndex + 1] : null
  const prevLesson: any = validIndex > 0 ? allLessons[validIndex - 1] : null

  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Array<{ name: string; date: string; text: string }>>([
    {
      name: 'Ehab Osama',
      date: '2026/09/12 2:01 ص',
      text: 'جميل جدا الشرح جزاك الله خيرا'
    }
  ])

  // استخراج رابط التضمين الآمن ليوتيوب بدون أخطاء نوع البيانات
  const getEmbedUrl = (rawUrl: any): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return ''
    if (rawUrl.includes('/embed/')) return rawUrl
    const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
    if (match && match) return 'https://www.youtube.com/embed/' + match
    if (rawUrl.length === 11) return 'https://www.youtube.com/embed/' + rawUrl
    return rawUrl
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    const newComment = {
      name: state?.profile?.fullName || 'طالب متميز',
      date: new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
      text: commentText.trim()
    }
    setComments([newComment, ...comments])
    setCommentText('')
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', direction: 'rtl', fontFamily: 'inherit' }}>
      
      {/* مشغل الفيديو */}
      <div style={{
        backgroundColor: '#000000',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        position: 'relative',
        paddingTop: '56.25%',
        marginBottom: '24px'
      }}>
        <iframe
          src={getEmbedUrl(lesson?.youtubeUrl || lesson?.videoUrl || lesson?.youtubeId || '')}
          title={lesson?.title || 'المحاضرة'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>

      {/* تفاصيل المحاضرة */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0e3b2e', margin: 0 }}>
            {lesson?.title || 'عنوان المحاضرة'}
          </h1>
          <span style={{
            backgroundColor: 'rgba(14, 59, 46, 0.08)',
            color: '#0e3b2e',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            ⏱️ {lesson?.duration || '15 دقيقة'}
          </span>
        </div>
        <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
          {lesson?.description || 'مقدمة كورس التغذية المجاني دليلك لتصميم نظام غذائي مخصص يناسب احتياجاتك.'}
        </p>
      </div>

      {/* قسم التعليقات */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0e3b2e', marginBottom: '6px' }}>
          آراء وتعليقات الطلاب
        </h3>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '18px' }}>
          شارك رأيك أو سؤالك عن المحاضرة باحترام.
        </p>

        <div style={{ marginBottom: '24px' }}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={1000}
            placeholder="إيه أكثر معلومة استفدت منها؟"
            style={{
              width: '100%',
              minHeight: '90px',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              marginBottom: '10px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {commentText.length} / 1000
            </span>
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              style={{
                backgroundColor: commentText.trim() ? '#0e3b2e' : '#9ca3af',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>نشر التعليق</span>
              <span>✈️</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {comments.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '14px 16px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #f3f4f6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#0e3b2e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{c.date}</div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* زر المحاضرة التالية البديل لزر كل المحاضرات القديم */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
        {prevLesson ? (
          <Link
            to={`/lesson/${prevLesson.id}`}
            style={{
              textDecoration: 'none',
              color: '#0e3b2e',
              backgroundColor: '#f3f4f6',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>→</span>
            <span>المحاضرة السابقة</span>
          </Link>
        ) : <div />}

        <Link
          to={nextLesson ? `/lesson/${nextLesson.id}` : '/dashboard'}
          style={{
            textDecoration: 'none',
            backgroundColor: '#0e3b2e',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '15px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(14, 59, 46, 0.25)'
          }}
        >
          <span>{nextLesson ? 'المحاضرة التالية' : 'إنهاء الكورس والعودة للرئيسية'}</span>
          <span>←</span>
        </Link>
      </div>

    </div>
  )
}

export default LessonPage
