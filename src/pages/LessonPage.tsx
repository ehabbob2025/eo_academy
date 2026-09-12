import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { course } from '../data/demo'
import { CourseState } from '../App'
import { supabase } from '../lib/supabase'

export function LessonPage({ state }: { state: CourseState }) {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  // 1. تحديد المحاضرة الحالية والسابقة والتالية
  const currentIndex = course.lessons.findIndex((l: any) => l.id === lessonId)
  const validIndex = currentIndex !== -1 ? currentIndex : 0
  const lesson = course.lessons[validIndex] || course.lessons[0]
  const nextLesson = validIndex < course.lessons.length - 1 ? course.lessons[validIndex + 1] : null
  const prevLesson = validIndex > 0 ? course.lessons[validIndex - 1] : null

  // 2. حالة التعليقات
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Array<{ name: string; date: string; text: string }>>([
    {
      name: 'Ehab Osama',
      date: '2026/09/12 2:01 ص',
      text: 'جميل جدا الشرح جزاك الله خيرا'
    }
  ])

  // استخراج رابط يوتيوب المضمن
  const getEmbedUrl = (url: string) => {
    if (!url) return 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    if (url.includes('embed/')) return url
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')?.split('?')[0]
      return `https://www.youtube.com/embed/${id}`
    }
    if (url.includes('watch?v=')) {
      const id = new URLSearchParams(url.split('?')).get('v')
      return `https://www.youtube.com/embed/${id}`
    }
    return url
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    const newComment = {
      name: state.profile?.fullName || 'طالب متميز',
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
        paddingTop: '56.25%', // 16:9 Aspect Ratio
        marginBottom: '24px'
      }}>
        <iframe
          src={getEmbedUrl((lesson as any)?.youtubeUrl || (lesson as any)?.videoUrl || (lesson as any)?.youtubeId || '')}
          title={lesson.title}
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
            {lesson.title}
          </h1>
          <span style={{
            backgroundColor: 'rgba(14, 59, 46, 0.08)',
            color: '#0e3b2e',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            ⏱️ {lesson.duration || '15 دقيقة'}
          </span>
        </div>
        <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
          {lesson.description || 'مقدمة كورس التغذية المجاني دليلك لتصميم نظام غذائي مخصص يناسب احتياجاتك.'}
        </p>
      </div>

      {/* شريط التنقل بين المحاضرات (أزرار التالي والسابق وكل المحاضرات) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        {/* زر المحاضرة السابقة */}
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
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span>→</span>
            <span>المحاضرة السابقة</span>
          </Link>
        ) : (
          <div />
        )}

        {/* زر كل المحاضرات في المنتصف */}
        <Link
          to="/dashboard"
          style={{
            textDecoration: 'none',
            color: '#0e3b2e',
            fontWeight: '700',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>📋</span>
          <span>كل المحاضرات</span>
        </Link>

        {/* زر المحاضرة التالية البارز بالأخضر */}
        {nextLesson ? (
          <Link
            to={`/lesson/${nextLesson.id}`}
            style={{
              textDecoration: 'none',
              backgroundColor: '#0e3b2e',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(14, 59, 46, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <span>المحاضرة التالية</span>
            <span>←</span>
          </Link>
        ) : (
          <Link
            to="/project"
            style={{
              textDecoration: 'none',
              backgroundColor: '#d4a017',
              color: '#000000',
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>مشروع التخرج 🎓</span>
          </Link>
        )}
      </div>

      {/* قسم التعليقات والآراء */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0e3b2e', marginBottom: '6px' }}>
          آراء وتعليقات الطلاب
        </h3>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '18px' }}>
          شارك رأيك أو سؤالك عن المحاضرة باحترام.
        </p>

        {/* صندوق كتابة التعليق */}
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
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span>نشر التعليق</span>
              <span>✈️</span>
            </button>
          </div>
        </div>

        {/* قائمة التعليقات السابقة */}
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
                  {c.name.charAt(0).
