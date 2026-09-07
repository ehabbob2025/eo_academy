import { ArrowLeft, Award, BookOpenCheck, FolderCheck, PlayCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function LandingPage({ course }: { course: { title: string; subtitle: string } }) {
  return (
    <div className="landing-page" dir="rtl">
      <header className="public-header container">
        <div className="brand"><span className="brand-mark">EO</span><span><strong>EHAB OSAMA</strong><small>ACADEMY</small></span></div>
        <Link className="text-link" to="/register">تسجيل الدخول</Link>
      </header>
      <main>
        <section className="hero-section container">
          <div className="hero-copy">
            <span className="eyebrow">كورس مجاني عملي</span>
            <h1>{course.title}</h1>
            <p>{course.subtitle}</p>
            <div className="hero-actions">
              <Link className="primary-button" to="/register">ابدأ الكورس مجانًا <ArrowLeft size={20} /></Link>
              <span><ShieldCheck size={18} /> المحاضرات متاحة للمشتركين فقط</span>
            </div>
            <div className="trust-row">
              <div><strong>+1500</strong><span>عميل</span></div><div><strong>+250</strong><span>طالب</span></div><div><strong>5</strong><span>محاضرات</span></div>
            </div>
          </div>
          <div className="hero-visual" aria-label="محتوى الكورس">
            <div className="glow-orb" />
            <div className="course-preview-card">
              <div className="preview-top"><span className="brand-mark">EO</span><span>Nutrition Course</span></div>
              <div className="video-placeholder"><PlayCircle size={58} /><span>ابدأ أول محاضرة</span></div>
              <div className="preview-progress"><span /><span /><span /><span /><span /></div>
            </div>
          </div>
        </section>
        <section className="benefits-section container">
          <article><BookOpenCheck /><h2>٥ محاضرات مركزة</h2><p>فيديوهات Unlisted جوه حسابك، مش روابط مرمية في جروب.</p></article>
          <article><FolderCheck /><h2>تطبيق عملي</h2><p>اختبار بعد كل محاضرة ومشروع تخرج في نهاية الرحلة.</p></article>
          <article><Award /><h2>شهادة إتمام</h2><p>تستحقها بعد إتمام الاختبارات واعتماد مشروعك.</p></article>
        </section>
      </main>
      <footer className="public-footer">© 2026 EO | Ehab Osama Academy</footer>
    </div>
  )
}

