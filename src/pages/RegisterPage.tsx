import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CourseState } from '../App'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function RegisterPage({ state }: { state: CourseState }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError('')
    const form = new FormData(event.currentTarget)
    const profile = {
      fullName: String(form.get('fullName') || '').trim(),
      email: String(form.get('email') || '').trim().toLowerCase(),
      phone: String(form.get('phone') || '').trim(),
      audienceRole: '',
      goal: '',
    }

    if (!isSupabaseConfigured || !supabase) {
      state.setProfile(profile)
      state.setSocialGateDone(true)
      navigate('/dashboard')
      return
    }

    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInAnonymously({
        options: { data: { full_name: profile.fullName } },
      })
      if (authError || !data.user) {
        setError('تعذر إنشاء الحساب الآن. تأكد إن Anonymous sign-ins مفعّل في Supabase ثم جرّب تاني.')
        return
      }
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: profile.fullName,
        phone: profile.phone,
        contact_email: profile.email,
      }).eq('id', data.user.id)
      if (profileError) {
        await supabase.auth.signOut({ scope: 'local' })
        setError('التسجيل محتاج إعدادًا أخيرًا في قاعدة البيانات. تواصل مع مسؤول المنصة.')
        return
      }
      const { error: enrollmentError } = await supabase.from('enrollments').upsert(
        { user_id: data.user.id, course_id: '11111111-1111-4111-8111-111111111111', status: 'active', source: 'free-course-registration' },
        { onConflict: 'user_id,course_id' },
      )
      if (enrollmentError) {
        setError('تم إنشاء الحساب لكن تعذر ربطه بالكورس. حاول مرة أخرى.')
        return
      }
      state.setProfile(profile)
      state.setSocialGateDone(true)
      navigate('/dashboard')
    } catch {
      setError('تعذر الاتصال. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <Link className="brand auth-brand" to="/"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ACADEMY</small></span></Link>
      <div className="auth-card">
        <span className="eyebrow">ابدأ الكورس مجانًا</span>
        <h1>سجّل بياناتك</h1>
        <p className="muted">اكتب بياناتك واضغط بدء الكورس — هتدخل فورًا من غير انتظار إيميل.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>الاسم الثلاثي<input name="fullName" required minLength={5} placeholder="مثال: أحمد محمد حسن" /></label>
          <label>الإيميل<div className="input-with-icon"><Mail size={18} /><input name="email" type="email" required placeholder="name@example.com" /></div></label>
          <label>رقم واتساب<input name="phone" required inputMode="tel" placeholder="01xxxxxxxxx" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button full-button" disabled={loading} type="submit">{loading ? 'جاري بدء الكورس...' : 'ابدأ الكورس الآن'} <ArrowLeft size={20} /></button>
        </form>
      </div>
    </div>
  )
}
