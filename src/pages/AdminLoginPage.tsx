import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function AuthCard({ children }: { children: ReactNode }) {
  return <div className="auth-page" dir="rtl"><Link className="brand auth-brand" to="/"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ADMIN</small></span></Link><div className="auth-card">{children}</div></div>
}

function authMessage(error: { message: string; status?: number; code?: string }) {
  if (error.status === 429 || /rate.limit/i.test(error.message)) return 'وصلنا لحد المحاولات المسموح مؤقتًا. جرّب لاحقًا من غير تكرار إرسال الإيميل.'
  if (error.code === 'invalid_credentials') return 'الإيميل أو كلمة المرور غير صحيحة. لو لم تعيّن كلمة مرور من قبل، اضغط تعيين أو نسيت كلمة المرور.'
  if (error.code === 'email_not_confirmed') return 'لازم تأكد الإيميل الأول.'
  return 'تعذرت العملية. تأكد من اتصالك وحاول مرة أخرى.'
}

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [reset, setReset] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || (reset && sent)) return
    setError('')
    if (!supabase) { setError('إعدادات الاتصال غير مكتملة. تواصل مع مسؤول الموقع.'); return }
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    setLoading(true)
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) { setError(authMessage(error)); return }
        setSent(true)
        return
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password: String(form.get('password') || ''),
      })
      if (error) { setError(authMessage(error)); return }
      if (!data.user) { setError('تعذر التحقق من الحساب.'); return }
      const { data: profile, error: roleError } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (roleError || profile?.role !== 'admin') {
        await supabase.auth.signOut({ scope: 'local' })
        setError('الحساب غير مصرح له بالإدارة، أو تعذر التحقق من الصلاحية.')
        return
      }
      navigate('/admin', { replace: true })
    } catch {
      setError('تعذر الاتصال. حاول مرة أخرى.')
    } finally { setLoading(false) }
  }

  return <AuthCard>
    <span className="eyebrow">دخول المالك</span>
    <h1>{reset ? 'تعيين كلمة المرور' : 'لوحة إدارة EO Academy'}</h1>
    <p className="muted">{reset ? 'هنبعت رابط آمن لتعيين كلمة مرور. بعد كده تدخل بالإيميل والباسورد مباشرة.' : 'ادخل بالإيميل وكلمة المرور. الدخول متاح لحساب الإدارة المعتمد فقط.'}</p>
    <form onSubmit={submit} className="auth-form">
      <label>الإيميل<input name="email" type="email" autoComplete="username" dir="ltr" required disabled={loading || sent} /></label>
      {!reset && <><label>كلمة المرور<input name="password" type={show ? 'text' : 'password'} autoComplete="current-password" dir="ltr" required disabled={loading} /></label>
      <button type="button" onClick={() => setShow(!show)} aria-pressed={show}>{show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}</button></>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {sent && <p role="status">لو الإيميل مسجل، هيوصلك رابط تعيين كلمة المرور. راجع الوارد والرسائل غير المرغوب فيها.</p>}
      <button className="button primary full-width" type="submit" disabled={loading || (reset && sent)}>{loading ? 'جاري التنفيذ...' : reset ? 'إرسال رابط تعيين كلمة المرور' : 'دخول الإدارة'}</button>
      <button type="button" disabled={loading} onClick={() => { setReset(!reset); setSent(false); setError('') }}>{reset ? 'العودة لتسجيل الدخول' : 'تعيين أو نسيت كلمة المرور؟'}</button>
    </form>
  </AuthCard>
}

export function PasswordResetPage({ onComplete }: { onComplete?: () => void }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || done) return
    setError('')
    if (!supabase) { setError('إعدادات الاتصال غير مكتملة.'); return }
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    if (password.length < 12) { setError('استخدم كلمة مرور من 12 حرفًا على الأقل.'); return }
    if (password !== form.get('confirm')) { setError('كلمتا المرور غير متطابقتين.'); return }
    setLoading(true)
    try {
      const { data, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !data.user) { setError('الرابط غير صالح أو انتهت صلاحيته. ارجع للدخول واطلب رابط تعيين جديد.'); return }
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.code === 'same_password' ? 'اختار كلمة مرور مختلفة عن القديمة.' : updateError.code === 'weak_password' ? 'كلمة المرور ضعيفة. استخدم كلمة أطول ومتنوعة.' : authMessage(updateError))
        return
      }
      setDone(true)
      await supabase.auth.signOut({ scope: 'local' })
    } catch { setError('تعذر الاتصال. حاول مرة أخرى.') }
    finally { setLoading(false) }
  }
  const back = () => { navigate('/admin-login', { replace: true }); onComplete?.() }
  return <AuthCard><h1>كلمة مرور جديدة</h1>
    {done ? <><p role="status">تم حفظ كلمة المرور. ادخل بيها دلوقتي.</p><button className="button primary full-width" onClick={back}>تسجيل الدخول</button></> :
    <form onSubmit={submit} className="auth-form">
      <p className="muted">افتح الصفحة من رابط الاستعادة في الإيميل، أو من جلسة دخول صالحة. اختار كلمة جديدة ما شاركتهاش مع حد.</p>
      <label>كلمة المرور الجديدة<input name="password" type="password" autoComplete="new-password" minLength={12} required dir="ltr" disabled={loading}/></label>
      <label>تأكيد كلمة المرور<input name="confirm" type="password" autoComplete="new-password" minLength={12} required dir="ltr" disabled={loading}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full-width" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</button>
      <button type="button" onClick={back} disabled={loading}>العودة للدخول</button>
    </form>}
  </AuthCard>
}
