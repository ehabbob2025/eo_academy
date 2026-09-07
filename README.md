# EO Academy Learning Engine

منصة عربية RTL للكورس المجاني: تسجيل الطلاب، بوابة متابعة قناة يوتيوب، خمس محاضرات متسلسلة، اختبار بعد كل محاضرة، مشروع تخرج، شهادة إتمام، ولوحة إدارة.

## الموجود في النسخة الحالية

- Landing page بهوية EO Academy الأخضر الداكن والذهبي.
- تسجيل الاسم الثلاثي، الإيميل، واتساب، الصفة والهدف.
- دخول Email OTP عند ربط Supabase.
- Soft gate للاشتراك في يوتيوب والمتابعة على إنستجرام.
- خمس محاضرات؛ كل واحدة تُفتح بعد اجتياز السابقة.
- تشغيل فيديو YouTube Unlisted داخل الصفحة باستخدام `youtube-nocookie.com`.
- اختبار تجريبي ومسار نجاح/رسوب وفتح تلقائي للمحاضرة التالية.
- مشروع تخرج وحالات مراجعة واعتماد.
- شاشة شهادة إتمام وعرض للكورس المدفوع.
- لوحة أدمن لإضافة عنوان ووصف ومدة ولينك الفيديو لكل محاضرة.
- مخطط Supabase كامل مع RLS وفصل روابط الفيديو عن بيانات المحاضرات العامة.
- تخزين مفاتيح الإجابات في جدول غير متاح للطلاب، والتصحيح داخل دالة آمنة.
- وضع Demo تلقائي لو متغيرات Supabase غير موجودة.

## تشغيل المعاينة على الكمبيوتر

```bash
npm install
npm run dev
```

صفحة الطالب: `http://localhost:5173/`

لوحة الأدمن التجريبية: `http://localhost:5173/admin`

## الخطوة 1 — إنشاء Supabase

1. أنشئ مشروع Supabase جديد باسم مناسب مثل `eo-academy`.
2. افتح **SQL Editor**.
3. انسخ محتوى الملف:
   `supabase/migrations/20260907170000_initial_schema.sql`
4. شغّل الملف مرة واحدة.
5. من **Project Settings → API** انسخ:
   - Project URL
   - Publishable/Anon key
6. انسخ `.env.example` إلى ملف جديد اسمه `.env.local` وعدّل القيم.
7. لا ترفع `.env.local` أو أي Secret Key إلى GitHub.

## الخطوة 2 — تفعيل الأدمن

سجّل حسابك مرة واحدة من الموقع، ثم شغّل في SQL Editor بعد استبدال الإيميل:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'YOUR_EMAIL'
);
```

استخدم Publishable/Anon key فقط في الواجهة. لا تضع Service Role أو Secret key داخل أي متغير يبدأ بـ`VITE_`.

## الخطوة 3 — فيديوهات YouTube Unlisted

لكل فيديو:

1. اجعل Visibility = **Unlisted**.
2. تأكد أن **Allow embedding** مفعّل.
3. افتح `/admin`.
4. الصق لينك الفيديو كاملًا في المحاضرة المناسبة.
5. النظام يستخرج Video ID ويعرض الفيديو داخل صفحة المحاضرة.

مهم: Unlisted يمنع ظهور الفيديو في نتائج البحث والقناة العامة، لكنه ليس DRM. الزائر غير المسجل لا يستطيع قراءة الفيديو من قاعدة البيانات بسبب RLS، لكن أي طالب مصرح له يستطيع تقنيًا استخراج اللينك من المتصفح. لو احتجنا منع مشاركة الرابط بدرجة أعلى سنستخدم استضافة فيديو Signed Playback بدل YouTube.

## الخطوة 4 — GitHub وCloudflare Pages

ارفع ملفات المشروع إلى Repository خاص على GitHub، ثم داخل Cloudflare Pages:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: اتركها فارغة لو المشروع في جذر الـRepository.

أضف متغيرات البيئة الموجودة في `.env.example` داخل إعدادات Cloudflare، ثم أعد النشر.

ملف `public/_redirects` موجود لتشغيل روابط React المباشرة مثل `/dashboard` و`/admin`.

## فحص الجودة

```bash
npm run build
npm run lint
```

## المرحلة التالية

النسخة الحالية جاهزة للمعاينة وبها قاعدة البيانات الآمنة. المرحلة التالية هي استبدال بيانات الـDemo بقراءة وكتابة كاملة من Supabase داخل صفحات الطالب والأدمن، ثم إضافة محرر أسئلة، رفع مشروع حقيقي، ومولد شهادة PDF برقم تحقق.

