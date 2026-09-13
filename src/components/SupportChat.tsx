import { Loader2, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Message = { id: string; sender_id: string; body: string; created_at: string }

export function SupportChat() {
  const [open, setOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !supabase) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    const start = async () => {
      setLoading(true); setError('')
      const { data: auth } = await supabase!.auth.getUser()
      const uid = auth.user?.id
      if (!uid) { setError('سجّل دخولك الأول عشان تبدأ المحادثة.'); setLoading(false); return }
      setUserId(uid)
      let { data: thread } = await supabase!.from('support_threads').select('id').eq('user_id', uid).maybeSingle()
      if (!thread) {
        const created = await supabase!.from('support_threads').insert({ user_id: uid }).select('id').single()
        thread = created.data
      }
      if (!thread) { setError('تعذر فتح المحادثة. جرّب مرة تانية.'); setLoading(false); return }
      setThreadId(thread.id)
      const { data } = await supabase!.from('support_messages').select('id,sender_id,body,created_at').eq('thread_id', thread.id).order('created_at')
      setMessages((data || []) as Message[])
      channel = supabase!.channel(`support-${thread.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${thread.id}` }, (payload: any) => {
        const next = payload.new as Message
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next])
      }).subscribe()
      setLoading(false)
    }
    void start()
    return () => { if (channel && supabase) void supabase.removeChannel(channel) }
  }, [open])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !threadId || !userId) return
    const form = new FormData(event.currentTarget)
    const body = String(form.get('message') || '').trim()
    if (!body) return
    setSending(true); setError('')
    const { error: sendError } = await supabase.from('support_messages').insert({ thread_id: threadId, sender_id: userId, body })
    setSending(false)
    if (sendError) setError('الرسالة متبعتتش. جرّب تاني.'); else event.currentTarget.reset()
  }

  return <div className="support-widget" dir="rtl">
    {open && <section className="support-window">
      <header><div><strong>اسأل كابتن إيهاب</strong><small>هنرد عليك داخل المنصة</small></div><button onClick={() => setOpen(false)} aria-label="إغلاق"><X /></button></header>
      <div className="support-messages">
        {loading ? <div className="chat-state"><Loader2 className="spin" /> جاري فتح المحادثة</div> : messages.length === 0 ? <div className="chat-state"><MessageCircle /><strong>أهلًا بيك 👋</strong><span>اكتب سؤالك وهتلاقي الرد هنا.</span></div> : messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_id === userId ? 'mine' : 'admin'}`}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</time></div>)}
        <div ref={endRef} />
      </div>
      {error && <p className="chat-error">{error}</p>}
      <form onSubmit={send}><input name="message" maxLength={2000} placeholder="اكتب سؤالك هنا..." autoComplete="off" /><button disabled={sending || !threadId} aria-label="إرسال"><Send /></button></form>
    </section>}
    {!open && <button className="support-launcher" onClick={() => setOpen(true)}><MessageCircle /><span>اسألنا</span></button>}
  </div>
}

