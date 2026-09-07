export type LessonStatus = 'locked' | 'available' | 'completed'

export interface CourseLesson {
  id: string
  position: number
  title: string
  description: string
  durationMinutes: number
  status: LessonStatus
  youtubeVideoId?: string
  quizPassed: boolean
}

export interface QuizOption {
  id: string
  label: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: QuizOption[]
  correctOptionId?: string
  explanation?: string
}

export interface StudentProfile {
  fullName: string
  email: string
  phone: string
  audienceRole: string
  goal: string
}

