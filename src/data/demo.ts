import type { CourseLesson, QuizQuestion } from '../types'

export const course = {
  id: 'nutrition-free-course',
  title: 'الكورس المجاني في أساسيات التغذية',
  subtitle: '٥ محاضرات عملية تساعدك تفهم الأساسيات وتختبر نفسك وتنفّذ مشروع تخرج.',
}

export const demoLessons: CourseLesson[] = [
  {
    id: 'lesson-1',
    position: 1,
    title: 'المحاضرة الأولى',
    description: 'أضف عنوان المحاضرة ووصفها ولينك الفيديو من لوحة الأدمن.',
    durationMinutes: 25,
    status: 'available',
    quizPassed: false,
  },
  {
    id: 'lesson-2',
    position: 2,
    title: 'المحاضرة الثانية',
    description: 'تُفتح تلقائيًا بعد النجاح في اختبار المحاضرة السابقة.',
    durationMinutes: 25,
    status: 'locked',
    quizPassed: false,
  },
  {
    id: 'lesson-3',
    position: 3,
    title: 'المحاضرة الثالثة',
    description: 'تُفتح تلقائيًا بعد النجاح في اختبار المحاضرة السابقة.',
    durationMinutes: 25,
    status: 'locked',
    quizPassed: false,
  },
  {
    id: 'lesson-4',
    position: 4,
    title: 'المحاضرة الرابعة',
    description: 'تُفتح تلقائيًا بعد النجاح في اختبار المحاضرة السابقة.',
    durationMinutes: 25,
    status: 'locked',
    quizPassed: false,
  },
  {
    id: 'lesson-5',
    position: 5,
    title: 'المحاضرة الخامسة',
    description: 'بعدها يتفتح مشروع التخرج والعرض الخاص بالكورس المدفوع.',
    durationMinutes: 25,
    status: 'locked',
    quizPassed: false,
  },
]

export const demoQuiz: QuizQuestion[] = [
  {
    id: 'q-1',
    prompt: 'ده سؤال تجريبي للتأكد إن رحلة الاختبار شغالة. اختار الإجابة الصحيحة.',
    options: [
      { id: 'a', label: 'الإجابة الأولى' },
      { id: 'b', label: 'الإجابة الصحيحة' },
      { id: 'c', label: 'الإجابة الثالثة' },
    ],
    correctOptionId: 'b',
    explanation: 'هنستبدل السؤال التجريبي بأسئلة المحاضرة الفعلية من لوحة الأدمن.',
  },
]

