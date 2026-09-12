import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatWidget({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'أهلاً بك! أنا مساعدك الذكي في الأكاديمية، كيف يمكنني مساعدتك؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      let botAnswer = 'شكراً لتواصلك! يمكنك التواصل مع الإدارة مباشرة لمزيد من التفاصيل.';

      if (supabase) {
        const { data: kbData } = await supabase
          .from('ai_knowledge_base')
          .select('question, answer');

        if (kbData && kbData.length > 0) {
          const found = kbData.find((item: { question: string; answer: string }) => 
            userText.includes(item.question) || item.question.includes(userText)
          );
          if (found) {
            botAnswer = found.answer;
          }
        }

        if (userId) {
          await supabase.from('ai_chat_logs').insert([
            { user_id: userId, sender: 'user', message: userText },
            { user_id: userId, sender: 'bot', message: botAnswer }
          ]);
        }
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: botAnswer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'عذراً، حدث خطأ أثناء معالجة الطلب.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40" dir="rtl">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold transition transform hover:scale-105"
        >
          <span>💬</span>
          <span>المساعد الذكي</span>
        </button>
      )}

      {isOpen && (
        <div className="w-80 md:w-96 h-[440px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
          <div className="p-3.5 bg-zinc-800 flex justify-between items-center border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-sm">مساعد الأكاديمية</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[85%] ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white mr-auto'
                    : 'bg-zinc-800 text-zinc-200 ml-auto'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-zinc-500">جاري الرد...</div>}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب استفسارك..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-sm font-bold transition"
            >
              إرسال
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
