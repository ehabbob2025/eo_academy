import { ArrowLeft } from 'lucide-react'
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
    event.preventDefault(); setError('')
    const form = new FormData(event.currentTarget)
    const profile = {
      fullName: String(form.get('fullName') || '').trim(), email: '',
      phone: String(form.get('phone') || '').trim(), audienceRole: String(form.get('audienceRole') || ''), goal: String(form.get('goal') || '').trim(),
    }
    state.setProfile(profile)
    if (!isSupabaseConfigured || !supabase) { navigate('/follow'); return }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/follow` } })
    setLoading(false)
    if (authError) setError('تعذر فتح تسجيل Google. حاول مرة تانية.')
  }

  return (
    <div className="auth-page" dir="rtl">
      <Link className="brand auth-brand" to="/"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ACADEMY</small></span></Link>
      <div className="auth-card">
        <>
          <span className="eyebrow">خطوة واحدة وتبدأ</span><h1>سجّل بياناتك</h1><p className="muted">اكتب الاسم زي ما تحب يظهر في شهادة الإتمام.</p>
          <form className="form-stack" onSubmit={submit}>
            <label>الاسم الثلاثي<input name="fullName" required minLength={5} placeholder="مثال: أحمد محمد حسن" /></label>
            <label>رقم واتساب<input name="phone" required inputMode="tel" placeholder="01xxxxxxxxx" /></label>
            <label>أنت حاليًا؟<select name="audienceRole" required defaultValue=""><option value="" disabled>اختار</option><option value="trainer">مدرب</option><option value="nutritionist">أخصائي تغذية</option><option value="student">طالب</option><option value="client">مهتم بالتغذية لنفسي</option></select></label>
            <label>إيه أهم نتيجة عايزها من الكورس؟<textarea name="goal" required rows={3} placeholder="اكتب هدفك باختصار" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="google-button" disabled={loading} type="submit"><span className="google-mark">G</span>{loading ? 'جاري فتح Google...' : 'التسجيل باستخدام Google'} <ArrowLeft size={20} /></button>
          </form>
        </>
      </div>
    </div>
  )
}
