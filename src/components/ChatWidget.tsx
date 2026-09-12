import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ChatWidget({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'أهلاً بك! أنا مساعدك الذكي في الأكاديمية، كيف يمكنني مساعدتك؟' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { sender: 'user', text: userText }])
    setLoading(true)

    try {
      let botAnswer = 'شكراً لتواصلك! يمكنك التواصل مع الإدارة مباشرة لمزيد من التفاصيل.'

      if (supabase) {
        const { data: kbData } = await supabase
          .from('ai_knowledge_base')
          .select('question, answer')

        if (kbData && kbData.length > 0) {
          const found = kbData.find((item: { question: string; answer: string }) => 
            userText.includes(item.question) || item.question.includes(userText)
          )
          if (found) {
            botAnswer = found.answer
          }
        }

        if (userId) {
          await supabase.from('ai_chat_logs').insert([
            { user_id: userId, sender: 'user', message: userText },
            { user_id: userId, sender: 'bot', message: botAnswer }
          ])
        }
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: botAnswer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'عذراً، حدث خطأ أثناء معالجة الطلب.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 99999, direction: 'rtl', fontFamily: 'inherit' }}>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#10b981',
            color: '#000000',
            padding: '12px 20px',
            borderRadius: '999px',
            border: 'none',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <span>🤖</span>
          <span>المساعد الذكي</span>
        </button>
      )}

      {isOpen && (
        <div
          style={{
            width: '340px',
            height: '460px',
            backgroundColor: '#0d1f18',
            border: '1px solid #1a4535',
            borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#122a21',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1a4535',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span style={{ fontWeight: '700', fontSize: '13px' }}>مساعد EO Academy</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#a0b3aa', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  alignSelf: m.sender === 'user' ? 'flex-start' : 'flex-end',
                  backgroundColor: m.sender === 'user' ? '#10b981' : '#162e24',
                  color: m.sender === 'user' ? '#000000' : '#e0e7e4',
                  fontWeight: m.sender === 'user' ? '600' : '400',
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && <div style={{ fontSize: '11px', color: '#a0b3aa' }}>جاري الرد...</div>}
            <div ref={endRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #1a4535', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب استفسارك..."
              style={{
                flex: 1,
                backgroundColor: '#162e24',
                border: '1px solid #1a4535',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#ffffff',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading}
              style={{
                backgroundColor: '#10b981',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              إرسال
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
