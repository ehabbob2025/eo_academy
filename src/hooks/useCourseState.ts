import { useEffect, useMemo, useState } from 'react'
import { demoLessons } from '../data/demo'
import type { CourseLesson, StudentProfile } from '../types'
import { supabase } from '../lib/supabase'

const LESSONS_KEY = 'eo-course-lessons'
const PROFILE_KEY = 'eo-course-profile'
const SOCIAL_KEY = 'eo-course-social-gate'
const PROJECT_KEY = 'eo-course-project-status'

export function useCourseState() {
  const [lessons, setLessons] = useState<CourseLesson[]>(() => {
    const saved = localStorage.getItem(LESSONS_KEY)
    if (!saved) return demoLessons
    return (JSON.parse(saved) as CourseLesson[]).map((lesson) => ({
      ...lesson,
      quizEnabled: lesson.quizEnabled ?? (lesson.position !== 1),
    }))
  })
  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem(PROFILE_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [socialGateDone, setSocialGateDone] = useState(
    () => localStorage.getItem(SOCIAL_KEY) === 'true',
  )
  const [projectStatus, setProjectStatus] = useState<'not_started' | 'submitted' | 'approved'>(
    () =>
      (localStorage.getItem(PROJECT_KEY) as 'not_started' | 'submitted' | 'approved') ||
      'not_started',
  )

  useEffect(() => localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons)), [lessons])
  useEffect(() => {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }, [profile])
  useEffect(() => localStorage.setItem(SOCIAL_KEY, String(socialGateDone)), [socialGateDone])
  useEffect(() => localStorage.setItem(PROJECT_KEY, projectStatus), [projectStatus])

  useEffect(() => {
    if (!supabase || !profile) return
    const client = supabase
    const loadLiveLessons = async () => {
      // Give the enrollment sync a moment to finish before protected media is read.
      await new Promise((resolve) => window.setTimeout(resolve, 500))
      const { data } = await client
        .from('lessons')
        .select('id,position,title,description,duration_minutes,quiz_enabled,lesson_media(youtube_video_id),lesson_progress(watched_seconds,quiz_passed)')
        .eq('course_id', '11111111-1111-4111-8111-111111111111')
        .eq('is_published', true)
        .order('position')
      if (!data?.length) return
      const prepared = data.map((lesson: any) => {
        const media = lesson.lesson_media as unknown as { youtube_video_id: string }[] | null
        const progressRows = lesson.lesson_progress as unknown as { watched_seconds: number; quiz_passed: boolean }[] | null
        const lessonProgress = progressRows?.[0]
        const quizEnabled = lesson.quiz_enabled !== false
        const watchedEnough = (lessonProgress?.watched_seconds || 0) >= Math.ceil(Math.max(lesson.duration_minutes, 1) * 60 * .85)
        const completed = quizEnabled ? Boolean(lessonProgress?.quiz_passed) : watchedEnough
        return {
          lesson: {
            id: lesson.id,
            position: lesson.position,
            title: lesson.title,
            description: lesson.description,
            durationMinutes: lesson.duration_minutes,
            youtubeVideoId: media?.[0]?.youtube_video_id || '',
            quizEnabled,
            quizPassed: Boolean(lessonProgress?.quiz_passed),
            status: completed ? 'completed' : 'locked',
          } as CourseLesson,
          completed,
        }
      })
      setLessons(prepared.map((entry: { lesson: CourseLesson; completed: boolean }, index: number) => ({
        ...entry.lesson,
        status: entry.completed
          ? 'completed'
          : index === 0 || prepared.slice(0, index).every((previous: { completed: boolean }) => previous.completed)
            ? 'available'
            : 'locked',
      })))
    }
    void loadLiveLessons()
  }, [profile])

  const completedCount = lessons.filter((lesson) => lesson.status === 'completed').length
  const progress = Math.round((completedCount / lessons.length) * 100)
  const courseCompleted = completedCount === lessons.length

  const passLesson = (lessonId: string) => {
    setLessons((current) => {
      const passed = current.find((lesson) => lesson.id === lessonId)
      if (!passed) return current
      return current.map((lesson) => {
        if (lesson.id === lessonId) return { ...lesson, quizPassed: true, status: 'completed' }
        if (lesson.position === passed.position + 1) return { ...lesson, status: 'available' }
        return lesson
      })
    })
  }

  const completeLesson = (lessonId: string) => {
    setLessons((current) => {
      const completed = current.find((lesson) => lesson.id === lessonId)
      if (!completed) return current
      return current.map((lesson) => {
        if (lesson.id === lessonId) return { ...lesson, status: 'completed' }
        if (lesson.position === completed.position + 1) return { ...lesson, status: 'available' }
        return lesson
      })
    })
  }

  const updateLesson = (lessonId: string, changes: Partial<CourseLesson>) => {
    setLessons((current) =>
      current.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...changes } : lesson)),
    )
  }

  const resetDemo = () => {
    localStorage.removeItem(LESSONS_KEY)
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(SOCIAL_KEY)
    localStorage.removeItem(PROJECT_KEY)
    setLessons(demoLessons)
    setProfile(null)
    setSocialGateDone(false)
    setProjectStatus('not_started')
  }

  return useMemo(
    () => ({
      lessons,
      profile,
      setProfile,
      socialGateDone,
      setSocialGateDone,
      completedCount,
      progress,
      courseCompleted,
      passLesson,
      completeLesson,
      updateLesson,
      projectStatus,
      submitProject: () => setProjectStatus('submitted'),
      approveProject: () => setProjectStatus('approved'),
      resetDemo,
    }),
    [lessons, profile, socialGateDone, completedCount, progress, courseCompleted, projectStatus],
  )
}
