import { CheckCircle2, Mail } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AdminLoginPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (!supabase) { setError('Supabase غير متصل.'); return }
    const email = String(new FormData(event.currentTarget).get('email') || '').trim().toLowerCase()
    if (email !== 'bobhendam@gmail.com') { setError('الحساب ده غير مصرح له بدخول الإدارة.'); return }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin` } })
    setLoading(false)
    if (authError) setError(authError.message); else setSent(true)
  }
  return <div className="auth-page" dir="rtl"><Link className="brand auth-brand" to="/"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ADMIN</small></span></Link><div className="auth-card">{sent ? <div className="success-state"><CheckCircle2 size={54}/><h1>راجع إيميلك</h1><p>بعتنالك رابط دخول الإدارة الآمن.</p></div> : <><span className="eyebrow">دخول المالك</span><h1>لوحة إدارة EO Academy</h1><p className="muted">الدخول متاح لحساب الإدارة المعتمد فقط.</p><form className="form-stack" onSubmit={submit}><label>إيميل الإدارة<div className="input-with-icon"><Mail size={18}/><input name="email" type="email" required defaultValue="bobhendam@gmail.com" /></div></label>{error && <p className="form-error">{error}</p>}<button className="primary-button full-button" disabled={loading}>{loading ? 'جاري الإرسال...' : 'إرسال رابط الدخول'}</button></form></>}</div></div>
}
