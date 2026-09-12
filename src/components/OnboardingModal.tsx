import { useState } from 'react';
import { supabase } from '../lib/supabase';
const PLATFORMS = [
  { id: 'youtube', name: 'قناة اليوتيوب', url: 'https://youtube.com/@yourchannel', icon: '📺' },
  { id: 'facebook', name: 'صفحة فيسبوك', url: 'https://facebook.com/yourpage', icon: '📘' },
  { id: 'instagram', name: 'حساب إنستغرام', url: 'https://instagram.com/yourhandle', icon: '📸' },
  { id: 'tiktok', name: 'حساب تيك توك', url: 'https://tiktok.com/@yourhandle', icon: '🎵' },
];

export default function OnboardingModal({ userId, onComplete }: { userId?: string; onComplete: () => void }) {
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const handleVisit = (id: string, url: string) => {
    window.open(url, '_blank');
    setVisited((prev) => ({ ...prev, [id]: true }));
  };

  const allVisited = PLATFORMS.every((p) => visited[p.id]);

  const handleFinish = async () => {
    if (!allVisited) return;
    setLoading(true);
    try {
      if (supabase && userId) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_onboarded: true })
          .eq('id', userId);

        if (error) throw error;
      }
      onComplete();
    } catch (err) {
      alert('حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4" dir="rtl">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl">
        <h2 className="text-xl font-bold text-center mb-2">مرحباً بك في الأكاديمية! 🎉</h2>
        <p className="text-zinc-400 text-xs text-center mb-5 leading-relaxed">
          لتفعيل حسابك بالكامل، يُرجى زيارة ومتابعة منصاتنا الرسمية:
        </p>

        <div className="space-y-3 mb-6">
          {PLATFORMS.map((platform) => {
            const isDone = visited[platform.id];
            return (
              <div
                key={platform.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/70 border border-zinc-700/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{platform.icon}</span>
                  <span className="font-medium text-sm">{platform.name}</span>
                </div>
                <button
                  onClick={() => handleVisit(platform.id, platform.url)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                  }`}
                >
                  {isDone ? '✓ تم الفتح' : 'متابعة'}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleFinish}
          disabled={!allVisited || loading}
          className={`w-full py-3 rounded-xl font-bold text-sm transition ${
            allVisited
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'جاري التحقق والتفعيل...' : allVisited ? 'تأكيد ودخول المنصة' : 'يرجى فتح ومتابعة كافة المنصات'}
        </button>
      </div>
    </div>
  );
}
