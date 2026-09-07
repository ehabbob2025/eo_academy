import { Award, Download, LockKeyhole, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CourseState } from '../App'

export function CertificatePage({ state }: { state: CourseState }) {
  if (state.projectStatus !== 'approved') return <div className="empty-state"><LockKeyhole /><h1>الشهادة هتظهر بعد اعتماد المشروع</h1><p>إتمام الفيديوهات وحده مش كفاية؛ لازم مشروع التخرج يتراجع ويتقبل.</p><Link className="secondary-button" to="/project">حالة المشروع</Link></div>
  return (
    <div className="certificate-page"><header className="page-header simple"><div><span className="eyebrow">تستحقها</span><h1>شهادة إتمام الكورس</h1><p>شارك إنجازك وخلي شهادتك دليل عملي على التزامك.</p></div></header>
      <div className="certificate-preview"><div className="certificate-border"><span className="brand-mark large">EO</span><span className="certificate-kicker">CERTIFICATE OF COMPLETION</span><h2>شهادة إتمام</h2><p>تشهد أكاديمية إيهاب أسامة بأن</p><h3>{state.profile?.fullName}</h3><p>قد أتم بنجاح الكورس المجاني في أساسيات التغذية ومشروعه التطبيقي</p><div className="certificate-footer"><span>EO-2026-DEMO</span><strong>Ehab Osama<br/><small>Nutritionist & Instructor</small></strong></div></div></div>
      <div className="certificate-actions"><button className="primary-button"><Download size={19} /> تحميل الشهادة PDF</button><button className="secondary-button"><Share2 size={19} /> مشاركة الإنجاز</button></div>
      <section className="paid-offer"><Award /><div><span className="eyebrow">خطوتك الاحترافية التالية</span><h2>حوّل الأساسيات لمهارة تقدر تستخدمها وتبيعها</h2><p>بعد ما أنهيت النسخة المجانية، استعد للتطبيق الكامل داخل الكورس المدفوع.</p></div><a className="primary-button" href={import.meta.env.VITE_PAID_COURSE_URL || '#'}>اعرف تفاصيل الكورس المدفوع</a></section>
    </div>
  )
}

