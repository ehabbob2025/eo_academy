import { CheckCircle2, FileText, LockKeyhole, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { CourseState } from '../App'

export function ProjectPage({ state }: { state: CourseState }) {
  const [fileName, setFileName] = useState('')
  if (!state.courseCompleted) return <div className="empty-state"><LockKeyhole /><h1>مشروع التخرج لسه مقفول</h1><p>كمّل المحاضرات الخمسة واختباراتها الأول.</p><Link className="secondary-button" to="/dashboard">الرجوع للمحاضرات</Link></div>
  if (state.projectStatus !== 'not_started') return <div className="project-status-page"><CheckCircle2 /><span className="eyebrow">تم استلام المشروع</span><h1>{state.projectStatus === 'approved' ? 'مبروك، مشروعك اتقبل' : 'مشروعك تحت المراجعة'}</h1><p>{state.projectStatus === 'approved' ? 'شهادة الإتمام متاحة دلوقتي.' : 'هيوصلك إشعار أول ما يتم التقييم أو لو محتاج تعديل.'}</p>{state.projectStatus === 'approved' && <Link className="primary-button" to="/certificate">عرض الشهادة</Link>}</div>

  const submit = (event: FormEvent) => { event.preventDefault(); if (fileName) state.submitProject() }
  return (
    <div className="project-page"><header className="page-header simple"><div><span className="eyebrow">الخطوة الأخيرة</span><h1>مشروع التخرج</h1><p>التعليمات النهائية هتتحدد من لوحة الأدمن حسب محتوى المحاضرات.</p></div></header>
      <div className="project-layout"><section className="project-instructions"><h2>المطلوب في المشروع</h2><ol><li>اقرأ الحالة أو المطلوب كاملًا.</li><li>نفّذ التطبيق باستخدام ما تعلمته في المحاضرات.</li><li>ارفع الإجابة في ملف PDF أو Word واضح.</li></ol><div className="rubric"><h3>معايير التقييم</h3><div><span>صحة التطبيق</span><strong>50%</strong></div><div><span>التفسير والاستنتاج</span><strong>30%</strong></div><div><span>التنظيم والوضوح</span><strong>20%</strong></div></div></section>
        <form className="upload-card" onSubmit={submit}><FileText size={34} /><h2>ارفع ملف المشروع</h2><label className="file-drop"><UploadCloud /><span>{fileName || 'اضغط لاختيار الملف'}</span><small>PDF أو Word — بحد أقصى 10 MB</small><input type="file" accept=".pdf,.doc,.docx" required onChange={(event) => setFileName(event.target.files?.[0]?.name || '')} /></label><textarea required rows={4} placeholder="اكتب ملاحظة للمصحح (اختياري)" /><button className="primary-button full-button" type="submit" disabled={!fileName}>إرسال المشروع للمراجعة</button></form>
      </div>
    </div>
  )
}
